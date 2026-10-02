// Presence detector in the designer: catalog entry, templates, and displayed type.
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
import { presenceDetectorDesignerFr } from "./designer.fr";

const template: Snippet = {
  id: "pir",
  get label() {
    return t`Presence detector`;
  },
  get hint() {
    return t`A “Passage” key: 1 on detection, 0 after the hold time (10 s).`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "pir"),
          name: t`Presence detector`,
          address: freeAddress(doc, ctx.line),
          kind: "sensor",
          behavior: "presenceDetector/v1",
          objects: [
            {
              id: "p",
              name: t`Presence`,
              ga: [],
              dpt: "1.001",
              port: "input",
              flags: flags(false, true),
            },
          ],
          buttons: [
            {
              id: "motion",
              label: t`Passage`,
              icon: "presence",
              press: { object: "p", value: 1 },
            },
          ],
        },
      ],
    };
  },
};

export const presenceDetectorDesigner: DesignerContribution = {
  messages: { fr: presenceDetectorDesignerFr },
  behavior: "presenceDetector/v1",
  category: "sensors",
  templates: [template],
  typeLabel: () => t`Presence detector`,
};
