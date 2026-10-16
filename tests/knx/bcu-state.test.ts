// The state of a manufacturer's device that ETS programs, kept by its BCU: what a download
// changed is kept by that device only, and its programming mode and individual address are
// those of its memory after the restart that ends a download.
import { describe, expect, it } from "vitest";
import { createSimulator, registerParticipant } from "../../src/core";
import { bcu1 } from "../../src/bcu";
import { captureRegistry } from "../../src/knx/registry";
import { installPackage } from "../../site/designer/packages";
import { addProductDevice } from "../../site/designer/ets-device";
import { SAMPLE_PRODUCTS } from "./fixtures/sample-devices/products";

SAMPLE_PRODUCTS.forEach((p) => registerParticipant(p.model));
installPackage({
  manifest: { format: "bdpkg/1", name: "samples", version: "1", products: [] },
  script: "",
  databases: new Map(SAMPLE_PRODUCTS.map((p) => [p.behavior, p.database])),
  scenarios: [],
});

/** Two SA 2 at 1.1.1 and 1.1.2, with commissioning. */
function twoDevices() {
  const doc = {
    formatVersion: 2,
    lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }],
    devices: [] as unknown[],
    groupAddresses: [],
  } as unknown as Parameters<typeof addProductDevice>[0];
  const ids = [0, 1].map(() =>
    addProductDevice(doc, "example.sa2/v1", captureRegistry(), "1.1"),
  );
  const raw = {
    ...doc,
    installation: {
      devices: ids.map((device, n) => ({ device, address: `1.1.${n + 1}` })),
    },
  };
  return { ids: ids as [string, string], sim: createSimulator(raw) };
}

const held = (sim: ReturnType<typeof createSimulator>, id: string) =>
  (sim.installation()!.devices as { device: string; memory?: unknown }[]).find(
    (d) => d.device === id,
  )?.memory;

describe("BCU of a device", () => {
  it("keeps a download of its own, whatever device restarts first", () => {
    const { sim, ids } = twoDevices();
    const [a, b] = ids;
    sim.writeMemory(a, 0x164, [0x81]);
    // B restarts without a download: A's change stays pending, B keeps nothing.
    sim.restartDevice(b);
    expect(held(sim, b)).toBeUndefined();
    sim.restartDevice(a);
    expect(held(sim, a)).toBeDefined();
    expect(sim.memory(a)![0x164]).toBe(0x81);
  });

  it("leaves programming mode in its memory too when it restarts", () => {
    const { sim, ids } = twoDevices();
    const [a] = ids;
    sim.pressProgrammingButton(a);
    sim.writeMemory(a, 0x164, [1]);
    sim.restartDevice(a);
    expect(sim.programmingMode(a)).toBe(false);
    expect(sim.memory(a)![0x60]! & 1).toBe(0);
    // A later write does not bring it back.
    sim.writeMemory(a, 0x165, [2]);
    expect(sim.programmingMode(a)).toBe(false);
  });

  it("answers at the individual address that a download wrote", () => {
    const { sim, ids } = twoDevices();
    const [a] = ids;
    sim.writeMemory(a, 0x117, [0x12, 0x34]);
    sim.restartDevice(a);
    expect(bcu1.individualAddress(sim.bcu(a)!.state)).toBe(0x1234);
    expect(sim.physicalAddress(a)).toBe("1.2.52");
  });
});
