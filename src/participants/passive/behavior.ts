// Device without logic (or visualization panel): it keeps the values of its objects and
// sends the values typed in the diagram.
import type { BehaviorDefinition } from "../../knx/contracts";
import { sendTypedValue } from "../shared/typed-value";

/**
 * Device without logic: it keeps the values of its objects. Values typed in the diagram
 * (`inputs`) are written to their object and sent, as from a visualization panel.
 */
export const passive: BehaviorDefinition<Record<string, never>> = {
  representsAnyDpt: true,
  description:
    "Device without logic: it keeps the values of its objects, and sends the values typed in the diagram, as a visualization panel.",
  acceptsInputs: true,
  acceptsKeys: false,
  onInput: sendTypedValue,
  ports: {
    input: {
      description:
        "Object written by a numeric input of the diagram, then transmitted.",
      dpts: "any",
      channel: "none",
      title: "Transmission",
      direction: "out",
    },
    display: {
      description: "Value received and kept, as shown by a visualization.",
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
