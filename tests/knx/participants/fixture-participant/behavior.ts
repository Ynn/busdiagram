// Fictional participant of the tests: a "beacon" that sends 1 on its object when the
// diagram presses its key, used to show that a participant lives in its folder only.
import type { BehaviorDefinition } from "../../../../src/knx/contracts";
import { beaconLayout } from "./layout";
import { beaconWarnings } from "./rules";

export const beacon: BehaviorDefinition<null> = {
  description: "Test beacon: sends 1 when it is pressed.",
  parameterLayout: beaconLayout,
  warnings: beaconWarnings,
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      loud: { title: "Loud beacon", type: "boolean", default: false },
    },
  },
  ports: {
    signal: {
      dpts: ["1.001"],
      channel: "none",
      title: "Beacon signal",
      direction: "out",
      description: "Sent when the beacon is pressed.",
      telegram: "state",
    },
  },
  createState: () => null,
};
