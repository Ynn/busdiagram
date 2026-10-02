// Weather station in the designer: catalog entry, templates, and displayed type.
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
import { weatherStationDesignerFr } from "./designer.fr";

/** Weather station: wind and brightness measurements with threshold outputs. */
const weatherStation: Snippet = {
  id: "weatherStation",
  get label() {
    return t`Weather station`;
  },
  get hint() {
    return t`Wind speed (9.005) and brightness (9.004) entered on the device, wind alarm (1.005) and sun protection (1.001) outputs.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "weatherStation"),
          name: t`Weather station`,
          address: freeAddress(doc, ctx.line),
          kind: "weatherStation",
          behavior: "weatherStation/v1",
          objects: [
            {
              id: "wind",
              name: t`Wind speed`,
              ga: [],
              dpt: "9.005",
              port: "wind",
              flags: flags(false, true),
            },
            {
              id: "brightness",
              name: t`Brightness`,
              ga: [],
              dpt: "9.004",
              port: "brightness",
              flags: flags(false, true),
            },
            {
              id: "windAlarm",
              name: t`Wind alarm`,
              ga: [],
              dpt: "1.005",
              port: "windAlarm",
              flags: flags(false, true),
            },
            {
              id: "sun",
              name: t`Sun protection`,
              ga: [],
              dpt: "1.001",
              port: "sunProtection",
              flags: flags(false, true),
            },
          ],
          inputs: [
            {
              id: "wind",
              type: "number",
              label: t`Wind (m/s)`,
              object: "wind",
              min: 0,
              max: 40,
              step: 1,
            },
            {
              id: "brightness",
              type: "number",
              label: t`Brightness (lx)`,
              object: "brightness",
              min: 0,
              max: 100000,
              step: 5000,
            },
          ],
        },
      ],
    };
  },
};

export const weatherStationDesigner: DesignerContribution = {
  messages: { fr: weatherStationDesignerFr },
  behavior: "weatherStation/v1",
  category: "sensors",
  templates: [weatherStation],
  typeLabel: () => t`Weather station`,
};
