// Lighting dimming shared by the KNX dimmer actuator and the KNX/DALI gateway.
// Both share channel logic for switching (1.001), relative dimming (3.007),
// absolute value (5.001), scenes (17.001), and status feedback (1.001 and 5.001).
// The gateway adds broadcast commands and fault reporting (1.005), and records
// emitted DALI commands (DAPC, RECALL MAX/OFF, UP/DOWN, GO TO SCENE) in the event log.
import type {
  BehaviorContext,
  BehaviorDefinition,
  JsonObject,
  ParamSchema,
} from "../../knx/contracts";
import { dimStepPct } from "../../knx/dpt";

interface DimChannelState {
  /** Level at the last anchor point (start of a fade). */
  from: number;
  /** Targeted level. */
  target: number;
  startMs: number;
  fadeMs: number;
  /** Last non-zero level (the "last value" ignition value). */
  last: number;
  /** Number of faulty ballasts recorded at the last gateway poll. */
  failures: number;
  /** Colour temperature (K) of a tunable white channel; null otherwise. */
  kelvin: number | null;
  /** Scenes stored by a scene control telegram (DPT 18.001): scene → level %. */
  learned: Record<string, number>;
  /** Level when the bus voltage failed, restored on recovery; null otherwise. */
  beforeFailure: number | null;
}

export interface DimmerState {
  channels: Record<string, DimChannelState>;
  /** KNX/DALI gateway: DALI commands in the log, ballast polling, scenes 1–16. */
  gateway: boolean;
}

type Ctx = BehaviorContext<DimmerState>;

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/** Level at `timeMs`, including any fade in progress. */
export function levelAt(st: DimChannelState, timeMs: number): number {
  if (st.fadeMs <= 0) return st.target;
  const f = Math.min(1, Math.max(0, (timeMs - st.startMs) / st.fadeMs));
  return st.from + (st.target - st.from) * f;
}

/**
 * DALI arc power level (IEC 62386-102, logarithmic curve): 1 → 0.1%, 254 → 100%.
 * 0 = off.
 */
export function daliArcLevel(pct: number): number {
  if (pct <= 0) return 0;
  const p = clamp(pct, 0.1, 100);
  return Math.round(1 + (253 / 3) * (Math.log10(p) + 1));
}

const params = (ctx: Ctx, ch: string) =>
  ctx.device.channels.find((c) => c.id === ch)?.parameters ?? {};
const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);

function objectsOf(ctx: Ctx, port: string, ch: string | null) {
  return ctx.device.objects.filter(
    (o) => o.port === port && (ch === null ? !o.channel : o.channel === ch),
  );
}

function publish(ctx: Ctx, ch: string) {
  const st = ctx.state.channels[ch]!;
  const lvl = st.target;
  objectsOf(ctx, "status", ch).forEach((o) =>
    ctx.setObject(o.id, lvl > 0 ? 1 : 0),
  );
  objectsOf(ctx, "valueStatus", ch).forEach((o) => ctx.setObject(o.id, lvl));
  ctx.schedule(`${ch}:status`, num(params(ctx, ch).statusDelayMs, 300));
}

function dali(ctx: Ctx, ch: string | null, text: string) {
  if (!isGateway(ctx)) return;
  const label =
    ch === null
      ? ctx.t`broadcast`
      : ctx.t`group ${ctx.device.channels.find((c) => c.id === ch)?.label ?? ch}`;
  ctx.note(ctx.t`DALI: ${label} ← ${text}`);
}

const isGateway = (ctx: Ctx) => ctx.state.gateway;

/** Apply a target level with a fade, then publish state returns at its due date. */
function go(ctx: Ctx, ch: string, target: number, fadeMs: number) {
  const st = ctx.state.channels[ch];
  if (!st) return;
  const now = levelAt(st, ctx.timeMs);
  const t = clamp(target);
  const fade = Math.abs(t - now) < 1e-9 ? 0 : Math.max(0, fadeMs);
  // Same order during a fade: the current fade continues, on the actuator side as the side
  // lamp (the engine does not transmit a control identical to the equipment).
  if (t === st.target && fade > 0 && fade === st.fadeMs) return;
  if (now > 0) st.last = now;
  st.from = now;
  st.target = t;
  st.startMs = ctx.timeMs;
  st.fadeMs = fade;
  if (st.target > 0) st.last = st.target;
  ctx.setOutput(ch, output(st, st.fadeMs));
  ctx.cancel(`${ch}:status`);
  if (st.fadeMs > 0) ctx.schedule(`${ch}:end`, st.fadeMs);
  else {
    ctx.cancel(`${ch}:end`);
    publish(ctx, ch);
  }
}

