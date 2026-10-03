// Heating actuator: a DPT 5.001 control value converted to PWM for a thermoelectric valve.
import type {
  BehaviorContext,
  BehaviorDefinition,
  JsonObject,
  ParamSchema,
} from "../../knx/contracts";
import { clamp, num } from "../shared/values";
import { heatingLayout } from "./layout";
import { valveWarnings } from "./rules";

interface HeatChannel {
  /** Control size applied, %. */
  valuePct: number;
  /** Order received in 1 bit (two points): no modulation. */
  direct: boolean;
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

/** Drive the output to open the valve, accounting for its action direction. */
function drive(ctx: HCtx, ch: string, open: boolean) {
  const st = ctx.state.channels[ch]!;
  const inverted = chParams(ctx, ch).valveType === "normallyOpen";
  const energized = open !== inverted;
  if (energized === st.energized && ctx.getOutput(ch)) return;
  st.energized = energized;
  ctx.setOutput(ch, { type: "switch", on: energized });
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
    "Heating actuator: each output drives an electrothermal valve; continuous control value (5.001) converted to PWM, or direct 1-bit command, monitoring and emergency mode.",
  channelParameters: heatingChannelParams,
  ports: {
    value: {
      description:
        "Continuous control value of the valve (5.001), applied by pulse-width modulation over cycleMs.",
      drivesLoad: true,
      dpts: ["5.001"],
      channel: "required",
      title: "Control value",
      direction: "in",
    },
    switch: {
      drivesLoad: true,
      dpts: ["1.001"],
      channel: "required",
      title: "1-bit command",
      direction: "in",
      description: "two-point or thermostat PWM control",
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
  },
  output: "switch",
  createState(d) {
    const channels: Record<string, HeatChannel> = {};
    d.channels.forEach(
      (c) =>
        (channels[c.id] = {
          valuePct: 0,
          direct: false,
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
      // Initially closed valve: An open valve off voltage must be supplied.
      st.energized = chParams(ctx, c.id).valveType === "normallyOpen";
      ctx.setOutput(c.id, { type: "switch", on: st.energized });
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
    if (o.port !== "value" && o.port !== "switch") return;
    st.direct = o.port === "switch";
    st.valuePct = st.direct ? (e.newValue ? 100 : 0) : clamp(e.newValue);
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
          energized: st.energized,
          emergency: st.emergency,
        }
      : {};
  },
};
