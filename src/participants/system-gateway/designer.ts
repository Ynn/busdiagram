// Gateway to another system in the designer: catalog entry, templates, and displayed type.
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
import { systemGatewayDesignerFr } from "./designer.fr";

/** Gateway to another building system: one value from it, one command to it. */
const systemGateway: Snippet = {
  id: "systemGateway",
  get label() {
    return t`Gateway to another system`;
  },
  get hint() {
    return t`Boundary with Modbus, BACnet, or M-Bus: a value from the other system (9.001) is entered and sent on KNX; a command (1.001) is received and forwarded. The other system is not simulated.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "gateway"),
          name: t`Gateway to another system`,
          address: freeAddress(doc, ctx.line),
          kind: "gateway",
          behavior: "systemGateway/v1",
          parameters: { system: "Modbus" },
          objects: [
            {
              id: "v1",
              name: t`Value from the other system`,
              ga: [],
              dpt: "9.001",
              port: "value",
              flags: flags(false, true),
            },
            {
              id: "c1",
              name: t`Command to the other system`,
              ga: [],
              dpt: "1.001",
              port: "command",
              flags: flags(true, false),
            },
          ],
          inputs: [
            {
              id: "v1",
              type: "number",
              label: t`Value`,
              object: "v1",
              min: 0,
              max: 100,
              step: 1,
            },
          ],
        },
      ],
    };
  },
};

export const systemGatewayDesigner: DesignerContribution = {
  messages: { fr: systemGatewayDesignerFr },
  behavior: "systemGateway/v1",
  category: "supervision",
  templates: [systemGateway],
  typeLabel: () => t`Gateway to another system`,
};
