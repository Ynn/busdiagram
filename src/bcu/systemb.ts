// System B (mask 07B0h; KNX Standard 03_05_01, knx_master.xml MV-07B0): each part of the
// device has its interface object (1 address table, 2 association table, 3 group object
// table, 4 application, 5 PEI program) and is loaded through its property
// PID_LOAD_STATE_CONTROL (5): the event in the first octet (1 Load, 2 Load completed, 3
// additional load control, 4 Unload), then the record of an additional control. The
// device allocates the segment of each part (a relative segment); PID_TABLE_REFERENCE
// (7) gives its address, where ETS writes it with A_Memory_Write. Its memory control
// blocks (PID_MCB_TABLE, 27) and its application identifier (PID_PROG_VERSION, 13) are
// written as properties. The tables have 2-octet counts and entries: the group addresses
// (without the individual address), the associations (connection number, object number),
// one descriptor per group object.
//
// The simulated device places its segments at fixed addresses (SEGMENTS), the product
// databases with them; what it keeps of the system (programming mode, individual address,
// load states, properties) is below 1000h.
import type {
  BcuState,
  MaskProfile,
  ObjectDescriptor,
  ProductProperty,
  TableContent,
  Tables,
} from "./profile";
import { registerProfile } from "./profile";
import { TableOverflow } from "./tables";

const SIZE = 0x10000;
const PROG = 0x60;
const IA = 0x62;
const LOAD_STATE = 0x70;
const APP_ID = 0x78;
const PEI_ID = 0x80;
/**
 * Memory control blocks of objects 1–5, MCB_ELEMENTS elements of 8 octets each, as ETS
 * writes them (the length of a block, then what the program gives).
 */
const MCB = 0x100;
const MCB_SIZE = 8;
const MCB_ELEMENTS = 16;
const OWN_PROPERTIES = 0x400;

/** Segment of each load state machine: [address, room]. */
const SEGMENTS: Record<number, readonly [number, number]> = {
  1: [0x1000, 0x1000],
  2: [0x2000, 0x2000],
  3: [0x4000, 0x1000],
  4: [0x5000, 0x5000],
  5: [0xa000, 0x2000],
};
const LSMS = 5;

const UNLOADED = 0;
const LOADED = 1;
const LOADING = 2;
const ERROR = 3;

/** Interface object type of each object (device, tables, application, PEI program). */
const OBJECT_TYPE = [0, 1, 2, 9, 3, 4];

const word = (m: Uint8Array, at: number) => (m[at]! << 8) | m[at + 1]!;
const setWord = (m: Uint8Array, at: number, v: number) => {
  m[at] = v >> 8;
  m[at + 1] = v & 0xff;
};

/** Octets of an element of a property datatype (PDT_GENERIC_01–20: 11h–24h). */
const elementSize = (type: number) =>
  type >= 0x11 && type <= 0x24 ? type - 0x10 : 1;

const ownProperties = (s: BcuState) =>
  (s.extra.ownProperties as ProductProperty[] | undefined) ?? [];

/** Where a property of its own is kept in the memory, if the product has it. */
function ownSlot(s: BcuState, object: number, pid: number) {
  let at = OWN_PROPERTIES;
  for (const p of ownProperties(s)) {
    if (p.value) continue;
    const size = elementSize(p.type);
    if (p.object === object && p.pid === pid) return { at, size, max: p.max };
    at += size * p.max;
  }
  return null;
}

/** Properties the mask writes in its memory: [address, octets of an element, elements]. */
function systemSlot(object: number, pid: number) {
  if (pid === 13 && object === 4) return [APP_ID, 5, 1] as const;
  if (pid === 13 && object === 5) return [PEI_ID, 5, 1] as const;
  if (pid === 27 && object >= 1 && object <= LSMS)
    return [MCB + 0x80 * (object - 1), MCB_SIZE, MCB_ELEMENTS] as const;
  return null;
}

