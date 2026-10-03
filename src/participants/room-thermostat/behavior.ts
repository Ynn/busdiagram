// Room thermostat: DPT 20.102 modes, setpoints, PI or two-point control. The measured
// temperature comes from the room state (ctx.readRoom()) or an external sensor object.
import type {
  BehaviorContext,
  BehaviorDefinition,
  JsonObject,
  ParamSchema,
} from "../../knx/contracts";
import { clamp, num } from "../shared/values";
import { thermostatLayout } from "./layout";

const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

/** Modes HVAC (DPT 20.102). */
export const HVAC = {
  auto: 0,
  comfort: 1,
  standby: 2,
  economy: 3,
  protection: 4,
} as const;

export interface ThermostatState {
  /** Base setpoint for heating comfort, °C. */
  baseC: number;
  /** Preselected mode (hvacMode object or local key). */
  preset: number;
  presence: boolean;
  window: boolean;
  /** Heating mode when true; cooling mode otherwise. */
  heating: boolean;
  /** Current mode and setpoint. */
  mode: number;
  setpointC: number;
  /** Last temperature measured. */
  measuredC: number | null;
  /** Integral term of the PI controller, in percent. */
  integral: number;
  /** Calculated control value, %. */
  valuePct: number;
  /** One-bit output for two-point control or PWM. */
  switchOn: boolean;
  pwmStartMs: number;
  /** Time elapsed since the last calculation, ms. */
  elapsedMs: number;
  lastSentPct: number | null;
  lastSentPctAt: number;
  lastSentTempC: number | null;
  lastSentTempAt: number;
  warned: boolean;
  /** Time of the last externalTemp value received, ms; null before the first one. */
  externalAtMs: number | null;
  /** Start of the wait for a first externalTemp value (start-up, bus voltage return). */
  externalWaitFromMs: number;
  /** The external temperature is older than externalTempTimeoutMs. */
  externalStale: boolean;
  /** No usable temperature: the sensor fault is reported. */
  sensorFault: boolean;
}

type TCtx = BehaviorContext<ThermostatState>;

const P = (ctx: TCtx) => ctx.device.parameters;

function objectsOf(ctx: BehaviorContext<unknown>, port: string) {
  return ctx.device.objects.filter((o) => o.port === port);
}

function publish(ctx: BehaviorContext<unknown>, port: string, value: number) {
  objectsOf(ctx, port).forEach((o) => {
    if (ctx.getObject(o.id) === value) return;
    ctx.setObject(o.id, value);
    ctx.transmit(o.id);
  });
}

/**
 * Mode priority in this simulator: open window > protection preselected > presence >
 * preselection. As on most room controllers, presence extends comfort from the
 * standby or economy mode, but does not end a building protection mode (absence,
 * holidays) set centrally.
 */
function modeOf(st: ThermostatState): number {
  if (st.window) return HVAC.protection;
  if (st.preset === HVAC.protection) return HVAC.protection;
  if (st.presence) return HVAC.comfort;
  return st.preset === HVAC.auto ? HVAC.comfort : st.preset;
}

/** Mode consignment: reduced in heating, raised in cooling, absolute protection. */
function setpointOf(ctx: TCtx, st: ThermostatState, mode: number): number {
  const p = P(ctx);
  if (mode === HVAC.protection)
    return st.heating ? num(p.frostProtectionC, 7) : num(p.heatProtectionC, 35);
  const shift =
    mode === HVAC.standby
      ? num(p.standbyShiftK, 2)
      : mode === HVAC.economy
        ? num(p.economyShiftK, 4)
        : 0;
  return st.heating ? st.baseC - shift : st.baseC + num(p.deadZoneK, 3) + shift;
}

