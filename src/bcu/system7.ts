// BIM M112 (System 7, masks 0700h, 0701h, 0705h; KNX Standard 03_05_01, 03_05_02 §3.31,
// knx_master.xml MV-0701): 64 kB of memory, the tables and the application in EEPROM
// segments that ETS allocates. ETS loads each part through a Load State Machine mapped
// in memory: an 11-octet A_Memory_Write at 0104h gives the state machine (high nibble:
// 1 address table, 2 association table, 3 application, 4 PEI program) and the event
// (low nibble: 1 Load, 2 Load completed, 3 additional load control, 4 Unload), followed
// by the record of an additional control (segment allocation, task segment with the
// application identifier…). A BIM M112 of mask 0705h is loaded through the property
// PID_LOAD_STATE_CONTROL (5) of the object of each part (1–4) instead: the event in its
// first octet, then the same record without its third octet. The load states are read at B6EAh–B6EDh. The address table
// is at 4000h; the association table where its state machine's segment is allocated; the
// group object table is the application's (its location is given by the product).
import type {
  BcuState,
  MaskProfile,
  ProductProperty,
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

const SIZE = 0x10000;
const PROG = 0x60;
const LOAD_CONTROL = 0x0104;
const LOAD_STATE = 0xb6ea;
const ADDRESS_TABLE = 0x4000;
// What the device keeps of its load controls, in a part of its memory that ETS does not
// write: the association table's segment, the group object table, the application id.
const ASSOC_PTR = 0xb6f0;
const OBJECT_PTR = 0xb6f2;
const APP_ID = 0xb6f4;
// The properties of its own that the application program writes, one after the other
// in the order of the product, each with room for all its elements.
const OWN_PROPERTIES = 0xb700;

/** Octets of an element of a property datatype (PDT_GENERIC_01–20: 11h–24h). */
const elementSize = (type: number) =>
  type >= 0x11 && type <= 0x24 ? type - 0x10 : 1;

/** Where a property of its own is kept in the memory, if the product has it. */
function ownSlot(s: BcuState, object: number, pid: number) {
  let at = OWN_PROPERTIES;
  for (const p of (s.extra.ownProperties as ProductProperty[] | undefined) ??
    []) {
    // A value the device is made with is not in the memory.
    if (p.value) continue;
    const size = elementSize(p.type);
    if (p.object === object && p.pid === pid) return { at, size, max: p.max };
    at += size * p.max;
  }
  return null;
}

const UNLOADED = 0;
const LOADED = 1;
const LOADING = 2;
const ERROR = 3;

const word = (m: Uint8Array, at: number) => (m[at]! << 8) | m[at + 1]!;
const setWord = (m: Uint8Array, at: number, v: number) => {
  m[at] = v >> 8;
  m[at + 1] = v & 0xff;
};

const layout = (m: Uint8Array, at?: TableLocations): TableLayout => ({
  addressTable: ADDRESS_TABLE,
  associations: at?.associations ?? word(m, ASSOC_PTR),
  objects: at?.objects ?? word(m, OBJECT_PTR),
  objectHeader: 3,
  descriptor: 4,
  maxAddresses: at?.maxAddresses,
  maxAssociations: at?.maxAssociations,
});

/** An event of a Load State Machine (an A_Memory_Write at 0104h). */
function loadEvent(s: BcuState, data: readonly number[]) {
  const lsm = data[0]! >> 4;
  const event = data[0]! & 0x0f;
  if (lsm < 1 || lsm > 4) return;
  const m = s.memory;
  const at = LOAD_STATE + lsm - 1;
  const state = m[at]!;
  switch (event) {
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
      const type = data[1];
      const start = ((data[3] ?? 0) << 8) | (data[4] ?? 0);
      // Segment allocation of the association table: where the table is.
      if (type === 0x00 && lsm === 2) setWord(m, ASSOC_PTR, start);
      // Task segment of the application: its identifier (manufacturer, type, version).
      if (type === 0x02 && lsm === 3) m.set(data.slice(6, 11), APP_ID);
      break;
    }
    case 4: // Unload
      m[at] = UNLOADED;
      break;
  }
  s.written = true;
}

