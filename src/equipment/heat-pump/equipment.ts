// Heat pump heating or cooling the room it serves: its compressor runs while the output
// enables it, after a minimum off time that protects it from short cycles.
import type { EquipmentDefinition, JsonObject } from "../../knx/contracts";

export interface HeatPumpState extends JsonObject {
  /** Operation enabled by the actuator. */
  enabled: boolean;
  /** The compressor runs. */
  running: boolean;
  /** Time since the compressor stopped (ms), for its minimum off time. */
  offMs: number;
}

const num = (v: unknown, d: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : d;

export const heatPump: EquipmentDefinition<HeatPumpState> = {
  title: "Heat pump",
  description:
    "Heat pump serving a room: while the output enables it, its compressor runs (after a minimum off time) and heats or cools the room; it draws its electrical power, the heat delivered being that power times its coefficient of performance.",
  accepts: "switch",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      mode: {
        title: "Operating mode",
        type: "string",
        enum: ["heating", "cooling"],
        enumTitles: ["Heating", "Cooling"],
        default: "heating",
        description:
          "Heating warms the room; cooling cools it (reversible unit).",
      },
      electricPowerW: {
        title: "Electrical power",
        type: "number",
        minimum: 100,
        maximum: 20000,
        default: 1500,
        description: "Electrical power (W) drawn while the compressor runs.",
      },
      cop: {
        title: "Coefficient of performance",
        type: "number",
        minimum: 1,
        maximum: 8,
        default: 3.5,
        description:
          "Heat delivered divided by the electrical power drawn (shown on the unit; the room model uses powerK).",
      },
      powerK: {
        title: "Heating effect (K)",
        type: "number",
        minimum: 1,
        maximum: 60,
        default: 25,
        description:
          "Temperature difference (K) from outdoors that the unit can maintain alone while it runs.",
      },
      minOffMs: {
        title: "Minimum off time",
        unit: "ms",
        type: "integer",
        minimum: 0,
        default: 10000,
        description:
          "Time the compressor stays off after a stop before it may start again (anti short-cycle); real units wait a few minutes, compressed here like room time.",
      },
    },
  },
  initialState: {
    type: "object",
    additionalProperties: false,
    properties: {
      enabled: { title: "On at start", type: "boolean", default: false },
    },
  },
  // At start the compressor has been off long enough: it may start at once.
  create: (p, init) => ({
    enabled: init.enabled === true,
    running: init.enabled === true,
    offMs: num(p.minOffMs, 10000),
  }),
  applyCommand(s, c) {
    if (c.type !== "switch" || c.on === s.enabled) return s;
    if (!c.on) return { ...s, enabled: false, running: false, offMs: 0 };
    return { ...s, enabled: true };
  },
  advance(s, dtMs, p) {
    if (dtMs <= 0 || s.running) return s;
    const min = num(p.minOffMs, 10000);
    // The off time counts up to the minimum, then the compressor starts when enabled.
    const offMs = Math.min(min, s.offMs + dtMs);
    const running = s.enabled && offMs >= min;
    return offMs === s.offMs && running === s.running
      ? s
      : { ...s, offMs, running };
  },
  heatOutput: (s, p) =>
    s.running ? (p.mode === "cooling" ? -1 : 1) * num(p.powerK, 25) : 0,
  powerW: (s, p) => (s.running ? num(p.electricPowerW, 1500) : 0),
};
