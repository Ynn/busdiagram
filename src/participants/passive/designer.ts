// Device without logic in the designer: catalog entry, templates, and displayed type.
// Designer entry of the participant: never imported by its model or the library.
import type { DesignerContribution } from "../../../site/designer/snippet-kit";
import { t } from "../../../site/designer/lang";
import { passiveDesignerFr } from "./designer.fr";

export const passiveDesigner: DesignerContribution = {
  messages: { fr: passiveDesignerFr },
  behavior: "passive/v1",
  templates: [],
  typeLabel: () => t`Device without logic`,
};
