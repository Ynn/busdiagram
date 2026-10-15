// cEMI L_Data frames of group communication (KNX Standard 03_06_03 §4.1.5), as exchanged
// with a KNXnet/IP tunnel or a bridge. Not the TP1 frame of format.ts: a cEMI frame has a
// message code, additional information, two control fields and a length that counts the
// APDU after the TPCI octet, and no checksum.
import { parseGA, parseIA } from "./address";
import type { Priority } from "./contracts";
import type { GroupService } from "./sim";

export const L_DATA_REQ = 0x11;
export const L_DATA_CON = 0x2e;
export const L_DATA_IND = 0x29;

export type CemiPriority = Priority | "system";

/** A group telegram carried by a cEMI L_Data frame. */
export interface CemiGroupFrame {
  messageCode: typeof L_DATA_REQ | typeof L_DATA_CON | typeof L_DATA_IND;
  service: GroupService;
  /** Individual address of the sender ("1.1.251"); "0.0.0" lets an interface fill it in. */
  source: string;
  /** Group address, three levels. */
  ga: string;
  priority: CemiPriority;
  /** Routing counter (hop count), 0–7. */
  hopCount: number;
  /**
   * Payload: `size` 0 for data held in the 6 low bits of the APCI (DPTs of 1 to 6 bits, and
   * a read), otherwise the number of bytes after the APCI (1 to 14 for a standard frame).
   */
  size: number;
  /** Payload bytes; one byte holding the 6-bit value when `size` is 0. */
  data: number[];
  /** L_Data.con: confirmation negative (error bit of control field 1). */
  error?: boolean;
}

/** A frame that cannot be read, with the reason. */
export class CemiError extends Error {}

const PRIORITY_BITS: Record<CemiPriority, number> = {
  system: 0,
  normal: 1,
  urgent: 2,
  low: 3,
};
const PRIORITIES: CemiPriority[] = ["system", "normal", "urgent", "low"];

const APCI: Record<GroupService, number> = {
  GroupValueRead: 0x000,
  GroupValueResponse: 0x040,
  GroupValueWrite: 0x080,
};

/** Maximum APDU data of a standard frame (L_Data, extended frames excluded). */
export const MAX_DATA = 14;

const iaWord = (ia: string) => {
  const a = parseIA(ia);
  if (!a) throw new CemiError(`invalid individual address “${ia}”`);
  return (a[0] << 12) | (a[1] << 8) | a[2];
};
const gaWord = (ga: string) => {
  const g = parseGA(ga);
  if (!g) throw new CemiError(`invalid group address “${ga}”`);
  return (g[0] << 11) | (g[1] << 8) | g[2];
};
export const iaText = (w: number) =>
  `${(w >> 12) & 0xf}.${(w >> 8) & 0xf}.${w & 0xff}`;
export const gaText = (w: number) =>
  `${(w >> 11) & 0x1f}/${(w >> 8) & 0x7}/${w & 0xff}`;

/** Bytes of a cEMI L_Data frame for a group telegram. */
export function encodeCemi(f: CemiGroupFrame): Uint8Array {
  const read = f.service === "GroupValueRead";
  if (!Number.isInteger(f.hopCount) || f.hopCount < 0 || f.hopCount > 7)
    throw new CemiError(`hop count ${f.hopCount} outside 0–7`);
  const size = read ? 0 : f.size;
  if (!Number.isInteger(size) || size < 0 || size > MAX_DATA)
    throw new CemiError(`payload size ${size} outside 0–${MAX_DATA}`);
  if (size > 0 && f.data.length !== size)
    throw new CemiError(`${f.data.length} payload bytes for a size of ${size}`);
  if (f.data.some((b) => !Number.isInteger(b) || b < 0 || b > 0xff))
    throw new CemiError("payload bytes 0–255 expected");
  const src = iaWord(f.source);
  const dst = gaWord(f.ga);
  const apci = APCI[f.service];
  const short = read ? 0 : (f.data[0] ?? 0) & 0x3f;
  const apdu =
    size === 0
      ? [(apci >> 8) & 0x03, (apci & 0xc0) | short]
      : [(apci >> 8) & 0x03, apci & 0xc0, ...f.data];
  // Control field 1: standard frame, no repetition, broadcast (not system broadcast),
  // priority, no acknowledgement requested; the error bit only in a confirmation.
  const ctrl1 =
    0x80 |
    0x20 |
    0x10 |
    (PRIORITY_BITS[f.priority] << 2) |
    (f.messageCode === L_DATA_CON && f.error ? 0x01 : 0);
  // Control field 2: group destination, hop count, standard frame format.
  const ctrl2 = 0x80 | (f.hopCount << 4);
  return Uint8Array.from([
    f.messageCode,
    0x00,
    ctrl1,
    ctrl2,
    src >> 8,
    src & 0xff,
    dst >> 8,
    dst & 0xff,
    apdu.length - 1,
    ...apdu,
  ]);
}

