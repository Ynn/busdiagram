// ShutterActuator/v1: shutter actuator without sensor. It estimates position from
// its configured travel time and commands the motor (up/down/stop). The actual shutter,
// with its own travel time, is never copied into this estimate.
import { shutterLayout } from "./layout";
import { wiringWarnings } from "./rules";
import type {
  BehaviorContext,
  BehaviorDefinition,
  JsonObject,
  MotorDirection,
} from "../../knx/contracts";

type Phase = "idle" | "pending" | "moving";

interface ShutterChannelState {
  /** Scenes stored by a scene control telegram (DPT 18.001): scene → position %. */
  learned: Record<string, number>;
  /** Estimated position at the last reference point (movement start or stop). */
  estimatedPositionPct: number;
  phase: Phase;
  /** Direction logique (0 % = haut, 100 % = bas). */
  direction: "up" | "down" | null;
  targetPct: number | null;
  startedAtMs: number | null;
  stopAtMs: number | null;
  /** An effective movement was interrupted without any further publication of its position. */
  unpublished: boolean;
  /** Weather alarms received (or assumed by the monitoring). */
  alarms: Record<WeatherAlarm, boolean>;
  /** Forcing object: the output is held up or down. */
  forced: "up" | "down" | null;
  /** Lock object active: commands are ignored. */
  locked: boolean;
  /** Cause that holds the output, by priority: weather alarm, forcing, lock; or null. */
  control: Control | null;
  /** Estimated position when a cause took the output, to return to it afterwards. */
  beforeControlPct: number | null;
  /** Stored positions 1 to 4 (%), from the parameters, changed by the store objects. */
  presets: number[];
  /** Last end-position states sent: [upper, lower]. */
  limits: [number | null, number | null];
  /** Estimated slat angle at the last reference point (0 % open, 100 % closed). */
  estimatedSlatPct: number;
  /** Duration of the slat rotation at the start of the current movement, ms. */
  slatPhaseMs: number;
  /** Target slat angle of a slat-only movement, or null. */
  targetSlatPct: number | null;
}

const WEATHER = ["wind", "rain", "frost"] as const;
type WeatherAlarm = (typeof WEATHER)[number];
type Control = WeatherAlarm | "forced" | "lock";

export interface ShutterState {
  channels: Record<string, ShutterChannelState>;
}

type Ctx = BehaviorContext<ShutterState>;

const EPS = 1e-6;
const clamp = (v: number) => Math.min(100, Math.max(0, v));

interface Params {
  /** Configured travel time downwards (closing), and upwards when not set separately. */
  estimatedTravelTimeMs: number;
  /** Configured travel time upwards (opening). */
  estimatedTravelTimeUpMs: number;
  startDelayMs: number;
  statusDelayMs: number;
  stepPct: number;
  endSupplementPct: number;
  invertOutput: boolean;
  /** Configured slat rotation time; 0 for a roller shutter without slats. */
  slatTravelMs: number;
  slatStepPct: number;
}

function params(ctx: Ctx, ch: string): Params {
  const p = ctx.device.channels.find((c) => c.id === ch)?.parameters ?? {};
  return {
    estimatedTravelTimeMs: Number(p.estimatedTravelTimeMs),
    estimatedTravelTimeUpMs: Number(
      p.estimatedTravelTimeUpMs ?? p.estimatedTravelTimeMs,
    ),
    startDelayMs: Number(p.startDelayMs ?? 300),
    statusDelayMs: Number(p.statusDelayMs ?? 300),
    stepPct: Number(p.stepPct ?? 0),
    endSupplementPct: Number(p.endSupplementPct ?? 0),
    invertOutput: p.invertOutput === true,
    slatTravelMs: Math.max(0, Number(p.slatTravelMs ?? 0)),
    slatStepPct: Number(p.slatStepPct ?? 20),
  };
}

/** Configured travel time for a direction. */
const travelFor = (
  p: Pick<Params, "estimatedTravelTimeMs" | "estimatedTravelTimeUpMs">,
  direction: "up" | "down" | null,
) => (direction === "up" ? p.estimatedTravelTimeUpMs : p.estimatedTravelTimeMs);

/** Estimation projected at the moment `timeMs`, without changing the state. */
export function projectEstimate(
  st: ShutterChannelState,
  timeMs: number,
  travelMs: number,
): number {
  if (st.phase !== "moving" || st.startedAtMs === null || !st.direction)
    return st.estimatedPositionPct;
  const sign = st.direction === "down" ? 1 : -1;
  // The blind moves only after the slat rotation phase.
  const moving = Math.max(0, timeMs - st.startedAtMs - (st.slatPhaseMs ?? 0));
  return clamp(st.estimatedPositionPct + (sign * moving * 100) / travelMs);
}

/** Slat angle projected at `timeMs`. */
export function projectSlat(
  st: ShutterChannelState,
  timeMs: number,
  slatTravelMs: number,
): number {
  if (
    slatTravelMs <= 0 ||
    st.phase !== "moving" ||
    st.startedAtMs === null ||
    !st.direction
  )
    return st.estimatedSlatPct;
  const sign = st.direction === "down" ? 1 : -1;
  const turning = Math.min(timeMs - st.startedAtMs, st.slatPhaseMs);
  return clamp(st.estimatedSlatPct + (sign * turning * 100) / slatTravelMs);
}

function motor(ctx: Ctx, ch: string, dir: "up" | "down" | null) {
  let d: MotorDirection = dir ?? "stop";
  if (dir && params(ctx, ch).invertOutput) d = dir === "up" ? "down" : "up";
  ctx.setOutput(ch, { type: "motor", direction: d });
}

