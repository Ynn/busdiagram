// Logic module in the designer: catalog entry, templates, and displayed type.
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
import { logicGateDesignerFr } from "./designer.fr";

/** Logic module: two one-bit inputs and one output on new addresses. */
const logicModule: Snippet = {
  id: "logicModule",
  get label() {
    return t`Logic module`;
  },
  get hint() {
    return t`AND of two one-bit inputs sent on a new output address; change the operation and link the inputs.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "logicModule"),
          name: t`Logic module`,
          address: freeAddress(doc, ctx.line),
          kind: "logicModule",
          behavior: "logicGate/v1",
          parameters: { operation: "and" },
          objects: [
            {
              id: "in1",
              name: t`Logic input 1`,
              ga: [],
              dpt: "1.001",
              port: "logicIn",
              flags: flags(true, false),
            },
            {
              id: "in2",
              name: t`Logic input 2`,
              ga: [],
              dpt: "1.001",
              port: "logicIn",
              flags: flags(true, false),
            },
            {
              id: "out",
              name: t`Logic output`,
              ga: [],
              dpt: "1.001",
              port: "logicOut",
              flags: flags(false, true),
            },
          ],
        },
      ],
    };
  },
};

export const logicGateDesigner: DesignerContribution = {
  messages: { fr: logicGateDesignerFr },
  behavior: "logicGate/v1",
  category: "automation",
  templates: [logicModule],
  typeLabel: () => t`Logic module`,
};
