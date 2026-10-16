// BCU1 (masks 0010h, 0011h, 0012h; KNX Standard 03_05_01 §4.16.3, §4.17.3, §4.18.3,
// knx_master.xml MV-0011/MV-0012): 512 octets of memory, the application in the EEPROM
// from 100h. ETS loads it by memory writes verified by reads ("Load all"): RunError (10Dh)
// 00h to stop, the address table length (116h) 01h while loading, the image, the tables,
// then 10Dh FFh and a restart.
import type {
  BcuState,
  MaskProfile,
  ObjectDescriptor,
  TableContent,
  TableLocations,
  Tables,
} from "./profile";
import { registerProfile } from "./profile";
import type { TableLayout } from "./tables";
import {
  readTables as readTablesAt,
  writeTables as writeTablesAt,
} from "./tables";

const SIZE = 0x200;
const PROG = 0x60;
const APP_ID = 0x104;
const RUN_ERROR = 0x10d;
const GA_TABLE = 0x116;
const ASSOC_PTR = 0x111;
const OBJECT_PTR = 0x112;
const EEPROM = 0x100;

export const bcu1: MaskProfile = {
  masks: [0x0010, 0x0011, 0x0012],
  name: "BCU1",
  memorySize: SIZE,
  factory() {
    const m = new Uint8Array(SIZE);
    // No group address (table length 1: the individual address only), stopped.
    m[GA_TABLE] = 1;
    m[GA_TABLE + 1] = 0xff;
    m[GA_TABLE + 2] = 0xff;
    return m;
  },
  programmingMode: (s) => (s.memory[PROG]! & 1) === 1,
  setProgrammingMode(s, on) {
    s.memory[PROG] = on ? s.memory[PROG]! | 1 : s.memory[PROG]! & ~1;
  },
  individualAddress: (s) =>
    (s.memory[GA_TABLE + 1]! << 8) | s.memory[GA_TABLE + 2]!,
  setIndividualAddress(s, ia) {
    s.memory[GA_TABLE + 1] = ia >> 8;
    s.memory[GA_TABLE + 2] = ia & 0xff;
  },
  writeMemory(s, address, data) {
    if (address + data.length > SIZE) return false;
    s.memory.set(data, address);
    if (address >= EEPROM || address + data.length > EEPROM) s.written = true;
    return true;
  },
  readMemory(s, address, count) {
    if (address + count > SIZE) return null;
    return Array.from(s.memory.subarray(address, address + count));
  },
  readProperty: () => null,
  running: (s) => s.memory[RUN_ERROR] === 0xff,
  applicationId(s) {
    if (s.memory[RUN_ERROR] !== 0xff) return null;
    const m = s.memory;
    return {
      manufacturer: m[APP_ID]!,
      deviceType: (m[APP_ID + 1]! << 8) | m[APP_ID + 2]!,
      version: m[APP_ID + 3]!,
    };
  },
  tables: (s) => readTables(s.memory),
  tableLocations: (m) => {
    const l = layout(m);
    return { associations: l.associations, objects: l.objects };
  },
  writeTables: (memory, content, at) => writeTables(memory, content, at),
  start(memory, app) {
    memory[RUN_ERROR] = 0xff;
    // ETS writes the code of the program's manufacturer at 104h: that of the brand that
    // sells it, for a program made by another manufacturer (OEM).
    if (app) memory[APP_ID] = app.manufacturer & 0xff;
  },
};

/** Where the tables of a BCU1 are: address table at 116h, the others by their pointers. */
const layout = (m: Uint8Array, at?: TableLocations): TableLayout => ({
  addressTable: GA_TABLE,
  associations: at?.associations ?? EEPROM + m[ASSOC_PTR]!,
  objects: at?.objects ?? EEPROM + m[OBJECT_PTR]!,
  objectHeader: 2,
  descriptor: 3,
  maxAddresses: at?.maxAddresses,
  maxAssociations: at?.maxAssociations,
});

/** Tables of realisation type 1, read from a memory. */
export const readTables = (mem: Uint8Array): Tables =>
  readTablesAt(mem, layout(mem));

/** Write tables of realisation type 1 into a memory image (from address 0). */
export function writeTables(
  mem: Uint8Array,
  c: TableContent,
  at: TableLocations,
) {
  // The tables first: refused, they leave the memory as it was, pointers included.
  writeTablesAt(mem, c, layout(mem, at));
  mem[ASSOC_PTR] = at.associations - EEPROM;
  mem[OBJECT_PTR] = at.objects - EEPROM;
}

/** Type octet of a size as the product database writes it ("1 Bit", "2 Bytes"…). */
export function typeOctet(size: string): number {
  const m = /^(\d+)\s*(Bit|Byte)/i.exec(size);
  if (!m) return 0;
  const n = Number(m[1]);
  if (/bit/i.test(m[2]!)) return n <= 6 ? n - 1 : 7;
  return (
    (
      { 1: 7, 2: 8, 3: 9, 4: 10, 6: 11, 8: 12, 10: 13, 14: 14 } as Record<
        number,
        number
      >
    )[n] ?? 7
  );
}

/** Size in bits of a type octet. */
export const typeBits = (type: number) =>
  type <= 6
    ? type + 1
    : ((
        {
          7: 8,
          8: 16,
          9: 24,
          10: 32,
          11: 48,
          12: 64,
          13: 80,
          14: 112,
        } as Record<number, number>
      )[type] ?? 8);

export type { BcuState, ObjectDescriptor };

registerProfile(bcu1);