/** End-position objects: 1 at the top (upper) or at the bottom (lower), sent on change. */
function sendLimits(ctx: Ctx, ch: string) {
  const st = ctx.state.channels[ch]!;
  const values: [number, number] = [
    st.estimatedPositionPct <= EPS ? 1 : 0,
    st.estimatedPositionPct >= 100 - EPS ? 1 : 0,
  ];
  (["upperLimit", "lowerLimit"] as const).forEach((port, i) => {
    if (st.limits[i] === values[i]) return;
    st.limits[i] = values[i]!;
    ctx.device.objects
      .filter((o) => o.port === port && o.channel === ch)
      .forEach((o) => {
        ctx.setObject(o.id, values[i]!);
        ctx.transmit(o.id);
      });
  });
}

function publish(ctx: Ctx, ch: string) {
  const st = ctx.state.channels[ch]!;
  st.unpublished = false;
  sendLimits(ctx, ch);
  const objs = ctx.device.objects.filter(
    (o) => o.port === "positionStatus" && o.channel === ch,
  );
  const slatObjs = ctx.device.objects.filter(
    (o) => o.port === "slatStatus" && o.channel === ch,
  );
  if (!objs.length && !slatObjs.length) return;
  objs.forEach((o) => ctx.setObject(o.id, st.estimatedPositionPct));
  ctx.device.objects
    .filter((o) => o.port === "slatStatus" && o.channel === ch)
    .forEach((o) => ctx.setObject(o.id, st.estimatedSlatPct));
  ctx.schedule(`${ch}:status`, params(ctx, ch).statusDelayMs);
}

/** Immediately stop an effective movement and freeze the estimate. Return true if it moves. */
function haltMotion(ctx: Ctx, ch: string): boolean {
  const st = ctx.state.channels[ch]!;
  ctx.cancel(`${ch}:start`);
  ctx.cancel(`${ch}:stop`);
  if (st.phase !== "moving") {
    st.phase = "idle";
    return false;
  }
  st.estimatedPositionPct = projectEstimate(
    st,
    ctx.timeMs,
    travelFor(params(ctx, ch), st.direction),
  );
  st.estimatedSlatPct = projectSlat(
    st,
    ctx.timeMs,
    params(ctx, ch).slatTravelMs,
  );
  st.targetSlatPct = null;
  st.phase = "idle";
  st.direction = null;
  st.startedAtMs = null;
  st.stopAtMs = null;
  motor(ctx, ch, null);
  return true;
}

function requestTarget(ctx: Ctx, ch: string, target: number) {
  const st = ctx.state.channels[ch];
  if (!st) return;
  target = clamp(target);
  if (
    st.phase === "moving" &&
    st.targetPct !== null &&
    Math.abs(st.targetPct - target) < EPS
  ) {
    ctx.note(
      ctx.t`${ch}: already moving to ${Math.round(target)} %, command has no effect`,
    );
    return;
  }
  // A new order replaces the departure, the stop and the publication still pending.
  ctx.cancel(`${ch}:status`);
  if (haltMotion(ctx, ch)) st.unpublished = true;
  st.targetPct = null;
  // Near an end stop, extra travel time runs the motor even when the estimate has already reached the target:
  // the mechanical end stop halts the actual shutter and corrects the estimate.
  const toEnd =
    (target === 0 || target === 100) && params(ctx, ch).endSupplementPct > 0;
  if (Math.abs(target - st.estimatedPositionPct) < EPS && !toEnd) {
    if (st.unpublished) publish(ctx, ch);
    return;
  }
  st.phase = "pending";
  st.targetPct = target;
  ctx.schedule(`${ch}:start`, params(ctx, ch).startDelayMs);
}

function stopOrStep(ctx: Ctx, ch: string, value: number) {
  const st = ctx.state.channels[ch];
  if (!st) return;
  if (st.phase === "pending" || st.phase === "moving") {
    ctx.cancel(`${ch}:status`);
    const moved = haltMotion(ctx, ch);
    st.targetPct = null;
    if (moved || st.unpublished) publish(ctx, ch);
    return;
  }
  const pr = params(ctx, ch);
  // Venetian blind at rest: a short press turns the slats by one step.
  if (pr.slatTravelMs > 0) {
    requestSlat(
      ctx,
      ch,
      st.estimatedSlatPct + (value ? pr.slatStepPct : -pr.slatStepPct),
    );
    return;
  }
  const step = pr.stepPct;
  if (step <= 0) {
    ctx.note(ctx.t`${ch}: shutter stopped, stop/step has no effect (no slats)`);
    return;
  }
  requestTarget(ctx, ch, st.estimatedPositionPct + (value ? step : -step));
}

/** Slat-only movement: turn the slats to an angle without moving the blind. */
function requestSlat(ctx: Ctx, ch: string, target: number) {
  const st = ctx.state.channels[ch];
  if (!st) return;
  if (params(ctx, ch).slatTravelMs <= 0) {
    ctx.note(ctx.t`${ch}: no slats configured, slat command ignored`);
    return;
  }
  target = clamp(target);
  ctx.cancel(`${ch}:status`);
  if (haltMotion(ctx, ch)) st.unpublished = true;
  if (Math.abs(target - st.estimatedSlatPct) < EPS) {
    if (st.unpublished) publish(ctx, ch);
    return;
  }
  st.phase = "pending";
  st.targetPct = st.estimatedPositionPct;
  st.targetSlatPct = target;
  ctx.schedule(`${ch}:start`, params(ctx, ch).startDelayMs);
}

