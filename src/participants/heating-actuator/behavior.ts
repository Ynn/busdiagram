// Heating actuator: a DPT 5.001 control value converted to PWM for a thermoelectric valve.
// Each output drives a heating valve, a cooling valve, or a change-over valve fed by both
// control values of the room controller (KNX Standard 07_10_03, HVAC Valve Actuator,
// ValveMode 1, 3, and 5).
import type {
  BehaviorContext,
  BehaviorDefinition,
  JsonObject,
  Medium,
  ParamSchema,
} from "../../knx/contracts";
import { clamp, num } from "../shared/values";
import { heatingLayout } from "./layout";
import { valveWarnings } from "./rules";

interface HeatChannel {
  /** Control size applied, %. */
  valuePct: number;
  /** Last heating and cooling control values received, %. */
  heatPct: number;
  coolPct: number;
  /** Water that the valve lets through: the medium of the control value applied. */
  medium: Medium;
  /** The control value applied is a 1-bit order (two points): no modulation. */
  direct: boolean;
  /** Whether the last heating and cooling control values were 1-bit orders. */
  heatDirect: boolean;
  coolDirect: boolean;
  cycleStartMs: number;
  /** Current PWM cycle. */
  cycling: boolean;
  /** Powered outlet (volatile voltage). */
  energized: boolean;
  emergency: boolean;
}

export interface HeatingActuatorState {
  channels: Record<string, HeatChannel>;
}

type HCtx = BehaviorContext<HeatingActuatorState>;

const chParams = (ctx: HCtx, ch: string) =>
  ctx.device.channels.find((c) => c.id === ch)?.parameters ?? {};

function chObjects(ctx: HCtx, port: string, ch: string) {
  return ctx.device.objects.filter(
    (o) => o.port === port && (!o.channel || o.channel === ch),
  );
}

type ValveMode = "heating" | "cooling" | "changeover";

const valveMode = (ctx: HCtx, ch: string): ValveMode => {
  const m = chParams(ctx, ch).valveMode;
  return m === "cooling" || m === "changeover" ? m : "heating";
};

/** Ports that a channel uses, by valve mode. */
const HEATING_PORTS = ["value", "switch"];
const COOLING_PORTS = ["coolingValue", "coolingSwitch"];

/** Drive the output to open the valve, accounting for its action direction. */
function drive(ctx: HCtx, ch: string, open: boolean) {
  const st = ctx.state.channels[ch]!;
  const inverted = chParams(ctx, ch).valveType === "normallyOpen";
  const energized = open !== inverted;
  const cur = ctx.getOutput(ch);
  if (
    energized === st.energized &&
    cur?.type === "switch" &&
    cur.medium === st.medium
  )
    return;
  st.energized = energized;
  ctx.setOutput(ch, { type: "switch", on: energized, medium: st.medium });
}

/** The change-over output has a heating/cooling object: the water comes from it. */
const heatCoolObject = (ctx: HCtx, ch: string) =>
  chObjects(ctx, "heatCool", ch).find((o) => o.channel === ch && o.gas.length);

/**
 * Control value of a change-over valve: the controller sends the value of its active
 * mode and sets the other one to 0, so the valve follows the one that is not zero; when
 * both are, the last one received.
 */
function selectValue(st: HeatChannel, last: Medium) {
  const other: Medium = last === "heating" ? "cooling" : "heating";
  const pct = (m: Medium) => (m === "heating" ? st.heatPct : st.coolPct);
  const medium = pct(last) > 0 || pct(other) === 0 ? last : other;
  st.medium = medium;
  st.valuePct = pct(medium);
  // The kind of order goes with the value selected: a 0 on the other input, ignored for
  // the value, does not turn a modulated value into a permanent order.
  st.direct = medium === "heating" ? st.heatDirect : st.coolDirect;
}

/** Apply the command size: PWM over the period, immediately resume in the cycle. */
function applyValue(ctx: HCtx, ch: string) {
  const st = ctx.state.channels[ch]!;
  const v = st.valuePct;
  if (st.direct || v <= 0 || v >= 100) {
    ctx.cancel(`${ch}:off`);
    ctx.cancel(`${ch}:cycle`);
    st.cycling = false;
    drive(ctx, ch, v > 0);
    return;
  }
  const cycle = num(chParams(ctx, ch).cycleMs, 20_000);
  if (!st.cycling) {
    st.cycling = true;
    st.cycleStartMs = ctx.timeMs;
    ctx.schedule(`${ch}:cycle`, cycle);
  }
  const onMs = Math.round((v / 100) * cycle);
  const left = st.cycleStartMs + onMs - ctx.timeMs;
  if (left > 0) {
    drive(ctx, ch, true);
    ctx.schedule(`${ch}:off`, left);
  } else {
    ctx.cancel(`${ch}:off`);
    drive(ctx, ch, false);
  }
}