/** Recalculate mode and record; publishes the state objects that have changed. */
function update(ctx: TCtx) {
  const st = ctx.state;
  const mode = modeOf(st);
  const sp = setpointOf(ctx, st, mode);
  if (mode !== st.mode) {
    const why = st.window
      ? ctx.t`window open`
      : st.presence
        ? ctx.t`presence`
        : ctx.t`preset`;
    ctx.note(
      ctx.t`thermostat: ${modeName(ctx, mode)} mode (${why}), setpoint ${fmt(sp)} °C`,
    );
  } else if (sp !== st.setpointC)
    ctx.note(ctx.t`thermostat: setpoint ${fmt(sp)} °C`);
  st.mode = mode;
  st.setpointC = sp;
  publish(ctx, "hvacModeStatus", mode);
  publish(ctx, "setpointStatus", sp);
  publish(ctx, "heatCoolStatus", st.heating ? 1 : 0);
}

function modeName(ctx: BehaviorContext<unknown>, m: number) {
  switch (m) {
    case HVAC.comfort:
      return ctx.t`comfort`;
    case HVAC.standby:
      return ctx.t`standby`;
    case HVAC.economy:
      return ctx.t`economy`;
    case HVAC.protection:
      return ctx.t`protection`;
    default:
      return ctx.t`auto`;
  }
}

/** Measured temperature: external temperature object when available, otherwise the room sensor. */
function measure(ctx: TCtx): number | null {
  const st = ctx.state;
  const ext = objectsOf(ctx, "externalTemp")
    .map((o) => ctx.getObject(o.id))
    .find((v) => v !== null);
  const timeout = num(P(ctx).externalTempTimeoutMs, 0);
  // Monitored from the last value, or, before a first one, from start-up.
  const stale =
    timeout > 0 &&
    objectsOf(ctx, "externalTemp").length > 0 &&
    ctx.timeMs - (st.externalAtMs ?? st.externalWaitFromMs) > timeout;
  if (stale !== st.externalStale) {
    st.externalStale = stale;
    ctx.note(
      stale
        ? ctx.t`thermostat: no external temperature for ${timeout / 1000} s: internal sensor used`
        : ctx.t`thermostat: external temperature received again`,
    );
  }
  if (ext !== undefined && ext !== null && !stale) return ext;
  return ctx.readRoom()?.temperatureC ?? null;
}

/** A control cycle: measurement, control size, emissions. */
function control(ctx: TCtx, dtMs: number) {
  const st = ctx.state;
  const p = P(ctx);
  const t = measure(ctx);
  if (t === null) {
    if (!st.warned)
      ctx.note(
        ctx.t`thermostat: no temperature (room or “externalTemp” object): no control`,
      );
    st.warned = true;
    // Sensor fault: a temperature was lost, the external temperature never came within
    // its monitoring time, or the device has no source at all. It is reported, and the
    // control value set to its fault value.
    const noSource =
      ctx.readRoom() === null && !objectsOf(ctx, "externalTemp").length;
    if (
      !st.sensorFault &&
      (st.measuredC !== null || noSource || st.externalStale)
    ) {
      st.sensorFault = true;
      publish(ctx, "sensorFault", 1);
      ctx.note(
        ctx.t`thermostat: sensor fault, control value ${num(p.sensorFaultValuePct, 0)} %`,
      );
      st.valuePct = num(p.sensorFaultValuePct, 0);
      st.switchOn = st.valuePct > 0;
      sendValue(ctx);
      pwm(ctx);
    }
    return;
  }
  if (st.sensorFault) {
    st.sensorFault = false;
    st.warned = false;
    ctx.note(
      ctx.t`thermostat: temperature received again, sensor fault cleared`,
    );
    publish(ctx, "sensorFault", 0);
  }
  st.measuredC = t;
  sendTemperature(ctx, t);

  // Positive deviation = energy requirement in the current mode.
  const e = st.heating ? st.setpointC - t : t - st.setpointC;
  const type = p.controlType === "twoPoint" ? "twoPoint" : "pi";
  if (type === "twoPoint") {
    const hyst = num(p.hysteresisK, 0.5);
    // "negative" hysteresis: stop at check-in, set-off - hysteresis.
    if (st.switchOn && e <= 0) st.switchOn = false;
    else if (!st.switchOn && e >= hyst) st.switchOn = true;
    st.valuePct = st.switchOn ? 100 : 0;
  } else {
    const kp = 100 / Math.max(0.1, num(p.proportionalBandK, 2));
    const ti = num(p.integralTimeMs, 120_000);
    const prop = kp * e;
    // Anti-package: the integral does not accumulate when the output is saturated in this direction.
    const next = st.integral + (ti > 0 ? (kp * e * dtMs) / ti : 0);
    const raw = prop + next;
    if (!((raw > 100 && e > 0) || (raw < 0 && e < 0)))
      st.integral = clamp(next, -100, 100);
    if (ti <= 0) st.integral = 0;
    st.valuePct = clamp(prop + st.integral);
  }
  sendValue(ctx);
  pwm(ctx);
}