function start(ctx: Ctx, ch: string) {
  const st = ctx.state.channels[ch]!;
  const target = st.targetPct;
  if (st.phase !== "pending" || target === null) return;
  const p = params(ctx, ch);
  if (st.targetSlatPct !== null) {
    const delta = st.targetSlatPct - st.estimatedSlatPct;
    st.phase = "moving";
    st.direction = delta > 0 ? "down" : "up";
    st.slatPhaseMs = Math.round((Math.abs(delta) * p.slatTravelMs) / 100);
    st.startedAtMs = ctx.timeMs;
    st.stopAtMs = ctx.timeMs + st.slatPhaseMs;
    motor(ctx, ch, st.direction);
    ctx.schedule(`${ch}:stop`, st.slatPhaseMs);
    return;
  }
  const toEnd = target === 0 || target === 100;
  const down = target > st.estimatedPositionPct || (target === 100 && toEnd);
  const travel = travelFor(p, down ? "down" : "up");
  const durationMs = Math.round(
    (Math.abs(target - st.estimatedPositionPct) / 100) * travel +
      (toEnd ? (p.endSupplementPct / 100) * travel : 0),
  );
  if (durationMs <= 0) {
    st.phase = "idle";
    st.estimatedPositionPct = target;
    publish(ctx, ch);
    return;
  }
  st.phase = "moving";
  st.direction = down ? "down" : "up";
  // A venetian blind first turns its slats to closed (down) or open (up).
  st.slatPhaseMs =
    p.slatTravelMs > 0
      ? Math.round(
          ((st.direction === "down"
            ? 100 - st.estimatedSlatPct
            : st.estimatedSlatPct) *
            p.slatTravelMs) /
            100,
        )
      : 0;
  st.startedAtMs = ctx.timeMs;
  st.stopAtMs = ctx.timeMs + durationMs + st.slatPhaseMs;
  motor(ctx, ch, st.direction);
  ctx.schedule(`${ch}:stop`, durationMs + st.slatPhaseMs);
}

function finish(ctx: Ctx, ch: string) {
  const st = ctx.state.channels[ch]!;
  if (st.phase !== "moving") return;
  // Stopping at the calculated deadline, even if the actual component did not reach the target.
  const target =
    st.targetPct ??
    projectEstimate(st, ctx.timeMs, travelFor(params(ctx, ch), st.direction));
  st.estimatedSlatPct =
    st.targetSlatPct ??
    projectSlat(st, ctx.timeMs, params(ctx, ch).slatTravelMs);
  st.targetSlatPct = null;
  st.phase = "idle";
  st.direction = null;
  st.startedAtMs = null;
  st.stopAtMs = null;
  st.estimatedPositionPct = target;
  st.targetPct = null;
  motor(ctx, ch, null);
  publish(ctx, ch);
}

/**
 * Scene telegram: move each channel to its preset, or, with the learn bit of a scene
 * control telegram (DPT 18.001), store the current estimated position as the scene.
 */
function applyScene(ctx: Ctx, channels: string[], raw: number, dpt: string) {
  const scene = (raw & 0x3f) + 1;
  if (dpt === "18.001" && raw & 0x80) {
    channels.forEach((ch) => {
      const st = ctx.state.channels[ch];
      if (!st) return;
      if (
        ctx.device.channels.find((c) => c.id === ch)?.parameters
          .sceneLearning === false
      ) {
        ctx.note(
          ctx.t`${ch}: scene storing disabled, scene ${scene} unchanged`,
        );
        return;
      }
      const pos = Math.round(
        projectEstimate(
          st,
          ctx.timeMs,
          travelFor(params(ctx, ch), st.direction),
        ),
      );
      st.learned[String(scene)] = pos;
      ctx.note(ctx.t`${ch}: scene ${scene} stored (${pos} %)`);
    });
    return;
  }
  channels.forEach((ch) => {
    const preset =
      ctx.state.channels[ch]?.learned[String(scene)] ??
      ctx.device.channels.find((c) => c.id === ch)?.scenes.get(scene);
    if (preset === undefined) {
      ctx.note(ctx.t`${ch}: no preset for scene ${scene}, command ignored`);
      return;
    }
    requestTarget(ctx, ch, preset);
  });
}

/** Reaction of an output: a movement, a stop, a position, or nothing. */
function react(ctx: Ctx, ch: string, reaction: unknown, positionPct: unknown) {
  switch (reaction) {
    case "up":
      return requestTarget(ctx, ch, 0);
    case "down":
      return requestTarget(ctx, ch, 100);
    case "stop":
      if (haltMotion(ctx, ch)) publish(ctx, ch);
      ctx.state.channels[ch]!.targetPct = null;
      return;
    case "position":
      return requestTarget(ctx, ch, Number(positionPct ?? 0));
  }
}

/** Weather alarms in their order of priority, highest first. */
function alarmOrder(ctx: Ctx, ch: string): WeatherAlarm[] {
  const order = String(
    ctx.device.channels.find((c) => c.id === ch)?.parameters.alarmPriority ??
      "wind,rain,frost",
  ).split(",");
  return order.filter((x): x is WeatherAlarm =>
    (WEATHER as readonly string[]).includes(x),
  );
}

/**
 * Cause holding the output: the first active one in the order of safetyPriority (weather
 * alarms, lock, forcing by default), the weather alarms in the order of alarmPriority.
 */