/** Output command, with the colour temperature of a tunable white channel. */
const output = (st: DimChannelState, fadeMs: number) => ({
  type: "dim" as const,
  level: st.target,
  fadeMs,
  ...(st.kelvin !== null ? { colourTemperatureK: st.kelvin } : {}),
});

/** Colour temperature (DPT 7.600), limited to the range of the channel. */
function setColour(ctx: Ctx, ch: string, kelvin: number) {
  const st = ctx.state.channels[ch];
  if (!st || st.kelvin === null) return;
  const p = params(ctx, ch);
  const k = Math.round(
    clamp(kelvin, num(p.minColourK, 2700), num(p.maxColourK, 6500)),
  );
  if (k !== kelvin)
    ctx.note(ctx.t`${ch}: ${kelvin} K limited to ${k} K by the channel range`);
  if (k === st.kelvin) return;
  st.kelvin = k;
  // A fade in progress continues with its remaining time.
  const remaining = Math.max(0, st.startMs + st.fadeMs - ctx.timeMs);
  ctx.setOutput(ch, output(st, remaining));
  objectsOf(ctx, "colourTemperatureStatus", ch).forEach((o) =>
    ctx.setObject(o.id, k),
  );
  ctx.schedule(`${ch}:colour`, num(p.statusDelayMs, 300));
}

function switchCh(ctx: Ctx, ch: string, on: boolean) {
  const p = params(ctx, ch);
  const st = ctx.state.channels[ch]!;
  const fade = num(p.switchFadeMs, 0);
  if (!on) {
    dali(ctx, ch, ctx.t`OFF`);
    return go(ctx, ch, 0, fade);
  }
  // The switch-on level stays within the minimum and maximum levels of the channel.
  const lvl = clamp(
    p.onLevel === "last" ? st.last || 100 : num(p.onLevelPct, 100),
    num(p.minLevelPct, 1),
    num(p.maxLevelPct, 100),
  );
  dali(
    ctx,
    ch,
    lvl >= 100
      ? ctx.t`RECALL MAX LEVEL`
      : ctx.t`DAPC ${daliArcLevel(lvl)} (${Math.round(lvl)} %)`,
  );
  go(ctx, ch, lvl, fade);
}

function setValue(ctx: Ctx, ch: string, v: number, fadeMs?: number) {
  const p = params(ctx, ch);
  const off = levelAt(ctx.state.channels[ch]!, ctx.timeMs) <= 0;
  // Switching by a brightness value can be forbidden separately for on and off.
  if (off && v > 0 && p.valueSwitchesOn === false) {
    ctx.note(
      ctx.t`${ch}: off, a brightness value does not switch on (parameter)`,
    );
    return;
  }
  if (!off && v <= 0 && p.valueSwitchesOff === false) {
    const min = num(p.minLevelPct, 1);
    ctx.note(
      ctx.t`${ch}: a value of 0 does not switch off (parameter): minimum level ${min} %`,
    );
    v = min;
  }
  // A value above 0 stays within the minimum and maximum levels (KNX Dimming Actuator
  // Basic: X < minimum gives the minimum, X > maximum the maximum).
  const lvl =
    v <= 0 ? 0 : clamp(v, num(p.minLevelPct, 1), num(p.maxLevelPct, 100));
  dali(ctx, ch, ctx.t`DAPC ${daliArcLevel(lvl)} (${Math.round(lvl)} %)`);
  go(ctx, ch, lvl, fadeMs ?? num(p.valueFadeMs, 0));
}

