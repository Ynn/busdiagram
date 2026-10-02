// Level of a dimmed load, shared by the dimmable lamp, the fan, and the DALI group.
import type { EquipmentDefinition, JsonObject } from "../../knx/contracts";

export interface DimmableState extends JsonObject {
  /** Niveau lumineux courant, 0–100 %. */
  levelPct: number;
  /** Level covered by the last order. */
  targetPct: number;
  /** Current molten speed (% per ms), 0 at standstill. */
  ratePctPerMs: number;
}

export const dimCommand = <S extends DimmableState>(
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

export const dimAdvance = <S extends DimmableState>(s: S, dtMs: number): S => {
  if (!s.ratePctPerMs || dtMs <= 0) return s;
  const d = s.targetPct - s.levelPct;
  const step = s.ratePctPerMs * dtMs;
  if (Math.abs(d) <= step)
    return { ...s, levelPct: s.targetPct, ratePctPerMs: 0 };
  return { ...s, levelPct: s.levelPct + Math.sign(d) * step };
};

export const levelInit: EquipmentDefinition["initialState"] = {
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