function controlOf(ctx: Ctx, ch: string): Control | null {
  const st = ctx.state.channels[ch]!;
  const order = String(
    ctx.device.channels.find((c) => c.id === ch)?.parameters.safetyPriority ??
      "alarms,lock,forced",
  ).split(",");
  for (const cause of order) {
    if (cause === "alarms") {
      const a = alarmOrder(ctx, ch).find((x) => st.alarms[x]);
      if (a) return a;
    } else if (cause === "lock" && st.locked) return "lock";
    else if (cause === "forced" && st.forced) return "forced";
  }
  return null;
}

/**
 * Apply the cause that now holds the output: its reaction when it takes over, or, when
 * every cause has ended, the reaction after the last one (stay, or return to the
 * position before the first cause).
 */
function updateControl(ctx: Ctx, ch: string) {
  const st = ctx.state.channels[ch]!;
  const p = ctx.device.channels.find((c) => c.id === ch)?.parameters ?? {};
  const before = st.control;
  const now = controlOf(ctx, ch);
  if (now === before) return;
  if (before === null)
    st.beforeControlPct = projectEstimate(
      st,
      ctx.timeMs,
      travelFor(params(ctx, ch), st.direction),
    );
  st.control = now;
  if (now === null) {
    const after =
      before === "lock"
        ? p.afterLock
        : before === "forced"
          ? p.afterForcing
          : p.afterAlarm;
    ctx.note(ctx.t`${ch}: released, commands accepted again`);
    if (after === "restore" && st.beforeControlPct !== null)
      requestTarget(ctx, ch, st.beforeControlPct);
    else react(ctx, ch, after, 0);
    st.beforeControlPct = null;
    return;
  }
  if (now === "forced") {
    ctx.note(
      st.forced === "up"
        ? ctx.t`${ch}: forced up, commands ignored`
        : ctx.t`${ch}: forced down, commands ignored`,
    );
    react(ctx, ch, st.forced, 0);
  } else if (now === "lock") {
    ctx.note(ctx.t`${ch}: locked, commands ignored`);
    react(ctx, ch, p.lockStart, p.lockPositionPct);
  } else {
    const defaults = { wind: "up", rain: "up", frost: "none" };
    ctx.note(
      now === "wind"
        ? ctx.t`${ch}: wind alarm, commands ignored`
        : now === "rain"
          ? ctx.t`${ch}: rain alarm, commands ignored`
          : ctx.t`${ch}: frost alarm, commands ignored`,
    );
    react(ctx, ch, p[`${now}Reaction`] ?? defaults[now], 0);
  }
}

/** Why commands are ignored, for the event log. */
function refusal(ctx: Ctx, ch: string): string {
  switch (ctx.state.channels[ch]!.control) {
    case "wind":
      return ctx.t`${ch}: wind alarm active, command ignored`;
    case "rain":
      return ctx.t`${ch}: rain alarm active, command ignored`;
    case "frost":
      return ctx.t`${ch}: frost alarm active, command ignored`;
    case "forced":
      return ctx.t`${ch}: forced, command ignored`;
    default:
      return ctx.t`${ch}: locked, command ignored`;
  }
}

/** Alarm objects of a channel (with that channel, or without channel). */
const alarmObjects = (ctx: Ctx, ch: string, kind: WeatherAlarm) =>
  ctx.device.objects.filter(
    (o) => o.port === `${kind}Alarm` && (o.channel === ch || !o.channel),
  );

/** Cyclic monitoring: without a telegram within the period, the alarm is assumed. */
function watchAlarms(ctx: Ctx, ch: string, kind?: WeatherAlarm) {
  const ms = Number(
    ctx.device.channels.find((c) => c.id === ch)?.parameters
      .alarmMonitoringMs ?? 0,
  );
  if (!(ms > 0)) return;
  for (const k of kind ? [kind] : WEATHER)
    if (alarmObjects(ctx, ch, k).length) ctx.schedule(`${ch}:watch:${k}`, ms);
}

function weatherAlarm(ctx: Ctx, ch: string, kind: WeatherAlarm, on: boolean) {
  const st = ctx.state.channels[ch];
  if (!st) return;
  watchAlarms(ctx, ch, kind);
  if (st.alarms[kind] === on) return;
  st.alarms[kind] = on;
  if (!on)
    ctx.note(
      kind === "wind"
        ? ctx.t`${ch}: wind alarm ended`
        : kind === "rain"
          ? ctx.t`${ch}: rain alarm ended`
          : ctx.t`${ch}: frost alarm ended`,
    );
  updateControl(ctx, ch);
}