/**
 * PID_TABLE (23) of the tables, whose datatype gives the format of their entries: the
 * group addresses (PDT_UNSIGNED_INT), the associations (PDT_GENERIC_04: connection
 * number, object number), the descriptors (PDT_GENERIC_02): [type, octets of an entry].
 */
const TABLE_FORMAT: Record<number, readonly [number, number]> = {
  1: [0x04, 2],
  2: [0x14, 4],
  3: [0x12, 2],
};

/** Entries the segment of a table holds after its count. */
const tableRoom = (object: number) =>
  Math.min(
    0xfff,
    Math.floor((SEGMENTS[object]![1] - 2) / TABLE_FORMAT[object]![1]),
  );

/** An event of the load state machine of object `lsm`, with its record. */
function loadEvent(s: BcuState, lsm: number, data: readonly number[]) {
  const m = s.memory;
  const at = LOAD_STATE + lsm - 1;
  const state = m[at]!;
  switch (data[0]! & 0x0f) {
    case 1: // Load
      m[at] = state === ERROR ? ERROR : LOADING;
      break;
    case 2: // Load completed
      m[at] =
        state === LOADING ? LOADED : state === UNLOADED ? UNLOADED : ERROR;
      break;
    case 3: {
      // Additional load control, while loading.
      if (state !== LOADING) {
        m[at] = state === UNLOADED ? UNLOADED : ERROR;
        break;
      }
      // The only one the device does: the allocation of its relative segment (0Bh),
      // its length (4 octets), which must fit, then the mode (1: filled with the octet
      // that follows; ETS then writes only the others). Any other is refused: error.
      if (data[1] !== 0x0b || data.length < 8) {
        m[at] = ERROR;
        break;
      }
      const length =
        (((data[2] ?? 0) << 24) |
          ((data[3] ?? 0) << 16) |
          ((data[4] ?? 0) << 8) |
          (data[5] ?? 0)) >>>
        0;
      const [start, room] = SEGMENTS[lsm]!;
      if (length > room || data[6]! > 1) m[at] = ERROR;
      else if (data[6] === 1) m.fill(data[7]!, start, start + length);
      break;
    }
    case 4: // Unload
      m[at] = UNLOADED;
      break;
    case 0: // No operation
      break;
    default: // An event the state machine does not know.
      m[at] = ERROR;
      break;
  }
  s.written = true;
}

/** A property of the system part: its datatype, whether ETS may write it, its value. */
interface SystemProperty {
  type: number;
  writable: boolean;
  value(s: BcuState): number[];
}

// Property datatypes (KNX Standard 03_07_03): PDT_CONTROL, PDT_UNSIGNED_CHAR,
// PDT_UNSIGNED_INT, PDT_UNSIGNED_LONG, PDT_GENERIC_02.
const PDT_CONTROL = 0x00;
const PDT_UNSIGNED_CHAR = 0x02;
const PDT_UNSIGNED_INT = 0x04;
const PDT_UNSIGNED_LONG = 0x09;
const PDT_GENERIC_02 = 0x12;

