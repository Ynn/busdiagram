// Switched electrical appliance, described by its power.
import type { EquipmentDefinition } from "../../knx/contracts";
import type { LampState } from "../shared/switched";

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
