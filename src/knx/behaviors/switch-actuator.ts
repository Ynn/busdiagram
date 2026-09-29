// switchActuator/v1: multichannel on/off actuator, timer, scenes, status feedback,
// priority override (DPT 2.001).
import { toObjectUnit } from "../units";
import type {
  BehaviorContext,
  BehaviorDefinition,
  DeviceInfo,
  JsonObject,
} from "../contracts";

type AfterForcing =
  "lastCommand" | "previous" | "unchanged" | "on" | "off" | "toggle";
type TimerRetrigger = "restart" | "none" | "add";
/** Limit of one "add-on" timer: five durations (current value of actuators). */
const MAX_TIMER_ADDS = 5;

interface SwitchChannelState {
  /** Logical switching state (command, status feedback); the relay contact follows relayMode. */
  on: boolean;
  /** Condition requested by the commands (switch, scene, timer), applied without forcing. */
  commanded: boolean;
  /** Timer expiry date, or null. */
  offAtMs: number | null;
  /** Force in progress, or null. */
  forced: "on" | "off" | null;
  /** Condition of the relay at the beginning of the forcing. */
  beforeForcing: boolean | null;
  /** Switched off by load shedding (power limit); commands are stored meanwhile. */
  shed: boolean;
}

interface MeterChannel {
  /** Counted energy, Wh (fractional; transmitted rounded). */
  energyWh: number;
  /** Power at the last metering update, W. */
  powerW: number;
  /** Last transmitted power, W; null before the first transmission. */
  sentW: number | null;
}

export interface SwitchState {
  channels: Record<string, SwitchChannelState>;
  meter: {
    channels: Record<string, MeterChannel>;
    atMs: number;
    totalSentW: number | null;
    limitAlarm: number;
    started: boolean;
  };
}

const METER_PORTS = ["power", "energy", "totalPower", "powerLimit"];

type Ctx = BehaviorContext<SwitchState>;

const statusObjects = (ctx: Ctx, ch: string) =>
  ctx.device.objects.filter((o) => o.port === "status" && o.channel === ch);

/**
 * Drive the relay for a logical switching state. With a normally closed relay, the
 * contact is closed (the load is powered) when the logical state is off.
 */
function drive(ctx: Ctx, ch: string, on: boolean) {
  const nc =
    ctx.device.channels.find((c) => c.id === ch)?.parameters.relayMode ===
    "normallyClosed";
  ctx.setOutput(ch, { type: "switch", on: on !== nc });
}

function setRelay(ctx: Ctx, ch: string, on: boolean) {
  const st = ctx.state.channels[ch];
  if (!st || st.on === on) return;
  st.on = on;
  drive(ctx, ch, on);
  // Measure the new power shortly after the load has changed.
  if (metering(ctx)) ctx.schedule("meterSoon", 100);
  const status = statusObjects(ctx, ch);
  if (!status.length) return;
  status.forEach((o) => ctx.setObject(o.id, on ? 1 : 0));
  const delay = Number(
    ctx.device.channels.find((c) => c.id === ch)?.parameters.statusDelayMs ??
      300,
  );
  // A new change during the delay replaces the publication: it will send the last statement.
  ctx.schedule(`${ch}:status`, delay);
}

const channelParams = (ctx: Ctx, ch: string) =>
  ctx.device.channels.find((c) => c.id === ch)?.parameters ?? {};

/** Apply the requested state, unless the output is forced (the command remains stored). */
function follow(ctx: Ctx, ch: string) {
  const st = ctx.state.channels[ch]!;
  if (st.forced) {
    ctx.note(
      st.forced === "on"
        ? ctx.t`${ch}: output forced (on), command stored without effect`
        : ctx.t`${ch}: output forced (off), command stored without effect`,
    );
    return;
  }
  if (st.shed) {
    ctx.note(ctx.t`${ch}: output shed, command stored without effect`);
    return;
  }
  setRelay(ctx, ch, st.commanded);
}

