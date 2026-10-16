// What an export to share keeps of the memory of a manufacturer's device: its system part,
// tables and parameters, but not the application code that ETS writes from the catalog.
import { describe, expect, it } from "vitest";
import { createSimulator, registerParticipant } from "../../src/core";
import { captureRegistry } from "../../src/knx/registry";
import { parseMemory } from "../../src/knx/installation";
import { shareableMemory } from "../../src/knxprod/database";
import { installPackage } from "../../site/designer/packages";
import { addProductDevice } from "../../site/designer/ets-device";
import { shareableScenario } from "../../site/designer/manufacturers";
import { SAMPLE_PRODUCTS } from "./fixtures/sample-devices/products";

SAMPLE_PRODUCTS.forEach((p) => registerParticipant(p.model));
installPackage({
  manifest: { format: "bdpkg/1", name: "samples", version: "1", products: [] },
  script: "",
  databases: new Map(SAMPLE_PRODUCTS.map((p) => [p.behavior, p.database])),
  scenarios: [],
});
const sa2 = SAMPLE_PRODUCTS.find((p) => p.behavior === "example.sa2/v1")!;

// SA 2 (BCU1, EEPROM 100h–1FFh): its parameters at 164h–165h, code from 170h.
const PARAMETER = 0x164;
const CODE = 0x1f0;

describe("export to share", () => {
  it("keeps the header, the tables and the parameters, not the code", () => {
    const mem = new Uint8Array(0x200);
    mem[0x104] = 0x02; // manufacturer of the program
    mem[0x116] = 0x03; // length of the address table
    mem[PARAMETER] = 0x81;
    mem[CODE] = 0xc3;
    const out = shareableMemory(sa2.database, mem);
    expect(out[0x104]).toBe(0x02);
    expect(out[0x116]).toBe(0x03);
    expect(out[PARAMETER]).toBe(0x81);
    expect(out[CODE]).toBe(0);
  });

  it("gives a scenario that loads with what the device runs from", () => {
    const doc = {
      formatVersion: 2,
      lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }],
      devices: [] as unknown[],
      groupAddresses: [],
    } as unknown as Parameters<typeof addProductDevice>[0];
    const id = addProductDevice(
      doc,
      "example.sa2/v1",
      captureRegistry(),
      "1.1",
    );
    const sim = createSimulator({
      ...doc,
      installation: { devices: [{ device: id, address: "1.1.1" }] },
    });
    // A download: a parameter, and the code of the program.
    sim.writeMemory(id, PARAMETER, [0x81]);
    sim.writeMemory(id, CODE, [0xc3]);
    sim.restartDevice(id);
    const saved = { ...doc, installation: sim.installation() };

    const shared = shareableScenario(saved) as typeof saved;
    const held = (s: typeof saved) =>
      parseMemory(
        (s.installation!.devices as { device: string; memory?: unknown }[])[0]!
          .memory,
      )!;
    expect(held(saved)[CODE]).toBe(0xc3);
    expect(held(shared)[CODE]).toBe(0);
    expect(held(shared)[PARAMETER]).toBe(0x81);
    // The private save keeps everything; the shared scenario still runs.
    const again = createSimulator(shared);
    expect(again.memory(id)![PARAMETER]).toBe(0x81);
    expect(again.memory(id)![CODE]).toBe(0);
  });
});