function sendTemperature(ctx: TCtx, t: number) {
  const st = ctx.state;
  const p = P(ctx);
  const delta = num(p.temperatureSendDeltaK, 0.2);
  const cyclic = num(p.temperatureCyclicMs, 0);
  const due =
    st.lastSentTempC === null ||
    Math.abs(t - st.lastSentTempC) >= delta - 1e-9 ||
    (cyclic > 0 && ctx.timeMs - st.lastSentTempAt >= cyclic);
  if (!due) return;
  st.lastSentTempC = t;
  st.lastSentTempAt = ctx.timeMs;
  objectsOf(ctx, "actualTemp").forEach((o) => {
    ctx.setObject(o.id, t);
    ctx.transmit(o.id);
  });
}

/** Send the continuous control value after a sufficient change, at an endpoint, or on a cycle. */
function sendValue(ctx: TCtx) {
  const st = ctx.state;
  const p = P(ctx);
  const v = Math.round(st.valuePct);
  const delta = num(p.valueSendDeltaPct, 5);
  const cyclic = num(p.valueCyclicMs, 0);
  const last = st.lastSentPct;
  const due =
    last === null ||
    Math.abs(v - last) >= delta ||
    (v !== last && (v === 0 || v === 100)) ||
    (cyclic > 0 && ctx.timeMs - st.lastSentPctAt >= cyclic);
  if (!due) return;
  st.lastSentPct = v;
  st.lastSentPctAt = ctx.timeMs;
  const [active, idle] = st.heating
    ? ["heatingValue", "coolingValue"]
    : ["coolingValue", "heatingValue"];
  objectsOf(ctx, active).forEach((o) => {
    ctx.setObject(o.id, v);
    ctx.transmit(o.id);
  });
  publish(ctx, idle, 0);
}

/**
 * All-or-nothing output: direct in two-point regulation, modulated (PWM) in PI:
 * march for value × period, immediate recovery of a new value in the cycle.
 */
function pwm(ctx: TCtx) {
  const st = ctx.state;
  const p = P(ctx);
  let on = st.switchOn;
  if (p.controlType !== "twoPoint") {
    const cycle = num(p.pwmCycleMs, 20_000);
    if (ctx.timeMs - st.pwmStartMs >= cycle)
      st.pwmStartMs += cycle * Math.floor((ctx.timeMs - st.pwmStartMs) / cycle);
    const v = Math.round(st.valuePct);
    on = v >= 100 || (v > 0 && ctx.timeMs - st.pwmStartMs < (v / 100) * cycle);
  }
  st.switchOn = on;
  const [active, idle] = st.heating
    ? ["heatingSwitch", "coolingSwitch"]
    : ["coolingSwitch", "heatingSwitch"];
  publish(ctx, active, on ? 1 : 0);
  publish(ctx, idle, 0);
}

/** Writing received from the bus or local action, depending on the port of the object. */
/** Window state from a window object: 1.009 uses 1 for closed, other DPTs 1 for open. */
const windowOpenOf = (dpt: string, value: number) =>
  dpt === "1.009" ? value === 0 : value !== 0;

