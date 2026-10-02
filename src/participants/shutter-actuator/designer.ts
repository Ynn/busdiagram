// Shutter actuator in the designer: catalog entry, templates, and displayed type.
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
import { shutterActuatorDesignerFr } from "./designer.fr";

const template: Snippet = {
  id: "shutterActuator",
  get label() {
    return t`Shutter actuator`;
  },
  get hint() {
    return t`Up/down, stop/step, setpoint and position feedback; link them to group addresses.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "shutterActuator"),
          name: t`Shutter actuator`,
          address: freeAddress(doc, ctx.line),
          kind: "shutterActuator",
          behavior: "shutterActuator/v1",
          objects: [
            {
              id: "move",
              name: t`Up/down`,
              ga: [],
              dpt: "1.008",
              port: "move",
              channel: "s1",
              flags: flags(true, false),
            },
            {
              id: "stop",
              name: t`Stop/step`,
              ga: [],
              dpt: "1.007",
              port: "stopStep",
              channel: "s1",
              flags: flags(true, false),
            },
            {
              id: "target",
              name: t`Requested position`,
              ga: [],
              dpt: "5.001",
              port: "positionCommand",
              channel: "s1",
              flags: flags(true, false),
            },
            {
              id: "status",
              name: t`Estimated position`,
              ga: [],
              dpt: "5.001",
              port: "positionStatus",
              channel: "s1",
              flags: flags(false, true),
            },
          ],
          channels: [
            {
              id: "s1",
              label: t`Shutter`,
              parameters: { estimatedTravelTimeMs: 20000 },
              equipment: {
                type: "shutter",
                parameters: { actualTravelTimeMs: 20000 },
              },
            },
          ],
        },
      ],
    };
  },
};

export const shutterActuatorDesigner: DesignerContribution = {
  objectIds: {
    move: { prefix: "move", numbered: "several" },
    stopStep: { prefix: "stop", numbered: "several" },
    positionCommand: { prefix: "target", numbered: "several" },
    positionStatus: { prefix: "status", numbered: "several" },
  },
  messages: { fr: shutterActuatorDesignerFr },
  behavior: "shutterActuator/v1",
  category: "actuators",
  templates: [template],
  typeLabel: (d) => {
    const n = (d.channels ?? []).length;
    return n === 1
      ? t`Shutter actuator · 1 output`
      : t`Shutter actuator · ${n} outputs`;
  },
};
