// The tables of a download, where the program has them: written up to their capacity,
// refused beyond it without a change to the memory.
import { describe, expect, it } from "vitest";
import { readTables, writeTables } from "../../src/bcu/tables";
import { TableOverflow, bcu1 } from "../../src/bcu";
import type { TableContent } from "../../src/bcu";

// A BCU1 program as SA 2 has it: 11 group addresses at 116h, the associations at 12Fh.
const at = {
  addressTable: 0x116,
  associations: 0x12f,
  objects: 0x146,
  objectHeader: 2,
  descriptor: 3,
  maxAddresses: 11,
  maxAssociations: 11,
};

/** Object 0 linked to `n` group addresses 1/0/1… */
const content = (n: number): TableContent => ({
  individualAddress: 0x1101,
  links: new Map([[0, Array.from({ length: n }, (_, i) => 0x0801 + i)]]),
  objects: new Map(),
});

describe("tables of a download", () => {
  it("are written up to the capacity of the program", () => {
    const mem = new Uint8Array(0x200);
    mem[at.objects] = 1;
    writeTables(mem, content(11), at);
    const t = readTables(mem, at);
    expect(t.groupAddresses).toHaveLength(11);
    expect(t.objects.get(0)?.gas).toHaveLength(11);
  });

  it("are refused beyond it, the memory unchanged", () => {
    const mem = new Uint8Array(0x200);
    mem[at.objects] = 1;
    const before = mem.slice();
    expect(() => writeTables(mem, content(12), at)).toThrow(TableOverflow);
    expect([...mem]).toEqual([...before]);
  });

  it("never run into the table that follows them", () => {
    // Without a capacity, the space up to the association table: 11 group addresses.
    const mem = new Uint8Array(0x200);
    mem[at.objects] = 1;
    const free = { ...at, maxAddresses: undefined, maxAssociations: undefined };
    expect(() => writeTables(mem, content(11), free)).not.toThrow();
    expect(() => writeTables(mem, content(12), free)).toThrow(TableOverflow);
    // A count octet: 254 group addresses at most, with the individual address.
    expect(() =>
      writeTables(new Uint8Array(0x10000), content(256), {
        ...free,
        addressTable: 0x4000,
        associations: 0x5000,
        objects: 0x6000,
      }),
    ).toThrow(TableOverflow);
  });
});

describe("tables refused", () => {
  it("refuse a group object beyond the object table of the program", () => {
    const mem = new Uint8Array(0x200);
    mem[at.objects] = 1;
    const before = mem.slice();
    const beyond: TableContent = {
      ...content(1),
      links: new Map([[1, [0x0801]]]),
    };
    expect(() => writeTables(mem, beyond, at)).toThrow(TableOverflow);
    expect([...mem]).toEqual([...before]);
  });

  it("leave the pointers as they were", () => {
    const mem = new Uint8Array(0x200);
    mem[0x111] = 0x2f; // association table pointer of a BCU1
    const before = mem.slice();
    expect(() =>
      bcu1.writeTables(mem, content(12), {
        associations: 0x12f,
        objects: 0x146,
        maxAddresses: 11,
      }),
    ).toThrow(TableOverflow);
    expect([...mem]).toEqual([...before]);
  });

  it("at the same place as another table", () => {
    const mem = new Uint8Array(0x200);
    expect(() =>
      writeTables(mem, content(1), { ...at, associations: at.addressTable }),
    ).toThrow(TableOverflow);
  });
});