/** Relative dimming: step size is 100% / 2^(n-1), using dimTimeMs for full-range travel. */
function dim(ctx: Ctx, ch: string, raw: number) {
  const p = params(ctx, ch);
  const st = ctx.state.channels[ch]!;
  const now = levelAt(st, ctx.timeMs);
  const step = dimStepPct(raw);
  if (!step) {
    dali(ctx, ch, ctx.t`dimming stopped at ${Math.round(now)} %`);
    return go(ctx, ch, now, 0);
  }
  const up = (raw & 8) !== 0;
  const min = num(p.minLevelPct, 1);
  const max = num(p.maxLevelPct, 100);
  if (now <= 0 && up && p.dimSwitchesOn === false) {
    ctx.note(ctx.t`${ch}: off, dimming does not switch on (parameter)`);
    return;
  }
  if (now <= 0 && !up) return;
  const floor = p.dimSwitchesOff === true ? 0 : min;
  // While dimming, a new step counts from the level being reached (the set value), as in
  // the state machine of the KNX Dimming Actuator Basic; otherwise from the current level.
  const base =
    st.fadeMs > 0 && levelAt(st, ctx.timeMs) !== st.target ? st.target : now;
  const target = clamp(
    up ? Math.max(base, min) + step : base - step,
    floor,
    max,
  );
  const dimTime = num(p.dimTimeMs, 5000);
  dali(
    ctx,
    ch,
    up
      ? ctx.t`UP (dimming to ${Math.round(target)} %)`
      : ctx.t`DOWN (dimming to ${Math.round(target)} %)`,
  );
  go(ctx, ch, target, (Math.abs(target - now) / 100) * dimTime);
}

/**
 * Scene telegram: recall the preset of each channel, or, with the learn bit of a scene
 * control telegram (DPT 18.001), store the current level as the scene.
 */
function scene(ctx: Ctx, channels: string[], raw: number, dpt: string) {
  const n = (raw & 0x3f) + 1;
  if (dpt === "18.001" && raw & 0x80) {
    channels.forEach((ch) => {
      const st = ctx.state.channels[ch];
      if (!st) return;
      if (params(ctx, ch).sceneLearning === false) {
        ctx.note(ctx.t`${ch}: scene storing disabled, scene ${n} unchanged`);
        return;
      }
      if (isGateway(ctx) && n > 16) {
        ctx.note(
          ctx.t`${ch}: DALI scenes go from 1 to 16, scene ${n} not stored`,
        );
        return;
      }
      const level = Math.round(levelAt(st, ctx.timeMs));
      st.learned[String(n)] = level;
      ctx.note(ctx.t`${ch}: scene ${n} stored (${level} %)`);
    });
    return;
  }
  channels.forEach((ch) => {
    const preset =
      ctx.state.channels[ch]?.learned[String(n)] ??
      ctx.device.channels.find((c) => c.id === ch)?.scenes.get(n);
    if (preset === undefined) {
      ctx.note(ctx.t`${ch}: no preset for scene ${n}, command ignored`);
      return;
    }
    dali(ctx, ch, ctx.t`GO TO SCENE ${n - 1} (${Math.round(preset)} %)`);
    go(ctx, ch, preset, num(params(ctx, ch).valueFadeMs, 0));
  });
}

/** Ballast examination (gateway): defects reported on objects 1.005. */
function poll(ctx: Ctx, publishChanges: boolean) {
  let total = 0;
  ctx.device.channels.forEach((c) => {
    const st = ctx.state.channels[c.id];
    if (!st) return;
    // Every DALI load of the group counts (several loads can share an output).
    let failures = 0;
    c.loads.forEach((_, i) => {
      const eq = ctx.readEquipment(c.id, i);
      if (typeof eq?.failed === "number") failures += eq.failed;
    });
    total += failures;
    if (failures !== st.failures) {
      st.failures = failures;
      objectsOf(ctx, "error", c.id).forEach((o) => {
        ctx.setObject(o.id, failures > 0 ? 1 : 0);
        if (publishChanges) ctx.transmit(o.id);
      });
      if (publishChanges)
        ctx.note(
          failures > 0
            ? ctx.t`DALI: ${failures} faulty ballast(s) in group ${c.label}`
            : ctx.t`DALI: no more fault in group ${c.label}`,
        );
    }
  });
  objectsOf(ctx, "generalError", null).forEach((o) => {
    const v = total > 0 ? 1 : 0;
    if (ctx.getObject(o.id) === v) return;
    ctx.setObject(o.id, v);
    if (publishChanges) ctx.transmit(o.id);
  });
}

