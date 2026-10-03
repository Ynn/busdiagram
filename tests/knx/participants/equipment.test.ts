// Equipment: the layout reads the sizes of the views from the model entries, without the
// views; they are the sizes the views declare.
import { describe, expect, it } from "vitest";
import {
  captureRegistry,
  registerParticipant,
  restoreRegistry,
  saveRegistry,
} from "../../../src/knx/registry";
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

describe("view sizes and the registry snapshots", () => {
  it("restoring the registry restores the sizes, added or replaced", () => {
    const saved = saveRegistry();
    registerParticipant({
      viewSizes: {
        lamp: { width: 999, height: 888 },
        probeView: { width: 10, height: 10 },
      },
    });
    expect(captureRegistry().viewSizes.get("lamp")).toEqual({
      width: 999,
      height: 888,
    });
    restoreRegistry(saved);
    expect(captureRegistry().viewSizes.get("lamp")).toEqual({
      width: 84,
      height: 32,
    });
    expect(captureRegistry().viewSizes.has("probeView")).toBe(false);
  });
});
