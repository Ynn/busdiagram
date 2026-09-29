// Non-KNX equipment models: pure code without GA, DPT, or engine references.
import type {
  EquipmentDefinition,
  JsonObject,
  MotorDirection,
} from "../knx/contracts";

export interface LampState extends JsonObject {
  on: boolean;
}

export const lamp: EquipmentDefinition<LampState> = {
  title: "Lamp",
  description: "Lamp: lit while the relay output is closed.",
  accepts: "switch",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      powerW: {
        title: "Rated power",
        type: "number",
        minimum: 0,
        maximum: 100000,
        default: 60,
        description:
          "Electrical power (W) drawn while the lamp is on; used by metering actuators. Any switched load can be represented with a matching power.",
      },
    },
  },
  powerW: (s, p) => (s.on ? Number(p.powerW ?? 60) : 0),
  initialState: {
    type: "object",
    additionalProperties: false,
    properties: {
      on: { title: "On at start", type: "boolean", default: false },
    },
  },
  create: (_p, init) => ({ on: init.on === true }),
  applyCommand: (s, c) =>
    c.type === "switch" && c.on !== s.on ? { on: c.on } : s,
};

/** Switched electrical appliance (oven, water heater, socket), described by its power. */
export const appliance: EquipmentDefinition<LampState> = {
  title: "Appliance",
  description:
    "Electrical appliance on a switched output (oven, water heater, socket): draws its rated power while powered.",
  accepts: "switch",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      powerW: {
        title: "Rated power",
        type: "number",
        minimum: 0,
        maximum: 100000,
        default: 2000,
        description:
          "Electrical power (W) drawn while the appliance is powered.",
      },
    },
  },
  powerW: (s, p) => (s.on ? Number(p.powerW ?? 2000) : 0),
  initialState: {
    type: "object",
    additionalProperties: false,
    properties: {
      on: { title: "On at start", type: "boolean", default: false },
    },
  },
  create: (_p, init) => ({ on: init.on === true }),
  applyCommand: (s, c) =>
    c.type === "switch" && c.on !== s.on ? { on: c.on } : s,
};

export interface ShutterEquipmentState extends JsonObject {
  /** Actual position: 0 % = open / at the top, 100 % = closed / at the bottom. */
  positionPct: number;
  /** Order applied by the actuator. */
  drive: MotorDirection;
  /** Real movement: false to stop even if the order is maintained. */
  moving: boolean;
  /** Physically affected, or null. */
  limit: "top" | "bottom" | null;
  /** Slat angle of a venetian blind: 0 % = open (horizontal), 100 % = closed. */
  slatPct: number;
}

const limitOf = (pos: number): ShutterEquipmentState["limit"] =>
  pos <= 0 ? "top" : pos >= 100 ? "bottom" : null;

const canMove = (drive: MotorDirection, pos: number, slat = 0, slats = false) =>
  (drive === "down" && (pos < 100 || (slats && slat < 100))) ||
  (drive === "up" && (pos > 0 || (slats && slat > 0)));

const slatTime = (p: JsonObject) => Math.max(0, Number(p.slatTravelMs ?? 0));

