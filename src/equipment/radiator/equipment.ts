// Radiator with a thermoelectric valve.
import type { EquipmentDefinition, JsonObject } from "../../knx/contracts";

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
