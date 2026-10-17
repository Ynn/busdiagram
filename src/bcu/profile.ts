// Bus coupling unit (BCU) of a manufacturer's device: what the system part of a KNX device
// does whatever its application, for one family of masks. A profile gives the memory of
// the device, where its individual address and programming mode are, how ETS loads it
// (memory writes, load state machines, properties), and how its tables are read: group
// addresses, associations, group objects. The application of a product (its "firmware")
// runs on top, reading its parameters in the same memory.

/** Group object as its descriptor in memory sets it. */
export interface ObjectDescriptor {
  C: boolean;
  R: boolean;
  W: boolean;
  T: boolean;
  /** Update on a response (system 7 and later; false for a BCU1). */
  U: boolean;
  priority: "system" | "urgent" | "normal" | "low";
  /** Type octet: the size of the value (0–6: 1 to 7 bits, 7: 1 octet, 8: 2 octets…). */
  type: number;
}

/** Tables of a loaded device. */
export interface Tables {
  individualAddress: number;
  /** Group addresses, in the order of the table (connection numbers 1…). */
  groupAddresses: number[];
  /** Group objects by number, with their addresses (the sending one first). */
  objects: Map<number, ObjectDescriptor & { gas: number[] }>;
}

/** What the tables of a complete download contain. */
export interface TableContent {
  individualAddress: number;
  /** Group addresses of each object number, the sending one first. */
  links: Map<number, number[]>;
  /** Descriptor of each active object. */
  objects: Map<number, Omit<ObjectDescriptor, "U"> & { U?: boolean }>;
}

/** State of the system part of a device: its memory and what the profile keeps beside it. */
export interface BcuState {
  mask: number;
  memory: Uint8Array;
  /** Values the profile keeps outside the memory (load states, properties…). */
  extra: Record<string, unknown>;
  /** A download changed the memory since the last restart. */
  written: boolean;
}

export interface MaskProfile {
  /** Mask versions of the family (0010h, 0011h, 0012h…). */
  masks: readonly number[];
  name: string;
  /** Size of the memory the device has (addresses 0…size−1). */
  memorySize: number;
  /**
   * Where the system part of the mask is, outside the segments of a program ([start,
   * length]): its RAM and programming mode, its load states, what it keeps of its load
   * controls, its own properties. An export to share keeps these and the program's
   * parameters and tables, nothing else.
   */
  systemAreas: readonly (readonly [number, number])[];
  /**
   * Address of the relative segment that the device allocates to a load state machine
   * (System B), where the product database places it.
   */
  relativeSegment?(lsm: number): number | undefined;
  /**
   * Where the tables are when the device allocates them itself (System B), as many
   * entries as the memory holds and the program allows ([start, length]).
   */
  tableAreas?(
    memory: Uint8Array,
    max: { addresses?: number; associations?: number },
  ): (readonly [number, number])[];
  /** Memory as delivered by the mask: no group address, application stopped. */
  factory(): Uint8Array;
  /** Programming LED and individual address, as the memory holds them. */
  programmingMode(s: BcuState): boolean;
  setProgrammingMode(s: BcuState, on: boolean): void;
  individualAddress(s: BcuState): number;
  setIndividualAddress(s: BcuState, ia: number): void;
  /**
   * An A_Memory_Write from ETS: false when refused (outside the memory). The profile
   * reacts to its control locations (load control of a system 7).
   */
  writeMemory(s: BcuState, address: number, data: readonly number[]): boolean;
  readMemory(s: BcuState, address: number, count: number): number[] | null;
  /** A_PropertyValue_Read of the device: the value, or null when the property does not exist. */
  readProperty(
    s: BcuState,
    object: number,
    pid: number,
    start: number,
    count: number,
  ): number[] | null;
  /**
   * A_PropertyValue_Write: `count` elements from `start`, `data` their octets; the value
   * written, or null when refused (no property, elements out of it, octets not those of
   * `count` elements).
   */
  writeProperty?(
    s: BcuState,
    object: number,
    pid: number,
    start: number,
    count: number,
    data: readonly number[],
  ): number[] | null;
  /** Description of a property (A_PropertyDescription_Read), or null when it has none. */
  describeProperty?(
    s: BcuState,
    object: number,
    pid: number,
  ): { type: number; max: number; writable: boolean } | null;
  /** Is the application loaded and started? */
  running(s: BcuState): boolean;
  /** Identifier of the application loaded: manufacturer, device type, version. */
  applicationId(
    s: BcuState,
  ): { manufacturer: number; deviceType: number; version: number } | null;
  /** The tables, read from the memory. */
  tables(s: BcuState): Tables;
  /** Where the tables of a loaded memory are. */
  tableLocations(memory: Uint8Array): TableLocations;
  /** Write the tables of a complete download into a memory image. */
  writeTables(
    memory: Uint8Array,
    content: TableContent,
    locations: TableLocations,
  ): void;
  /**
   * Mark an image as started, as the end of a complete download leaves it, with the
   * identifier of its application (for a BCU1, the image holds it, but for the code of
   * the manufacturer at 104h, which ETS writes from the program).
   */
  start?(
    memory: Uint8Array,
    app?: { manufacturer: number; number: number; version: number },
  ): void;
  /**
   * What the device knows from its manufacturer, not from ETS: where its application has
   * its group object table, the application it is delivered with.
   */
  locate?(
    s: BcuState,
    at: { objects?: number; applicationId?: readonly number[] },
  ): void;
}