export const shutter: EquipmentDefinition<ShutterEquipmentState> = {
  title: "Roller shutter",
  description:
    "Roller shutter: receives up/down/stop commands and moves through its actual travel, limited to 0–100%.",
  accepts: "motor",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["actualTravelTimeMs"],
    properties: {
      actualTravelTimeMs: {
        title: "Actual travel time",
        unit: "ms",
        type: "integer",
        exclusiveMinimum: 0,
        description:
          "Actual time for one complete travel (ms): downwards, and upwards unless actualTravelTimeUpMs is set.",
      },
      actualTravelTimeUpMs: {
        title: "Actual travel time up",
        unit: "ms",
        expert: true,
        type: "integer",
        exclusiveMinimum: 0,
        description:
          "Actual time for one complete upward travel (ms), when it differs from the downward time.",
      },
      slatTravelMs: {
        title: "Actual slat rotation time",
        unit: "ms",
        type: "integer",
        minimum: 0,
        default: 0,
        description:
          "Venetian blind: time for the slats to turn from open to closed (ms). The motor first turns the slats, then moves the blind. 0 describes a roller shutter without slats.",
      },
      wiringReversed: {
        title: "Motor wired in reverse",
        expert: true,
        type: "boolean",
        default: false,
        description:
          "Physical wiring with the up and down wires swapped: the motor turns opposite to the command. The actuator's “Inverted wiring” parameter compensates it.",
      },
    },
  },
  initialState: {
    type: "object",
    additionalProperties: false,
    properties: {
      positionPct: {
        title: "Actual position at start",
        unit: "%",
        type: "number",
        minimum: 0,
        maximum: 100,
        default: 0,
      },
      slatPct: {
        title: "Actual slat angle at start",
        unit: "%",
        type: "number",
        minimum: 0,
        maximum: 100,
        default: 0,
      },
    },
  },
  create: (_p, init) => {
    const positionPct = Number(init.positionPct ?? 0);
    return {
      positionPct,
      drive: "stop",
      moving: false,
      limit: limitOf(positionPct),
      slatPct: Number(init.slatPct ?? 0),
    };
  },
  applyCommand(s, c, p) {
    if (c.type !== "motor") return s;
    // A motor wired in reverse turns opposite to the command it receives.
    const drive: MotorDirection =
      p.wiringReversed === true && c.direction !== "stop"
        ? c.direction === "up"
          ? "down"
          : "up"
        : c.direction;
    if (drive === s.drive) return s;
    const slats = slatTime(p) > 0;
    return {
      ...s,
      drive,
      moving: canMove(drive, s.positionPct, s.slatPct, slats),
    };
  },
  advance(s, dtMs, p) {
    if (!s.moving || dtMs <= 0) return s;
    const travel = Number(
      s.drive === "up"
        ? (p.actualTravelTimeUpMs ?? p.actualTravelTimeMs)
        : p.actualTravelTimeMs,
    );
    const sign = s.drive === "down" ? 1 : -1;
    const slats = slatTime(p);
    let rest = dtMs;
    let slatPct = s.slatPct;
    // The motor first turns the slats towards closed (down) or open (up).
    if (slats > 0) {
      const toLimit = sign > 0 ? 100 - slatPct : slatPct;
      const turn = Math.min(rest, (toLimit * slats) / 100);
      slatPct = Math.min(
        100,
        Math.max(0, slatPct + (sign * turn * 100) / slats),
      );
      rest -= turn;
    }
    const positionPct = Math.min(
      100,
      Math.max(0, s.positionPct + (sign * rest * 100) / travel),
    );
    return {
      ...s,
      positionPct,
      slatPct,
      moving: canMove(s.drive, positionPct, slatPct, slats > 0),
      limit: limitOf(positionPct),
    };
  },
};

export interface DimmableState extends JsonObject {
  /** Niveau lumineux courant, 0–100 %. */
  levelPct: number;
  /** Level covered by the last order. */
  targetPct: number;
  /** Current molten speed (% per ms), 0 at standstill. */
  ratePctPerMs: number;
}

const dimCommand = <S extends DimmableState>(
  s: S,
  c: { type: string; level?: number; fadeMs?: number },
): S => {
  if (c.type !== "dim" || typeof c.level !== "number") return s;
  const target = Math.min(100, Math.max(0, c.level));
  const fade = Number(c.fadeMs ?? 0);
  if (fade <= 0)
    return { ...s, levelPct: target, targetPct: target, ratePctPerMs: 0 };
  return {
    ...s,
    targetPct: target,
    ratePctPerMs: Math.abs(target - s.levelPct) / fade,
  };
};

const dimAdvance = <S extends DimmableState>(s: S, dtMs: number): S => {
  if (!s.ratePctPerMs || dtMs <= 0) return s;
  const d = s.targetPct - s.levelPct;
  const step = s.ratePctPerMs * dtMs;
  if (Math.abs(d) <= step)
    return { ...s, levelPct: s.targetPct, ratePctPerMs: 0 };
  return { ...s, levelPct: s.levelPct + Math.sign(d) * step };
};

