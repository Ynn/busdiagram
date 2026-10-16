// Tables of a loaded device, as BCU1 and BIM M112 hold them (KNX Standard 03_05_01
// §4.16–4.18): the group address table (its length counting the individual address, the
// individual address, then the group addresses in increasing order), the association
// table (count, then connection number and object number, one octet each), and the group
// object table (count, a pointer, then one descriptor per object). A descriptor ends with
// the configuration octet and the type octet; it is 3 octets for a BCU1, 4 for a BIM M112.
import type { TableContent, Tables } from "./profile";

/** Where the tables are and how the object table is written. */
export interface TableLayout {
  addressTable: number;
  associations: number;
  objects: number;
  /** Octets before the first descriptor (count and pointer). */
  objectHeader: number;
  /** Octets of a descriptor (data pointer, configuration, type). */
  descriptor: number;
}

const PRIORITY = ["system", "normal", "urgent", "low"] as const;
const PRIORITY_BITS = { system: 0, normal: 1, urgent: 2, low: 3 } as const;

export function readTables(mem: Uint8Array, at: TableLayout): Tables {
  const g = at.addressTable;
  const n = Math.max(0, (mem[g] ?? 1) - 1);
  const gas: number[] = [];
  for (let i = 0; i < n; i++)
    gas.push((mem[g + 3 + 2 * i]! << 8) | mem[g + 4 + 2 * i]!);
  const objects: Tables["objects"] = new Map();
  const count = mem[at.objects] ?? 0;
  for (let k = 0; k < count; k++) {
    const d = at.objects + at.objectHeader + at.descriptor * k;
    if (d + at.descriptor > mem.length) break;
    const cfg = mem[d + at.descriptor - 2]!;
    objects.set(k, {
      C: (cfg & 0x04) !== 0,
      R: (cfg & 0x08) !== 0,
      W: (cfg & 0x10) !== 0,
      T: (cfg & 0x40) !== 0,
      // Bit 7 is the update flag of a BIM M112 (always 1 for a BCU1, which has none).
      U: at.descriptor === 4 && (cfg & 0x80) !== 0,
      priority: PRIORITY[cfg & 3]!,
      type: mem[d + at.descriptor - 1]!,
      gas: [],
    });
  }
  const pairs = mem[at.associations] ?? 0;
  for (let i = 0; i < pairs; i++) {
    const tsap = mem[at.associations + 1 + 2 * i]!;
    const asap = mem[at.associations + 2 + 2 * i]!;
    const ga = gas[tsap - 1];
    const o = objects.get(asap);
    if (ga !== undefined && o && !o.gas.includes(ga)) o.gas.push(ga);
  }
  return {
    individualAddress: (mem[g + 1]! << 8) | mem[g + 2]!,
    groupAddresses: gas,
    objects,
  };
}

/** Write the tables of a complete download into a memory image. */
export function writeTables(mem: Uint8Array, c: TableContent, at: TableLayout) {
  const g = at.addressTable;
  const gas = [...new Set([...c.links.values()].flat())].sort((a, b) => a - b);
  mem[g] = gas.length + 1;
  mem[g + 1] = c.individualAddress >> 8;
  mem[g + 2] = c.individualAddress & 0xff;
  gas.forEach((x, i) => {
    mem[g + 3 + 2 * i] = x >> 8;
    mem[g + 4 + 2 * i] = x & 0xff;
  });
  // Associations, the sending address of each object first, by object number.
  const pairs: [number, number][] = [];
  [...c.links]
    .sort(([a], [b]) => a - b)
    .forEach(([n, l]) => l.forEach((x) => pairs.push([gas.indexOf(x) + 1, n])));
  mem[at.associations] = pairs.length;
  pairs.forEach(([tsap, asap], i) => {
    mem[at.associations + 1 + 2 * i] = tsap;
    mem[at.associations + 2 + 2 * i] = asap;
  });
  for (const [n, o] of c.objects) {
    const d =
      at.objects + at.objectHeader + at.descriptor * n + at.descriptor - 2;
    const update = at.descriptor === 4 ? (o.U ? 0x80 : 0) : 0x80;
    mem[d] =
      update |
      (o.T ? 0x40 : 0) |
      (mem[d]! & 0x20) |
      (o.W ? 0x10 : 0) |
      (o.R ? 0x08 : 0) |
      (o.C ? 0x04 : 0) |
      PRIORITY_BITS[o.priority];
    mem[d + 1] = o.type;
  }
}
