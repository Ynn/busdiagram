// Configuration of a device of an application program, as ETS keeps it in a project:
// a value per parameter reference, and the group addresses of each group object. From
// it: what the Dynamic tree shows (visible parameters and active group objects), and
// the values written to memory, bit by bit, as ETS writes them.
import type {
  ApplicationProgram,
  ComObject,
  DynNode,
  MemoryLocation,
  Parameter,
  ParameterType,
} from "./application";

/** Values set in the project, by ParameterRef id; absent: the default. */
export type ParameterValues = Record<string, string>;

/** Value of a parameter reference: set, or default of the reference, or of the parameter. */
export function valueOf(
  app: ApplicationProgram,
  values: ParameterValues,
  refId: string,
): string {
  if (refId in values) return values[refId]!;
  const r = app.parameterRefs.get(refId);
  if (!r) return "";
  return r.value ?? app.parameters.get(r.ref)?.value ?? "";
}

/** Does a `when` test match a value ("1", "<5", ">=2", "!=0")? */
function matches(test: string, value: string): boolean {
  const m = /^(<=|>=|<|>|!=)?(.*)$/.exec(test)!;
  const op = m[1];
  const t = m[2]!;
  const a = Number(value);
  const b = Number(t);
  if (!op)
    return Number.isFinite(a) && Number.isFinite(b) ? a === b : value === t;
  if (!Number.isFinite(a) || !Number.isFinite(b))
    return op === "!=" ? value !== t : false;
  switch (op) {
    case "<":
      return a < b;
    case ">":
      return a > b;
    case "<=":
      return a <= b;
    case ">=":
      return a >= b;
    default:
      return a !== b;
  }
}

/** The branch of a choose that applies to the current values. */
export function branch(
  app: ApplicationProgram,
  values: ParameterValues,
  n: Extract<DynNode, { kind: "choose" }>,
): DynNode[] {
  const v = valueOf(app, values, n.ref);
  const hit = n.whens.filter(
    (w) => !w.isDefault && w.test.some((t) => matches(t, v)),
  );
  if (hit.length) return hit.flatMap((w) => w.children);
  return n.whens.filter((w) => w.isDefault).flatMap((w) => w.children);
}

export interface Visible {
  /** ParameterRefs of the active branches, in the order of the dialog (written to memory). */
  parameters: string[];
  /** Those of them that the dialog shows (not in a hidden block, not Access None). */
  shown: string[];
  /** ComObjectRefs active (the objects the device has with these parameters). */
  objects: string[];
}

/** What the Dynamic tree shows for these values. */
export function visible(
  app: ApplicationProgram,
  values: ParameterValues,
): Visible {
  const out: Visible = { parameters: [], shown: [], objects: [] };
  const walk = (nodes: DynNode[], shown: boolean) => {
    for (const n of nodes) {
      switch (n.kind) {
        case "channel":
          walk(n.children, shown);
          break;
        case "block":
          // A block with Access None is not shown, but its choices still create objects.
          walk(n.children, shown && n.access !== "None");
          break;
        case "param": {
          const r = app.parameterRefs.get(n.ref);
          const access =
            r?.access ?? app.parameters.get(r?.ref ?? "")?.access ?? "";
          out.parameters.push(n.ref);
          if (shown && access !== "None") out.shown.push(n.ref);
          break;
        }
        case "object":
          out.objects.push(n.ref);
          break;
        case "choose":
          walk(branch(app, values, n), shown);
          break;
        default:
          break;
      }
    }
  };
  walk(app.dynamic, true);
  out.parameters = [...new Set(out.parameters)];
  out.shown = [...new Set(out.shown)];
  out.objects = [...new Set(out.objects)];
  return out;
}

// ── Memory ─────────────────────────────────────────────────────────────────

/** Bits of a parameter in memory: its size from its type (at least 1 bit for a value). */
export function sizeOf(type: ParameterType | undefined): number {
  return type?.sizeInBit ?? 0;
}