/** Command received (switch object or stage preset). */
export function commandSwitch(ctx: Ctx, ch: string, on: boolean) {
  const st = ctx.state.channels[ch];
  if (!st) return;
  const params = ctx.device.channels.find((c) => c.id === ch)?.parameters ?? {};
  const timerMs = typeof params.timerMs === "number" ? params.timerMs : null;
  if (on && timerMs) {
    // Stairs timer: recirculatable (default), non-recirculatable, or additional.
    const mode = (params.timerRetrigger ?? "restart") as TimerRetrigger;
    const running = st.offAtMs !== null && st.offAtMs > ctx.timeMs;
    let until = ctx.timeMs + timerMs;
    if (running && mode === "none") {
      ctx.note(
        ctx.t`${ch}: timer cannot be retriggered, telegram has no effect`,
      );
      return;
    }
    if (running && mode === "add")
      until = Math.min(
        st.offAtMs! + timerMs,
        ctx.timeMs + MAX_TIMER_ADDS * timerMs,
      );
    ctx.schedule(`${ch}:off`, until - ctx.timeMs);
    st.offAtMs = until;
    // Warning of extinction: the exit opens briefly before the end of the timer.
    const warn = Number(params.timerWarningMs ?? 0);
    if (warn > 0 && until - ctx.timeMs > warn)
      ctx.schedule(`${ch}:warn`, until - ctx.timeMs - warn);
    else ctx.cancel(`${ch}:warn`);
  } else if (!on) {
    if (timerMs && st.offAtMs !== null && params.timerOffAllowed === false) {
      ctx.note(
        ctx.t`${ch}: early switch-off of the timer not allowed, telegram 0 has no effect`,
      );
      return;
    }
    ctx.cancel(`${ch}:off`);
    ctx.cancel(`${ch}:warn`);
    st.offAtMs = null;
  }
  st.commanded = on;
  follow(ctx, ch);
}

/**
 * Priority command (DPT 2.001): bit 1 = control, bit 0 = value.
 * 2 → forced off, 3 → forced on, 0 or 1 → end of forcing.
 */
function force(ctx: Ctx, ch: string, raw: number) {
  const st = ctx.state.channels[ch];
  if (!st) return;
  if (raw & 2) {
    if (st.forced === null) st.beforeForcing = st.on;
    st.forced = raw & 1 ? "on" : "off";
    setRelay(ctx, ch, st.forced === "on");
    return;
  }
  if (st.forced === null) return;
  const after = channelParams(ctx, ch).afterForcing as AfterForcing;
  st.forced = null;
  if (after === "previous") st.commanded = st.beforeForcing ?? st.commanded;
  else if (after === "unchanged") st.commanded = st.on;
  else if (after === "on" || after === "off") st.commanded = after === "on";
  else if (after === "toggle") st.commanded = !st.on;
  st.beforeForcing = null;
  setRelay(ctx, ch, st.commanded);
}

function applyScene(ctx: Ctx, channels: string[], raw: number) {
  const scene = (raw & 0x3f) + 1;
  channels.forEach((ch) => {
    const preset = ctx.device.channels
      .find((c) => c.id === ch)
      ?.scenes.get(scene);
    if (preset === undefined) {
      ctx.note(ctx.t`${ch}: no preset for scene ${scene}, command ignored`);
      return;
    }
    commandSwitch(ctx, ch, preset > 0);
  });
}

function channelsFor(d: DeviceInfo) {
  return d.channels.map((c) => c.id);
}

const metering = (ctx: Ctx) =>
  ctx.device.objects.some((o) => METER_PORTS.includes(o.port));

const numParam = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function sendPort(ctx: Ctx, port: string, ch: string | null, value: number) {
  ctx.device.objects
    .filter(
      (o) => o.port === port && (ch === null ? !o.channel : o.channel === ch),
    )
    .forEach((o) => {
      // Power is computed in W and energy in Wh; kW and kWh objects get converted values.
      ctx.setObject(o.id, toObjectUnit(o.dpt, value));
      ctx.transmit(o.id);
    });
}