/**
 * Group telegram of a cEMI L_Data frame. Throws CemiError for a frame that is not a
 * standard L_Data group frame of one of the three group services, or whose length does
 * not match: a truncated frame is refused rather than guessed.
 */
export function decodeCemi(bytes: Uint8Array | number[]): CemiGroupFrame {
  const b = Array.from(bytes);
  if (b.length < 2) throw new CemiError("frame too short");
  const mc = b[0]!;
  if (mc !== L_DATA_REQ && mc !== L_DATA_IND && mc !== L_DATA_CON)
    throw new CemiError(
      `message code 0x${mc.toString(16).padStart(2, "0")} is not L_Data`,
    );
  const at = 2 + b[1]!;
  if (b.length < at + 9)
    throw new CemiError(`frame of ${b.length} bytes too short for L_Data`);
  const ctrl1 = b[at]!;
  const ctrl2 = b[at + 1]!;
  if (!(ctrl1 & 0x80)) throw new CemiError("extended frame not supported");
  if (!(ctrl2 & 0x80))
    throw new CemiError("individual destination: not a group telegram");
  if (ctrl2 & 0x0f) throw new CemiError("extended frame format not supported");
  const len = b[at + 6]!;
  if (b.length !== at + 8 + len)
    throw new CemiError(
      `length ${len} does not match the ${b.length - at - 8} bytes after it`,
    );
  if (len < 1) throw new CemiError("no APCI");
  const tpci = b[at + 7]!;
  // Group communication uses T_Data_Group: TPCI 000000 (no numbered/control bits).
  if (tpci & 0xfc)
    throw new CemiError(
      `TPCI 0x${(tpci & 0xfc).toString(16)} is not T_Data_Group`,
    );
  const apci = ((tpci & 0x03) << 8) | (b[at + 8]! & 0xc0);
  const service = (Object.keys(APCI) as GroupService[]).find(
    (s) => APCI[s] === apci,
  );
  if (!service)
    throw new CemiError(
      `APCI 0x${apci.toString(16).padStart(3, "0")} is not a group service`,
    );
  if (service === "GroupValueRead" && (len !== 1 || b[at + 8]! & 0x3f))
    throw new CemiError("GroupValueRead with data");
  const size = len - 1;
  const data = size === 0 ? [b[at + 8]! & 0x3f] : b.slice(at + 9);
  if (service === "GroupValueRead") data.length = 0;
  return {
    messageCode: mc as CemiGroupFrame["messageCode"],
    service,
    source: iaText((b[at + 2]! << 8) | b[at + 3]!),
    ga: gaText((b[at + 4]! << 8) | b[at + 5]!),
    priority: PRIORITIES[(ctrl1 >> 2) & 3]!,
    hopCount: (ctrl2 >> 4) & 7,
    size,
    data,
    ...(mc === L_DATA_CON ? { error: (ctrl1 & 0x01) === 1 } : {}),
  };
}

/** Payload size of a DPT in a telegram: 0 when held in the APCI (up to 6 bits). */
export const payloadSize = (bits: number) =>
  bits <= 6 ? 0 : Math.ceil(bits / 8);

/** Payload bytes of a raw value (number) of `size` bytes, most significant first. */
export function rawToData(raw: number, size: number): number[] {
  if (size === 0) return [raw & 0x3f];
  if (size > 4)
    throw new CemiError(`payload of ${size} bytes not representable`);
  const out: number[] = [];
  for (let i = size - 1; i >= 0; i--)
    out.push(Math.floor(raw / 2 ** (8 * i)) & 0xff);
  return out;
}

/** Raw value (number) of payload bytes; payloads above 4 bytes are not representable. */
export function dataToRaw(data: number[], size: number): number {
  if (size === 0) return (data[0] ?? 0) & 0x3f;
  if (size > 4)
    throw new CemiError(`payload of ${size} bytes not representable`);
  return data.reduce((a, x) => a * 256 + x, 0) >>> 0;
}

export const hexBytes = (b: Uint8Array | number[]) =>
  Array.from(b, (x) => x.toString(16).toUpperCase().padStart(2, "0")).join(" ");
