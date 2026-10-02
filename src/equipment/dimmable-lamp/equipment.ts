// Dimmable lamp driven by a level.
import type { EquipmentDefinition } from "../../knx/contracts";
import type { DimmableState } from "../shared/dimmable";
import { dimAdvance, dimCommand, levelInit } from "../shared/dimmable";

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
