// Detail of a TP1 telegram for teaching: the fields and sub-fields of each octet, the
// serial characters on the bus, the calculation of the check octet, the timing of the frame,
// and the routing counter on each segment that the telegram reaches. Pure functions, from
// the same octets as the frame shown in the telegram card (KNX Standard 03_02_02, TP1:
// L_Data_Standard frame, character format, priority sequence, timing).
import type { Translate } from "../i18n";
import { en } from "../i18n";
import type { Priority } from "./contracts";
import { buildFrame } from "./format";
import type { Topology, TransportPlan } from "./network";
import { behindCut } from "./network";

export type FieldKind =
  | "control"
  | "source"
  | "destination"
  | "routing"
  | "apdu"
  | "data"
  | "checksum";

/** Bits hi…lo of an octet (7 = most significant) that carry one piece of information. */
export interface SubField {
  hi: number;
  lo: number;
  name: string;
  /** Value of the bits, as a number. */
  value: number;
  /** What the value means. */
  meaning: string;
}

export interface FrameOctet {
  index: number;
  value: number;
  field: FieldKind;
  fieldLabel: string;
  subFields: SubField[];
}

export interface TelegramFrameInput {
  source: string;
  ga: string;
  service: "GroupValueWrite" | "GroupValueRead" | "GroupValueResponse";
  dpt: string;
  value: number;
  priority: Priority;
  /** Routing counter of the frame on the segment considered (6 at the source). */
  rc: number;
}

const bitsOf = (byte: number, hi: number, lo: number) =>
  (byte >> lo) & ((1 << (hi - lo + 1)) - 1);

const PRIORITY_NAME = (t: Translate): Record<number, string> => ({
  0: t`system`,
  1: t`normal`,
  2: t`urgent`,
  3: t`low`,
});

/** The octets of the frame with their field and the meaning of their bits. */
export function frameOctets(
  input: TelegramFrameInput,
  t: Translate = en,
): FrameOctet[] {
  const fields = buildFrame(
    input.source,
    input.ga,
    input.value,
    input.dpt,
    input.rc,
    t,
    input.service,
    input.priority,
  );
  const bytes = fields.flatMap((f) => f.bytes);
  const last = bytes.length - 1;
  const apci = ((bytes[6]! & 3) << 2) | (bytes[7]! >> 6);
  const service =
    apci === 0
      ? "GroupValueRead"
      : apci === 1
        ? "GroupValueResponse"
        : apci === 2
          ? "GroupValueWrite"
          : t`other service`;
  const short = bytes.length === 9;
  return bytes.map((value, index) => {
    const sub = (
      hi: number,
      lo: number,
      name: string,
      meaning: (v: number) => string,
    ): SubField => {
      const v = bitsOf(value, hi, lo);
      return { hi, lo, name, value: v, meaning: meaning(v) };
    };
    if (index === 0)
      return {
        index,
        value,
        field: "control",
        fieldLabel: t`Control`,
        subFields: [
          sub(7, 6, t`Frame type`, (v) =>
            v === 2 ? t`L_Data standard frame` : t`other frame`,
          ),
          sub(5, 5, t`Repetition`, (v) => (v ? t`not repeated` : t`repeated`)),
          sub(4, 4, t`Fixed`, () => t`always 1`),
          sub(3, 2, t`Priority`, (v) => PRIORITY_NAME(t)[v]!),
          sub(1, 0, t`Fixed`, () => t`always 0`),
        ],
      };
    if (index === 1)
      return {
        index,
        value,
        field: "source",
        fieldLabel: t`Source`,
        subFields: [
          sub(7, 4, t`Area`, (v) => String(v)),
          sub(3, 0, t`Line`, (v) => String(v)),
        ],
      };
    if (index === 2)
      return {
        index,
        value,
        field: "source",
        fieldLabel: t`Source`,
        subFields: [sub(7, 0, t`Device`, (v) => String(v))],
      };
    if (index === 3)
      return {
        index,
        value,
        field: "destination",
        fieldLabel: t`Destination`,
        subFields: [
          sub(7, 3, t`Main group`, (v) => String(v)),
          sub(2, 0, t`Middle group`, (v) => String(v)),
        ],
      };
    if (index === 4)
      return {
        index,
        value,
        field: "destination",
        fieldLabel: t`Destination`,
        subFields: [sub(7, 0, t`Subgroup`, (v) => String(v))],
      };
    if (index === 5)
      return {
        index,
        value,
        field: "routing",
        fieldLabel: t`Address type · routing counter · length`,
        subFields: [
          sub(7, 7, t`Address type`, (v) =>
            v ? t`group address` : t`individual address`,
          ),
          sub(6, 4, t`Routing counter`, (v) => String(v)),
          sub(3, 0, t`Length`, (v) =>
            v > 1
              ? t`${v} octets after this one`
              : t`${v} octet after this one`,
          ),
        ],
      };
    if (index === 6)
      return {
        index,
        value,
        field: "apdu",
        fieldLabel: t`TPCI · APCI`,
        subFields: [
          sub(7, 2, t`TPCI`, (v) =>
            v === 0 ? t`data, group (T_Data_Group)` : t`other`,
          ),
          sub(1, 0, t`APCI (high bits)`, () => service),
        ],
      };
    if (index === 7)
      return {
        index,
        value,
        field: "apdu",
        fieldLabel: t`APCI · data`,
        subFields: [
          sub(7, 6, t`APCI (low bits)`, () => service),
          sub(5, 0, short ? t`Data` : t`Unused`, (v) =>
            short
              ? input.service === "GroupValueRead"
                ? t`no data for a read`
                : t`value ${v}, carried in the APCI octet (6 bits at most)`
              : t`0: the value follows in its own octets`,
          ),
        ],
      };
    if (index === last)
      return {
        index,
        value,
        field: "checksum",
        fieldLabel: t`Checksum`,
        subFields: [sub(7, 0, t`Check octet`, () => t`odd parity per column`)],
      };
    return {
      index,
      value,
      field: "data",
      fieldLabel: t`Data`,
      subFields: [
        sub(
          7,
          0,
          t`Data octet ${index - 7}`,
          () => t`value of DPT ${input.dpt}`,
        ),
      ],
    };
  });
}

