// Fan driven by a percentage.
import type { EquipmentDefinition } from "../../knx/contracts";
import type { DimmableState } from "../shared/dimmable";
import { dimAdvance, dimCommand, levelInit } from "../shared/dimmable";

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
