// Lamp: lit while the relay output is closed.
import type { EquipmentDefinition } from "../../knx/contracts";
import type { LampState } from "../shared/switched";

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