function apply(ctx: TCtx, port: string, value: number, dpt = "") {
  const st = ctx.state;
  const p = P(ctx);
  switch (port) {
    case "externalTemp":
      // Received from the bus or entered on the device: the measurement is renewed.
      st.externalAtMs = ctx.timeMs;
      break;
    case "baseSetpoint":
      st.baseC = clamp(value, num(p.minSetpointC, 5), num(p.maxSetpointC, 35));
      break;
    case "setpointShift":
      st.baseC = clamp(
        num(p.comfortC, 21) + value,
        num(p.minSetpointC, 5),
        num(p.maxSetpointC, 35),
      );
      break;
    case "hvacMode":
      if (value >= 0 && value <= 4) st.preset = value;
      break;
    case "presence":
      if (p.presenceType === "button") {
        // Presence button: each 1 extends the comfort mode for comfortExtensionMs.
        if (value === 0) return;
        st.presence = true;
        ctx.schedule("presenceEnd", num(p.comfortExtensionMs, 7_200_000));
        ctx.note(ctx.t`thermostat: comfort extended by the presence button`);
      } else st.presence = value !== 0;
      break;
    case "window":
      st.window = windowOpenOf(dpt, value);
      break;
    case "heatCool": {
      const heating = value !== 0;
      if (heating !== st.heating) {
        st.heating = heating;
        st.integral = 0;
        st.lastSentPct = null;
      }
      break;
    }
    default:
      return;
  }
  update(ctx);
  // A change of set-up or mode occurs without waiting for the next cycle.
  if (st.measuredC !== null) control(ctx, 0);
}