/** Where a program puts its tables (from its product database). */
export interface TableLocations {
  /** Association table and group object table, as absolute addresses. */
  associations: number;
  objects: number;
  /** Capacities the program gives its tables (see TableLayout). */
  maxAddresses?: number;
  maxAssociations?: number;
}

const profiles: MaskProfile[] = [];

export function registerProfile(p: MaskProfile) {
  profiles.push(p);
}

/** Profile of a mask version, or undefined: the device has no simulated BCU. */
export const profileOf = (mask: number | string) => {
  const m = typeof mask === "string" ? parseInt(mask, 16) : mask;
  return profiles.find((p) => p.masks.includes(m));
};

/** What a device of a manufacturer brings to its BCU. */
export interface BcuProductInfo {
  /** What the delivered device holds in memory ([address, octets]). */
  delivered?: readonly (readonly [number, readonly number[]])[];
  /** Manufacturer code, which the device gives as its device object's property. */
  manufacturerId?: number;
  /** Where its application has its group object table (BIM M112). */
  objectTable?: number;
  /**
   * Identifier of the application it is delivered with (BIM M112: manufacturer, type,
   * version), which ETS compares before loading another.
   */
  applicationId?: readonly number[];
  /** Properties of its own that its application program writes. */
  properties?: readonly ProductProperty[];
}

/** A property of a manufacturer's interface object: its datatype and number of elements. */
export interface ProductProperty {
  object: number;
  pid: number;
  /** Property datatype (PDT_GENERIC_05: 15h…). */
  type: number;
  max: number;
  /**
   * A value the device is made with (its elements from the first), which no download
   * writes: a property its load procedure compares, such as the hardware type 0/78. It
   * is answered as it is, and is not kept in the memory.
   */
  value?: readonly number[];
}

/**
 * New state of a device of a mask, from its memory, or as delivered: the mask's memory
 * with what its manufacturer writes there.
 */
export function bcuState(
  mask: number,
  memory?: Uint8Array | null,
  product: BcuProductInfo = {},
): BcuState {
  const p = profileOf(mask);
  if (!p)
    throw new Error(
      `mask ${mask.toString(16).padStart(4, "0")}: no BCU profile`,
    );
  const m = p.factory();
  for (const [at, bytes] of product.delivered ?? []) m.set(bytes, at);
  if (memory) m.set(memory.subarray(0, m.length));
  const s: BcuState = {
    mask,
    memory: m,
    extra: {
      manufacturer: product.manufacturerId,
      ownProperties: product.properties ?? [],
    },
    written: false,
  };
  p.locate?.(s, {
    objects: product.objectTable,
    applicationId: product.applicationId,
  });
  return s;
}

// ── Bits ────────────────────────────────────────────────────────────────────

/** Read `bits` bits at an address and bit offset (counted from the MSB), unsigned. */
export function readBits(
  mem: Uint8Array,
  address: number,
  bitOffset: number,
  bits: number,
): number {
  let v = 0;
  for (let i = 0; i < bits; i++) {
    const b = bitOffset + i;
    const byte = mem[address + (b >> 3)] ?? 0;
    v = v * 2 + ((byte >> (7 - (b & 7))) & 1);
  }
  return v;
}

/**
 * Unsigned value of `octets` octets at an address, most significant first, or least
 * significant first for a program whose parameters are little-endian
 * (`ParameterByteOrder`).
 */
export function readUnsigned(
  mem: Uint8Array,
  address: number,
  octets: number,
  littleEndian = false,
): number {
  let v = 0;
  for (let i = 0; i < octets; i++) {
    const at = address + (littleEndian ? octets - 1 - i : i);
    v = v * 256 + (mem[at] ?? 0);
  }
  return v;
}

export function writeBits(
  mem: Uint8Array,
  address: number,
  bitOffset: number,
  bits: number,
  value: number,
) {
  for (let i = bits - 1, v = value; i >= 0; i--, v = Math.floor(v / 2)) {
    const b = bitOffset + i;
    const at = address + (b >> 3);
    if (at >= mem.length) continue;
    const mask = 1 << (7 - (b & 7));
    mem[at] = v % 2 ? mem[at]! | mask : mem[at]! & ~mask;
  }
}
