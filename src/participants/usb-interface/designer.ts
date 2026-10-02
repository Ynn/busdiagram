// USB interface in the designer: catalog entry, templates, and displayed type.
// Designer entry of the participant: never imported by its model or the library.
import type {
  DesignerContribution,
  Snippet,
} from "../../../site/designer/snippet-kit";
import {
  ensureBase,
  freeAddress,
  freeId,
  usedAddresses,
} from "../../../site/designer/snippet-kit";
import { t } from "../../../site/designer/lang";
import { usbInterfaceDesignerFr } from "./designer.fr";

const template: Snippet = {
  id: "usbInterface",
  get label() {
    return t`USB interface`;
  },
  get hint() {
    return t`Access to the bus through a USB interface: write and read group addresses from the USB interface panel of the diagram.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    const line = ctx.line ?? String(doc.lines![0]!.address);
    // Usual address of an interface: Z.L.255, otherwise the first free.
    const first = freeAddress(doc, line); // also check that the line exists
    const address = usedAddresses(doc).has(`${line}.255`)
      ? first
      : `${line}.255`;
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "usbInterface"),
          name: t`USB interface`,
          address,
          kind: "interface",
          behavior: "usbInterface/v1",
          objects: [],
        },
      ],
    };
  },
};

export const usbInterfaceDesigner: DesignerContribution = {
  messages: { fr: usbInterfaceDesignerFr },
  behavior: "usbInterface/v1",
  category: "supervision",
  templates: [template],
  typeLabel: () => t`USB interface`,
};