const thermostatParams: ParamSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    presenceType: {
      title: "Presence input",
      type: "string",
      enum: ["detector", "button"],
      enumTitles: ["Presence detector", "Presence button"],
      default: "detector",
      description:
        "detector: comfort while the presence object is 1; button: each 1 extends the comfort mode for comfortExtensionMs.",
    },
    comfortExtensionMs: {
      title: "Comfort extension",
      unit: "ms",
      type: "integer",
      minimum: 60000,
      default: 7200000,
      description:
        "Duration of the comfort mode started by the presence button (2 h by default).",
    },
    controlType: {
      title: "Control type",
      type: "string",
      enum: ["pi", "twoPoint"],
      enumTitles: ["PI (continuous or PWM)", "Two-point"],
      default: "pi",
      description:
        "pi uses proportional-integral control with a continuous value (5.001) or PWM (1 bit); twoPoint uses on/off control with hysteresis.",
    },
    comfortC: {
      title: "Base setpoint",
      type: "number",
      minimum: 5,
      maximum: 35,
      default: 21,
      description:
        "Initial heating comfort setpoint (°C); the baseSetpoint object can replace it.",
    },
    standbyShiftK: {
      title: "Standby setback",
      type: "number",
      minimum: 0,
      maximum: 10,
      default: 2,
      description:
        "Standby setpoint offset (K): lower for heating, higher for cooling.",
    },
    economyShiftK: {
      title: "Economy setback",
      type: "number",
      minimum: 0,
      maximum: 15,
      default: 4,
      description:
        "Economy or night setpoint offset (K): lower for heating, higher for cooling.",
    },
    frostProtectionC: {
      title: "Frost protection setpoint",
      type: "number",
      minimum: 3,
      maximum: 15,
      default: 7,
      description: "Heating setpoint in protection mode (°C).",
    },
    heatProtectionC: {
      title: "Heat protection setpoint",
      expert: true,
      type: "number",
      minimum: 25,
      maximum: 45,
      default: 35,
      description: "Cooling setpoint in protection mode (°C).",
    },
    deadZoneK: {
      title: "Dead zone",
      expert: true,
      type: "number",
      minimum: 0,
      maximum: 10,
      default: 3,
      description:
        "Difference between heating and cooling comfort setpoints (K), for example 21 °C and 24 °C.",
    },
    minSetpointC: {
      title: "Minimum setpoint",
      expert: true,
      type: "number",
      minimum: 0,
      maximum: 30,
      default: 5,
      description:
        "Lowest base setpoint accepted (°C); lower received or entered values are raised to it.",
    },
    maxSetpointC: {
      title: "Maximum setpoint",
      expert: true,
      type: "number",
      minimum: 10,
      maximum: 50,
      default: 35,
      description:
        "Highest base setpoint accepted (°C); higher received or entered values are lowered to it.",
    },
    hysteresisK: {
      title: "Hysteresis",
      type: "number",
      minimum: 0.1,
      maximum: 5,
      default: 0.5,
      description:
        "Two-point control switches on again when temperature differs from the setpoint by this amount (K).",
    },
    proportionalBandK: {
      title: "Proportional band",
      type: "number",
      minimum: 0.5,
      maximum: 10,
      default: 2,
      description:
        "Temperature difference (K) that produces 100% output from the proportional term.",
    },
    integralTimeMs: {
      title: "Integral time",
      unit: "ms",
      type: "integer",
      minimum: 0,
      default: 120_000,
      description:
        "PI integral time: a constant error doubles the proportional response after this duration (0 selects P control). Real installations use 60–240 minutes; the default follows compressed simulated room time.",
    },
    pwmCycleMs: {
      title: "PWM cycle time",
      unit: "ms",
      type: "integer",
      minimum: 1000,
      default: 20_000,
      description:
        "PWM cycle period for a 1-bit control object (real installations typically use 10–20 minutes).",
    },
    controlPeriodMs: {
      title: "Calculation period",
      unit: "ms",
      expert: true,
      type: "integer",
      minimum: 100,
      default: 1000,
      description:
        "Interval at which the controller recalculates its control value from the measured temperature.",
    },
    valueSendDeltaPct: {
      title: "Send on change",
      unit: "%",
      type: "number",
      minimum: 1,
      maximum: 50,
      default: 5,
      description:
        "Send the control value when it changes by at least this many percentage points.",
    },
    sensorFaultValuePct: {
      title: "Control value on sensor fault",
      unit: "%",
      expert: true,
      type: "number",
      minimum: 0,
      maximum: 100,
      default: 0,
      description:
        "Control value sent when no temperature is usable (external temperature too old, no room sensor), until a temperature comes back.",
    },
    externalTempTimeoutMs: {
      title: "External temperature timeout",
      unit: "ms",
      expert: true,
      type: "integer",
      minimum: 0,
      default: 0,
      description:
        "If no externalTemp value arrives within this time, control uses the internal sensor again until a new value arrives (0 disables monitoring).",
    },
    valueCyclicMs: {
      title: "Cyclic sending of control value",
      unit: "ms",
      expert: true,
      type: "integer",
      minimum: 0,
      default: 0,
      description:
        "Periodically resend the control value (0 disables it); needed when the actuator monitors incoming values.",
    },
    temperatureSendDeltaK: {
      title: "Temperature send threshold",
      type: "number",
      minimum: 0.1,
      maximum: 5,
      default: 0.2,
      description:
        "Send measured temperature when it changes by at least this amount (K).",
    },
    temperatureCyclicMs: {
      title: "Cyclic sending of temperature",
      unit: "ms",
      expert: true,
      type: "integer",
      minimum: 0,
      default: 0,
      description:
        "Also send the measured temperature at this interval, even without change; 0 disables cyclic sending.",
    },
  },
};

