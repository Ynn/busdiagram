// Switch actuator in the designer: catalog entry, templates, and displayed type.
// Designer entry of the participant: never imported by its model or the library.
import type {
  DesignerContribution,
  Snippet,
} from "../../../site/designer/snippet-kit";
import {
  ensureBase,
  flags,
  freeAddress,
  freeId,
} from "../../../site/designer/snippet-kit";
import { t } from "../../../site/designer/lang";
import { switchActuatorDesignerFr } from "./designer.fr";

function switchActuator(outputs: number): Snippet {
  return {
    id: `switchActuator${outputs}`,
    get label() {
      return t`${outputs}-output switch actuator`;
    },
    get hint() {
      return t`One channel and one lamp per output; fill in the objects' group addresses.`;
    },
    apply(input, ctx = {}) {
      const doc = ensureBase(input);
      const id = freeId(doc, "switchActuator");
      return {
        ...doc,
        devices: [
          ...doc.devices!,
          {
            id,
            // The number of outputs is a setting (Configuration page), not part of the name.
            name: t`Switch actuator`,
            address: freeAddress(doc, ctx.line),
            kind: "switchActuator",
            behavior: "switchActuator/v1",
            objects: Array.from({ length: outputs }, (_, i) => ({
              id: `c${i + 1}`,
              name: t`Command L${i + 1}`,
              ga: [],
              dpt: "1.001",
              port: "switch",
              channel: `s${i + 1}`,
              flags: flags(true, false),
            })),
            channels: Array.from({ length: outputs }, (_, i) => ({
              id: `s${i + 1}`,
              label: `L${i + 1}`,
              equipment: { type: "lamp" },
            })),
          },
        ],
      };
    },
  };
}

export const switchActuatorDesigner: DesignerContribution = {
  objectIds: {
    switch: { prefix: "c" },
    status: { prefix: "e" },
    forced: { prefix: "f" },
    scene: { prefix: "sc" },
  },
  messages: { fr: switchActuatorDesignerFr },
  behavior: "switchActuator/v1",
  category: "actuators",
  templates: [switchActuator(4), switchActuator(6)],
  catalogName: () => [
    t`Switch actuator`,
    t`Four outputs to start with, one lamp each; set the number of outputs on the Configuration page, and the loads of each output.`,
  ],
  typeLabel: (d) => {
    const n = (d.channels ?? []).length;
    return n === 1
      ? t`Switch actuator · 1 output`
      : t`Switch actuator · ${n} outputs`;
  },
};
