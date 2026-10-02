// Shutter or venetian blind driven by a motor.
import type {
  EquipmentDefinition,
  JsonObject,
  MotorDirection,
} from "../../knx/contracts";

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