const channelParameters: ParamSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    onLevel: {
      title: "Switch-on value",
      type: "string",
      enum: ["fixed", "last"],
      enumTitles: ["Set value", "Last value"],
      default: "fixed",
      description:
        "Level when switched on: fixed uses onLevelPct; last restores the level before switch-off.",
    },
    onLevelPct: {
      title: "Switch-on level",
      unit: "%",
      type: "number",
      minimum: 1,
      maximum: 100,
      default: 100,
      description: "Level reached when a value of 1 is received (fixed mode).",
    },
    dimTimeMs: {
      title: "Dimming time",
      unit: "ms",
      type: "integer",
      exclusiveMinimum: 0,
      default: 5000,
      description:
        "Time for a 0–100% relative dimming transition (DPT 3.007); smaller steps take less time.",
    },
    switchFadeMs: {
      title: "Fade on switching",
      unit: "ms",
      expert: true,
      type: "integer",
      minimum: 0,
      default: 0,
      description:
        "Transition time when switching on or off (0 means immediate).",
    },
    sceneLearning: {
      title: "Scene storing",
      type: "boolean",
      default: true,
      description:
        "A scene control telegram with the learn bit (DPT 18.001) stores the current level as the scene; it replaces the configured preset until the simulation restarts.",
    },
    valueFadeMs: {
      title: "Fade on value",
      unit: "ms",
      expert: true,
      type: "integer",
      minimum: 0,
      default: 0,
      description:
        "Transition time to a received value (5.001) or scene preset.",
    },
    minLevelPct: {
      title: "Minimum level",
      unit: "%",
      expert: true,
      type: "number",
      minimum: 0,
      maximum: 50,
      default: 1,
      description: "Minimum relative dimming level.",
    },
    maxLevelPct: {
      title: "Maximum level",
      unit: "%",
      expert: true,
      type: "number",
      minimum: 50,
      maximum: 100,
      default: 100,
      description: "Upper limit for relative dimming and received values.",
    },
    dimSwitchesOn: {
      title: "Switch on by dimming",
      expert: true,
      type: "boolean",
      default: true,
      description: "An increase command turns on a channel that is off.",
    },
    dimSwitchesOff: {
      title: "Switch off by dimming",
      expert: true,
      type: "boolean",
      default: false,
      description:
        "A decrease command may dim to off; otherwise it stops at the minimum level.",
    },
    valueSwitchesOn: {
      title: "Switch on by brightness value",
      expert: true,
      type: "boolean",
      default: true,
      description:
        "A brightness value above 0 turns on a channel that is off; otherwise the value is ignored while the channel is off.",
    },
    valueSwitchesOff: {
      title: "Switch off by brightness value",
      expert: true,
      type: "boolean",
      default: true,
      description:
        "A brightness value of 0 turns the channel off; otherwise the channel dims to its minimum level.",
    },
    statusDelayMs: {
      title: "Status feedback delay",
      unit: "ms",
      expert: true,
      type: "integer",
      minimum: 0,
      default: 300,
      description:
        "Delay before sending status feedback (ms), after a transition completes.",
    },
    busFailure: {
      title: "On bus voltage failure",
      type: "string",
      enum: ["unchanged", "off", "level"],
      enumTitles: ["Unchanged", "Off", "Fixed level"],
      default: "unchanged",
      description:
        "Level of the channel when the bus voltage fails; it is then kept until the voltage returns.",
    },
    busFailureLevelPct: {
      title: "Level on bus voltage failure",
      unit: "%",
      type: "number",
      minimum: 0,
      maximum: 100,
      default: 100,
      description: "Level set when the bus voltage fails, with “Fixed level”.",
    },
    busRecovery: {
      title: "On bus voltage recovery",
      type: "string",
      enum: ["previous", "off", "on"],
      enumTitles: ["Level before the failure", "Off", "On"],
      default: "previous",
      description:
        "Level of the channel when the bus voltage returns (on: the switch-on level); the status feedback is then sent.",
    },
    minColourK: {
      title: "Warmest colour temperature",
      expert: true,
      type: "integer",
      minimum: 1000,
      maximum: 10000,
      default: 2700,
      description:
        "Lowest colour temperature (K) of a tunable white channel; lower requests are limited to it.",
    },
    maxColourK: {
      title: "Coldest colour temperature",
      expert: true,
      type: "integer",
      minimum: 1000,
      maximum: 10000,
      default: 6500,
      description:
        "Highest colour temperature (K) of a tunable white channel; higher requests are limited to it.",
    },
  },
};