/** The properties of one element that the mask answers itself, by object and PID. */
function systemProperty(object: number, pid: number): SystemProperty | null {
  if (pid === 1 && object < OBJECT_TYPE.length)
    return {
      type: PDT_UNSIGNED_INT,
      writable: false,
      value: () => [0, OBJECT_TYPE[object]!],
    };
  if (object >= 1 && object <= LSMS) {
    // PID_LOAD_STATE_CONTROL: its state (written with a load control).
    if (pid === 5)
      return {
        type: PDT_CONTROL,
        writable: true,
        value: (s) => [s.memory[LOAD_STATE + object - 1]!],
      };
    // PID_TABLE_REFERENCE: where its segment is.
    if (pid === 7) {
      const [at] = SEGMENTS[object]!;
      return {
        type: PDT_UNSIGNED_LONG,
        writable: false,
        value: () => [0, 0, at >> 8, at & 0xff],
      };
    }
  }
  switch (`${object}/${pid}`) {
    case "0/12": // PID_MANUFACTURER_ID
      return {
        type: PDT_UNSIGNED_INT,
        writable: false,
        value: (s) => {
          const id = (s.extra.manufacturer as number | undefined) ?? 0;
          return [(id >> 8) & 0xff, id & 0xff];
        },
      };
    case "0/54": // PID_PROGMODE
      return {
        type: PDT_UNSIGNED_CHAR,
        writable: true,
        value: (s) => [systemB.programmingMode(s) ? 1 : 0],
      };
    case "0/56": // PID_MAX_APDULENGTH: that of a TP1 frame
      return { type: PDT_UNSIGNED_INT, writable: false, value: () => [0, 15] };
    case "0/83": // PID_DEVICE_DESCRIPTOR
      return {
        type: PDT_GENERIC_02,
        writable: false,
        value: () => [0x07, 0xb0],
      };
    case "4/6": // PID_RUN_STATE_CONTROL: 1 running, 0 halted
      return {
        type: PDT_CONTROL,
        writable: false,
        value: (s) => [systemB.running(s) ? 1 : 0],
      };
    default:
      return null;
  }
}

const PRIORITY = ["system", "normal", "urgent", "low"] as const;
const PRIORITY_BITS = { system: 0, normal: 1, urgent: 2, low: 3 } as const;

/** Configuration octet of a descriptor. */
const configOf = (o: Omit<ObjectDescriptor, "U"> & { U?: boolean }) =>
  (o.U ? 0x80 : 0) |
  (o.T ? 0x40 : 0) |
  (o.W ? 0x10 : 0) |
  (o.R ? 0x08 : 0) |
  (o.C ? 0x04 : 0) |
  PRIORITY_BITS[o.priority];

const [ADDRESSES, ASSOCIATIONS, OBJECTS] = [1, 2, 3].map(
  (l) => SEGMENTS[l]![0],
) as [number, number, number];

/** Descriptor of object `n` (from 1): its configuration octet, then its type. */
const descriptorAt = (n: number) => OBJECTS + 2 * n;

function readTables(m: Uint8Array): Tables {
  const gas: number[] = [];
  const n = Math.min(word(m, ADDRESSES), tableRoom(1));
  for (let i = 0; i < n; i++) gas.push(word(m, ADDRESSES + 2 + 2 * i));
  const objects: Tables["objects"] = new Map();
  const count = Math.min(word(m, OBJECTS), tableRoom(3));
  for (let k = 1; k <= count; k++) {
    const cfg = m[descriptorAt(k)]!;
    objects.set(k, {
      C: (cfg & 0x04) !== 0,
      R: (cfg & 0x08) !== 0,
      W: (cfg & 0x10) !== 0,
      T: (cfg & 0x40) !== 0,
      U: (cfg & 0x80) !== 0,
      priority: PRIORITY[cfg & 3]!,
      type: m[descriptorAt(k) + 1]!,
      gas: [],
    });
  }
  const pairs = Math.min(word(m, ASSOCIATIONS), tableRoom(2));
  for (let i = 0; i < pairs; i++) {
    const tsap = word(m, ASSOCIATIONS + 2 + 4 * i);
    const asap = word(m, ASSOCIATIONS + 4 + 4 * i);
    const ga = gas[tsap - 1];
    const o = objects.get(asap);
    if (ga !== undefined && o && !o.gas.includes(ga)) o.gas.push(ga);
  }
  return { individualAddress: word(m, IA), groupAddresses: gas, objects };
}

