// Manufacturers' devices that a package of devices (.bdpkg) brings, with the products of
// an imaginary manufacturer (fixtures/sample-devices): the package read and checked, its
// products inserted as ETS inserts them, and downloaded by the load procedure of their
// mask — memory writes verified by reads on a BCU1, Load State Machines on a BIM M112.
import { beforeAll, describe, expect, it } from "vitest";
import { createSimulator, registerParticipant, version } from "../../src/core";
import { bcu1, bcuState } from "../../src/bcu";
import { projectImage, valuesOf } from "../../src/knxprod/runtime";
import { programOf } from "../../src/knxprod/database";
import { DeviceManagement, decodeLData } from "../../src/knx/management";
import type { LDataFrame } from "../../src/knx/management";
import { captureRegistry } from "../../src/knx/registry";
import { buildScenario } from "../../src/knx/scenario";
import { cardHeight, drawnObjects } from "../../src/knx/layout";
import {
  databaseOf,
  forgetPackage,
  installPackage,
  readPackage,
  scriptFor,
} from "../../site/designer/packages";
import { programOfProduct } from "../../site/designer/manufacturers";
import {
  addProductDevice,
  applyConfiguration,
  projectFromInstallation,
} from "../../site/designer/ets-device";
import { installationAsProject } from "../../src/knx/commissioning";
import { SAMPLE_PRODUCTS } from "./fixtures/sample-devices/products";