const channelInitialState: ParamSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    levelPct: {
      title: "Initial level",
      unit: "%",
      type: "number",
      minimum: 0,
      maximum: 100,
      default: 0,
      description: "Level of the output when the simulation starts; 0 is off.",
    },
    colourTemperatureK: {
      title: "Initial colour temperature",
      type: "integer",
      minimum: 1000,
      maximum: 10000,
      default: 4000,
      description:
        "Colour temperature (K) at start, for a channel with a colourTemperature object.",
    },
  },
};

export function base(
  description: string,
  extraPorts: BehaviorDefinition<DimmerState>["ports"],
  gateway = false,
): BehaviorDefinition<DimmerState> {
  return {
    description,
    channelParameters,
    channelInitialState,
    ports: {
      switch: {
        description: "Switching command of the channel (0 = off, 1 = on).",
        drivesLoad: true,
        dpts: ["1.001"],
        channel: "required",
        title: "Switch",
        direction: "in",
      },
      dim: {
        description:
          "Relative dimming (3.007): direction bit and step size 1–7; 0 stops dimming.",
        drivesLoad: true,
        dpts: ["3.007"],
        channel: "required",
        title: "Dimming",
        direction: "in",
      },
      value: {
        description: "Brightness value in percent (5.001); zero switches off.",
        drivesLoad: true,
        dpts: ["5.001"],
        channel: "required",
        title: "Value",
        direction: "in",
      },
      status: {
        description: "Switching status of the channel, sent after each change.",
        defaultFlags: { R: true },
        telegram: "state",
        dpts: ["1.001"],
        channel: "required",
        title: "Status",
        direction: "out",
      },
      valueStatus: {
        description: "Brightness value (5.001), sent after a transition.",
        defaultFlags: { R: true },
        dpts: ["5.001"],
        channel: "required",
        title: "Value status",
        direction: "out",
      },
      scene: {
        drivesLoad: true,
        dpts: ["17.001", "18.001"],
        channel: "optional",
        title: "Scene",
        direction: "in",
        description:
          "scene number (17.001), or scene control (18.001) whose learn bit stores the current level",
      },
      ...extraPorts,
    },
    output: "dim",
    createState(d) {
      const channels: Record<string, DimChannelState> = {};
      d.channels.forEach((c) => {
        const lvl =
          typeof c.initialState.levelPct === "number"
            ? c.initialState.levelPct
            : 0;
        channels[c.id] = {
          from: lvl,
          target: lvl,
          startMs: 0,
          fadeMs: 0,
          last: lvl || 100,
          failures: 0,
          kelvin: d.objects.some(
            (o) => o.port === "colourTemperature" && o.channel === c.id,
          )
            ? num(c.initialState.colourTemperatureK, 4000)
            : null,
          learned: {},
          beforeFailure: null,
        };
      });
      return { channels, gateway };
    },
    onInit(ctx) {
      ctx.device.channels.forEach((c) => {
        const st = ctx.state.channels[c.id]!;
        ctx.setOutput(c.id, output(st, 0));
        objectsOf(ctx, "colourTemperatureStatus", c.id).forEach((o) =>
          st.kelvin === null ? undefined : ctx.setObject(o.id, st.kelvin),
        );
        objectsOf(ctx, "status", c.id).forEach((o) =>
          ctx.setObject(o.id, st.target > 0 ? 1 : 0),
        );
        objectsOf(ctx, "valueStatus", c.id).forEach((o) =>
          ctx.setObject(o.id, st.target),
        );
      });
      if (isGateway(ctx)) {
        poll(ctx, false);
        // Bridges periodically interrogate their ballasts.
        ctx.schedule("poll", num(ctx.device.parameters.pollMs, 2000));
      }
    },
    onObjectWrite(ctx, e) {
      const o = ctx.device.objects.find((x) => x.id === e.objectId);
      if (!o) return;
      const all = ctx.device.channels.map((c) => c.id);
      if (o.port === "broadcastSwitch") {
        ctx.note(
          ctx.t`DALI: broadcast ← ${e.newValue ? ctx.t`RECALL MAX LEVEL` : ctx.t`OFF`}`,
        );
        all.forEach((ch) => go(ctx, ch, e.newValue ? 100 : 0, 0));
        return;
      }
      if (o.port === "broadcastValue") {
        ctx.note(
          ctx.t`DALI: broadcast ← DAPC ${daliArcLevel(e.newValue)} (${Math.round(e.newValue)} %)`,
        );
        all.forEach((ch) => go(ctx, ch, e.newValue, 0));
        return;
      }
      if (o.port === "scene")
        return scene(ctx, o.channel ? [o.channel] : all, e.newValue, o.dpt);
      if (!o.channel) return;
      if (o.port === "switch") switchCh(ctx, o.channel, e.newValue !== 0);
      else if (o.port === "dim") dim(ctx, o.channel, e.newValue);
      else if (o.port === "value") setValue(ctx, o.channel, e.newValue);
      else if (o.port === "colourTemperature")
        setColour(ctx, o.channel, e.newValue);
    },
    onBusFailure(ctx) {
      ctx.device.channels.forEach((c) => {
        const st = ctx.state.channels[c.id];
        if (!st) return;
        st.beforeFailure = levelAt(st, ctx.timeMs);
        const p = params(ctx, c.id);
        if (p.busFailure === "off") go(ctx, c.id, 0, 0);
        else if (p.busFailure === "level")
          go(ctx, c.id, num(p.busFailureLevelPct, 100), 0);
        else go(ctx, c.id, st.beforeFailure, 0); // a fade in progress stops
      });
    },
    onBusRecovery(ctx) {
      ctx.device.channels.forEach((c) => {
        const st = ctx.state.channels[c.id];
        if (!st) return;
        const a = params(ctx, c.id).busRecovery ?? "previous";
        if (a === "on" || a === "off") switchCh(ctx, c.id, a === "on");
        else go(ctx, c.id, st.beforeFailure ?? levelAt(st, ctx.timeMs), 0);
        st.beforeFailure = null;
        // The actuator reports its state after a restart.
        publish(ctx, c.id);
      });
      // The gateway polls its ballasts again, from a first poll on restart.
      if (isGateway(ctx)) {
        poll(ctx, true);
        ctx.schedule("poll", num(ctx.device.parameters.pollMs, 2000));
      }
    },
    onTimer(ctx, key) {
      if (key === "poll") {
        poll(ctx, true);
        ctx.schedule("poll", num(ctx.device.parameters.pollMs, 2000));
        return;
      }
      const [ch, what] = key.split(":");
      if (!ch) return;
      if (what === "end") publish(ctx, ch);
      else if (what === "colour")
        objectsOf(ctx, "colourTemperatureStatus", ch).forEach((o) =>
          ctx.transmit(o.id),
        );
      else if (what === "status") {
        objectsOf(ctx, "status", ch).forEach((o) => ctx.transmit(o.id));
        objectsOf(ctx, "valueStatus", ch).forEach((o) => ctx.transmit(o.id));
      }
    },
    channelState(state, ch): JsonObject {
      const st = state.channels[ch];
      return st
        ? {
            levelPct: st.target,
            fadeMs: st.fadeMs,
            failures: st.failures,
            colourTemperatureK: st.kelvin,
            learnedScenes: { ...st.learned },
          }
        : {};
    },
  };
}
