// Window contact in the designer: catalog entry, templates, and displayed type.
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
  withRoom,
} from "../../../site/designer/snippet-kit";
import { t } from "../../../site/designer/lang";
import { windowContactDesignerFr } from "./designer.fr";

/** Window contact (binary entry) of the first room, on a new address. */
const windowContact: Snippet = {
  id: "windowContact",
  get label() {
    return t`Window contact`;
  },
  get hint() {
    return t`Sends its room's window opening (1.019); link it to the address of the thermostat's “Window” object.`;
  },
  apply(input, ctx = {}) {
    const { doc, room } = withRoom(ensureBase(input));
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "windowContact"),
          name: t`Window contact`,
          address: freeAddress(doc, ctx.line),
          kind: "binaryInput",
          behavior: "windowContact/v1",
          room,
          objects: [
            {
              id: "c",
              name: t`Window`,
              ga: [],
              dpt: "1.019",
              port: "contact",
              flags: flags(false, true),
            },
          ],
        },
      ],
    };
  },
};

export const windowContactDesigner: DesignerContribution = {
  messages: { fr: windowContactDesignerFr },
  behavior: "windowContact/v1",
  category: "sensors",
  templates: [windowContact],
  typeLabel: () => t`Window contact`,
};