const levelInit: EquipmentDefinition["initialState"] = {
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
    },
  },
};

export const dimmableLamp: EquipmentDefinition<DimmableState> = {
  title: "Dimmable lamp",
  description:
    "Dimmable lamp: follows the commanded level with the requested fade; a tunable white lamp also follows the commanded colour temperature.",
  accepts: "dim",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      powerW: {
        title: "Rated power",
        type: "number",
        minimum: 0,
        maximum: 100000,
        default: 40,
        description:
          "Electrical power (W) at full level; the drawn power is proportional to the level.",
      },
    },
  },
  powerW: (s, p) => (Number(p.powerW ?? 40) * s.levelPct) / 100,
  initialState: levelInit,
  create: (_p, init) => {
    const l = Number(init.levelPct ?? 0);
    return { levelPct: l, targetPct: l, ratePctPerMs: 0 };
  },
  applyCommand: (s, c) => {
    const next = dimCommand(s, c);
    return c.type === "dim" && typeof c.colourTemperatureK === "number"
      ? { ...next, colourTemperatureK: c.colourTemperatureK }
      : next;
  },
  advance: (s, dt) => dimAdvance(s, dt),
};

/** Fan driven by a percentage (for example by a dimming actuator channel). */
export const fan: EquipmentDefinition<DimmableState> = {
  title: "Fan",
  description:
    "Ventilation fan: runs at the commanded speed (0–100 %) after a short ramp.",
  accepts: "dim",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      powerW: {
        title: "Rated power",
        type: "number",
        minimum: 0,
        maximum: 100000,
        default: 50,
        description:
          "Electrical power (W) at full speed; the drawn power is proportional to the speed.",
      },
    },
  },
  powerW: (s, p) => (Number(p.powerW ?? 50) * s.levelPct) / 100,
  initialState: levelInit,
  create: (_p, init) => {
    const l = Number(init.levelPct ?? 0);
    return { levelPct: l, targetPct: l, ratePctPerMs: 0 };
  },
  // The motor needs about two seconds to reach a new speed.
  applyCommand: (s, c) =>
    c.type === "dim" ? dimCommand(s, { ...c, fadeMs: 2000 }) : s,
  advance: (s, dt) => dimAdvance(s, dt),
};

export interface DaliGroupState extends DimmableState {
  /** Number of faulty DALI ballasts (ECGs); their lamps stay off. */
  failed: number;
  /** Faulty ballasts, one bit per ballast in the group (bit 0 is the first). */
  failedMask: number;
}

const popcount = (n: number) => {
  let c = 0;
  for (let v = n; v; v &= v - 1) c++;
  return c;
};

/**
 * DALI Group: Several ballasts (ECG) on the DALI line, with their short addresses.
 * They follow the same level; a faulty ballast stays off and reports its fault to the gateway.
 */
export const daliGroup: EquipmentDefinition<DaliGroupState> = {
  title: "DALI group",
  description:
    "DALI ballasts in a group: each has a short address (0–63) and follows the commanded level.",
  accepts: "dim",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      ballasts: {
        title: "Number of ballasts",
        type: "integer",
        minimum: 1,
        maximum: 16,
        default: 2,
        description: "Number of ballasts (luminaires) in the group.",
      },
      firstAddress: {
        title: "First short address",
        type: "integer",
        minimum: 0,
        maximum: 63,
        default: 0,
        description:
          "Short DALI address of the first ballast; subsequent ballasts use consecutive addresses.",
      },
    },
  },
  initialState: {
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
      },
      failed: {
        title: "Faulty ballasts",
        type: "integer",
        minimum: 0,
        maximum: 16,
        default: 0,
        description:
          "Number of ballasts initially reporting a lamp or ballast fault.",
      },
    },
  },
  // Consecutive short addresses: the last one does not exceed 63.
  checkParameters(p, t) {
    const n = Number(p.ballasts ?? 2);
    const first = Number(p.firstAddress ?? 0);
    return first + n - 1 > 63
      ? [
          {
            parameter: "firstAddress",
            message: t`${n} ballasts from A${first} would reach A${first + n - 1}: DALI short addresses stop at 63`,
          },
        ]
      : [];
  },
  create: (p, init) => {
    const l = Number(init.levelPct ?? 0);
    const n = Math.min(Number(init.failed ?? 0), Number(p.ballasts ?? 2));
    return {
      levelPct: l,
      targetPct: l,
      ratePctPerMs: 0,
      failed: n,
      failedMask: (1 << n) - 1,
    };
  },
  applyCommand: (s, c) => dimCommand(s, c),
  advance: (s, dt) => dimAdvance(s, dt),
  // Simulated failure: "toggleBallast" with ballast index in the group.
  interact(s, action, p, payload) {
    const i = Number(payload);
    if (action !== "toggleBallast" || !Number.isInteger(i)) return s;
    if (i < 0 || i >= Number(p.ballasts ?? 2)) return s;
    const failedMask = s.failedMask ^ (1 << i);
    return { ...s, failedMask, failed: popcount(failedMask) };
  },
};