/** One serial character: start bit, data bits least significant first, even parity, stop. */
export interface SerialCharacter {
  octet: number;
  /** The eleven bits in their order on the bus. */
  bits: number[];
  parity: number;
}

export function serialCharacter(octet: number): SerialCharacter {
  const data = Array.from({ length: 8 }, (_, i) => (octet >> i) & 1);
  const ones = data.reduce((a, b) => a + b, 0);
  // Even parity: the parity bit makes the number of 1 among data and parity even.
  const parity = ones % 2;
  return { octet, bits: [0, ...data, parity, 1], parity };
}

/** Calculation of the check octet: each column of bits gets an odd number of 1. */
export interface ChecksumDetail {
  /** Octets covered by the check (all but the check octet). */
  octets: number[];
  /** Number of 1 in each bit column, from bit 7 to bit 0. */
  ones: number[];
  /** XOR of the octets so far, after each octet. */
  running: number[];
  /** Check octet: NOT of the XOR of the octets. */
  check: number;
}

export function checksumDetail(frame: number[]): ChecksumDetail {
  const octets = frame.slice(0, -1);
  const ones = [7, 6, 5, 4, 3, 2, 1, 0].map(
    (b) => octets.filter((o) => (o >> b) & 1).length,
  );
  const running: number[] = [];
  octets.reduce((acc, o) => {
    const next = acc ^ o;
    running.push(next);
    return next;
  }, 0);
  const check = ~(running[running.length - 1] ?? 0) & 0xff;
  return { octets, ones, running, check };
}

/** Times on the bus, in bit times (1/9600 s): KNX TP1 timing. */
export interface FrameTiming {
  bitUs: number;
  /** Bus idle before the frame: 50 bit times, 53 for normal and low priority. */
  idleBits: number;
  /** From the start bit of a character to the start bit of the next one. */
  characterBits: number;
  /** From the first start bit to the last stop bit. */
  frameBits: number;
  /** Silence between the end of the frame and the acknowledgement character. */
  ackPauseBits: number;
  ackBits: number;
}

export function frameTiming(octets: number, priority: Priority): FrameTiming {
  return {
    bitUs: 1e6 / 9600,
    idleBits: priority === "urgent" ? 50 : 53,
    characterBits: 13,
    frameBits: (octets - 1) * 13 + 11,
    ackPauseBits: 15,
    ackBits: 11,
  };
}

/** Acknowledgement characters of the data link layer. */
export const ACK = { ack: 0xcc, nak: 0x0c, busy: 0xc0 } as const;

/** A TP segment that the telegram reaches, with the routing counter of its frame there. */
export interface SegmentFrame {
  segId: string;
  label: string;
  rc: number;
}

export function segmentFrames(
  plan: TransportPlan,
  topology: Topology,
  t: Translate = en,
): SegmentFrame[] {
  const out: SegmentFrame[] = [];
  for (const front of plan.fronts) {
    const sg = topology.segments.get(front.segId);
    if (!sg || sg.kind === "ip" || behindCut(plan, front.path)) continue;
    // Each coupler, repeater, or router crossed decremented the counter.
    const rc = 6 - front.path.length;
    const label =
      sg.kind === "line"
        ? sg.downstream
          ? t`line ${sg.ref}, second segment`
          : t`line ${sg.ref}`
        : sg.kind === "main"
          ? t`main line ${sg.ref}.0`
          : t`backbone`;
    if (!out.some((x) => x.segId === sg.id))
      out.push({ segId: sg.id, label, rc });
  }
  return out;
}
