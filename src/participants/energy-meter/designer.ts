// Energy meter in the designer: catalog entry, templates, and displayed type.
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
import { energyMeterDesignerFr } from "./designer.fr";

/** Independent energy meter: one measured circuit with power, energy, and an input. */
const energyMeter: Snippet = {
  id: "energyMeter",
  get label() {
    return t`Energy meter`;
  },
  get hint() {
    return t`Measures a circuit that it does not switch (heat pump, water heater, sockets): power (14.056) and energy (13.010); the measured power is entered on the device.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "energyMeter"),
          name: t`Energy meter`,
          address: freeAddress(doc, ctx.line),
          kind: "energyMeter",
          behavior: "energyMeter/v1",
          objects: [
            {
              id: "p1",
              name: t`Power`,
              ga: [],
              dpt: "14.056",
              port: "power",
              channel: "c1",
              flags: flags(false, true),
            },
            {
              id: "e1",
              name: t`Energy`,
              ga: [],
              dpt: "13.010",
              port: "energy",
              channel: "c1",
              flags: flags(false, true),
            },
          ],
          inputs: [
            {
              id: "p1",
              type: "number",
              label: t`Power (W)`,
              object: "p1",
              min: 0,
              max: 10000,
              step: 100,
            },
          ],
          channels: [
            { id: "c1", label: t`Circuit 1`, initialState: { powerW: 1000 } },
          ],
        },
      ],
    };
  },
};

export const energyMeterDesigner: DesignerContribution = {
  messages: { fr: energyMeterDesignerFr },
  behavior: "energyMeter/v1",
  category: "automation",
  templates: [energyMeter],
  typeLabel: () => t`Energy meter`,
};
