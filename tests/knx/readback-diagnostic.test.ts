// The diagnostic of a memory that the parameters of a device do not explain belongs to
// that memory: another project with a device of the same identifier does not show it,
// an edit that writes what the pages show removes it, and undoing the edit brings it
// back, whatever was computed before.
import { describe, expect, it } from "vitest";
import { registerParticipant } from "../../src/core";
import { captureRegistry } from "../../src/knx/registry";
import { memoryJson, parseMemory } from "../../src/knx/installation";
import { installPackage } from "../../site/designer/packages";
import {
  addProductDevice,
  setEtsParameter,
  unexplainedOf,
} from "../../site/designer/ets-device";
import { programOfProduct } from "../../site/designer/manufacturers";
import { SAMPLE_PRODUCTS } from "./fixtures/sample-devices/products";

SAMPLE_PRODUCTS.forEach((p) => registerParticipant(p.model));
installPackage({
  manifest: { format: "bdpkg/1", name: "samples", version: "1", products: [] },
  script: "",
  databases: new Map(SAMPLE_PRODUCTS.map((p) => [p.behavior, p.database])),
  scenarios: [],
});

type Doc = Parameters<typeof addProductDevice>[0];
const project = () =>
  ({
    formatVersion: 2,
    lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }],
    devices: [],
    groupAddresses: [],
  }) as unknown as Doc;
const sa2 = programOfProduct("example.sa2/v1")!;

/** A project with an SA 2; `odd`: its memory holds 3 for the recovery of output A. */
function withSa2(odd: boolean) {
  const doc = project();
  const id = addProductDevice(doc, "example.sa2/v1", captureRegistry(), "1.1");
  const d = doc.devices.find((x) => x.id === id)!;
  const ets = d.ets as unknown as { memory: unknown };
  if (odd) {
    const mem = parseMemory(ets.memory)!;
    mem[0x164] = mem[0x164]! | 0x03;
    ets.memory = memoryJson(mem);
  }
  return { doc, id, d, ets };
}

describe("the diagnostic of a memory read back", () => {
  it("is that of the memory of the device shown, not of a device of the same identifier", () => {
    const a = withSa2(true);
    const b = withSa2(false);
    expect(a.id).toBe(b.id);
    expect(new Set(unexplainedOf(a.d, sa2).map((u) => u.address))).toEqual(
      new Set([0x164]),
    );
    expect(unexplainedOf(b.d, sa2)).toEqual([]);
    // Shown again from the same memory, as after a new start of the designer.
    expect(unexplainedOf(structuredClone(a.d), sa2).length).toBeGreaterThan(0);
  });

  it("goes with an edit that writes what the pages show, and comes back when it is undone", () => {
    const a = withSa2(true);
    const before = structuredClone(a.ets.memory);
    setEtsParameter(a.doc, a.id, sa2, captureRegistry(), "P-1_R-1", "1");
    expect(unexplainedOf(a.d, sa2)).toEqual([]);
    a.ets.memory = before;
    expect(unexplainedOf(a.d, sa2).length).toBeGreaterThan(0);
  });
});
