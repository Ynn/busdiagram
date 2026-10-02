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
  /** Wind alarm active: the shutter is raised and commands are ignored. */
  windLock: boolean;
  /** Lock object active: commands are ignored (the wind alarm keeps priority). */
  locked: boolean;
  /** Estimated position when the lock started, to return to it afterwards. */
  beforeLockPct: number | null;
  /** Estimated slat angle at the last reference point (0 % open, 100 % closed). */
  estimatedSlatPct: number;
  /** Duration of the slat rotation at the start of the current movement, ms. */
  slatPhaseMs: number;
  /** Target slat angle of a slat-only movement, or null. */
  targetSlatPct: number | null;
}

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

function publish(ctx: Ctx, ch: string) {
  const st = ctx.state.channels[ch]!;
  st.unpublished = false;
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

/** Lock object: commands ignored while it is 1; reactions at its start and its end. */
function lock(ctx: Ctx, ch: string, on: boolean) {
  const st = ctx.state.channels[ch];
  if (!st || st.locked === on) return;
  st.locked = on;
  const p = ctx.device.channels.find((c) => c.id === ch)?.parameters ?? {};
  if (on) {
    st.beforeLockPct = projectEstimate(
      st,
      ctx.timeMs,
      travelFor(params(ctx, ch), st.direction),
    );
    ctx.note(ctx.t`${ch}: locked, commands ignored`);
    if (!st.windLock) react(ctx, ch, p.lockStart, p.lockPositionPct);
    return;
  }
  ctx.note(ctx.t`${ch}: lock ended`);
  if (st.windLock) return;
  if (p.afterLock === "restore" && st.beforeLockPct !== null)
    requestTarget(ctx, ch, st.beforeLockPct);
  else react(ctx, ch, p.afterLock, 0);
}

function windAlarm(ctx: Ctx, ch: string, on: boolean) {
  const st = ctx.state.channels[ch];
  if (!st || st.windLock === on) return;
  st.windLock = on;
  if (on) {
    ctx.note(ctx.t`${ch}: wind alarm, shutter raised and locked`);
    requestTarget(ctx, ch, 0);
  } else ctx.note(ctx.t`${ch}: wind alarm ended, shutter released in place`);
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
          "Motor when the bus voltage fails: stopped, or driven to an end position (the estimate becomes that end position).",
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
        "1 raises the shutter and locks it against other commands; 0 releases it in place",
    },
    lock: {
      dpts: ["1.001"],
      channel: "required",
      title: "Lock",
      direction: "in",
      description:
        "1 locks the output: commands are ignored, with the reactions lockStart and afterLock; the wind alarm keeps priority.",
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
        windLock: false,
        locked: false,
        beforeLockPct: null,
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
      motor(ctx, c.id, null);
      const st = ctx.state.channels[c.id]!;
      ctx.device.objects
        .filter((o) => o.port === "positionStatus" && o.channel === c.id)
        .forEach((o) => ctx.setObject(o.id, st.estimatedPositionPct));
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
    if (o.port === "windAlarm") {
      (ch ? [ch] : ctx.device.channels.map((c) => c.id)).forEach((c) =>
        windAlarm(ctx, c, e.newValue === 1),
      );
      return;
    }
    if (o.port === "lock") {
      if (ch) lock(ctx, ch, e.newValue === 1);
      return;
    }
    const blocked = (c: string) =>
      ctx.state.channels[c]?.windLock || ctx.state.channels[c]?.locked;
    const locked = ch
      ? blocked(ch)
      : o.port === "scene" && ctx.device.channels.every((c) => blocked(c.id));
    if (locked) {
      ctx.note(
        ch && ctx.state.channels[ch]?.windLock
          ? ctx.t`${ch}: wind alarm active, command ignored`
          : ctx.t`${ch ?? o.id}: locked, command ignored`,
      );
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
      case "scene":
        applyScene(
          ctx,
          (ch ? [ch] : ctx.device.channels.map((c) => c.id)).filter(
            (c) => !blocked(c),
          ),
          e.newValue,
          o.dpt,
        );
        break;
    }
  },
  onBusFailure(ctx) {
    // The motors stop, or run to an end position: the device no longer tracks the
    // movement, so the estimate becomes that end position.
    ctx.device.channels.forEach((c) => {
      const st = ctx.state.channels[c.id];
      if (!st) return;
      const reaction = c.parameters.busFailure;
      if (haltMotion(ctx, c.id) && reaction !== "up" && reaction !== "down")
        ctx.note(ctx.t`${c.id}: stopped, bus voltage failure`);
      st.targetPct = null;
      if (reaction === "up" || reaction === "down") {
        motor(ctx, c.id, reaction);
        st.estimatedPositionPct = reaction === "up" ? 0 : 100;
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
      // An end position reached during the failure: the motor is switched off.
      motor(ctx, c.id, null);
      if (st.windLock || st.locked) return publish(ctx, c.id);
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
      windLock: st.windLock,
      locked: st.locked,
      learnedScenes: { ...st.learned },
    };
  },
};