function report(ctx: HCtx, ch: string) {
  const st = ctx.state.channels[ch]!;
  chObjects(ctx, "valueStatus", ch)
    .filter((o) => o.channel === ch)
    .forEach((o) => {
      if (ctx.getObject(o.id) === st.valuePct) return;
      ctx.setObject(o.id, st.valuePct);
      ctx.transmit(o.id);
    });
}

function watch(ctx: HCtx, ch: string) {
  const ms = num(chParams(ctx, ch).monitoringMs, 0);
  if (ms > 0) ctx.schedule(`${ch}:watch`, ms);
}

function setFault(ctx: HCtx, ch: string, on: boolean) {
  chObjects(ctx, "fault", ch)
    .filter((o) => o.channel === ch)
    .forEach((o) => {
      if (ctx.getObject(o.id) === (on ? 1 : 0)) return;
      ctx.setObject(o.id, on ? 1 : 0);
      ctx.transmit(o.id);
    });
}

const heatingChannelParams: ParamSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    valveMode: {
      title: "Valve function",
      type: "string",
      enum: ["heating", "cooling", "changeover"],
      enumTitles: ["Heating", "Cooling", "Heating and cooling (change-over)"],
      default: "heating",
      description:
        "heating: the output follows the heating control value; cooling: the cooling control value; changeover: one valve for both, as on a 2-pipe system, following the control value that is not zero.",
    },
    valveType: {
      title: "Valve direction of action",
      type: "string",
      enum: ["normallyClosed", "normallyOpen"],
      enumTitles: ["Closed when de-energised", "Open when de-energised"],
      default: "normallyClosed",
      description:
        "normallyClosed: valve closed without power (common); normallyOpen: valve open without power, so the output is inverted.",
    },
    cycleMs: {
      title: "PWM cycle time",
      unit: "ms",
      type: "integer",
      minimum: 1000,
      default: 20_000,
      description:
        "PWM period for a continuous control value: powered time equals value × period (real installations typically use 10–20 minutes).",
    },
    monitoringMs: {
      title: "Control value monitoring",
      unit: "ms",
      expert: true,
      type: "integer",
      minimum: 0,
      default: 0,
      description:
        "If no control value arrives within this time, enter fallback mode and report a fault (0 disables monitoring).",
    },
    emergencyPct: {
      title: "Emergency control value",
      unit: "%",
      expert: true,
      type: "number",
      minimum: 0,
      maximum: 100,
      default: 30,
      description: "Control value applied in fallback mode.",
    },
  },
};