/** Read `bits` bits at a byte offset and bit offset (MSB first), as an unsigned number. */
export function readBits(
  mem: Uint8Array,
  offset: number,
  bitOffset: number,
  bits: number,
): number {
  let v = 0;
  for (let i = 0; i < bits; i++) {
    const b = bitOffset + i;
    const byte = mem[offset + (b >> 3)] ?? 0;
    v = v * 2 + ((byte >> (7 - (b & 7))) & 1);
  }
  return v;
}

export function writeBits(
  mem: Uint8Array,
  offset: number,
  bitOffset: number,
  bits: number,
  value: number,
) {
  for (let i = bits - 1, v = value; i >= 0; i--, v = Math.floor(v / 2)) {
    const b = bitOffset + i;
    const at = offset + (b >> 3);
    if (at >= mem.length) continue;
    const mask = 1 << (7 - (b & 7));
    mem[at] = v % 2 ? mem[at]! | mask : mem[at]! & ~mask;
  }
}

/** KNX 2-octet float (DPT 9): sign, exponent (4 bits), mantissa (11 bits) ×0.01. */
function dpt9Raw(v: number): number {
  let m = Math.round(v * 100);
  let e = 0;
  while ((m < -2048 || m > 2047) && e < 15) {
    m = Math.round(m / 2);
    e++;
  }
  return ((m < 0 ? 0x8000 : 0) | (e << 11) | (m & 0x7ff)) >>> 0;
}
const dpt9Value = (raw: number) => {
  const m = raw & 0x7ff;
  return ((raw & 0x8000 ? m - 2048 : m) << ((raw >> 11) & 15)) / 100;
};

/** Octets of a parameter value, big-endian, as many as its type takes. */
export function encodeValue(
  type: ParameterType | undefined,
  value: string,
): Uint8Array {
  const bits = sizeOf(type);
  const out = new Uint8Array(Math.ceil(bits / 8));
  if (!type || !bits) return out;
  if (type.kind === "text") {
    // ISO-8859-1, completed with NUL octets.
    [...value].slice(0, out.length).forEach((c, i) => {
      out[i] = Math.min(255, c.charCodeAt(0));
    });
    return out;
  }
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n)) return out;
  const view = new DataView(out.buffer);
  if (type.kind === "float") {
    if (bits === 64) view.setFloat64(0, n);
    else if (bits === 32) view.setFloat32(0, n);
    else view.setUint16(0, dpt9Raw(n));
    return out;
  }
  // Integers, two's complement for a negative one, on any width (BigInt above 32 bits).
  let v = BigInt(Math.round(n));
  if (v < 0n) v += 1n << BigInt(bits);
  for (let i = out.length - 1; i >= 0; i--, v >>= 8n)
    out[i] = Number(v & 0xffn);
  // A width that is not a multiple of 8 is aligned on the right of the octets.
  return out;
}