export const system7: MaskProfile = {
  masks: [0x0700, 0x0701, 0x0705],
  name: "BIM M112",
  memorySize: SIZE,
  // RAM and the load control (0104h); load states, what they keep, own properties.
  systemAreas: [
    [0, 0x200],
    [LOAD_STATE, 0x1000],
  ],
  factory() {
    const m = new Uint8Array(SIZE);
    // No group address (the individual address only), nothing loaded.
    m[ADDRESS_TABLE] = 1;
    m[ADDRESS_TABLE + 1] = 0xff;
    m[ADDRESS_TABLE + 2] = 0xff;
    return m;
  },
  programmingMode: (s) => (s.memory[PROG]! & 1) === 1,
  setProgrammingMode(s, on) {
    s.memory[PROG] = on ? s.memory[PROG]! | 1 : s.memory[PROG]! & ~1;
  },
  individualAddress: (s) => word(s.memory, ADDRESS_TABLE + 1),
  setIndividualAddress(s, ia) {
    setWord(s.memory, ADDRESS_TABLE + 1, ia);
  },
  writeMemory(s, address, data) {
    if (address + data.length > SIZE) return false;
    if (address === LOAD_CONTROL) {
      loadEvent(s, data);
      return true;
    }
    s.memory.set(data, address);
    if (address >= ADDRESS_TABLE) s.written = true;
    return true;
  },
  readMemory(s, address, count) {
    if (address + count > SIZE) return null;
    return Array.from(s.memory.subarray(address, address + count));
  },
  readProperty(s, object, pid, start, count) {
    const m = s.memory;
    const value = ((): number[] | null => {
      switch (`${object}/${pid}`) {
        case "0/1": // PID_OBJECT_TYPE: device object
          return [0, 0];
        case "0/12": // PID_MANUFACTURER_ID
          return [0, (s.extra.manufacturer as number | undefined) ?? 0];
        case "0/56": // PID_MAX_APDULENGTH: that of a TP1 frame
          return [0, 15];
        case "1/1":
          return [0, 1];
        case "1/7": // PID_TABLE_REFERENCE of the address table
          return [ADDRESS_TABLE >> 8, ADDRESS_TABLE & 0xff];
        case "2/1":
          return [0, 2];
        case "2/7": // of the association table
          return [m[ASSOC_PTR]!, m[ASSOC_PTR + 1]!];
        case "3/1":
          return [0, 3];
        case "1/5": // PID_LOAD_STATE_CONTROL: address table, association table,
        case "2/5": // application, PEI program
        case "3/5":
        case "4/5":
          return [m[LOAD_STATE + object - 1]!];
        case "3/6": // PID_RUN_STATE_CONTROL: 1 running, 0 halted
          return [system7.running(s) ? 1 : 0];
        case "3/13": // PID_PROG_VERSION: the application identifier
          return Array.from(m.subarray(APP_ID, APP_ID + 5));
        case "4/1":
          return [0, 4];
        case "4/13":
          return [0, 0, 0, 0, 0];
        default:
          return null;
      }
    })();
    // A property of its own that the device is made with: its value, as it is.
    const made = value
      ? undefined
      : (s.extra.ownProperties as ProductProperty[] | undefined)?.find(
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
      // A property of its own: its elements, kept in the memory.
      if (start === 0) return [own.max >> 8, own.max & 0xff];
      if (count < 1 || start + count - 1 > own.max) return null;
      const from = own.at + own.size * (start - 1);
      return Array.from(m.subarray(from, from + own.size * count));
    }
    if (!value) return null;
    // Element 0: the number of elements; the others have one.
    if (start === 0) return [0, 1];
    return start === 1 && count === 1 ? value : null;
  },
  describeProperty(s, object, pid) {
    const own = (s.extra.ownProperties as ProductProperty[] | undefined)?.find(
      (p) => p.object === object && p.pid === pid,
    );
    return own ? { type: own.type, max: own.max, writable: !own.value } : null;
  },
  writeProperty(s, object, pid, start, count, data) {
    // A load control through the property of a part (mask 0705h): answered with its
    // load state.
    if (pid === 5 && object >= 1 && object <= 4 && start === 1 && count === 1) {
      if (!data.length) return null;
      // Its record (10 octets) has no octet between the type of control and the
      // address, which the record in memory (11 octets) has.
      loadEvent(s, [
        (object << 4) | (data[0]! & 0x0f),
        data[1] ?? 0,
        0,
        ...data.slice(2),
      ]);
      return [s.memory[LOAD_STATE + object - 1]!];
    }
    // Properties of its own that the application program writes (an ABB program writes
    // its PID 204 of the application object): kept as written.
    // Kept in the memory, which the installation keeps after a restart.
    const own = ownSlot(s, object, pid);
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
  running: (s) => [0, 1, 2].every((i) => s.memory[LOAD_STATE + i] === LOADED),
  applicationId(s) {
    if (!system7.running(s)) return null;
    const m = s.memory;
    return {
      manufacturer: word(m, APP_ID),
      deviceType: word(m, APP_ID + 2),
      version: m[APP_ID + 4]!,
    };
  },
  tables: (s): Tables => readTablesAt(s.memory, layout(s.memory)),
  tableLocations: (m) => {
    const l = layout(m);
    return { associations: l.associations, objects: l.objects };
  },
  writeTables(memory: Uint8Array, content: TableContent, at: TableLocations) {
    // The tables first: refused, they leave the memory as it was, pointers included.
    writeTablesAt(memory, content, layout(memory, at));
    setWord(memory, ASSOC_PTR, at.associations);
    setWord(memory, OBJECT_PTR, at.objects);
  },
  start(memory, app) {
    // As a complete download leaves it: the address table, the association table and
    // the application loaded, the application's identifier.
    memory.fill(LOADED, LOAD_STATE, LOAD_STATE + 3);
    if (app) {
      setWord(memory, APP_ID, app.manufacturer);
      setWord(memory, APP_ID + 2, app.number);
      memory[APP_ID + 4] = app.version;
    }
  },
  locate(s, at) {
    // The group object table is the application's: the product says where it is.
    if (at.objects !== undefined) setWord(s.memory, OBJECT_PTR, at.objects);
    // As delivered: the application identifier of the manufacturer's program.
    const id = s.memory.subarray(APP_ID, APP_ID + 5);
    if (at.applicationId && id.every((x) => x === 0))
      s.memory.set(at.applicationId.slice(0, 5), APP_ID);
  },
};

registerProfile(system7);