// ── A package, as a package's build writes it (entries stored) ──────────────

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b: Uint8Array) => {
  let c = 0xffffffff;
  for (const x of b) c = crcTable[(c ^ x) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function zip(files: Record<string, string>): Uint8Array {
  const enc = new TextEncoder();
  const local: number[] = [];
  const central: number[] = [];
  const u16 = (a: number[], v: number) => a.push(v & 0xff, (v >> 8) & 0xff);
  const u32 = (a: number[], v: number) => {
    u16(a, v & 0xffff);
    u16(a, v >>> 16);
  };
  const entries = Object.entries(files);
  for (const [name, text] of entries) {
    const n = enc.encode(name);
    const data = enc.encode(text);
    const crc = crc32(data);
    const offset = local.length;
    const head = (a: number[], sig: number, isCentral: boolean) => {
      u32(a, sig);
      if (isCentral) u16(a, 20);
      [20, 0, 0, 0, 0].forEach((v) => u16(a, v));
      u32(a, crc);
      u32(a, data.length);
      u32(a, data.length);
      u16(a, n.length);
      u16(a, 0);
      if (isCentral) {
        [0, 0, 0].forEach((v) => u16(a, v));
        u32(a, 0);
        u32(a, offset);
      }
      a.push(...n);
    };
    head(local, 0x04034b50, false);
    local.push(...data);
    head(central, 0x02014b50, true);
  }
  const end: number[] = [];
  u32(end, 0x06054b50);
  [0, 0, entries.length, entries.length].forEach((v) => u16(end, v));
  u32(end, central.length);
  u32(end, local.length);
  u16(end, 0);
  return new Uint8Array([...local, ...central, ...end]);
}

const manifest = {
  format: "bdpkg/1",
  name: "example-devices",
  version: "1.0.0",
  busdiagram: "0.1.0",
  products: SAMPLE_PRODUCTS.map((p) => ({
    behavior: p.behavior,
    manufacturer: p.manufacturer,
    name: p.name,
    database: `databases/${p.behavior.replace(/\W/g, "-")}.json`,
  })),
  scenarios: [
    {
      id: "example",
      file: "scenarios/example.json",
      title: { en: "Example", fr: "Exemple" },
      translations: { fr: "scenarios/example.fr.json" },
    },
  ],
};

const packageFiles = (): Record<string, string> => ({
  "manifest.json": JSON.stringify(manifest),
  "devices.js": "BusDiagram.registerParticipant({});",
  ...Object.fromEntries(
    SAMPLE_PRODUCTS.map((p, i) => [
      manifest.products[i]!.database,
      JSON.stringify(p.database),
    ]),
  ),
  "scenarios/example.json": JSON.stringify({ formatVersion: 2, devices: [] }),
  "scenarios/example.fr.json": JSON.stringify({ Example: "Exemple" }),
});

describe("package of devices (.bdpkg)", () => {
  it("is read with its products' databases and its examples", async () => {
    const p = await readPackage(zip(packageFiles()), version);
    expect(p.manifest.name).toBe("example-devices");
    expect(p.script).toContain("registerParticipant");
    expect([...p.databases.keys()]).toEqual([
      "example.sa2/v1",
      "example.be1/v1",
    ]);
    expect(p.databases.get("example.sa2/v1")!.mask).toBe("MV-0012");
    expect(p.scenarios).toEqual([
      {
        id: "example",
        title: { en: "Example", fr: "Exemple" },
        data: { formatVersion: 2, devices: [] },
        translations: { fr: { Example: "Exemple" } },
      },
    ]);
    // Installed, its databases give the designer the programs of its products.
    installPackage(p);
    expect(databaseOf("example.be1/v1")?.id).toBe("M-00FE_A-0002-10-0000");
    expect(programOfProduct("example.sa2/v1")?.name).toBe(
      "Switch actuator 2-fold",
    );
    forgetPackage("example-devices");
    expect(programOfProduct("example.sa2/v1")).toBeUndefined();
  });

  it("is refused, saying why, when it is not one", async () => {
    const refused = (files: Record<string, string>, lib = version) =>
      readPackage(zip(files), lib).then(
        () => "",
        (e: Error) => e.message,
      );
    await expect(
      readPackage(new TextEncoder().encode("not a zip"), version),
    ).rejects.toThrow(/not a zip file/);
    const f = packageFiles();
    expect(
      await refused({ ...f, "manifest.json": '{"format":"other"}' }),
    ).toMatch(/format bdpkg\/1 expected/);
    expect(await refused({ ...f, "manifest.json": "{" })).toMatch(
      /manifest.json of the package is not JSON/,
    );
    const { "devices.js": _, ...noScript } = f;
    void _;
    expect(await refused(noScript)).toMatch(/no file devices.js/);
    const { [manifest.products[0]!.database]: __, ...noDatabase } = f;
    void __;
    expect(await refused(noDatabase)).toMatch(/no file databases\//);
    expect(
      await refused({ ...f, [manifest.products[1]!.database]: "{}" }),
    ).toMatch(/is not a product database/);
    expect(await refused(f, "0.0.9")).toMatch(
      /needs BusDiagram 0\.1\.0 or later \(this is 0\.0\.9\)/,
    );
    // A package that names its contract: the contract decides, not the version.
    const withApi = (api: number) => ({
      ...f,
      "manifest.json": JSON.stringify({
        ...manifest,
        busdiagram: "9.0.0",
        api,
      }),
    });
    expect(await refused(withApi(1))).toBe("");
    expect(await refused(withApi(99))).toMatch(/needs the contract 99/);
  });

  it("gives an export the scripts of the products its scenario uses", async () => {
    const byProduct = {
      ...packageFiles(),
      "manifest.json": JSON.stringify({
        ...manifest,
        common: "scripts/common.js",
        products: manifest.products.map((p, i) => ({
          ...p,
          script: `scripts/p${i}.js`,
        })),
      }),
      "scripts/common.js": "/* common */",
      "scripts/p0.js": "/* sa2 */",
      "scripts/p1.js": "/* be1 */",
    };
    const p = await readPackage(zip(byProduct), version);
    installPackage(p);
    expect(scriptFor("example-devices", new Set(["example.be1/v1"]))).toBe(
      "/* common */;\n/* be1 */",
    );
    forgetPackage("example-devices");
    expect(
      scriptFor("example-devices", new Set(["example.be1/v1"])),
    ).toBeNull();
    // Without scripts by product: none (the whole script is embedded).
    installPackage(await readPackage(zip(packageFiles()), version));
    expect(
      scriptFor("example-devices", new Set(["example.be1/v1"])),
    ).toBeNull();
    forgetPackage("example-devices");
  });

  it("leaves the former version installed when the new one does not run", async () => {
    const p = await readPackage(zip(packageFiles()), version);
    installPackage(p);
    const next = {
      ...p,
      databases: new Map([...p.databases].slice(0, 1)),
      scenarios: [],
    };
    const undo = installPackage(next);
    expect(databaseOf("example.be1/v1")).toBeUndefined();
    undo();
    expect(databaseOf("example.be1/v1")?.id).toBe("M-00FE_A-0002-10-0000");
    expect(databaseOf("example.sa2/v1")).toBeDefined();
    forgetPackage("example-devices");
    // A first version that does not run leaves nothing.
    installPackage(p)();
    expect(databaseOf("example.sa2/v1")).toBeUndefined();
  });
});

// ── Downloads by ETS ─────────────────────────────────────────────────────────

SAMPLE_PRODUCTS.forEach((p) => registerParticipant(p.model));

/** The databases installed, as the import of the package installs them. */
const installed = () =>
  installPackage({
    manifest: { ...manifest, scenarios: [] },
    script: "",
    databases: new Map(SAMPLE_PRODUCTS.map((p) => [p.behavior, p.database])),
    scenarios: [],
  });

const ETS = (15 << 12) | (15 << 8) | 251;
/** What the program of the BE 1 writes in its property 3/204: 2 elements of 5 octets. */
const OWN = [0, 0, 0x42, 0, 0, 0, 0, 0xde, 0xff, 0];

/** A management client that speaks as ETS: connection, numbered data, reads back. */
function client(m: DeviceManagement, to: number) {
  let seq = 0;
  const frame = (tpdu: number[]): LDataFrame => ({
    messageCode: 0x11,
    ctrl1: 0xb0,
    source: ETS,
    destination: to,
    group: false,
    hopCount: 6,
    tpdu,
  });
  const data = (apdu: number[]) => {
    const tpdu = [0x40 | (seq << 2) | apdu[0]!, ...apdu.slice(1)];
    seq = (seq + 1) & 15;
    const out = m.handle(frame(tpdu)).map((f) => decodeLData(f)!);
    expect(out[0]!.tpdu[0]! & 0xc3).toBe(0xc2);
    // ETS acknowledges the answer.
    if (out[1]) m.handle(frame([0xc2 | (out[1].tpdu[0]! & 0x3c)]));
    return out[1]?.tpdu;
  };
  return {
    connect: () => m.handle(frame([0x80])),
    disconnect: () => m.handle(frame([0x81])),
    descriptor: () => data([0x03, 0x00]),
    write(address: number, bytes: number[]) {
      for (let i = 0; i < bytes.length; i += 12) {
        const part = bytes.slice(i, i + 12);
        const a = address + i;
        expect(
          data([0x02, 0x80 | part.length, a >> 8, a & 0xff, ...part]),
        ).toBeUndefined();
        // Verify: read back what was written.
        const back = data([0x02, part.length, a >> 8, a & 0xff]);
        expect(back!.slice(4)).toEqual(part);
      }
    },
    /** A_Memory_Write that announces `count` octets and carries `bytes`. */
    announce: (address: number, count: number, bytes: number[]) =>
      data([0x02, 0x80 | count, address >> 8, address & 0xff, ...bytes]),
    /** A_Memory_Write without reading back (load controls of a BIM M112). */
    control: (address: number, bytes: number[]) =>
      data([0x02, 0x80 | bytes.length, address >> 8, address & 0xff, ...bytes]),
    property: (obj: number, pid: number) =>
      data([0x03, 0xd5, obj, pid, 0x10, 0x01])!.slice(6),
    /** Elements from 1 of a property. */
    elements: (obj: number, pid: number, count: number) =>
      data([0x03, 0xd5, obj, pid, count << 4, 0x01])!.slice(6),
    describe: (obj: number, pid: number) =>
      data([0x03, 0xd8, obj, pid, 0x00])!.slice(2),
    writeProperty: (obj: number, pid: number, count: number, bytes: number[]) =>
      data([0x03, 0xd7, obj, pid, count << 4, 0x01, ...bytes])!.slice(6),
    read: (address: number, n: number) =>
      data([0x02, n, address >> 8, address & 0xff])!.slice(4),
    restart: () => m.handle(frame([0x40 | (seq << 2) | 0x03, 0x80])),
  };
}

const emptyDoc = () =>
  ({
    formatVersion: 2,
    lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }],
    devices: [] as unknown[],
    groupAddresses: [],
  }) as unknown as Parameters<typeof addProductDevice>[0];

describe("download into a BCU1 by its load procedure", () => {
  beforeAll(installed);
  it("leaves the device with the application, its parameters, and its links", () => {
    const app = programOfProduct("example.sa2/v1")!;
    const doc = emptyDoc();
    const id = addProductDevice(
      doc,
      "example.sa2/v1",
      captureRegistry(),
      "1.1",
    );
    const raw = {
      ...doc,
      installation: { devices: [{ device: id, address: "1.1.1" }] },
    };
    const sim = createSimulator(raw);
    const m = new DeviceManagement(() => sim);
    const at = (1 << 12) | (1 << 8) | 1;
    const c = client(m, at);
    c.connect();
    expect(c.descriptor()!.slice(2)).toEqual([0x00, 0x12]);
    // As delivered, it holds the code of its manufacturer, which ETS checks first.
    expect(c.read(0x104, 1)).toEqual([0xfe]);
    // Output A: normally closed contact, on 1/2/1 = 0A01h.
    const image = projectImage(
      app,
      "0012",
      { "P-1_R-1": "1" },
      new Map([[0, ["1/2/1"]]]),
      "1.1.1",
    );
    const range = (a: number, n: number) =>
      Array.from(image.subarray(a, a + n));
    // MV-0012 "Load all": stopped, address table emptied, the image, then started.
    c.write(0x10d, [0x00]);
    c.write(0x116, [0x01]);
    c.write(0x100, range(0x100, 13));
    c.write(0x10e, range(0x10e, 8));
    c.write(0x119, range(0x119, 230));
    c.write(0x116, [image[0x116]!]);
    c.write(0x10d, [0xff]);
    // 117h–118h hold the individual address; the address table from 116h is complete.
    c.write(0x117, range(0x117, 2));
    let changed = 0;
    sim.onInstallationChange(() => changed++);
    c.restart();
    c.disconnect();
    expect(changed).toBe(1);
    const held = sim.memory(id)!;
    expect(valuesOf(app, held)["P-1_R-1"]).toBe("1");
    const s = bcuState(0x0012, held);
    expect(bcu1.tables(s).objects.get(0)!.gas).toEqual([0x0a01]);
    expect(bcu1.tables(s).objects.get(0)!.W).toBe(true);
    expect(bcu1.individualAddress(s)).toBe(at);
    expect(bcu1.running(s)).toBe(true);
    // The installation section carries the memory; the device runs what it holds.
    const after = createSimulator({
      ...raw,
      installation: sim.installation()!,
    });
    expect(after.applicationLoaded(id)).toBe(true);
    // The designer sets the project to what the device holds: as configured in ETS.
    const project = structuredClone(doc);
    expect(
      projectFromInstallation(
        project,
        sim.installation(),
        undefined,
        captureRegistry(),
      ),
    ).toEqual([id]);
    const dev = project.devices.find((d) => d.id === id)! as unknown as {
      ets: { parameters?: Record<string, string>; memory: unknown };
      objects: { id: string; ga: string[] }[];
    };
    expect(dev.ets.parameters).toEqual({ "P-1_R-1": "1" });
    expect(dev.objects.map((o) => [o.id, o.ga])).toEqual([
      ["o0", ["1/2/1"]],
      ["o1", []],
    ]);
    expect(dev.ets.memory).toEqual(
      (sim.installation()!.devices as { memory: unknown }[])[0]!.memory,
    );
    // Nothing changed since: the project is left as it is.
    expect(
      projectFromInstallation(
        project,
        sim.installation(),
        sim.installation(),
        captureRegistry(),
      ),
    ).toEqual([]);
  });
});

describe("program made by another manufacturer (OEM)", () => {
  it("holds the code of the brand that sells it at 104h, as ETS writes it", () => {
    // The SA 2 sold by another brand (FDh): its image still holds the maker's code.
    const db = structuredClone(SAMPLE_PRODUCTS[0]!.database);
    db.id = "M-00FD_A-0001-10-0000-O00FE";
    const app = programOf(db);
    expect(app.segments.get("AS-0100")!.data[4]).toBe(0xfe);
    const image = projectImage(app, "0012", {}, new Map(), "1.1.1");
    expect(image[0x104]).toBe(0xfd);
  });
});

describe("card of a manufacturer's device", () => {
  beforeAll(installed);

  it("draws only the objects linked to a group address", () => {
    const doc = emptyDoc();
    const id = addProductDevice(
      doc,
      "example.sa2/v1",
      captureRegistry(),
      "1.1",
    );
    const dev = (
      doc.devices as { id: string; objects: { ga?: string }[] }[]
    ).find((d) => d.id === id)!;
    dev.objects[1]!.ga = "1/0/2";
    const d = buildScenario(
      { ...doc, groupAddresses: [{ address: "1/0/2", name: "B" }] },
      captureRegistry(),
    ).devicesById.get(id)!;
    expect(d.objects.map((o) => o.id)).toEqual(["o0", "o1"]);
    expect(drawnObjects(d).map((o) => o.id)).toEqual(["o1"]);
    expect(cardHeight(d)).toBe(
      cardHeight({ ...d, ets: null, objects: [d.objects[1]!] }),
    );
  });
});

describe("installation as the project", () => {
  beforeAll(installed);

  it("gives a manufacturer's device the memory of the project, which it runs", () => {
    const doc = emptyDoc();
    const id = addProductDevice(
      doc,
      "example.sa2/v1",
      captureRegistry(),
      "1.1",
    );
    const dev = (
      doc.devices as { id: string; objects: { ga?: string }[] }[]
    ).find((d) => d.id === id)!;
    dev.objects[0]!.ga = "1/0/1";
    // The memory of the device is computed with its links.
    const app = programOfProduct("example.sa2/v1")!;
    const registry = captureRegistry();
    const d = doc.devices.find((x) => x.id === id)!;
    applyConfiguration(d, app, registry);
    const sim = createSimulator({
      ...doc,
      installation: installationAsProject(doc),
    });
    expect(sim.applicationLoaded(id)).toBe(true);
    expect(
      drawnObjects(sim.scenario.devicesById.get(id)!).map((o) => o.id),
    ).toEqual(["o0"]);
  });
});

describe("restart after a download", () => {
  beforeAll(installed);

  it("starts the application again, after a download of the same octets too", () => {
    const doc = emptyDoc();
    (doc.devices as unknown[]).push({
      id: "usb",
      name: "USB",
      address: "1.1.250",
      kind: "interface",
      behavior: "usbInterface/v1",
      objects: [],
    });
    const id = addProductDevice(
      doc,
      "example.sa2/v1",
      captureRegistry(),
      "1.1",
    );
    const d = doc.devices.find((x) => x.id === id)!;
    (d as { objects: { ga?: string }[] }).objects[0]!.ga = "1/0/1";
    applyConfiguration(
      d,
      programOfProduct("example.sa2/v1")!,
      captureRegistry(),
    );
    const sim = createSimulator({
      ...doc,
      groupAddresses: [{ address: "1/0/1", name: "Light" }],
      installation: installationAsProject(doc),
    });
    sim.groupWrite("usb", "1/0/1", 1);
    sim.advance(3000);
    expect(sim.objectValue(id, "o0")).toBe(1);
    // ETS writes the octets the device already holds, then restarts it.
    const at = 0x100 + 100;
    expect(sim.writeMemory(id, at, [sim.memory(id)![at]!])).toBe(true);
    sim.restartDevice(id);
    // Its objects as at its start; the time goes on.
    expect(sim.objectValue(id, "o0")).not.toBe(1);
    expect(sim.timeMs).toBe(3000);
    // A restart without a download before it: its application goes on.
    sim.groupWrite("usb", "1/0/1", 1);
    sim.advance(3000);
    sim.restartDevice(id);
    expect(sim.objectValue(id, "o0")).toBe(1);
  });
});

describe("download without commissioning", () => {
  beforeAll(installed);

  it("says that the devices hold no memory, which ETS reads as zeros", () => {
    const doc = emptyDoc();
    addProductDevice(doc, "example.sa2/v1", captureRegistry(), "1.1");
    // No installation section: the diagram runs the project as if programmed.
    const sim = createSimulator(doc);
    const warned: string[] = [];
    const c = client(
      new DeviceManagement(
        () => sim,
        (a) => warned.push(a),
      ),
      (1 << 12) | (1 << 8) | 1,
    );
    c.connect();
    expect(c.descriptor()!.slice(2)).toEqual([0x00, 0x12]);
    expect(warned).toEqual([]);
    expect(c.read(0x104, 1)).toEqual([0]);
    expect(warned).toEqual(["1.1.1"]);
  });
});

describe("download into a BIM M112 (System 7) by its Load State Machines", () => {
  beforeAll(installed);
  it("loads the tables and the application, then runs it", () => {
    const doc = emptyDoc();
    const id = addProductDevice(
      doc,
      "example.be1/v1",
      captureRegistry(),
      "1.1",
    );
    const raw = {
      ...doc,
      installation: { devices: [{ device: id, address: "1.1.6" }] },
    };
    const sim = createSimulator(raw);
    const m = new DeviceManagement(() => sim);
    const c = client(m, (1 << 12) | (1 << 8) | 6);
    c.connect();
    expect(c.descriptor()!.slice(2)).toEqual([0x07, 0x01]);
    // As delivered: its manufacturer, and the application identifier of its program,
    // which ETS compares.
    expect(c.property(0, 12)).toEqual([0x00, 0xfe]);
    expect(c.property(3, 13)).toEqual([0x00, 0xfe, 0x00, 0x02, 0x10]);
    // Unload, then load each part: address table, associations, application.
    for (const lsm of [1, 2, 3])
      c.control(0x0104, [(lsm << 4) | 4, ...Array(10).fill(0)]);
    expect(c.read(0xb6ea, 3)).toEqual([0, 0, 0]);
    const segment = (lsm: number, at: number, size: number) => [
      (lsm << 4) | 3,
      0x00,
      0x00,
      at >> 8,
      at & 0xff,
      size >> 8,
      size & 0xff,
      0xff,
      0x03,
      0x80,
      0x00,
    ];
    const task = (lsm: number, at: number) => [
      (lsm << 4) | 3,
      0x02,
      0x00,
      at >> 8,
      at & 0xff,
      0x80,
      0x00,
      0xfe,
      0x00,
      0x02,
      0x10,
    ];
    for (const [lsm, at, size] of [
      [1, 0x4000, 256],
      [2, 0x4100, 256],
      [3, 0x4200, 64],
    ] as const) {
      c.control(0x0104, [(lsm << 4) | 1, ...Array(10).fill(0)]);
      c.control(0x0104, segment(lsm, at, size));
      if (lsm === 3) {
        c.control(0x0104, task(lsm, at));
        // The application: its object table (switching, C R T) and its parameter (on).
        c.write(0x4200, [0x01, 0x00, 0x00, 0x00, 0x00, 0x4c, 0x00]);
        c.write(0x4220, [0x01]);
        // The program writes a property of its own, which ETS describes first.
        expect(c.describe(3, 204)).toEqual([3, 204, 0, 0x95, 0, 2, 0x33]);
        // Its hardware type, as it is made: compared by the load procedure, not written.
        expect(c.property(0, 78)).toEqual([0, 0, 0, 0xfe, 1, 0]);
        expect(c.describe(0, 78)).toEqual([0, 78, 0, 0x16, 0, 1, 0x33]);
        expect(c.writeProperty(0, 78, 1, [1, 2, 3, 4, 5, 6])).toEqual([]);
        expect(c.writeProperty(3, 204, 2, OWN)).toEqual(OWN);
        // Refused, without a change: elements beyond the property, octets that are not
        // those of the elements announced, a write without all its octets.
        expect(c.elements(3, 204, 3)).toEqual([]);
        expect(c.writeProperty(3, 204, 2, OWN.slice(1))).toEqual([]);
        expect(c.elements(3, 204, 2)).toEqual(OWN);
        expect(c.announce(0x4220, 3, [0x55])!.slice(4)).toEqual([]);
        expect(c.read(0x4220, 1)).toEqual([0x01]);
      }
      c.control(0x0104, [(lsm << 4) | 2, ...Array(10).fill(0)]);
    }
    expect(c.read(0xb6ea, 3)).toEqual([1, 1, 1]);
    // The association table is where its state machine's segment was allocated.
    expect(c.property(2, 7)).toEqual([0x41, 0x00]);
    c.restart();
    c.disconnect();
    const after = createSimulator({
      ...raw,
      installation: sim.installation()!,
    });
    expect(after.applicationLoaded(id)).toBe(true);
    // The property is kept with the memory of the installation, after the restart.
    const again = client(
      new DeviceManagement(() => after),
      (1 << 12) | (1 << 8) | 6,
    );
    again.connect();
    expect(again.elements(3, 204, 2)).toEqual(OWN);
  });

  it("runs the application that the designer configured, as ETS would load it", () => {
    const doc = emptyDoc();
    const id = addProductDevice(
      doc,
      "example.be1/v1",
      captureRegistry(),
      "1.1",
    );
    const dev = (
      doc.devices as { id: string; objects: { ga?: string }[] }[]
    ).find((d) => d.id === id)!;
    expect(dev.objects).toHaveLength(1);
    dev.objects[0]!.ga = "1/0/1";
    const sim = createSimulator({
      ...doc,
      groupAddresses: [{ address: "1/0/1", name: "Light" }],
    });
    sim.input(id, "in", "down");
    sim.input(id, "in", "up");
    sim.input(id, "in", "down");
    sim.advance(100);
    // Reaction "toggle" by default: on, then off.
    expect(sim.history.map((t) => `${t.ga}=${t.value}`)).toEqual([
      "1/0/1=1",
      "1/0/1=0",
    ]);
  });
});
