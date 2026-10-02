// Room thermostat in the designer: catalog entry, templates, and displayed type.
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
import { roomThermostatDesignerFr } from "./designer.fr";

/** Room thermostat: temperature and control value on new addresses. */
const thermostat: Snippet = {
  id: "roomThermostat",
  get label() {
    return t`Room thermostat`;
  },
  get hint() {
    return t`PI control of its room: temperature (9.001), heating control value (5.001), mode (20.102), window and presence; link its objects to group addresses.`;
  },
  apply(input, ctx = {}) {
    const { doc, room } = withRoom(ensureBase(input));
    const o = (
      id: string,
      name: string,
      ga: string | string[],
      dpt: string,
      port: string,
      out: boolean,
    ) => ({ id, name, ga, dpt, port, flags: flags(!out, out) });
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "roomThermostat"),
          name: t`Room thermostat`,
          address: freeAddress(doc, ctx.line),
          kind: "thermostat",
          behavior: "roomThermostat/v1",
          room,
          objects: [
            o("temp", t`Measured temperature`, [], "9.001", "actualTemp", true),
            o("base", t`Base setpoint`, [], "9.001", "baseSetpoint", false),
            o("mode", t`Mode (preset)`, [], "20.102", "hvacMode", false),
            {
              ...o("presence", t`Presence`, [], "1.018", "presence", false),
              flags: flags(true, true),
            },
            o("win", t`Window`, [], "1.019", "window", false),
            o(
              "val",
              t`Heating control value`,
              [],
              "5.001",
              "heatingValue",
              true,
            ),
          ],
          buttons: [
            {
              id: "presence",
              label: t`Presence`,
              icon: "presence",
              press: { object: "presence", value: "toggle" },
              led: "presence",
            },
          ],
        },
      ],
    };
  },
};

export const roomThermostatDesigner: DesignerContribution = {
  messages: { fr: roomThermostatDesignerFr },
  behavior: "roomThermostat/v1",
  category: "controls",
  templates: [thermostat],
  typeLabel: () => t`Room thermostat`,
};
