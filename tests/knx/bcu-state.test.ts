// The state of a manufacturer's device that ETS programs, kept by its BCU: what a download
// changed is kept by that device only, and its programming mode and individual address are
// those of its memory after the restart that ends a download.
import { describe, expect, it } from "vitest";
import { createSimulator, registerParticipant } from "../../src/core";
import { bcu1, bcuState, system7 } from "../../src/bcu";
import { runsProduct } from "../../src/bcu/device";
import { parseMemory } from "../../src/knx/installation";
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

describe("application of a device", () => {
  /** The memory of a project with one device of a product, and the product. */
  const projectOf = (behavior: string) => {
    const doc = {
      formatVersion: 2,
      lines: [{ address: "1.1" }],
      devices: [] as unknown[],
      groupAddresses: [],
    } as unknown as Parameters<typeof addProductDevice>[0];
    addProductDevice(doc, behavior, captureRegistry(), "1.1");
    const d = doc.devices[0] as unknown as {
      ets: { memory: unknown; mask: string };
    };
    const product = SAMPLE_PRODUCTS.find((p) => p.behavior === behavior)!;
    return {
      mem: parseMemory(d.ets.memory)!,
      mask: d.ets.mask,
      product: product.model.bcuProducts![0]!,
    };
  };

  it("runs only a program of its product: BCU1, by its manufacturer", () => {
    const { mem, mask, product } = projectOf("example.sa2/v1");
    expect(runsProduct(product, mask, mem)).toBe(true);
    mem[0x104] = 0x77;
    expect(runsProduct(product, mask, mem)).toBe(false);
  });

  it("runs only a program of its product: System 7, by its identifier", () => {
    const { mem, mask, product } = projectOf("example.be1/v1");
    expect(runsProduct(product, mask, mem)).toBe(true);
    // Another version, another type of the same manufacturer.
    const version = mem.slice();
    version[0xb6f8] = 0x11;
    expect(runsProduct(product, mask, version)).toBe(false);
    const type = mem.slice();
    type[0xb6f7] = 0x03;
    expect(runsProduct(product, mask, type)).toBe(false);
    // Not loaded.
    const unloaded = mem.slice();
    unloaded[0xb6ec] = 0;
    expect(runsProduct(product, mask, unloaded)).toBe(false);
  });
});

describe("load state machines of a BIM M112 of mask 0705h", () => {
  it("load through the property PID_LOAD_STATE_CONTROL of each part", () => {
    const s = bcuState(0x0705);
    // Unload, load, allocate the association table at 4100h, load completed.
    const control = (object: number, record: number[]) =>
      system7.writeProperty!(s, object, 5, 1, 1, record);
    expect(control(2, [4, ...Array(9).fill(0)])).toEqual([0]);
    expect(control(2, [1, ...Array(9).fill(0)])).toEqual([2]);
    control(2, [3, 0, 0, 0x41, 0x00, 0, 0, 0, 0, 0]);
    expect(control(2, [2, ...Array(9).fill(0)])).toEqual([1]);
    expect(system7.readProperty(s, 2, 5, 1, 1)).toEqual([1]);
    expect(system7.readProperty(s, 2, 7, 1, 1)).toEqual([0x41, 0x00]);
  });
});
