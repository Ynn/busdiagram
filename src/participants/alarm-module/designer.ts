// Alarm module in the designer: catalog entry, template, and displayed type.
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
import { alarmModuleDesignerFr } from "./designer.fr";

/** Alarm module with one zone: triggers, resets, and stored alarms to link. */
const template: Snippet = {
  id: "alarmModule",
  get label() {
    return t`Alarm module`;
  },
  get hint() {
    return t`Intrusion and fire alarms of a zone, stored until reset; link the triggers to detectors and the alarms to the actuators.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    const obj = (
      id: string,
      name: string,
      port: string,
      dpt: string,
      W: boolean,
    ) => ({
      id,
      name,
      ga: [],
      dpt,
      port,
      channel: "z1",
      flags: flags(W, !W),
    });
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "alarmModule"),
          name: t`Alarm module`,
          address: freeAddress(doc, ctx.line),
          kind: "alarmModule",
          behavior: "alarmModule/v1",
          channels: [{ id: "z1", label: t`Zone 1` }],
          objects: [
            obj("it1", t`Intrusion trigger`, "intrusionTrigger", "1.005", true),
            obj("ir1", t`Intrusion reset`, "intrusionReset", "1.015", true),
            obj("is1", t`Intrusion alarm`, "intrusionState", "1.005", false),
            obj("ft1", t`Fire trigger`, "fireTrigger", "1.005", true),
            obj("fr1", t`Fire reset`, "fireReset", "1.015", true),
            obj("fs1", t`Fire alarm`, "fireState", "1.005", false),
          ],
        },
      ],
    };
  },
};

export const alarmModuleDesigner: DesignerContribution = {
  messages: { fr: alarmModuleDesignerFr },
  behavior: "alarmModule/v1",
  category: "automation",
  templates: [template],
  typeLabel: (d) => {
    const n = (d.channels ?? []).length;
    return n === 1 ? t`Alarm module · 1 zone` : t`Alarm module · ${n} zones`;
  },
};
