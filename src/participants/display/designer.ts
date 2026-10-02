// Display in the designer: catalog entry, templates, and displayed type.
// Designer entry of the participant: never imported by its model or the library.
import type {
  DesignerContribution,
  Json,
  Snippet,
} from "../../../site/designer/snippet-kit";
import { ensureBase, freeId } from "../../../site/designer/snippet-kit";
import { t } from "../../../site/designer/lang";
import { displayDesignerFr } from "./designer.fr";

const template: Snippet = {
  id: "sup",
  get label() {
    return t`IP supervisor`;
  },
  get hint() {
    return t`Display on the IP network; adds the KNXnet/IP routers if missing.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    void ctx;
    const topology = (doc.topology ?? {}) as Json;
    return {
      ...doc,
      // KNXnet/IP routers used as line couplers for one line, or area couplers otherwise.
      ...(doc.ipRouter || topology.ip
        ? {}
        : {
            topology: {
              ...topology,
              ip:
                doc.lines!.length === 1 &&
                !topology.backbone &&
                !topology.mainLines
                  ? "lineCouplers"
                  : "areaCouplers",
            },
          }),
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "sup"),
          name: t`Supervisor`,
          kind: "supervisor",
          medium: "IP",
          behavior: "display/v1",
          objects: [],
        },
      ],
    };
  },
};

export const displayDesigner: DesignerContribution = {
  messages: { fr: displayDesignerFr },
  behavior: "display/v1",
  category: "supervision",
  templates: [template],
  typeLabel: (d) => {
    return d.kind === "supervisor" ? t`IP supervisor` : t`Display`;
  },
};