/**
 * Metering update: integrate energy with the power of the previous interval, then send
 * power on change (or cyclically) and energy cyclically. Energy is counted with a time
 * scale so that the counter moves visibly in simulated seconds.
 */
function meter(ctx: Ctx, cyclic: boolean) {
  const p = ctx.device.parameters;
  const m = ctx.state.meter;
  const scale = numParam(p.energyTimeScale, 60);
  const hours = ((ctx.timeMs - m.atMs) / 3_600_000) * scale;
  m.atMs = ctx.timeMs;
  const delta = numParam(p.powerSendDeltaW, 10);
  let total = 0;
  for (const ch of channelsFor(ctx.device)) {
    const c = (m.channels[ch] ??= { energyWh: 0, powerW: 0, sentW: null });
    c.energyWh += c.powerW * hours;
    c.powerW = ctx.readPower(ch) ?? 0;
    total += c.powerW;
    if (cyclic || c.sentW === null || Math.abs(c.powerW - c.sentW) >= delta) {
      c.sentW = c.powerW;
      sendPort(ctx, "power", ch, c.powerW);
    }
    if (cyclic) sendPort(ctx, "energy", ch, Math.round(c.energyWh));
  }
  if (
    cyclic ||
    m.totalSentW === null ||
    Math.abs(total - m.totalSentW) >= delta
  ) {
    m.totalSentW = total;
    sendPort(ctx, "totalPower", null, total);
  }
  const limit = numParam(p.powerLimitW, 0);
  if (limit > 0) {
    const hyst = numParam(p.powerLimitHysteresisW, 50);
    const before = m.limitAlarm;
    const after = before
      ? total <= limit - hyst
        ? 0
        : 1
      : total >= limit
        ? 1
        : 0;
    if (after !== before) {
      m.limitAlarm = after;
      ctx.note(
        after
          ? ctx.t`Total power ${Math.round(total)} W reaches the limit ${limit} W`
          : ctx.t`Total power ${Math.round(total)} W is back below ${limit - hyst} W`,
      );
      sendPort(ctx, "powerLimit", null, after);
    }
    // While the limit is exceeded, marked outputs that are on are shed.
    if (m.limitAlarm) shed(ctx);
  }
}

/** Load shedding: switch off the marked outputs, then try again after a minimum time. */
function shed(ctx: Ctx) {
  for (const c of ctx.device.channels) {
    const st = ctx.state.channels[c.id];
    if (!st || c.parameters.loadShedding !== true || st.shed || !st.on)
      continue;
    if (st.forced) continue;
    st.shed = true;
    ctx.note(ctx.t`${c.id}: switched off by load shedding`);
    setRelay(ctx, c.id, false);
    ctx.schedule(
      `${c.id}:unshed`,
      numParam(ctx.device.parameters.sheddingTimeMs, 20000),
    );
  }
}

