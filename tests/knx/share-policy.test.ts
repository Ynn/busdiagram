// What a scenario shares of the memory of its manufacturers' devices, whatever the host
// that shares it (designer, component link, player): what their product database tells
// apart, and nothing when no database does.
import { describe, expect, it } from "vitest";
import type { ProductDatabase } from "../../src/knxprod/database";
import { setProductDatabase, shareableScenario } from "../../src/knxprod/share";
import { memoryJson, parseMemory } from "../../src/knx/installation";
import { SAMPLE_PRODUCTS } from "./fixtures/sample-devices/products";

const sa2 = SAMPLE_PRODUCTS.find((p) => p.behavior === "example.sa2/v1")!;

/** A memory with a marker at C000h, outside what the database knows. */
function marked() {
  const mem = new Uint8Array(0x10000);
  mem.set([0xde, 0xad, 0xbe, 0xef], 0xc000);
  return memoryJson(mem);
}

const scenario = () => ({
  devices: [
    { id: "sa", behavior: "example.sa2/v1", ets: { memory: marked() } },
  ],
  installation: { devices: [{ device: "sa", memory: marked() }] },
});

describe("shareable scenario", () => {
  it("keeps only what the product database tells apart", () => {
    setProductDatabase("example.sa2/v1", sa2.database as ProductDatabase);
    const { data, unshared } = shareableScenario(scenario());
    expect(unshared).toEqual([]);
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/DEADBEEF/i);
    const d = data as ReturnType<typeof scenario>;
    expect(parseMemory(d.installation.devices[0]!.memory)?.[0xc000] ?? 0).toBe(
      0,
    );
  });

  it("shares no memory of a product without database", () => {
    setProductDatabase("example.sa2/v1", null);
    const { unshared } = shareableScenario(scenario());
    expect(unshared).toEqual(["sa"]);
  });
});
