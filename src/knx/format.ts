// Construction of the actual TP1 frame, from the same codec as the engine.
import type { Translate } from "../i18n";
import type { Priority } from "./contracts";
import { en } from "../i18n";
import { dptBits, encode } from "./dpt";
import { parseGA, parseIA } from "./address";

export { dptName, formatValue } from "./dpt";

const PRIORITY_BITS: Record<Priority, number> = {
  urgent: 2,
  normal: 1,
  low: 3,
};

export interface FrameField {
  label: string;
  bytes: number[];
  hint: string;
}

/** Standard TP1 (writing, reading or response), from the control byte to the control sum. */
export function buildFrame(
  src: string,
  ga: string,
  value: number,
  dpt: string,
  rc = 6,
  t: Translate = en,
  service:
    | "GroupValueWrite"
    | "GroupValueRead"
    | "GroupValueResponse" = "GroupValueWrite",
  priority: Priority = "low",
): FrameField[] {
  const read = service === "GroupValueRead";
  const raw = read ? 0 : encode(dpt, value);
  // APCI: 0x000 read, 0x040 answer, 0x080 write.
  const apciCode = read ? 0x00 : service === "GroupValueResponse" ? 0x40 : 0x80;
  const s = parseIA(src) ?? [0, 0, 0];
  const g = parseGA(ga) ?? [0, 0, 0];
  const srcWord = (s[0] << 12) | (s[1] << 8) | s[2];
  const dstWord = (g[0] << 11) | (g[1] << 8) | g[2];
  // 1, 2 or 4 bits: the data is held in the low 6 bits of the APCI; otherwise 1, 2, or 4 bytes more.
  const bits = dptBits(dpt);
  const short = read || bits < 8;
  const data = short
    ? []
    : bits === 32
      ? [
          (raw >>> 24) & 0xff,
          (raw >>> 16) & 0xff,
          (raw >>> 8) & 0xff,
          raw & 0xff,
        ]
      : bits === 24
        ? [(raw >>> 16) & 0xff, (raw >>> 8) & 0xff, raw & 0xff]
        : bits === 16
          ? [raw >> 8, raw & 0xff]
          : [raw & 0xff];
  const len = 1 + data.length;
  const apci = short
    ? [0x00, apciCode | (raw & 0x3f)]
    : [0x00, apciCode, ...data];
  const fields: FrameField[] = [
    {
      // Standard frame, not repeated; bits 3–2 carry the priority (11 low, 01 normal, 10 urgent).
      label: t`Control`,
      bytes: [0xb0 | (PRIORITY_BITS[priority] << 2)],
      hint:
        priority === "normal"
          ? t`standard frame, normal priority`
          : priority === "urgent"
            ? t`standard frame, urgent priority`
            : t`standard frame, low priority`,
    },
    { label: t`Source`, bytes: [srcWord >> 8, srcWord & 0xff], hint: src },
    { label: t`Destination`, bytes: [dstWord >> 8, dstWord & 0xff], hint: ga },
    {
      label: t`Group · RC · length`,
      bytes: [0x80 | ((rc & 7) << 4) | len],
      hint:
        len > 1
          ? t`group address, RC ${rc}, ${len} bytes`
          : t`group address, RC ${rc}, ${len} byte`,
    },
    {
      label: t`TPCI/APCI + data`,
      bytes: apci,
      hint: read
        ? t`GroupValueRead, no data`
        : data.length > 1
          ? t`${service}, payload bytes 0x${data.map(hex).join(" ")}`
          : t`${service}, payload byte 0x${hex(raw)}`,
    },
  ];
  const all = fields.flatMap((f) => f.bytes);
  const check = ~all.reduce((a, b) => a ^ b, 0) & 0xff;
  fields.push({
    label: t`Checksum`,
    bytes: [check],
    hint: t`inverted XOR`,
  });
  return fields;
}

export const hex = (b: number) => b.toString(16).toUpperCase().padStart(2, "0");
