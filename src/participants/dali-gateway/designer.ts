// KNX/DALI gateway in the designer: catalog entry, templates, and displayed type.
// Designer entry of the participant: never imported by its model or the library.
import type { DesignerContribution } from "../../../site/designer/snippet-kit";
import { t } from "../../../site/designer/lang";
import { daliGatewayDesignerFr } from "./designer.fr";
import { dimmerTemplate } from "../shared/dimming-designer";

export const daliGatewayDesigner: DesignerContribution = {
  objectIds: { status: { prefix: "status", numbered: "several" } },
  messages: { fr: daliGatewayDesignerFr },
  behavior: "daliGateway/v1",
  category: "actuators",
  templates: [dimmerTemplate(true)],
  typeLabel: (d) => {
    const n = (d.channels ?? []).length;
    return n === 1 ? t`DALI gateway · 1 group` : t`DALI gateway · ${n} groups`;
  },
};
