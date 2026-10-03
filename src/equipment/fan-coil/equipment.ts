// Fan coil unit: a water coil behind a thermoelectric valve, and a fan that blows the
// room air through the coil while water flows in it.
import type {
  EquipmentDefinition,
  JsonObject,
  Medium,
} from "../../knx/contracts";

export interface FanCoilState extends JsonObject {
  /** Actual valve opening, 0–100%. */
  openPct: number;
  /** Voltage applied by the actuator. */
  energized: boolean;
  /** The valve is moving. */
  moving: boolean;
  /** Water in the coil: hot (heating) or cold (cooling). */
  medium: Medium;
}

const num = (v: unknown, d: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : d;

const valveTarget = (s: FanCoilState, p: JsonObject) =>
  s.energized !== (p.normallyOpen === true) ? 100 : 0;

/** Water of the coil: fixed for a heating or a cooling coil, from the valve for a change-over coil. */
export const fanCoilMedium = (s: FanCoilState, p: JsonObject): Medium =>
  p.coil === "heating" || p.coil === "cooling" ? p.coil : s.medium;

/**
 * Fan coil unit. Its coil is a heating coil, a cooling coil (4-pipe unit: one fan coil per
 * valve), or a change-over coil (2-pipe unit): the same pipes carry hot water in heating
 * and cold water in cooling, and the valve actuator gives which. The fan runs while water
 * flows in the coil; its speed is not modeled.
 */
export const fanCoil: EquipmentDefinition<FanCoilState> = {
  title: "Fan coil",
  description:
    "Fan coil unit: a heating, cooling, or change-over (2-pipe) water coil behind a thermoelectric valve, and a fan that runs while water flows; heat or cooling output is proportional to valve opening.",
  accepts: "switch",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      coil: {
        title: "Coil",
        type: "string",
        enum: ["changeover", "heating", "cooling"],
        enumTitles: [
          "Heating and cooling (2-pipe, change-over)",
          "Heating (4-pipe, hot water)",
          "Cooling (4-pipe, cold water)",
        ],
        default: "changeover",
        description:
          "changeover: the same coil heats with hot water and cools with cold water, as given by the valve actuator; heating or cooling: a coil of a 4-pipe unit, on its own valve.",
      },
      openingTimeMs: {
        title: "Valve travel time",
        unit: "ms",
        type: "integer",
        minimum: 1000,
        default: 8000,
        description:
          "Time for the valve to open fully (ms), compressed like room time; short relative to the PWM period.",
      },
      normallyOpen: {
        title: "Valve open when de-energised",
        type: "boolean",
        default: false,
        description: "Normally open valve: applying power closes it.",
      },
      powerK: {
        title: "Heating or cooling effect (K)",
        type: "number",
        minimum: 1,
        maximum: 60,
        default: 20,
        description:
          "Temperature difference (K) from outdoors that the unit can maintain alone with the valve fully open.",
      },
      fanPowerW: {
        title: "Fan power",
        type: "number",
        minimum: 0,
        maximum: 1000,
        default: 40,
        description:
          "Electrical power (W) drawn by the fan while water flows in the coil.",
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
  create: (p, init) => ({
    openPct: num(init.openPct, 0),
    energized: false,
    moving: false,
    medium: p.coil === "cooling" ? "cooling" : "heating",
  }),
  applyCommand(s, c, p) {
    if (c.type !== "switch") return s;
    const medium = c.medium ?? s.medium;
    if (c.on === s.energized && medium === s.medium) return s;
    const next = { ...s, energized: c.on, medium };
    return { ...next, moving: next.openPct !== valveTarget(next, p) };
  },
  advance(s, dtMs, p) {
    const target = valveTarget(s, p);
    if (s.openPct === target || dtMs <= 0)
      return s.moving ? { ...s, moving: false } : s;
    const step = (dtMs * 100) / num(p.openingTimeMs, 8000);
    const openPct =
      target > s.openPct
        ? Math.min(target, s.openPct + step)
        : Math.max(target, s.openPct - step);
    return { ...s, openPct, moving: openPct !== target };
  },
  heatOutput: (s, p) =>
    (fanCoilMedium(s, p) === "cooling" ? -1 : 1) *
    (s.openPct / 100) *
    num(p.powerK, 20),
  powerW: (s, p) => (s.openPct > 0 ? num(p.fanPowerW, 40) : 0),
};
