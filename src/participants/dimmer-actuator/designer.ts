// Dimmer actuator in the designer: catalog entry, templates, and displayed type.
// Designer entry of the participant: never imported by its model or the library.
import type { DesignerContribution } from "../../../site/designer/snippet-kit";
import { t } from "../../../site/designer/lang";
import { dimmerActuatorDesignerFr } from "./designer.fr";
import { dimmerTemplate } from "../shared/dimming-designer";

export const dimmerActuatorDesigner: DesignerContribution = {
  objectIds: { status: { prefix: "status", numbered: "several" } },
  messages: { fr: dimmerActuatorDesignerFr },
  behavior: "dimmerActuator/v1",
  category: "actuators",
  templates: [dimmerTemplate(false)],
  typeLabel: (d) => {
    const n = (d.channels ?? []).length;
    return n === 1 ? t`Dimmer · 1 output` : t`Dimmer · ${n} outputs`;
  },
};
