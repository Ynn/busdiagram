// Equipment: the layout reads the sizes of the views from the model entries, without the
// views; they are the sizes the views declare.
import { describe, expect, it } from "vitest";
import { captureRegistry } from "../../../src/knx/registry";
import { STANDARD_VIEWS } from "../../../src/ui/standard-views";

describe("sizes of the equipment views", () => {
  it("are known to the registry, as the views declare them", () => {
    const sizes = captureRegistry().viewSizes;
    expect([...sizes.keys()].sort()).toEqual(
      Object.keys(STANDARD_VIEWS).sort(),
    );
    for (const [id, view] of Object.entries(STANDARD_VIEWS))
      expect(sizes.get(id), id).toEqual(view.size);
  });
});