export const shutterActuator: BehaviorDefinition<ShutterState> = {
  presentation: () => ({ receiver: true }),
  warnings: wiringWarnings,
  parameterLayout: shutterLayout,
  description:
    "Shutter actuator without sensor: position estimated from the configured travel time.",
  channelParameters: {
    type: "object",
    additionalProperties: false,
    required: ["estimatedTravelTimeMs"],
    properties: {
      estimatedTravelTimeMs: {
        title: "Configured travel time",
        unit: "ms",
        type: "integer",
        exclusiveMinimum: 0,
        description:
          "Travel time configured in the actuator (ms): downwards, and upwards unless estimatedTravelTimeUpMs is set.",
      },
      estimatedTravelTimeUpMs: {
        title: "Configured travel time up",
        unit: "ms",
        expert: true,
        type: "integer",
        exclusiveMinimum: 0,
        description:
          "Upward travel time configured in the actuator (ms), when it differs from the downward time; many actuators take separate times because a shutter rises more slowly than it falls.",
      },
      startDelayMs: {
        title: "Start delay",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 0,
        default: 300,
        description: "Delay before starting or reversing motion (ms).",
      },
      statusDelayMs: {
        title: "Position feedback delay",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 0,
        default: 300,
        description: "Delay before sending position feedback (ms).",
      },
      slatTravelMs: {
        title: "Configured slat rotation time",
        unit: "ms",
        type: "integer",
        minimum: 0,
        default: 0,
        description:
          "Venetian blind: time configured for the slats to turn from open to closed (ms). A movement first turns the slats; a short press at rest turns them by slatStepPct. 0 for a roller shutter without slats.",
      },
      slatStepPct: {
        title: "Slat step",
        unit: "%",
        expert: true,
        type: "number",
        minimum: 1,
        maximum: 100,
        default: 20,
        description: "Slat angle change for a short press at rest (%).",
      },
      stepPct: {
        title: "Stop/step increment",
        unit: "%",
        expert: true,
        type: "number",
        minimum: 0,
        maximum: 100,
        default: 0,
        description:
          "Position step for a stop/step command received at rest by a shutter without slats (%). 0 (default): no movement, as in the KNX stop/step function, where the step turns slats; some actuators move a roller shutter by this amount instead.",
      },
      endSupplementPct: {
        title: "End-of-travel supplement",
        unit: "%",
        expert: true,
        type: "number",
        minimum: 0,
        maximum: 50,
        default: 0,
        description:
          "Extra travel time toward 0% or 100%, as a percentage of full travel. The motor runs even if the estimate is already at the limit; the end stop recalibrates the estimate (often 5–10% on a real actuator).",
      },
      invertOutput: {
        title: "Inverted wiring",
        expert: true,
        type: "boolean",
        default: false,
        description:
          "Invert the up and down outputs to compensate a motor wired in reverse (shutter parameter wiringReversed). Without such wiring, enabling it makes the shutter move opposite to the commands.",
      },
      sceneLearning: {
        title: "Scene storing",
        type: "boolean",
        default: true,
        description:
          "A scene control telegram with the learn bit (DPT 18.001) stores the current estimated position as the scene; it replaces the configured preset until the simulation restarts.",
      },
      windReaction: {
        title: "On wind alarm",
        type: "string",
        enum: ["up", "down", "stop", "none"],
        enumTitles: ["Up", "Down", "Stop", "No movement"],
        default: "up",
        description:
          "Movement when the wind alarm starts; commands are then ignored until it ends.",
      },
      rainReaction: {
        title: "On rain alarm",
        type: "string",
        enum: ["up", "down", "stop", "none"],
        enumTitles: ["Up", "Down", "Stop", "No movement"],
        default: "up",
        description:
          "Movement when the rain alarm starts (an awning or a blind is usually raised).",
      },
      frostReaction: {
        title: "On frost alarm",
        type: "string",
        enum: ["up", "down", "stop", "none"],
        enumTitles: ["Up", "Down", "Stop", "No movement"],
        default: "none",
        description:
          "Movement when the frost alarm starts; a frozen shutter is usually left where it is.",
      },
      alarmPriority: {
        title: "Priority of the weather alarms",
        type: "string",
        enum: [
          "wind,rain,frost",
          "wind,frost,rain",
          "rain,wind,frost",
          "rain,frost,wind",
          "frost,wind,rain",
          "frost,rain,wind",
        ],
        enumTitles: [
          "Wind > Rain > Frost",
          "Wind > Frost > Rain",
          "Rain > Wind > Frost",
          "Rain > Frost > Wind",
          "Frost > Wind > Rain",
          "Frost > Rain > Wind",
        ],
        default: "wind,rain,frost",
        description:
          "Order of the weather alarms when several are active: the first one active applies.",
      },
      safetyPriority: {
        title: "Priority of the safety functions",
        type: "string",
        enum: [
          "alarms,lock,forced",
          "alarms,forced,lock",
          "lock,alarms,forced",
          "lock,forced,alarms",
          "forced,lock,alarms",
          "forced,alarms,lock",
        ],
        enumTitles: [
          "Weather alarms > Lock > Forcing",
          "Weather alarms > Forcing > Lock",
          "Lock > Weather alarms > Forcing",
          "Lock > Forcing > Weather alarms",
          "Forcing > Lock > Weather alarms",
          "Forcing > Weather alarms > Lock",
        ],
        default: "alarms,lock,forced",
        description:
          "Order of the weather alarms, the lock, and forcing when several are active: the first one active holds the output, and commands are ignored.",
      },
      alarmMonitoringMs: {
        title: "Monitoring of the alarm objects",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 0,
        default: 0,
        description:
          "Weather sensors send their alarm cyclically: without a telegram on an alarm object within this time, the alarm is assumed (0: no monitoring).",
      },
      afterAlarm: {
        title: "After the weather alarms",
        type: "string",
        enum: ["none", "up", "down", "restore"],
        enumTitles: ["No movement", "Up", "Down", "Position before the alarm"],
        default: "none",
        description: "Movement when the last weather alarm ends.",
      },
      afterForcing: {
        title: "End of forcing",
        type: "string",
        enum: ["none", "up", "down", "restore"],
        enumTitles: [
          "No movement",
          "Up",
          "Down",
          "Position before the forcing",
        ],
        default: "none",
        description:
          "Movement when the forcing ends (0 or 1 on the forcing object).",
      },
      preset1Pct: {
        title: "Stored position 1",
        unit: "%",
        type: "number",
        minimum: 0,
        maximum: 100,
        default: 20,
        description: "Position recalled by 0 on the object of positions 1/2.",
      },
      preset2Pct: {
        title: "Stored position 2",
        unit: "%",
        type: "number",
        minimum: 0,
        maximum: 100,
        default: 40,
        description: "Position recalled by 1 on the object of positions 1/2.",
      },
      preset3Pct: {
        title: "Stored position 3",
        unit: "%",
        type: "number",
        minimum: 0,
        maximum: 100,
        default: 60,
        description: "Position recalled by 0 on the object of positions 3/4.",
      },
      preset4Pct: {
        title: "Stored position 4",
        unit: "%",
        type: "number",
        minimum: 0,
        maximum: 100,
        default: 80,
        description: "Position recalled by 1 on the object of positions 3/4.",
      },
      presetStoring: {
        title: "Storing of the positions",
        type: "boolean",
        default: true,
        description:
          "The store objects replace a stored position with the current estimated position, until the simulation restarts.",
      },
      lockStart: {
        title: "When locked",
        type: "string",
        enum: ["none", "up", "down", "stop", "position"],
        enumTitles: ["No reaction", "Up", "Down", "Stop", "Position"],
        default: "none",
        description:
          "Movement when the lock object receives 1; the wind alarm keeps priority.",
      },
      lockPositionPct: {
        title: "Position when locked",
        unit: "%",
        type: "number",
        minimum: 0,
        maximum: 100,
        default: 0,
        description: "Position reached when the lock starts, with “Position”.",
      },
      afterLock: {
        title: "When unlocked",
        type: "string",
        enum: ["none", "up", "down", "restore"],
        enumTitles: ["No reaction", "Up", "Down", "Position before the lock"],
        default: "none",
        description: "Movement when the lock object receives 0.",
      },
      busFailure: {
        title: "On bus voltage failure",
        type: "string",
        enum: ["stop", "up", "down"],
        enumTitles: ["Stop", "Up", "Down"],
        default: "stop",
        description:
          "Motor when the bus voltage fails: stopped, or driven toward an end position until the voltage returns; the estimated position follows the time elapsed.",
      },
      busRecovery: {
        title: "On bus voltage recovery",
        type: "string",
        enum: ["none", "up", "down", "position"],
        enumTitles: ["No movement", "Up", "Down", "Position"],
        default: "none",
        description:
          "Movement when the bus voltage returns; the estimated position is sent in any case.",
      },
      busRecoveryPositionPct: {
        title: "Position on bus recovery",
        unit: "%",
        type: "number",
        minimum: 0,
        maximum: 100,
        default: 0,
        description: "Position reached on bus recovery, with “Position”.",
      },
    },
  },
  channelInitialState: {
    type: "object",
    additionalProperties: false,
    properties: {
      estimatedPositionPct: {
        title: "Estimated position at start",
        unit: "%",
        type: "number",
        minimum: 0,
        maximum: 100,
        default: 0,
        description:
          "Position the actuator assumes at start (0 = fully open, 100 = fully closed); the connected shutter starts at its own position.",
      },
      estimatedSlatPct: {
        title: "Estimated slat angle at start",
        unit: "%",
        type: "number",
        minimum: 0,
        maximum: 100,
        default: 0,
        description:
          "Slat angle the actuator assumes at start (venetian blinds).",
      },
    },
  },
  ports: {
    move: {
      description: "Up/down: 0 raises toward 0 %, 1 lowers toward 100 %.",
      drivesLoad: true,
      dpts: ["1.008"],
      channel: "required",
      title: "Up/down",
      direction: "in",
    },
    stopStep: {
      description:
        "Stop when moving; otherwise one step of stepPct (0 up, 1 down).",
      drivesLoad: true,
      dpts: ["1.007"],
      channel: "required",
      title: "Stop/step",
      direction: "in",
    },
    positionCommand: {
      description: "Target position in percent.",
      drivesLoad: true,
      dpts: ["5.001"],
      channel: "required",
      title: "Position setpoint",
      direction: "in",
    },
    positionStatus: {
      description: "Estimated position, sent after stopping.",
      defaultFlags: { R: true },
      telegram: "state",
      dpts: ["5.001"],
      channel: "required",
      title: "Position feedback",
      direction: "out",
    },
    scene: {
      drivesLoad: true,
      dpts: ["17.001", "18.001"],
      channel: "optional",
      title: "Scene",
      direction: "in",
      description:
        "scene number (17.001), or scene control (18.001) whose learn bit stores the current position",
    },
    slatCommand: {
      dpts: ["5.001"],
      channel: "required",
      title: "Slat angle setpoint",
      direction: "in",
      description: "slat angle (0 % open, 100 % closed) of a venetian blind",
    },
    slatStatus: {
      dpts: ["5.001"],
      channel: "required",
      title: "Slat angle feedback",
      direction: "out",
      description: "estimated slat angle, sent after stopping",
    },
    windAlarm: {
      dpts: ["1.005", "1.001"],
      channel: "optional",
      title: "Wind alarm",
      direction: "in",
      description:
        "1 starts the wind alarm (windReaction, up by default): commands are ignored until 0; without channel, applies to all channels",
    },
    lock: {
      dpts: ["1.001"],
      channel: "required",
      title: "Lock",
      direction: "in",
      description:
        "1 locks the output: commands are ignored, with the reactions lockStart and afterLock; weather alarms and forcing keep priority.",
    },
    rainAlarm: {
      dpts: ["1.005", "1.001"],
      channel: "optional",
      title: "Rain alarm",
      direction: "in",
      description: "1 starts the rain alarm (rainReaction); 0 ends it",
    },
    frostAlarm: {
      dpts: ["1.005", "1.001"],
      channel: "optional",
      title: "Frost alarm",
      direction: "in",
      description: "1 starts the frost alarm (frostReaction); 0 ends it",
    },
    forced: {
      dpts: ["2.001"],
      channel: "required",
      title: "Forcing",
      direction: "in",
      description:
        "3 forces down, 2 forces up; 0 or 1 ends the forcing (afterForcing). Weather alarms keep priority.",
    },
    recallPosition12: {
      dpts: ["1.001", "1.002"],
      channel: "required",
      title: "Positions 1/2",
      direction: "in",
      description:
        "0 moves to the stored position 1, 1 to the stored position 2",
    },
    recallPosition34: {
      dpts: ["1.001", "1.002"],
      channel: "required",
      title: "Positions 3/4",
      direction: "in",
      description:
        "0 moves to the stored position 3, 1 to the stored position 4",
    },
    storePosition12: {
      dpts: ["1.001", "1.002"],
      channel: "required",
      title: "Store positions 1/2",
      direction: "in",
      description:
        "0 stores the current position as position 1, 1 as position 2",
    },
    storePosition34: {
      dpts: ["1.001", "1.002"],
      channel: "required",
      title: "Store positions 3/4",
      direction: "in",
      description:
        "0 stores the current position as position 3, 1 as position 4",
    },
    upperLimit: {
      dpts: ["1.002", "1.001"],
      channel: "required",
      title: "Upper end position",
      direction: "out",
      description:
        "1 when the shutter is estimated at the top (0 %), sent on change",
      defaultFlags: { R: true },
      telegram: "state",
    },
    lowerLimit: {
      dpts: ["1.002", "1.001"],
      channel: "required",
      title: "Lower end position",
      direction: "out",
      description:
        "1 when the shutter is estimated at the bottom (100 %), sent on change",
      defaultFlags: { R: true },
      telegram: "state",
    },
  },
  output: "motor",
  createState(d) {
    const channels: Record<string, ShutterChannelState> = {};
    d.channels.forEach((c) => {
      channels[c.id] = {
        estimatedPositionPct: Number(c.initialState.estimatedPositionPct ?? 0),
        phase: "idle",
        direction: null,
        targetPct: null,
        startedAtMs: null,
        stopAtMs: null,
        unpublished: false,
        alarms: { wind: false, rain: false, frost: false },
        forced: null,
        locked: false,
        control: null,
        beforeControlPct: null,
        presets: [1, 2, 3, 4].map((n) =>
          Number(c.parameters[`preset${n}Pct`] ?? n * 20),
        ),
        limits: [null, null],
        learned: {},
        estimatedSlatPct: Number(c.initialState.estimatedSlatPct ?? 0),
        slatPhaseMs: 0,
        targetSlatPct: null,
      };
    });
    return { channels };
  },
  onInit(ctx) {
    ctx.device.channels.forEach((c) => {
      watchAlarms(ctx, c.id);
      motor(ctx, c.id, null);
      const st = ctx.state.channels[c.id]!;
      ctx.device.objects
        .filter((o) => o.port === "positionStatus" && o.channel === c.id)
        .forEach((o) => ctx.setObject(o.id, st.estimatedPositionPct));
      // End positions: known from the start too, without sending.
      const ends: [string, number][] = [
        ["upperLimit", st.estimatedPositionPct <= EPS ? 1 : 0],
        ["lowerLimit", st.estimatedPositionPct >= 100 - EPS ? 1 : 0],
      ];
      ends.forEach(([port, v], i) => {
        st.limits[i] = v;
        ctx.device.objects
          .filter((o) => o.port === port && o.channel === c.id)
          .forEach((o) => ctx.setObject(o.id, v));
      });
      // The slat angle is known from the start too (a read answers it).
      ctx.device.objects
        .filter((o) => o.port === "slatStatus" && o.channel === c.id)
        .forEach((o) => ctx.setObject(o.id, st.estimatedSlatPct));
    });
  },
  onObjectWrite(ctx, e) {
    const o = ctx.device.objects.find((x) => x.id === e.objectId);
    if (!o) return;
    const ch = o.channel;
    const all = ch ? [ch] : ctx.device.channels.map((c) => c.id);
    const kind = WEATHER.find((k) => o.port === `${k}Alarm`);
    if (kind) {
      all.forEach((c) => weatherAlarm(ctx, c, kind, e.newValue === 1));
      return;
    }
    if (o.port === "lock" || o.port === "forced") {
      if (!ch) return;
      const st = ctx.state.channels[ch]!;
      if (o.port === "lock") st.locked = e.newValue === 1;
      // 2.001: control bit and value; 3 forces down, 2 forces up, 0 or 1 ends forcing.
      else st.forced = e.newValue & 2 ? (e.newValue & 1 ? "down" : "up") : null;
      if (o.port === "lock" && !st.locked && st.control !== "lock")
        ctx.note(ctx.t`${ch}: lock ended`);
      updateControl(ctx, ch);
      return;
    }
    if (o.port === "storePosition12" || o.port === "storePosition34") {
      if (!ch) return;
      const n = (o.port === "storePosition12" ? 1 : 3) + (e.newValue ? 1 : 0);
      if (
        ctx.device.channels.find((c) => c.id === ch)?.parameters
          .presetStoring === false
      ) {
        ctx.note(
          ctx.t`${ch}: storing positions disabled, position ${n} unchanged`,
        );
        return;
      }
      const st = ctx.state.channels[ch]!;
      const pos = Math.round(
        projectEstimate(
          st,
          ctx.timeMs,
          travelFor(params(ctx, ch), st.direction),
        ),
      );
      st.presets[n - 1] = pos;
      ctx.note(ctx.t`${ch}: position ${n} stored (${pos} %)`);
      return;
    }
    const held = (c: string) => ctx.state.channels[c]?.control != null;
    if (ch ? held(ch) : o.port === "scene" && all.every(held)) {
      ctx.note(ch ? refusal(ctx, ch) : ctx.t`${o.id}: locked, command ignored`);
      return;
    }
    switch (o.port) {
      case "move":
        if (ch) requestTarget(ctx, ch, e.newValue ? 100 : 0);
        break;
      case "positionCommand":
        if (ch) requestTarget(ctx, ch, e.newValue);
        break;
      case "stopStep":
        if (ch) stopOrStep(ctx, ch, e.newValue);
        break;
      case "slatCommand":
        if (ch) requestSlat(ctx, ch, e.newValue);
        break;
      case "recallPosition12":
      case "recallPosition34":
        if (ch) {
          const n =
            (o.port === "recallPosition12" ? 1 : 3) + (e.newValue ? 1 : 0);
          ctx.note(ctx.t`${ch}: to stored position ${n}`);
          requestTarget(ctx, ch, ctx.state.channels[ch]!.presets[n - 1]!);
        }
        break;
      case "scene":
        applyScene(
          ctx,
          all.filter((c) => !held(c)),
          e.newValue,
          o.dpt,
        );
        break;
    }
  },
  onBusFailure(ctx) {
    // The motors stop, or run toward an end position until the voltage returns: the
    // estimate then follows the time actually elapsed, as for any movement.
    ctx.device.channels.forEach((c) => {
      const st = ctx.state.channels[c.id];
      if (!st) return;
      const reaction = c.parameters.busFailure;
      if (haltMotion(ctx, c.id) && reaction !== "up" && reaction !== "down")
        ctx.note(ctx.t`${c.id}: stopped, bus voltage failure`);
      st.targetPct = null;
      if (reaction === "up" || reaction === "down") {
        const p = params(ctx, c.id);
        st.phase = "moving";
        st.direction = reaction;
        st.targetPct = reaction === "up" ? 0 : 100;
        st.slatPhaseMs =
          p.slatTravelMs > 0
            ? Math.round(
                ((reaction === "down"
                  ? 100 - st.estimatedSlatPct
                  : st.estimatedSlatPct) *
                  p.slatTravelMs) /
                  100,
              )
            : 0;
        st.startedAtMs = ctx.timeMs;
        // No stop deadline: the device is off; the end stop halts the real shutter.
        st.stopAtMs = null;
        motor(ctx, c.id, reaction);
        ctx.note(
          reaction === "up"
            ? ctx.t`${c.id}: bus voltage failure, shutter raised`
            : ctx.t`${c.id}: bus voltage failure, shutter lowered`,
        );
      }
    });
  },
  onBusRecovery(ctx) {
    ctx.device.channels.forEach((c) => {
      const st = ctx.state.channels[c.id];
      if (!st) return;
      // A movement started by the failure ends: the estimate covers the time elapsed.
      if (st.phase === "moving") haltMotion(ctx, c.id);
      else motor(ctx, c.id, null);
      st.targetPct = null;
      watchAlarms(ctx, c.id);
      if (st.control !== null) return publish(ctx, c.id);
      if (c.parameters.busRecovery && c.parameters.busRecovery !== "none")
        react(
          ctx,
          c.id,
          c.parameters.busRecovery,
          c.parameters.busRecoveryPositionPct,
        );
      else publish(ctx, c.id);
    });
  },
  onTimer(ctx, key) {
    const [ch, what] = key.split(":");
    if (!ch) return;
    const watched = key.split(":")[2] as WeatherAlarm | undefined;
    if (what === "watch" && watched) {
      // No telegram from the alarm sensor within the period: the alarm is assumed.
      ctx.note(
        watched === "wind"
          ? ctx.t`${ch}: no telegram on the wind alarm in time, alarm assumed`
          : watched === "rain"
            ? ctx.t`${ch}: no telegram on the rain alarm in time, alarm assumed`
            : ctx.t`${ch}: no telegram on the frost alarm in time, alarm assumed`,
      );
      const st = ctx.state.channels[ch];
      if (st && !st.alarms[watched]) {
        st.alarms[watched] = true;
        updateControl(ctx, ch);
      }
      return;
    }
    if (what === "start") start(ctx, ch);
    else if (what === "stop") finish(ctx, ch);
    else if (what === "status")
      ctx.device.objects
        .filter(
          (o) =>
            (o.port === "positionStatus" || o.port === "slatStatus") &&
            o.channel === ch,
        )
        .forEach((o) => ctx.transmit(o.id));
  },
  channelState(state, ch, timeMs, device): JsonObject {
    const st = state.channels[ch];
    if (!st) return {};
    const cp = device.channels.find((c) => c.id === ch)?.parameters;
    const down = Number(cp?.estimatedTravelTimeMs);
    const travel = travelFor(
      {
        estimatedTravelTimeMs: down,
        estimatedTravelTimeUpMs: Number(cp?.estimatedTravelTimeUpMs ?? down),
      },
      st.direction,
    );
    return {
      estimatedPositionPct: projectEstimate(st, timeMs, travel),
      estimatedSlatPct: projectSlat(
        st,
        timeMs,
        Math.max(0, Number(cp?.slatTravelMs ?? 0)),
      ),
      phase: st.phase,
      direction: st.direction,
      targetPct: st.targetPct,
      startedAtMs: st.startedAtMs,
      stopAtMs: st.stopAtMs,
      safety: st.control,
      alarms: { ...st.alarms },
      presets: [...st.presets],
      locked: st.locked,
      learnedScenes: { ...st.learned },
    };
  },
};
