// Time switch in the designer: catalog entry, templates, and displayed type.
// Designer entry of the participant: never imported by its model or the library.
import type {
  DesignerContribution,
  Snippet,
} from "../../../site/designer/snippet-kit";
import {
  DEFAULT_CLOCK,
  ensureBase,
  flags,
  freeAddress,
  freeId,
} from "../../../site/designer/snippet-kit";
import { t } from "../../../site/designer/lang";
import { timeSwitchDesignerFr } from "./designer.fr";

/** Weekly time switch: one output on a new address; adds a simulated clock if needed. */
const timeSwitchSnippet: Snippet = {
  id: "timeSwitch",
  get label() {
    return t`Weekly time switch`;
  },
  get hint() {
    return t`Sends 1 at 07:00 and 0 at 22:00 every day; edit the program and link the output.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    return {
      ...doc,
      clock: doc.clock ?? { ...DEFAULT_CLOCK },
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "timeSwitch"),
          name: t`Weekly time switch`,
          address: freeAddress(doc, ctx.line),
          kind: "timeSwitch",
          behavior: "timeSwitch/v1",
          parameters: { program: "Daily 07:00 = 1; Daily 22:00 = 0" },
          objects: [
            {
              id: "out",
              name: t`Programmed output`,
              ga: [],
              dpt: "1.001",
              port: "output",
              flags: flags(false, true),
            },
          ],
        },
      ],
    };
  },
};

export const timeSwitchDesigner: DesignerContribution = {
  messages: { fr: timeSwitchDesignerFr },
  behavior: "timeSwitch/v1",
  category: "automation",
  templates: [timeSwitchSnippet],
  typeLabel: () => t`Weekly time switch`,
};
