// Alarm sounder (siren with flash light) on a switched output: it sounds while powered,
// up to an optional ringing time limit, as the sounders of alarm systems.
import type { EquipmentDefinition, JsonObject } from "../../knx/contracts";

export interface SirenState extends JsonObject {
  /** Supply switched on by the actuator. */
  powered: boolean;
  /** Time since it was powered (ms). */
  elapsedMs: number;
  /** The sounder sounds (powered, within its ringing time limit). */
  ringing: boolean;
}

const limitOf = (p: JsonObject) =>
  typeof p.ringLimitMs === "number" ? p.ringLimitMs : 180000;

export const siren: EquipmentDefinition<SirenState> = {
  title: "Alarm sounder",
  description:
    "Alarm sounder with flash light: sounds while its output is on, for at most its ringing time limit.",
  accepts: "switch",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      ringLimitMs: {
        title: "Ringing time limit",
        unit: "ms",
        type: "integer",
        minimum: 0,
        default: 180000,
        description:
          "The sounder stops after this time even if still powered; the flash light stays on (0: no limit). Outdoor sounders are often limited to 3 minutes.",
      },
      powerW: {
        title: "Rated power",
        type: "number",
        minimum: 0,
        maximum: 1000,
        default: 15,
        description: "Electrical power (W) drawn while powered.",
      },
    },
  },
  create: () => ({ powered: false, elapsedMs: 0, ringing: false }),
  applyCommand(s, c) {
    if (c.type !== "switch" || c.on === s.powered) return s;
    return c.on
      ? { powered: true, elapsedMs: 0, ringing: true }
      : { powered: false, elapsedMs: 0, ringing: false };
  },
  advance(s, dtMs, p) {
    if (!s.powered || !s.ringing || dtMs <= 0) return s;
    const elapsedMs = s.elapsedMs + dtMs;
    const limit = limitOf(p);
    return { ...s, elapsedMs, ringing: limit === 0 || elapsedMs < limit };
  },
  powerW: (s, p) =>
    s.powered ? (typeof p.powerW === "number" ? p.powerW : 15) : 0,
};
