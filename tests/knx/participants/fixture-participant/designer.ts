// Designer entry of the test beacon: catalog entry, template, displayed type.
import type {
  DesignerContribution,
  Snippet,
} from "../../../../site/designer/snippet-kit";
import {
  ensureBase,
  freeAddress,
  freeId,
} from "../../../../site/designer/snippet-kit";

const template: Snippet = {
  id: "testBeacon",
  label: "Test beacon",
  hint: "A beacon that sends 1 when it is pressed.",
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "beacon"),
          name: "Beacon",
          address: freeAddress(doc, ctx.line),
          kind: "beacon",
          behavior: "test.beacon/v1",
          objects: [],
        },
      ],
    };
  },
};

export const beaconDesigner: DesignerContribution = {
  behavior: "test.beacon/v1",
  category: "sensors",
  templates: [template],
  typeLabel: () => "Test beacon",
};
