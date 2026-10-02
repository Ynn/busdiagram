// Display / supervisor: receives and shows values, with no output or retransmission.
import type { BehaviorDefinition } from "../../knx/contracts";

export const display: BehaviorDefinition<Record<string, never>> = {
  // With "kind": "supervisor", it is drawn as a supervision software.
  presentation: (d) =>
    d.kind === "supervisor" ? { supervisor: true, receiver: true } : {},
  representsAnyDpt: true,
  description:
    "Display / supervisor: receives and shows values, with no output or retransmission.",
  ports: {
    display: {
      description:
        "Value received and shown, as by an indicator or a supervisor.",
      defaultFlags: { U: true },
      initialUnknown: true,
      dpts: "any",
      channel: "none",
      title: "Display",
      direction: "in",
    },
  },
  createState: () => ({}),
};