export interface RadiatorState extends JsonObject {
  /** Actual valve opening, 0–100%. */
  openPct: number;
  /** Voltage applied by the actuator. */
  energized: boolean;
  /** The valve is moving. */
  moving: boolean;
}

const valveTarget = (s: RadiatorState, p: JsonObject) =>
  s.energized !== (p.normallyOpen === true) ? 100 : 0;

/**
 * Heating or cooling emitter with a thermoelectric valve. The valve opens slowly
 * while powered and closes when unpowered; heat transfer depends on its opening.
 */
export const radiator: EquipmentDefinition<RadiatorState> = {
  title: "Radiator",
  description:
    "Radiator with a thermoelectric valve: gradual opening while powered; heat or cooling output is proportional to valve opening.",
  accepts: "switch",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      openingTimeMs: {
        title: "Valve travel time",
        unit: "ms",
        type: "integer",
        minimum: 1000,
        default: 8000,
        description:
          "Time for the valve to open fully (ms). Real valves take about 3 minutes; this is compressed like room time and should be short relative to the PWM period.",
      },
      normallyOpen: {
        title: "Valve open when de-energised",
        type: "boolean",
        default: false,
        description: "Normally open valve: applying power closes it.",
      },
      powerK: {
        title: "Heating effect (K)",
        type: "number",
        minimum: 1,
        maximum: 60,
        default: 25,
        description:
          "Temperature difference (K) from outdoors that this radiator can maintain alone with the valve fully open.",
      },
      emitter: {
        title: "Emitter",
        type: "string",
        enum: ["heating", "cooling"],
        enumTitles: ["Heating", "Cooling"],
        default: "heating",
        description:
          "heating warms the room; cooling cools it, for example a fan coil with condensate drainage. Humidity and condensation are not modeled.",
      },
    },
  },
  initialState: {
    type: "object",
    additionalProperties: false,
    properties: {
      openPct: {
        title: "Initial opening",
        unit: "%",
        type: "number",
        minimum: 0,
        maximum: 100,
        default: 0,
      },
    },
  },
  create: (_p, init) => ({
    openPct: Number(init.openPct ?? 0),
    energized: false,
    moving: false,
  }),
  applyCommand(s, c, p) {
    if (c.type !== "switch" || c.on === s.energized) return s;
    const next = { ...s, energized: c.on };
    return { ...next, moving: next.openPct !== valveTarget(next, p) };
  },
  advance(s, dtMs, p) {
    const target = valveTarget(s, p);
    if (s.openPct === target || dtMs <= 0)
      return s.moving ? { ...s, moving: false } : s;
    const step = (dtMs * 100) / Number(p.openingTimeMs ?? 8000);
    const openPct =
      target > s.openPct
        ? Math.min(target, s.openPct + step)
        : Math.max(target, s.openPct - step);
    return { ...s, openPct, moving: openPct !== target };
  },
  heatOutput: (s, p) =>
    (p.emitter === "cooling" ? -1 : 1) *
    (s.openPct / 100) *
    Number(p.powerK ?? 25),
};