export const roomThermostat: BehaviorDefinition<ThermostatState> = {
  // The display faces the measured temperature, the setpoint and the mode.
  presentation: (d) => {
    const ids = d.objects
      .filter((o) =>
        ["actualTemp", "setpointStatus", "hvacModeStatus"].includes(o.port),
      )
      .map((o) => o.id);
    return {
      screen: ids.length ? ids : d.objects.slice(0, 1).map((o) => o.id),
    };
  },
  parameterLayout: thermostatLayout,
  description:
    "Room thermostat: comfort / standby / economy / protection modes (20.102), window and presence, PI control (5.001 or PWM) or two-point, heating and cooling.",
  parameters: thermostatParams,
  acceptsInputs: true,
  ports: {
    actualTemp: {
      defaultFlags: { R: true },
      description: "Measured temperature (9.001), sent on change.",
      dpts: ["9.001"],
      channel: "none",
      title: "Measured temperature",
      direction: "out",
    },
    sensorFault: {
      dpts: ["1.005", "1.001"],
      channel: "none",
      title: "Sensor fault",
      direction: "out",
      description:
        "1 when no temperature is usable (external temperature too old and no room sensor); 0 when one comes back",
      defaultFlags: { R: true },
      telegram: "state",
    },
    externalTemp: {
      single: true,
      dpts: ["9.001"],
      channel: "none",
      title: "External temperature",
      direction: "in",
      description: "replaces the internal sensor after a value is received",
    },
    baseSetpoint: {
      description: "Base comfort setpoint for heating (9.001).",
      dpts: ["9.001"],
      channel: "none",
      title: "Base setpoint",
      direction: "in",
    },
    setpointShift: {
      dpts: ["9.002"],
      channel: "none",
      title: "Setpoint shift",
      direction: "in",
      description: "base setpoint = configured setpoint + offset",
    },
    setpointStatus: {
      defaultFlags: { R: true },
      description: "Current setpoint (9.001).",
      dpts: ["9.001"],
      channel: "none",
      title: "Current setpoint",
      direction: "out",
    },
    hvacMode: {
      description:
        "Selected mode (20.102: 0 auto, 1 comfort, 2 standby, 3 economy, 4 protection).",
      dpts: ["20.102"],
      channel: "none",
      title: "Mode (preset)",
      direction: "in",
    },
    hvacModeStatus: {
      defaultFlags: { R: true },
      description: "Current mode (20.102).",
      dpts: ["20.102"],
      channel: "none",
      title: "Current mode",
      direction: "out",
    },
    presence: {
      dpts: ["1.018", "1.001"],
      channel: "none",
      title: "Presence",
      direction: "in",
      description: "1 = presence: comfort mode",
    },
    window: {
      dpts: ["1.019", "1.001", "1.009"],
      channel: "none",
      title: "Window",
      direction: "in",
      description:
        "open window (1.019 / 1.001: 1 = open; 1.009: 0 = open): protection mode, highest priority",
    },
    heatCool: {
      dpts: ["1.100"],
      channel: "none",
      title: "Heating / cooling",
      direction: "in",
      description: "1 = heating, 0 = cooling",
    },
    heatCoolStatus: {
      defaultFlags: { R: true },
      description: "Current mode: 1 heating, 0 cooling (1.100).",
      dpts: ["1.100"],
      channel: "none",
      title: "Heating / cooling status",
      direction: "out",
    },
    heatingValue: {
      defaultFlags: { R: true },
      dpts: ["5.001"],
      channel: "none",
      title: "Heating control value",
      direction: "out",
      description: "continuous control value from 0 to 100%",
    },
    heatingSwitch: {
      defaultFlags: { R: true },
      dpts: ["1.001"],
      channel: "none",
      title: "Heating 1-bit control",
      direction: "out",
      description: "two-point control, or PWM under PI control",
    },
    coolingValue: {
      defaultFlags: { R: true },
      description: "Continuous cooling control value (5.001).",
      dpts: ["5.001"],
      channel: "none",
      title: "Cooling control value",
      direction: "out",
    },
    coolingSwitch: {
      defaultFlags: { R: true },
      description: "One-bit cooling command.",
      dpts: ["1.001"],
      channel: "none",
      title: "Cooling 1-bit control",
      direction: "out",
    },
  },
  createState(d) {
    const base = num(d.parameters.comfortC, 21);
    return {
      baseC: base,
      preset: HVAC.comfort,
      presence: false,
      window: false,
      heating: true,
      mode: HVAC.comfort,
      setpointC: base,
      measuredC: null,
      integral: 0,
      valuePct: 0,
      switchOn: false,
      pwmStartMs: 0,
      elapsedMs: 0,
      lastSentPct: null,
      lastSentPctAt: 0,
      lastSentTempC: null,
      lastSentTempAt: 0,
      warned: false,
      sensorFault: false,
      externalAtMs: null,
      externalWaitFromMs: 0,
      externalStale: false,
    };
  },
  onInit(ctx) {
    const st = ctx.state;
    st.externalWaitFromMs = ctx.timeMs;
    // Initial values reported on input objects.
    ctx.device.objects.forEach((o) => {
      const v = ctx.getObject(o.id);
      if (v === null) return;
      if (o.port === "hvacMode" && v >= 0 && v <= 4) st.preset = v;
      if (o.port === "presence") st.presence = v !== 0;
      if (o.port === "window") st.window = windowOpenOf(o.dpt, v);
      if (o.port === "heatCool") st.heating = v !== 0;
      if (o.port === "baseSetpoint") st.baseC = v;
    });
    st.mode = modeOf(st);
    st.setpointC = setpointOf(ctx, st, st.mode);
    objectsOf(ctx, "hvacModeStatus").forEach((o) =>
      ctx.setObject(o.id, st.mode),
    );
    objectsOf(ctx, "setpointStatus").forEach((o) =>
      ctx.setObject(o.id, st.setpointC),
    );
    objectsOf(ctx, "baseSetpoint").forEach((o) =>
      ctx.setObject(o.id, st.baseC),
    );
    objectsOf(ctx, "heatCoolStatus").forEach((o) =>
      ctx.setObject(o.id, st.heating ? 1 : 0),
    );
    const t = measure(ctx);
    if (t !== null) {
      st.measuredC = t;
      st.lastSentTempC = t;
      objectsOf(ctx, "actualTemp").forEach((o) => ctx.setObject(o.id, t));
    }
  },
  // The timers stop with the bus voltage. When it returns, a comfort extension still on
  // runs a whole extension again, and the external temperature is awaited again from now.
  onBusRecovery(ctx) {
    const st = ctx.state;
    st.externalAtMs = null;
    st.externalWaitFromMs = ctx.timeMs;
    if (P(ctx).presenceType === "button" && st.presence)
      ctx.schedule("presenceEnd", num(P(ctx).comfortExtensionMs, 7_200_000));
  },
  onTimer(ctx, key) {
    if (key !== "presenceEnd") return;
    ctx.state.presence = false;
    ctx.note(ctx.t`thermostat: end of the comfort extension`);
    update(ctx);
    if (ctx.state.measuredC !== null) control(ctx, 0);
  },
  onTick(ctx, dtMs) {
    const st = ctx.state;
    st.elapsedMs += dtMs;
    const period = num(P(ctx).controlPeriodMs, 1000);
    if (st.elapsedMs >= period) {
      const dt = st.elapsedMs;
      st.elapsedMs = 0;
      control(ctx, dt);
    } else if (P(ctx).controlType !== "twoPoint" && st.measuredC !== null)
      pwm(ctx);
  },
  onObjectWrite(ctx, e) {
    const o = ctx.device.objects.find((x) => x.id === e.objectId);
    if (o) apply(ctx, o.port, e.newValue, o.dpt);
  },
  onInput(ctx, input) {
    const d = ctx.device;
    if (input.gesture === "value") {
      const n = d.inputs.find((x) => x.id === input.inputId);
      const o = n && d.objects.find((x) => x.id === n.object);
      if (!o || input.value === undefined) return;
      ctx.setObject(o.id, input.value);
      apply(ctx, o.port, ctx.getObject(o.id)!, o.dpt);
      if (o.flags.T) ctx.transmit(o.id);
      return;
    }
    const b = d.buttons.find((x) => x.id === input.inputId);
    const a = b?.[input.gesture as "press" | "short" | "long"];
    const o = a && d.objects.find((x) => x.id === a.object);
    if (!a || !o) return;
    const cur = ctx.getObject(o.id) ?? 0;
    const v = a.value === "toggle" ? (cur ? 0 : 1) : a.value;
    ctx.setObject(o.id, v);
    apply(ctx, o.port, ctx.getObject(o.id)!, o.dpt);
    if (o.flags.T) ctx.transmit(o.id);
  },
  deviceState(st): JsonObject {
    return {
      mode: st.mode,
      setpointC: st.setpointC,
      baseC: st.baseC,
      measuredC: st.measuredC,
      heating: st.heating,
      valuePct: Math.round(st.valuePct),
      switchOn: st.switchOn,
      window: st.window,
      presence: st.presence,
      externalStale: st.externalStale,
    };
  },
};
