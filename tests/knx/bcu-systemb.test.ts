// System B (mask 07B0h), as ETS 6 loads a KNX Mini presence detector of Schneider
// Electric: the load state machines through PID_LOAD_STATE_CONTROL, the relative segments
// the device allocates, the tables written where PID_TABLE_REFERENCE puts them, the
// memory control blocks and the application identifier as properties. The records and
// tables are those of the frames ETS sent.
import { describe, expect, it } from "vitest";
import { bcuState, systemB } from "../../src/bcu";
import { parseApplication } from "../../src/knxprod/application";
import { parseXml } from "../../src/knxprod/xml";

const hex = (s: string) => s.match(/../g)!.map((b) => parseInt(b, 16));

/** A load control of object `lsm`: its answer, the load state. */
const control = (s: ReturnType<typeof bcuState>, lsm: number, record: string) =>
  systemB.writeProperty!(s, lsm, 5, 1, 1, hex(record));

describe("System B (mask 07B0h)", () => {
  it("loads the application, then the tables, as ETS does", () => {
    const s = bcuState(0x07b0);
    for (const lsm of [4, 3, 2, 1])
      expect(control(s, lsm, "04000000000000000000")).toEqual([0]);
    expect(control(s, 4, "01000000000000000000")).toEqual([2]);
    // Its relative segment: 398 octets, filled.
    expect(control(s, 4, "030b0000018e01000000")).toEqual([2]);
    // Memory control blocks: 8 octets each.
    expect(
      systemB.writeProperty!(s, 4, 27, 1, 1, hex("0000018a00320000")),
    ).toEqual(hex("0000018a00320000"));
    expect(
      systemB.writeProperty!(s, 4, 27, 1, 1, hex("0000018a0032000000")),
    ).toBeNull();
    expect(systemB.readProperty(s, 4, 7, 1, 1)).toEqual([0, 0, 0x50, 0]);
    for (const [lsm, size] of [
      [3, "017e"],
      [1, "0006"],
      [2, "000a"],
    ] as const) {
      expect(control(s, lsm, "01000000000000000000")).toEqual([2]);
      expect(control(s, lsm, `030b0000${size}00000000`)).toEqual([2]);
    }
    const write = (pointer: number[], data: string) =>
      expect(
        systemB.writeMemory(s, (pointer[2]! << 8) | pointer[3]!, hex(data)),
      ).toBe(true);
    // Group object table: 190 objects; 35 (C R T, low) and 56 (C W T, low), 1 bit.
    const objects = new Uint8Array(2 + 2 * 190);
    objects.set([0x00, 0xbe]);
    objects.set([0x4f, 0x00], 2 * 35);
    objects.set([0x57, 0x00], 2 * 56);
    write(
      systemB.readProperty(s, 3, 7, 1, 1)!,
      Array.from(objects, (b) => b.toString(16).padStart(2, "0")).join(""),
    );
    write(systemB.readProperty(s, 2, 7, 1, 1)!, "00020001002300020038");
    write(systemB.readProperty(s, 1, 7, 1, 1)!, "000200020003");
    expect(systemB.writeProperty!(s, 4, 13, 1, 1, hex("0064134111"))).toEqual(
      hex("0064134111"),
    );
    expect(systemB.running(s)).toBe(false);
    for (const lsm of [4, 3, 2, 1])
      expect(control(s, lsm, "02000000000000000000")).toEqual([1]);
    expect(systemB.running(s)).toBe(true);
    expect(systemB.applicationId(s)).toEqual({
      manufacturer: 0x64,
      deviceType: 0x1341,
      version: 0x11,
    });
    const t = systemB.tables(s);
    expect(t.groupAddresses).toEqual([2, 3]);
    expect(t.objects.get(35)).toMatchObject({
      C: true,
      R: true,
      W: false,
      T: true,
      priority: "low",
      type: 0,
      gas: [2],
    });
    expect(t.objects.get(56)).toMatchObject({
      C: true,
      R: false,
      W: true,
      gas: [3],
    });
  });

  it("gives the format of its tables (PID_TABLE) and refuses a segment too large", () => {
    const s = bcuState(0x07b0);
    expect(systemB.describeProperty!(s, 2, 23)).toMatchObject({ type: 0x14 });
    expect(systemB.describeProperty!(s, 1, 23)).toMatchObject({ type: 0x04 });
    expect(systemB.describeProperty!(s, 3, 23)).toMatchObject({ type: 0x12 });
    control(s, 1, "01000000000000000000");
    expect(control(s, 1, "030b0001000000000000")).toEqual([3]);
  });

  it("writes the tables of a complete download as ETS does", () => {
    const m = systemB.factory();
    systemB.writeTables(
      m,
      {
        individualAddress: 0x1114,
        links: new Map([
          [35, [2]],
          [56, [3]],
        ]),
        objects: new Map([
          [
            35,
            { C: true, R: true, W: false, T: true, priority: "low", type: 0 },
          ],
          [
            56,
            { C: true, R: false, W: true, T: true, priority: "low", type: 0 },
          ],
        ]),
      },
      systemB.tableLocations(m),
    );
    expect(Array.from(m.subarray(0x1000, 0x1006))).toEqual(hex("000200020003"));
    expect(Array.from(m.subarray(0x2000, 0x200a))).toEqual(
      hex("00020001002300020038"),
    );
    expect(Array.from(m.subarray(0x4000 + 70, 0x4000 + 72))).toEqual([0x4f, 0]);
    expect(Array.from(m.subarray(0x4000 + 112, 0x4000 + 114))).toEqual([
      0x57, 0,
    ]);
    expect(
      systemB.individualAddress({
        mask: 0x07b0,
        memory: m,
        extra: {},
        written: false,
      }),
    ).toBe(0x1114);
  });

  it("places a relative segment where the device allocates it", () => {
    const app = parseApplication(
      parseXml(`<KNX><ManufacturerData><Manufacturer><ApplicationPrograms>
        <ApplicationProgram Id="M-0064_A-1341-11-C3F2" ApplicationNumber="4929" ApplicationVersion="17" MaskVersion="MV-07B0" Name="Mini">
          <Static>
            <Code><RelativeSegment Id="RS-04-00000" Size="398" LoadStateMachine="4" Offset="0" /></Code>
            <AddressTable MaxEntries="200" />
            <AssociationTable MaxEntries="200" />
          </Static>
        </ApplicationProgram>
      </ApplicationPrograms></Manufacturer></ManufacturerData></KNX>`),
    );
    expect(app.segments.get("RS-04-00000")).toMatchObject({
      address: 0x5000,
      size: 398,
      lsm: 4,
    });
    expect(app.addressTable).toEqual({
      segment: "",
      offset: 0,
      maxEntries: 200,
    });
  });
});
