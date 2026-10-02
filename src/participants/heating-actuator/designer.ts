// Heating actuator in the designer: catalog entry, templates, and displayed type.
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
import { heatingActuatorDesignerFr } from "./designer.fr";

/** Heating actuator 2 outputs, each with its radiator in the first room. */
const heatingActuator: Snippet = {
  id: "heatingActuator",
  get label() {
    return t`Heating actuator, 2 outputs`;
  },
  get hint() {
    return t`Electrothermal valves driven by PWM from a 5.001 control value; fill in the group addresses.`;
  },
  apply(input, ctx = {}) {
    const { doc, room } = withRoom(ensureBase(input));
    const chans = ["h1", "h2"];
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "heatingActuator"),
          name: t`Heating actuator`,
          address: freeAddress(doc, ctx.line),
          kind: "heatingActuator",
          behavior: "heatingActuator/v1",
          objects: chans.flatMap((c, i) => [
            {
              id: `${c}v`,
              name: t`H${i + 1} control value`,
              ga: [],
              dpt: "5.001",
              port: "value",
              channel: c,
              flags: flags(true, false),
            },
            {
              id: `${c}s`,
              name: t`H${i + 1} control value status`,
              ga: [],
              dpt: "5.001",
              port: "valueStatus",
              channel: c,
              flags: flags(false, true),
            },
          ]),
          channels: chans.map((c, i) => ({
            id: c,
            label: `H${i + 1}`,
            equipment: { type: "radiator", room },
          })),
        },
      ],
    };
  },
};

export const heatingActuatorDesigner: DesignerContribution = {
  messages: { fr: heatingActuatorDesignerFr },
  behavior: "heatingActuator/v1",
  category: "actuators",
  templates: [heatingActuator],
  typeLabel: (d) => {
    const n = (d.channels ?? []).length;
    return n === 1
      ? t`Heating actuator · 1 output`
      : t`Heating actuator · ${n} outputs`;
  },
};
