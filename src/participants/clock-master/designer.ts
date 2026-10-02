// Clock master in the designer: catalog entry, templates, and displayed type.
// Designer entry of the participant: never imported by its model or the library.
import type {
  DesignerContribution,
  Snippet,
} from "../../../site/designer/snippet-kit";
import {
  DEFAULT_CLOCK,
  ensureBase,
  freeAddress,
  freeId,
} from "../../../site/designer/snippet-kit";
import { t } from "../../../site/designer/lang";
import { clockMasterDesignerFr } from "./designer.fr";

/** Clock master: time of day and date on new addresses; adds a simulated clock if needed. */
const clockMaster: Snippet = {
  id: "clockMaster",
  get label() {
    return t`Clock master`;
  },
  get hint() {
    return t`Sends the time (10.001) and the date (11.001) of the simulated clock; adds a clock to the scenario if it has none.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    const flagsR = { W: false, T: true, R: true };
    return {
      ...doc,
      clock: doc.clock ?? { ...DEFAULT_CLOCK },
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "clock"),
          name: t`Clock master`,
          address: freeAddress(doc, ctx.line),
          kind: "clock",
          behavior: "clockMaster/v1",
          objects: [
            {
              id: "time",
              name: t`Time of day`,
              ga: [],
              dpt: "10.001",
              port: "time",
              flags: flagsR,
            },
            {
              id: "date",
              name: t`Date`,
              ga: [],
              dpt: "11.001",
              port: "date",
              flags: flagsR,
            },
          ],
        },
      ],
    };
  },
};

export const clockMasterDesigner: DesignerContribution = {
  messages: { fr: clockMasterDesignerFr },
  behavior: "clockMaster/v1",
  category: "automation",
  templates: [clockMaster],
  typeLabel: () => t`Clock master`,
};
