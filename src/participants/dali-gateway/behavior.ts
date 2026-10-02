// KNX/DALI gateway: each channel is a DALI group of ballasts; broadcast commands, scenes and
// fault reporting, with the DALI commands sent shown in the log.
import type { BehaviorDefinition } from "../../knx/contracts";
import type { DimmerState } from "../shared/dimming";
import { base } from "../shared/dimming";
import { daliLayout } from "./layout";
import { daliRules } from "./rules";

export const daliGateway: BehaviorDefinition<DimmerState> = {
  parameterLayout: daliLayout,
  ...base(
    "KNX/DALI gateway: each channel is a DALI group of ballasts; broadcast, scenes and fault reporting.",
    {
      error: {
        defaultFlags: { R: true },
        dpts: ["1.005"],
        channel: "required",
        title: "Fault",
        direction: "out",
        description: "lamp or ballast fault in the group",
      },
      broadcastSwitch: {
        description: "Switches all groups with a DALI broadcast.",
        dpts: ["1.001"],
        channel: "none",
        title: "Broadcast switching",
        direction: "in",
      },
      broadcastValue: {
        description: "Sets the level of all groups with a DALI broadcast.",
        dpts: ["5.001"],
        channel: "none",
        title: "Broadcast value",
        direction: "in",
      },
      generalError: {
        description: "Fault on the DALI line, across all groups (1.005).",
        defaultFlags: { R: true },
        dpts: ["1.005"],
        channel: "none",
        title: "General fault",
        direction: "out",
      },
    },
    true,
  ),
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      pollMs: {
        title: "Ballast polling",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 500,
        default: 2000,
        description: "Interval between ballast status polls for faults.",
      },
    },
  },
  validate: daliRules,
};
