// Push-button interface in the designer: catalog entry, template, and displayed type.
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
import { buttonInterfaceDesignerFr } from "./designer.fr";

/**
 * Push-button interface: four contact inputs, each switching a new group address by
 * toggling; the function of each input is set on its pages.
 */
const template: Snippet = {
  id: "buttonInterface4",
  get label() {
    return t`Push-button interface`;
  },
  get hint() {
    return t`Four contact inputs for conventional push-buttons; each has a function (switching, dimming, blind, value, scene), a lock and a bus voltage recovery reaction.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    const inputs = [1, 2, 3, 4];
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "buttonInterface"),
          name: t`Push-button interface`,
          address: freeAddress(doc, ctx.line),
          kind: "buttonInterface",
          behavior: "buttonInterface/v1",
          channels: inputs.map((i) => ({
            id: `in${i}`,
            label: t`Input ${i}`,
            parameters: { function: "switch" },
          })),
          objects: inputs.map((i) => ({
            id: `sw${i}`,
            name: t`Switching ${i}`,
            ga: [],
            dpt: "1.001",
            port: "switch",
            channel: `in${i}`,
            flags: flags(true, true),
          })),
        },
      ],
    };
  },
};

export const buttonInterfaceDesigner: DesignerContribution = {
  objectIds: { move: { prefix: "move", numbered: "several" } },
  behavior: "buttonInterface/v1",
  messages: { fr: buttonInterfaceDesignerFr },
  category: "controls",
  templates: [template],
  catalogName: () => [
    t`Push-button interface`,
    t`Four inputs to start with; set the number of inputs on the Configuration page, and the function of each input on its pages.`,
  ],
  typeLabel: (d) => {
    const n = (d.channels ?? []).length;
    return n === 1
      ? t`Push-button interface · 1 input`
      : t`Push-button interface · ${n} inputs`;
  },
};
