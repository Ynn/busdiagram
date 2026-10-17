// A registry as a consumer of the 0.7 API builds it (without manufacturers' products)
// still runs a scenario.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import type { Registry } from "../../src/knx/registry";
import { captureRegistry } from "../../src/knx/registry";

describe("registry of the 0.7 API", () => {
  it("needs no manufacturers' products", () => {
    const r = captureRegistry();
    const registry: Registry = {
      behaviors: r.behaviors,
      equipment: r.equipment,
      viewSizes: r.viewSizes,
    };
    expect(registry.bcuProducts).toBeUndefined();
    const sim = createSimulator(
      {
        formatVersion: 2,
        lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }],
        devices: [],
        groupAddresses: [],
      },
      { registry },
    );
    expect(() => sim.advance(100)).not.toThrow();
  });
});