export const systemB: MaskProfile = {
  masks: [0x07b0],
  name: "System B",
  memorySize: SIZE,
  // Programming mode, individual address, load states, identifiers, memory control
  // blocks, own properties.
  systemAreas: [[0, 0x1000]],
  relativeSegment: (lsm) => SEGMENTS[lsm]?.[0],
  factory() {
    const m = new Uint8Array(SIZE);
    setWord(m, IA, 0xffff);
    return m;
  },
  programmingMode: (s) => (s.memory[PROG]! & 1) === 1,
  setProgrammingMode(s, on) {
    s.memory[PROG] = on ? s.memory[PROG]! | 1 : s.memory[PROG]! & ~1;
  },
  individualAddress: (s) => word(s.memory, IA),
  setIndividualAddress(s, ia) {
    setWord(s.memory, IA, ia);
  },
  writeMemory(s, address, data) {
    // Only the segments: the system part is written through properties.
    if (address < 0x1000 || address + data.length > SIZE) return false;
    s.memory.set(data, address);
    s.written = true;
    return true;
  },
  readMemory(s, address, count) {
    if (address + count > SIZE) return null;
    return Array.from(s.memory.subarray(address, address + count));
  },
  readProperty(s, object, pid, start, count) {
    const m = s.memory;
    const sys = systemSlot(object, pid);
    if (sys) {
      const [at, size, max] = sys;
      if (start === 0) return [0, max];
      if (count < 1 || start + count - 1 > max) return null;
      const from = at + size * (start - 1);
      return Array.from(m.subarray(from, from + size * count));
    }
    const format = pid === 23 ? TABLE_FORMAT[object] : undefined;
    if (format) {
      // A table as a property: its count, then its entries.
      const [at] = SEGMENTS[object]!;
      if (start === 0) return [m[at]!, m[at + 1]!];
      const n = format[1];
      if (count < 1 || start + count - 1 > tableRoom(object)) return null;
      const from = at + 2 + n * (start - 1);
      return Array.from(m.subarray(from, from + n * count));
    }
    const value = systemProperty(object, pid)?.value(s) ?? null;
    const made = value
      ? undefined
      : ownProperties(s).find(
          (p) => p.object === object && p.pid === pid && p.value,
        );
    if (made?.value) {
      if (start === 0) return [made.max >> 8, made.max & 0xff];
      const size = elementSize(made.type);
      if (count < 1 || start + count - 1 > made.max) return null;
      const from = size * (start - 1);
      return made.value.slice(from, from + size * count);
    }
    const own = value ? null : ownSlot(s, object, pid);
    if (own) {
      if (start === 0) return [own.max >> 8, own.max & 0xff];
      if (count < 1 || start + count - 1 > own.max) return null;
      const from = own.at + own.size * (start - 1);
      return Array.from(m.subarray(from, from + own.size * count));
    }
    if (!value) return null;
    if (start === 0) return [0, 1];
    return start === 1 && count === 1 ? value : null;
  },
  describeProperty(s, object, pid) {
    const format = pid === 23 ? TABLE_FORMAT[object] : undefined;
    if (format)
      return { type: format[0], max: tableRoom(object), writable: false };
    const sys = systemSlot(object, pid);
    // PDT_GENERIC_08 (memory control block), PDT_GENERIC_05 (identifier).
    if (sys) return { type: 0x10 + sys[1], max: sys[2], writable: true };
    const one = systemProperty(object, pid);
    if (one) return { type: one.type, max: 1, writable: one.writable };
    const own = ownProperties(s).find(
      (p) => p.object === object && p.pid === pid,
    );
    return own ? { type: own.type, max: own.max, writable: !own.value } : null;
  },
  writeProperty(s, object, pid, start, count, data) {
    // A load control: answered with the load state.
    if (
      pid === 5 &&
      object >= 1 &&
      object <= LSMS &&
      start === 1 &&
      count === 1
    ) {
      if (!data.length) return null;
      loadEvent(s, object, data);
      return [s.memory[LOAD_STATE + object - 1]!];
    }
    if (`${object}/${pid}` === "0/54") {
      // One element, one octet: anything else is refused, the mode as it was.
      if (start !== 1 || count !== 1 || data.length !== 1) return null;
      systemB.setProgrammingMode(s, (data[0]! & 1) === 1);
      return [data[0]! & 1];
    }
    const slot = systemSlot(object, pid);
    const own = slot
      ? { at: slot[0], size: slot[1], max: slot[2] }
      : ownSlot(s, object, pid);
    if (
      !own ||
      start === 0 ||
      count < 1 ||
      start + count - 1 > own.max ||
      data.length !== count * own.size
    )
      return null;
    s.memory.set(data, own.at + own.size * (start - 1));
    s.written = true;
    return [...data];
  },
  running: (s) =>
    [0, 1, 2, 3].every((i) => s.memory[LOAD_STATE + i] === LOADED),
  applicationId(s) {
    if (!systemB.running(s)) return null;
    const m = s.memory;
    return {
      manufacturer: word(m, APP_ID),
      deviceType: word(m, APP_ID + 2),
      version: m[APP_ID + 4]!,
    };
  },
  tableAreas: (m, max) => {
    const capped = (lsm: number, n: number, entry: number, cap?: number) =>
      [
        SEGMENTS[lsm]![0],
        Math.min(SEGMENTS[lsm]![1], 2 + entry * Math.min(n, cap || n)),
      ] as const;
    return [
      capped(1, word(m, ADDRESSES), 2, max.addresses),
      capped(2, word(m, ASSOCIATIONS), 4, max.associations),
      capped(3, word(m, OBJECTS) + 1, 2),
    ];
  },
  tables: (s) => readTables(s.memory),
  tableLocations: () => ({ associations: ASSOCIATIONS, objects: OBJECTS }),
  writeTables(mem: Uint8Array, c: TableContent, at) {
    // Everything checked before the first octet is written: a refusal leaves the memory
    // as it was.
    const numbers = [...c.objects.keys(), ...c.links.keys()];
    if (numbers.some((n) => !Number.isInteger(n) || n < 1))
      throw new RangeError("group objects are numbered from 1");
    const highest = Math.max(0, ...numbers);
    if (highest > tableRoom(3))
      throw new TableOverflow("objects", highest, tableRoom(3));
    const gas = [...new Set([...c.links.values()].flat())].sort(
      (a, b) => a - b,
    );
    const pairs: [number, number][] = [];
    [...c.links]
      .sort(([a], [b]) => a - b)
      .forEach(([n, l]) =>
        l.forEach((x) => pairs.push([gas.indexOf(x) + 1, n])),
      );
    const addresses = Math.min(tableRoom(1), at.maxAddresses ?? 0xffff);
    if (gas.length > addresses)
      throw new TableOverflow("addresses", gas.length, addresses);
    const associations = Math.min(tableRoom(2), at.maxAssociations ?? 0xffff);
    if (pairs.length > associations)
      throw new TableOverflow("associations", pairs.length, associations);
    setWord(mem, IA, c.individualAddress);
    setWord(mem, ADDRESSES, gas.length);
    gas.forEach((x, i) => setWord(mem, ADDRESSES + 2 + 2 * i, x));
    setWord(mem, ASSOCIATIONS, pairs.length);
    pairs.forEach(([tsap, asap], i) => {
      setWord(mem, ASSOCIATIONS + 2 + 4 * i, tsap);
      setWord(mem, ASSOCIATIONS + 4 + 4 * i, asap);
    });
    const count = Math.max(Math.min(word(mem, OBJECTS), tableRoom(3)), highest);
    setWord(mem, OBJECTS, count);
    for (const [n, o] of c.objects) {
      mem[descriptorAt(n)] = configOf(o);
      mem[descriptorAt(n) + 1] = o.type;
    }
  },
  start(memory, app) {
    // As a complete download leaves it: the tables and the application loaded.
    memory.fill(LOADED, LOAD_STATE, LOAD_STATE + 4);
    if (app) {
      setWord(memory, APP_ID, app.manufacturer);
      setWord(memory, APP_ID + 2, app.number);
      memory[APP_ID + 4] = app.version;
    }
  },
  locate(s, at) {
    // As delivered: the application identifier of the manufacturer's program.
    const id = s.memory.subarray(APP_ID, APP_ID + 5);
    if (at.applicationId && id.every((x) => x === 0))
      s.memory.set(at.applicationId.slice(0, 5), APP_ID);
  },
};

registerProfile(systemB);
