// Temperature sensor in the designer: catalog entry, templates, and displayed type.
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
import { temperatureSensorDesignerFr } from "./designer.fr";

/** Temperature probe of the first room, on a new address 9.001. */
const temperatureSensor: Snippet = {
  id: "temperatureSensor",
  get label() {
    return t`Temperature sensor`;
  },
  get hint() {
    return t`Sends its room's temperature (9.001); link it for instance to the address of a thermostat's “External temperature” object.`;
  },
  apply(input, ctx = {}) {
    const { doc, room } = withRoom(ensureBase(input));
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "temperatureSensor"),
          name: t`Temperature sensor`,
          address: freeAddress(doc, ctx.line),
          kind: "sensor",
          behavior: "temperatureSensor/v1",
          room,
          objects: [
            {
              id: "t",
              name: t`Temperature`,
              ga: [],
              dpt: "9.001",
              port: "temperature",
              flags: flags(false, true),
            },
          ],
        },
      ],
    };
  },
};

export const temperatureSensorDesigner: DesignerContribution = {
  messages: { fr: temperatureSensorDesignerFr },
  behavior: "temperatureSensor/v1",
  category: "sensors",
  templates: [temperatureSensor],
  typeLabel: () => t`Temperature sensor`,
};