/** Text value of the octets of a parameter, read with its type. */
export function decodeValue(
  type: ParameterType | undefined,
  bytes: Uint8Array,
): string {
  const bits = sizeOf(type);
  if (!type || !bits) return "";
  if (type.kind === "text") {
    const end = bytes.indexOf(0);
    return String.fromCharCode(...(end < 0 ? bytes : bytes.subarray(0, end)));
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (type.kind === "float") {
    const v =
      bits === 64
        ? view.getFloat64(0)
        : bits === 32
          ? view.getFloat32(0)
          : dpt9Value(view.getUint16(0));
    return String(Number(v.toPrecision(7)));
  }
  let v = 0n;
  for (const b of bytes) v = (v << 8n) | BigInt(b);
  if (type.kind === "number" && type.signed && v >= 1n << BigInt(bits - 1))
    v -= 1n << BigInt(bits);
  return v.toString();
}

/** Write a value at a memory location: its bits, MSB first, from a bit offset. */
function writeValue(
  img: Uint8Array,
  offset: number,
  bitOffset: number,
  type: ParameterType | undefined,
  value: string,
) {
  const bits = sizeOf(type);
  const bytes = encodeValue(type, value);
  const pad = bytes.length * 8 - bits;
  // Bit-wise, so that a value narrower than its octets keeps its neighbours.
  for (let i = 0; i < bits; i++) {
    const src = pad + i;
    const bit = (bytes[src >> 3]! >> (7 - (src & 7))) & 1;
    writeBits(img, offset, bitOffset + i, 1, bit);
  }
}

function readValue(
  img: Uint8Array,
  offset: number,
  bitOffset: number,
  type: ParameterType | undefined,
): string {
  const bits = sizeOf(type);
  const bytes = new Uint8Array(Math.ceil(bits / 8));
  const pad = bytes.length * 8 - bits;
  for (let i = 0; i < bits; i++) {
    const dst = pad + i;
    if (readBits(img, offset, bitOffset + i, 1))
      bytes[dst >> 3]! |= 1 << (7 - (dst & 7));
  }
  return decodeValue(type, bytes);
}

/** Bytes of each segment, by segment id: their default images, copied. */
export function segmentImages(
  app: ApplicationProgram,
): Map<string, Uint8Array> {
  return new Map([...app.segments].map(([id, s]) => [id, s.data.slice()]));
}

/**
 * Write the parameters into the segment images, as ETS does: for each parameter in
 * memory, the value of its visible reference (or of its default reference); for a union,
 * its visible parameters, or its default one when none is visible.
 */
export function writeParameters(
  app: ApplicationProgram,
  values: ParameterValues,
  images: Map<string, Uint8Array>,
) {
  const shown = new Set(visible(app, values).parameters);
  const refsOf = new Map<string, string[]>();
  app.parameterRefs.forEach((r) =>
    refsOf.set(r.ref, [...(refsOf.get(r.ref) ?? []), r.id]),
  );
  const unions = new Map<string, Parameter[]>();
  for (const p of app.parameters.values())
    if (p.union) unions.set(p.union, [...(unions.get(p.union) ?? []), p]);
  const write = (p: Parameter, ref: string | undefined) => {
    if (!p.memory) return;
    const img = images.get(p.memory.segment);
    const type = app.types.get(p.type);
    const bits = sizeOf(type);
    if (!img || !bits) return;
    const v = ref ? valueOf(app, values, ref) : p.value;
    writeValue(img, p.memory.offset, p.memory.bitOffset, type, v);
  };
  const visibleRef = (p: Parameter) =>
    (refsOf.get(p.id) ?? []).find((r) => shown.has(r));
  for (const p of app.parameters.values()) {
    if (p.union) continue;
    write(p, visibleRef(p) ?? refsOf.get(p.id)?.[0]);
  }
  // A union: the visible members (several, at different bits of the shared memory), or
  // its default member when none is visible.
  for (const list of unions.values()) {
    const shownMembers = list.filter((p) => visibleRef(p));
    const on = shownMembers.length
      ? shownMembers
      : list.filter((p) => p.defaultUnion);
    for (const p of on) write(p, visibleRef(p) ?? refsOf.get(p.id)?.[0]);
  }
}

/** Value of every parameter reference read from memory (the configuration a device holds). */
export function readParameters(
  app: ApplicationProgram,
  images: Map<string, Uint8Array>,
): ParameterValues {
  const out: ParameterValues = {};
  for (const r of app.parameterRefs.values()) {
    const p = app.parameters.get(r.ref);
    if (!p?.memory) continue;
    const img = images.get(p.memory.segment);
    const type = app.types.get(p.type);
    const bits = sizeOf(type);
    if (!img || !bits) continue;
    out[r.id] = readValue(img, p.memory.offset, p.memory.bitOffset, type);
  }
  return out;
}

/** Parameter of a memory location, for diagnostics. */
export const locationText = (m: MemoryLocation | null) =>
  m ? `${m.segment}+${m.offset}.${m.bitOffset}` : "—";

/** Effective description of a group object reference: the object with the ref's overrides. */
export function objectOf(
  app: ApplicationProgram,
  refId: string,
): (ComObject & { ref: string }) | null {
  const r = app.objectRefs.get(refId);
  const o = r ? app.objects.get(r.ref) : undefined;
  if (!r || !o) return null;
  return {
    ...o,
    ref: r.id,
    text: r.text ?? o.text,
    functionText: r.functionText ?? o.functionText,
    size: r.size ?? o.size,
    dpt: r.dpt ?? o.dpt,
    flags: { ...o.flags, ...r.flags },
  };
}
