// Templates of the dimmer actuator and the KNX/DALI gateway in the designer.
import type { Snippet } from "../../../site/designer/snippet-kit";
import {
  ensureBase,
  flags,
  freeAddress,
  freeId,
} from "../../../site/designer/snippet-kit";
import { t } from "../../../site/designer/lang";

/** Objects for a dimmer channel (switch, dim, value, and feedback), without addresses. */
function dimObjects(ch: string, label: string, dali: boolean) {
  const o = (
    id: string,
    name: string,
    dpt: string,
    port: string,
    out = false,
  ) => ({
    id: `${ch}${id}`,
    name: `${label} ${name}`,
    ga: [],
    dpt,
    port,
    channel: ch,
    flags: flags(!out, out),
  });
  return [
    o("s", t`switching`, "1.001", "switch"),
    o("d", t`dimming`, "3.007", "dim"),
    o("v", t`value`, "5.001", "value"),
    o("e", t`status`, "1.001", "status", true),
    o("ev", t`value status`, "5.001", "valueStatus", true),
    ...(dali ? [o("err", t`fault`, "1.005", "error", true)] : []),
  ];
}

export function dimmerTemplate(dali: boolean): Snippet {
  return {
    id: dali ? "dali" : "dim",
    get label() {
      return dali ? t`DALI gateway (2 groups)` : t`Dimmer`;
    },
    get hint() {
      return dali
        ? t`Two DALI groups (ballasts A0–A1 and A2–A3): switching, dimming, value, status and fault per group; fill in the group addresses.`
        : t`One dimmable output: switching, dimming, value and status; fill in the group addresses.`;
    },
    apply(input, ctx = {}) {
      const doc = ensureBase(input);
      const groups = dali
        ? [
            { id: "g1", label: t`Group 1`, first: 0 },
            { id: "g2", label: t`Group 2`, first: 2 },
          ]
        : [{ id: "s1", label: "L1", first: 0 }];
      return {
        ...doc,
        devices: [
          ...doc.devices!,
          {
            id: freeId(doc, dali ? "dali" : "dimmerActuator"),
            name: dali ? t`DALI gateway` : t`Dimmer`,
            address: freeAddress(doc, ctx.line),
            kind: dali ? "daliGateway" : "dimmerActuator",
            behavior: dali ? "daliGateway/v1" : "dimmerActuator/v1",
            objects: groups.flatMap((g) => dimObjects(g.id, g.label, dali)),
            channels: groups.map((g) => ({
              id: g.id,
              label: g.label,
              equipment: dali
                ? {
                    type: "daliGroup",
                    parameters: { ballasts: 2, firstAddress: g.first },
                  }
                : { type: "dimmableLamp" },
            })),
          },
        ],
      };
    },
  };
}