export const heatingActuator: BehaviorDefinition<HeatingActuatorState> = {
  warnings: valveWarnings,
  parameterLayout: heatingLayout,
  description:
    "Heating actuator: each output drives an electrothermal valve for heating, for cooling, or for both (change-over); continuous control value (5.001) converted to PWM, or direct 1-bit command, monitoring and emergency mode.",
  channelParameters: heatingChannelParams,
  ports: {
    value: {
      description:
        "Heating control value of the valve (5.001), applied by pulse-width modulation over cycleMs.",
      drivesLoad: true,
      dpts: ["5.001"],
      channel: "required",
      title: "Heating control value",
      direction: "in",
    },
    switch: {
      drivesLoad: true,
      dpts: ["1.001"],
      channel: "required",
      title: "Heating 1-bit command",
      direction: "in",
      description: "two-point or thermostat PWM heating control",
    },
    valueStatus: {
      description: "Control value applied to the valve (5.001).",
      defaultFlags: { R: true },
      dpts: ["5.001"],
      channel: "required",
      title: "Control value status",
      direction: "out",
    },
    fault: {
      dpts: ["1.005"],
      channel: "required",
      title: "Control value failure",
      direction: "out",
      description: "missing control value: fallback program",
    },
    heatCool: {
      // Unknown until a value is received: the water stays the one of the output's start.
      initialUnknown: true,
      dpts: ["1.100"],
      channel: "required",
      title: "Heating / cooling",
      direction: "in",
      description:
        "change-over output: 1 hot water, 0 cold water; the last control value received applies, the same value heating or cooling",
    },
    coolingValue: {
      description:
        "Cooling control value of the valve (5.001), for a cooling or change-over output.",
      drivesLoad: true,
      dpts: ["5.001"],
      channel: "required",
      title: "Cooling control value",
      direction: "in",
    },
    coolingSwitch: {
      drivesLoad: true,
      dpts: ["1.001"],
      channel: "required",
      title: "Cooling 1-bit command",
      direction: "in",
      description: "two-point or thermostat PWM cooling control",
    },
  },
  output: "switch",
  createState(d) {
    const channels: Record<string, HeatChannel> = {};
    d.channels.forEach(
      (c) =>
        (channels[c.id] = {
          valuePct: 0,
          heatPct: 0,
          coolPct: 0,
          medium: c.parameters.valveMode === "cooling" ? "cooling" : "heating",
          direct: false,
          heatDirect: false,
          coolDirect: false,
          cycleStartMs: 0,
          cycling: false,
          energized: false,
          emergency: false,
        }),
    );
    return { channels };
  },
  onInit(ctx) {
    ctx.device.channels.forEach((c) => {
      const st = ctx.state.channels[c.id]!;
      // A heating/cooling object given a value at start sets the water of a change-over
      // output; without one, it is heating until the first telegram.
      const hc = heatCoolObject(ctx, c.id);
      const hcValue = hc ? ctx.getObject(hc.id) : null;
      if (valveMode(ctx, c.id) === "changeover" && hcValue !== null)
        st.medium = hcValue ? "heating" : "cooling";
      // Initially closed valve: An open valve off voltage must be supplied.
      st.energized = chParams(ctx, c.id).valveType === "normallyOpen";
      ctx.setOutput(c.id, {
        type: "switch",
        on: st.energized,
        medium: st.medium,
      });
      chObjects(ctx, "valueStatus", c.id)
        .filter((o) => o.channel === c.id)
        .forEach((o) => ctx.setObject(o.id, 0));
      watch(ctx, c.id);
    });
  },
  onObjectWrite(ctx, e) {
    const o = ctx.device.objects.find((x) => x.id === e.objectId);
    const ch = o?.channel;
    if (!o || !ch || !ctx.state.channels[ch]) return;
    const st = ctx.state.channels[ch];
    const mode = valveMode(ctx, ch);
    if (o.port === "heatCool") {
      // Heating/cooling object of a change-over output: the water the valve lets
      // through; the control value applied stays the same.
      if (mode !== "changeover") return;
      st.medium = e.newValue ? "heating" : "cooling";
      applyValue(ctx, ch);
      return;
    }
    const cooling = COOLING_PORTS.includes(o.port);
    if (!cooling && !HEATING_PORTS.includes(o.port)) return;
    // A heating output ignores the cooling control value, and the reverse.
    if ((mode === "heating" && cooling) || (mode === "cooling" && !cooling))
      return;
    const direct = o.port === "switch" || o.port === "coolingSwitch";
    const pct = direct ? (e.newValue ? 100 : 0) : clamp(e.newValue);
    if (cooling) {
      st.coolPct = pct;
      st.coolDirect = direct;
    } else {
      st.heatPct = pct;
      st.heatDirect = direct;
    }
    // With a heating/cooling object, the last control value received applies and the
    // object gives the water; otherwise the value that is not zero selects it.
    if (mode === "changeover" && heatCoolObject(ctx, ch)) {
      st.valuePct = pct;
      st.direct = direct;
    } else selectValue(st, cooling ? "cooling" : "heating");
    if (st.emergency) {
      st.emergency = false;
      ctx.note(ctx.t`control value received: emergency mode ended`);
      setFault(ctx, ch, false);
    }
    applyValue(ctx, ch);
    report(ctx, ch);
    watch(ctx, ch);
  },
  onTimer(ctx, key) {
    const [ch, what] = key.split(":");
    const st = ch ? ctx.state.channels[ch] : undefined;
    if (!ch || !st) return;
    if (what === "off") drive(ctx, ch, false);
    else if (what === "cycle") {
      st.cycling = false;
      applyValue(ctx, ch);
    } else if (what === "watch") {
      st.emergency = true;
      st.direct = false;
      st.valuePct = num(chParams(ctx, ch).emergencyPct, 30);
      ctx.note(
        ctx.t`no control value received: emergency mode at ${st.valuePct} %`,
      );
      setFault(ctx, ch, true);
      applyValue(ctx, ch);
      report(ctx, ch);
    }
  },
  // The timers stop with the bus voltage. When it returns, each output takes up its
  // control value again, from a new PWM cycle, and its monitoring starts over.
  onBusRecovery(ctx) {
    ctx.device.channels.forEach((c) => {
      const st = ctx.state.channels[c.id];
      if (!st) return;
      st.cycling = false;
      applyValue(ctx, c.id);
      watch(ctx, c.id);
    });
  },
  channelState(state, ch): JsonObject {
    const st = state.channels[ch];
    return st
      ? {
          valuePct: st.valuePct,
          medium: st.medium,
          energized: st.energized,
          emergency: st.emergency,
        }
      : {};
  },
};