export const switchActuator: BehaviorDefinition<SwitchState> = {
  description:
    "Switch actuator: each channel drives a relay; optional timer, status feedback, and power and energy metering.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      meterIntervalMs: {
        title: "Metering send interval",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 1000,
        default: 5000,
        description:
          "Cyclic sending of power and energy values (ms), for channels with metering objects.",
      },
      powerSendDeltaW: {
        title: "Power send threshold",
        expert: true,
        type: "number",
        minimum: 0,
        default: 10,
        description:
          "Send a power value when it changes by at least this many watts.",
      },
      energyTimeScale: {
        title: "Energy time scale",
        expert: true,
        type: "number",
        exclusiveMinimum: 0,
        default: 60,
        description:
          "Energy counting speed: 60 counts one simulated second as one minute, so that the counter moves visibly; 1 counts real time.",
      },
      powerLimitW: {
        title: "Total power limit",
        type: "number",
        minimum: 0,
        default: 0,
        description:
          "Total power (W) of the actuator outputs at which the powerLimit object is set, for load shedding (0 disables it).",
      },
      sheddingTimeMs: {
        title: "Minimum shedding time",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 0,
        default: 20000,
        description:
          "A shed output is switched on again after this time, if its command still requests it; it is shed again if the limit is still exceeded.",
      },
      powerLimitHysteresisW: {
        title: "Power limit hysteresis",
        expert: true,
        type: "number",
        minimum: 0,
        default: 50,
        description:
          "The powerLimit object is reset below limit − hysteresis (W).",
      },
    },
  },
  channelParameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      timerMs: {
        title: "Timer",
        unit: "ms",
        type: ["integer", "null"],
        nullTitle: "no timer",
        exclusiveMinimum: 0,
        default: null,
        description: "Timer duration (ms); null disables the timer.",
      },
      timerRetrigger: {
        title: "Timer retriggering",
        expert: true,
        type: "string",
        enum: ["restart", "none", "add"],
        enumTitles: ["Restarts", "No effect", "Extends"],
        default: "restart",
        description:
          "When 1 is received during a timer: restart begins a full period, none ignores it, and add extends the period (up to five times).",
      },
      timerWarningMs: {
        title: "Switch-off warning",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 0,
        default: 0,
        description:
          "Time before the timer ends when the output briefly opens for one second as a warning (0 disables the warning).",
      },
      timerOffAllowed: {
        title: "Early switch-off by 0",
        expert: true,
        type: "boolean",
        default: true,
        description:
          "Allow a 0 write to switch off before the timer ends; otherwise ignore it.",
      },
      loadShedding: {
        title: "Shed on power limit",
        type: "boolean",
        default: false,
        description:
          "Switch this output off while the total power limit of the actuator is exceeded (load shedding).",
      },
      relayMode: {
        title: "Relay operating mode",
        type: "string",
        enum: ["normallyOpen", "normallyClosed"],
        enumTitles: ["Normally open", "Normally closed"],
        default: "normallyOpen",
        description:
          "normallyOpen closes the contact when the channel is on; normallyClosed closes it when the channel is off, so the load is powered while the switching state is 0. Status feedback reports the switching state, not the contact.",
      },
      statusDelayMs: {
        title: "Status feedback delay",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 0,
        default: 300,
        description: "Delay before sending status feedback (ms).",
      },
      afterForcing: {
        title: "End of forcing",
        expert: true,
        type: "string",
        enum: ["lastCommand", "previous", "unchanged", "on", "off", "toggle"],
        enumTitles: [
          "Last command",
          "Previous state",
          "Unchanged",
          "Start",
          "Stop",
          "Toggle",
        ],
        default: "lastCommand",
        description:
          "State after a priority override ends: follow the latest command received during the override, restore the previous state, keep the forced state, switch on, switch off, or invert the forced state.",
      },
    },
  },
  channelInitialState: {
    type: "object",
    additionalProperties: false,
    properties: {
      on: {
        title: "On at start",
        type: "boolean",
        default: false,
        description:
          "Switching state of the channel when the simulation starts.",
      },
    },
  },
  ports: {
    switch: {
      dpts: ["1.001"],
      channel: "required",
      title: "Command",
      direction: "in",
    },
    status: {
      dpts: ["1.001"],
      channel: "required",
      title: "Status feedback",
      direction: "out",
    },
    scene: {
      dpts: ["17.001"],
      channel: "optional",
      title: "Scene",
      direction: "in",
    },
    forced: {
      dpts: ["2.001"],
      channel: "required",
      title: "Forcing",
      direction: "in",
    },
    power: {
      dpts: ["14.056", "9.024"],
      channel: "required",
      title: "Power",
      direction: "out",
      description:
        "electrical power drawn by the load of the channel: W with 14.056, kW with 9.024",
    },
    energy: {
      dpts: ["13.010", "13.013"],
      channel: "required",
      title: "Energy",
      direction: "out",
      description:
        "active energy counted for the channel, sent cyclically: Wh with 13.010, kWh with 13.013",
    },
    totalPower: {
      dpts: ["14.056", "9.024"],
      channel: "none",
      title: "Total power",
      direction: "out",
      description:
        "sum of the power of all channels: W with 14.056, kW with 9.024",
    },
    powerLimit: {
      dpts: ["1.005", "1.001"],
      channel: "none",
      title: "Power limit",
      direction: "out",
      description:
        "1 when the total power reaches powerLimitW, 0 after hysteresis (load shedding)",
    },
  },
  output: "switch",
  createState(d) {
    const channels: Record<string, SwitchChannelState> = {};
    d.channels.forEach((c) => {
      const on = c.initialState.on === true;
      channels[c.id] = {
        on,
        commanded: on,
        offAtMs: null,
        forced: null,
        beforeForcing: null,
        shed: false,
      };
    });
    return {
      channels,
      meter: {
        channels: {},
        atMs: 0,
        totalSentW: null,
        limitAlarm: 0,
        started: false,
      },
    };
  },
  onInit(ctx) {
    if (metering(ctx)) ctx.schedule("meterSoon", 500);
    channelsFor(ctx.device).forEach((ch) => {
      const on = ctx.state.channels[ch]!.on;
      drive(ctx, ch, on);
      statusObjects(ctx, ch).forEach((o) => ctx.setObject(o.id, on ? 1 : 0));
    });
  },
  onObjectWrite(ctx, e) {
    const o = ctx.device.objects.find((x) => x.id === e.objectId);
    if (!o) return;
    if (o.port === "switch" && o.channel)
      commandSwitch(ctx, o.channel, e.newValue !== 0);
    else if (o.port === "forced" && o.channel)
      force(ctx, o.channel, e.newValue);
    else if (o.port === "scene")
      applyScene(
        ctx,
        o.channel ? [o.channel] : channelsFor(ctx.device),
        e.newValue,
      );
  },
  onTimer(ctx, key) {
    if (key === "meterSoon" || key === "meter") {
      meter(ctx, key === "meter");
      const m = ctx.state.meter;
      if (key === "meter" || !m.started) {
        m.started = true;
        ctx.schedule(
          "meter",
          numParam(ctx.device.parameters.meterIntervalMs, 5000),
        );
      }
      return;
    }
    const [ch, what] = key.split(":");
    if (!ch) return;
    if (what === "unshed") {
      const st = ctx.state.channels[ch];
      if (!st?.shed) return;
      st.shed = false;
      ctx.note(ctx.t`${ch}: load shedding ended, stored command applied`);
      follow(ctx, ch);
      return;
    }
    if (what === "off") {
      const st = ctx.state.channels[ch];
      if (!st) return;
      st.offAtMs = null;
      st.commanded = false;
      follow(ctx, ch);
    } else if (what === "warn") {
      const st = ctx.state.channels[ch];
      if (!st?.on || st.forced) return;
      // Open the output for one second without status feedback as an expiry warning.
      drive(ctx, ch, false);
      ctx.note(ctx.t`${ch}: switch-off warning`);
      ctx.schedule(`${ch}:warnEnd`, 1000);
    } else if (what === "warnEnd") {
      const st = ctx.state.channels[ch];
      if (st) drive(ctx, ch, st.on);
    } else if (what === "status") {
      statusObjects(ctx, ch).forEach((o) => ctx.transmit(o.id));
    }
  },
  channelState(state, ch): JsonObject {
    const st = state.channels[ch];
    return st
      ? {
          on: st.on,
          commanded: st.commanded,
          offAtMs: st.offAtMs,
          forced: st.forced,
          shed: st.shed,
          energyWh: state.meter.channels[ch]?.energyWh ?? 0,
          powerW: state.meter.channels[ch]?.powerW ?? 0,
        }
      : {};
  },
};
