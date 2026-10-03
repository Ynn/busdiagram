import type { Translate } from "../i18n";
import { en } from "../i18n";
import { STANDARD_DPT_IDS } from "./dpt-catalog";
// Codecs of data point types (DPTs) actually supported.
// The "canonical" value of an object is the decoded value of its useful byte:
// Both sending and receiving use encode → decode.

export interface DptInfo {
  id: string;
  name: string;
  /** Useful size: 1, 2 or 4 bits (in APCI), 8, 16, or 32 bits (additional bytes). */
  bits: 1 | 2 | 4 | 8 | 16 | 24 | 32;
  /**
   * Encoding of 16- and 32-bit values: KNX two-byte float (default for 16 bits),
   * unsigned 16-bit integer, signed 32-bit integer, or IEEE 754 single precision.
   */
  codec?: "f16" | "u16" | "v32" | "f32" | "time" | "date";
  min: number;
  max: number;
  /** Accepts only integer application values when true. */
  integer: boolean;
}

const BOOL = (id: string, name: string): DptInfo => ({
  id,
  name,
  bits: 1,
  min: 0,
  max: 1,
  integer: true,
});

const TABLE: DptInfo[] = [
  BOOL("1.001", "Switch"),
  BOOL("1.002", "Boolean"),
  BOOL("1.003", "Enable"),
  BOOL("1.005", "Alarm"),
  BOOL("1.007", "Step"),
  BOOL("1.008", "Up/Down"),
  BOOL("1.009", "Open/Closed"),
  BOOL("1.010", "Start/Stop"),
  BOOL("1.011", "State"),
  BOOL("1.012", "Invert"),
  BOOL("1.015", "Reset"),
  BOOL("1.017", "Trigger"),
  BOOL("1.018", "Occupancy"),
  BOOL("1.019", "Window/Door"),
  BOOL("1.022", "Scene A/B"),
  BOOL("1.100", "Heating/Cooling"),
  // 2 bits: c (control, bit 1) and v (value, bit 0). 0/1 = no forcing, 2 = forced shutdown, 3 = forced on.
  {
    id: "2.001",
    name: "Priority control",
    bits: 2,
    min: 0,
    max: 3,
    integer: true,
  },
  // 2 bits: c (control) and v (direction as in 1.008: 0 up, 1 down); 2 = forced up,
  // 3 = forced down. The forcing input of shutter actuators.
  {
    id: "2.008",
    name: "Direction control",
    bits: 2,
    min: 0,
    max: 3,
    integer: true,
  },
  // 4 bits: direction (bit 3, 1 = increase) and step code (bits 0–2; 0 = stop).
  {
    id: "3.007",
    name: "Relative dimming",
    bits: 4,
    min: 0,
    max: 15,
    integer: true,
  },
  {
    id: "5.001",
    name: "Percentage",
    bits: 8,
    min: 0,
    max: 100,
    integer: false,
  },
  // Unsigned percentage, 1 % per step: 0–255 %.
  {
    id: "5.004",
    name: "Percentage (0–255)",
    bits: 8,
    min: 0,
    max: 255,
    integer: true,
  },
  { id: "5.010", name: "Counter", bits: 8, min: 0, max: 255, integer: true },
  {
    id: "17.001",
    name: "Scene number",
    bits: 8,
    min: 0,
    max: 63,
    integer: true,
  },
  // Scene control: bit 7 = 1 stores the scene (learn), bits 0–5 = scene number − 1.
  {
    id: "18.001",
    name: "Scene control",
    bits: 8,
    min: 0,
    max: 191,
    integer: true,
  },
  // One-byte HVAC mode: 0 auto, 1 comfort, 2 standby, 3 economy, 4 protection.
  {
    id: "20.102",
    name: "HVAC mode",
    bits: 8,
    min: 0,
    max: 4,
    integer: true,
  },
  // KNX 2-byte float: 0.01 × M × 2^E (sign bit, 4-bit exponent, 11-bit mantissa).
  {
    id: "9.001",
    name: "Temperature",
    bits: 16,
    min: -273,
    max: 670433.28,
    integer: false,
  },
  {
    id: "9.002",
    name: "Temperature difference",
    bits: 16,
    min: -671088.64,
    max: 670433.28,
    integer: false,
  },
  {
    id: "9.004",
    name: "Lux",
    bits: 16,
    min: 0,
    max: 670433.28,
    integer: false,
  },
  {
    id: "9.005",
    name: "Wind speed",
    bits: 16,
    min: 0,
    max: 670433.28,
    integer: false,
  },
  {
    id: "9.007",
    name: "Humidity",
    bits: 16,
    min: 0,
    max: 670433.28,
    integer: false,
  },
  {
    id: "9.008",
    name: "Air quality",
    bits: 16,
    min: 0,
    max: 670433.28,
    integer: false,
  },
  // Electrical power in kW (2-byte float); 14.056 carries W.
  {
    id: "9.024",
    name: "Power (kW)",
    bits: 16,
    min: -671088.64,
    max: 670433.28,
    integer: false,
  },
  {
    id: "9.028",
    name: "Wind speed (km/h)",
    bits: 16,
    min: 0,
    max: 670433.28,
    integer: false,
  },
  // Unsigned 16-bit colour temperature in kelvin.
  {
    id: "7.600",
    name: "Colour temperature",
    bits: 16,
    codec: "u16",
    min: 0,
    max: 65535,
    integer: true,
  },
  // Time of day: application value = day × 86400 + seconds of the day; day 0 = none, 1 = Monday … 7 = Sunday.
  {
    id: "10.001",
    name: "Time of day",
    bits: 24,
    codec: "time",
    min: 0,
    max: 7 * 86400 + 86399,
    integer: true,
  },
  // Date: application value = YYYYMMDD; years 1990–2089 (two-digit year in the frame).
  {
    id: "11.001",
    name: "Date",
    bits: 24,
    codec: "date",
    min: 19900101,
    max: 20891231,
    integer: true,
  },
  // Signed 32-bit active energy in Wh.
  {
    id: "13.010",
    name: "Active energy",
    bits: 32,
    codec: "v32",
    min: -2147483648,
    max: 2147483647,
    integer: true,
  },
  // Signed 32-bit active energy in kWh.
  {
    id: "13.013",
    name: "Active energy (kWh)",
    bits: 32,
    codec: "v32",
    min: -2147483648,
    max: 2147483647,
    integer: true,
  },
  // IEEE 754 single-precision power in W.
  {
    id: "14.056",
    name: "Power",
    bits: 32,
    codec: "f32",
    min: -3.4e38,
    max: 3.4e38,
    integer: false,
  },
];

const f32 = new DataView(new ArrayBuffer(4));
const encodeFloat32 = (v: number) => {
  f32.setFloat32(0, v);
  return f32.getUint32(0);
};
const decodeFloat32 = (raw: number) => {
  f32.setUint32(0, raw >>> 0);
  return f32.getFloat32(0);
};

const BY_ID = new Map(TABLE.map((d) => [d.id, d]));

export const SUPPORTED_DPTS: readonly string[] = TABLE.map((d) => d.id);

export function dptInfo(dpt: string): DptInfo | undefined {
  return BY_ID.get(dpt);
}

export function isSupportedDpt(dpt: string): boolean {
  return BY_ID.has(dpt);
}

// Size in bits of each main DPT number, from the formats of KNX 03_07_02 (fields rounded
// up to whole bytes above 6 bits). Used for data types that a diagram shows without
// simulating them: the size is enough to check group address consistency.
const MAIN_BITS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 8,
  6: 8,
  7: 16,
  8: 16,
  9: 16,
  10: 24,
  11: 24,
  12: 32,
  13: 32,
  14: 32,
  15: 32,
  16: 112,
  17: 8,
  18: 8,
  19: 64,
  20: 8,
  21: 8,
  22: 16,
  23: 2,
  27: 32,
  29: 64,
  31: 3,
  200: 16,
  201: 16,
  202: 16,
  203: 24,
  204: 16,
  205: 24,
  206: 24,
  207: 16,
  209: 24,
  210: 32,
  211: 16,
  212: 48,
  213: 64,
  214: 32,
  215: 40,
  216: 40,
  217: 16,
  218: 40,
  219: 48,
  220: 32,
  221: 48,
  222: 48,
  223: 24,
  224: 48,
  225: 24,
  229: 48,
  231: 32,
  232: 24,
  234: 16,
  235: 48,
  236: 8,
  237: 16,
  238: 8,
  239: 16,
  240: 24,
  241: 32,
  242: 48,
  243: 64,
  244: 16,
  248: 40,
  251: 48,
  255: 64,
};

/** Main number of a DPT identifier ("1.1200" → 1); sub-numbers have 3 to 5 digits. */
const mainOf = (dpt: string) => {
  const m = /^(\d{1,3})\.(\d{3,5})$/.exec(dpt);
  return m ? Number(m[1]) : null;
};

/**
 * A DPT that a passive or display object may use without simulation: an identifier of
 * the standard catalog whose size is known. Its values are shown as raw bytes.
 */
export function isRepresentableDpt(dpt: string): boolean {
  const main = mainOf(dpt);
  return (
    BY_ID.has(dpt) ||
    (STANDARD_DPT_IDS.has(dpt) &&
      main !== null &&
      MAIN_BITS[main] !== undefined)
  );
}

/** Raw value of a DPT that is not simulated, in hexadecimal. */
const rawText = (dpt: string, v: number) =>
  "0x" +
  (v >>> 0)
    .toString(16)
    .toUpperCase()
    .padStart(Math.max(2, Math.ceil(dptBits(dpt) / 4)), "0");

/** Localized DPT name. The table stores English source names; the French catalog translates them. */
export function dptTitle(dpt: string, t: Translate = en): string {
  switch (dpt) {
    case "1.001":
      return t`Switch`;
    case "1.002":
      return t`Boolean`;
    case "1.003":
      return t`Enable`;
    case "1.005":
      return t`Alarm`;
    case "3.007":
      return t`Relative dimming`;
    case "1.007":
      return t`Step`;
    case "1.008":
      return t`Up/Down`;
    case "1.009":
      return t`Open/Close`;
    case "1.010":
      return t`Start/Stop`;
    case "1.011":
      return t`State`;
    case "1.012":
      return t`Invert`;
    case "1.015":
      return t`Reset`;
    case "1.017":
      return t`Trigger`;
    case "1.018":
      return t`Occupancy`;
    case "1.019":
      return t`Window/Door`;
    case "1.100":
      return t`Heating/Cooling`;
    case "20.102":
      return t`HVAC mode`;
    case "9.001":
      return t`Temperature`;
    case "9.002":
      return t`Temperature difference`;
    case "9.004":
      return t`Lux`;
    case "9.005":
      return t`Wind speed`;
    case "9.007":
      return t`Humidity`;
    case "9.008":
      return t`Air quality`;
    case "9.024":
      return t`Power (kW)`;
    case "9.028":
      return t`Wind speed (km/h)`;
    case "13.013":
      return t`Active energy (kWh)`;
    case "5.004":
      return t`Percentage (0–255)`;
    case "7.600":
      return t`Colour temperature`;
    case "10.001":
      return t`Time of day`;
    case "11.001":
      return t`Date`;
    case "13.010":
      return t`Active energy`;
    case "14.056":
      return t`Power`;
    case "2.001":
      return t`Priority control`;
    case "5.001":
      return t`Percentage`;
    case "5.010":
      return t`Counter`;
    case "17.001":
      return t`Scene number`;
    case "18.001":
      return t`Scene control`;
    default:
      return dpt;
  }
}

export function dptName(dpt: string, t: Translate = en): string {
  const d = BY_ID.get(dpt);
  return d ? `${d.id} ${dptTitle(dpt, t)}` : dpt;
}

export function dptBits(dpt: string): number {
  const known = BY_ID.get(dpt)?.bits;
  if (known) return known;
  const main = mainOf(dpt);
  return (main !== null && MAIN_BITS[main]) || (dpt.startsWith("1.") ? 1 : 8);
}

/** Range error for an application value, or null if it can be encoded. */
export function checkValue(
  dpt: string,
  v: number,
  t: Translate = en,
): string | null {
  const d = BY_ID.get(dpt);
  if (!d) return t`DPT ${dpt} not supported`;
  if (!Number.isFinite(v)) return t`finite number expected`;
  if (v < d.min || v > d.max)
    return t`value ${v} outside the range ${d.min}…${d.max} of DPT ${dpt}`;
  if (d.bits === 1 && v !== 0 && v !== 1)
    return t`DPT ${dpt} only accepts 0 or 1`;
  if (d.integer && d.bits !== 1 && !Number.isInteger(v))
    return t`DPT ${dpt} expects an integer`;
  if (d.codec === "date" && !validDate(v))
    return t`${v} is not a valid date (YYYYMMDD)`;
  if (dpt === "18.001" && v & 0x40)
    return t`DPT 18.001: bit 6 is reserved; use 0–63 to recall a scene, 128–191 to store it`;
  return null;
}

/** YYYYMMDD value of an existing calendar day. */
function validDate(v: number): boolean {
  const y = Math.floor(v / 10000);
  const m = Math.floor(v / 100) % 100;
  const day = v % 100;
  if (m < 1 || m > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Application value → byte (or bit) transported. */
export function encode(dpt: string, v: number): number {
  const d = BY_ID.get(dpt);
  if (!d) throw new Error(`DPT ${dpt} is not supported`);
  if (d.bits === 1) return v ? 1 : 0;
  if (dpt === "5.001") {
    const p = Math.min(100, Math.max(0, v));
    return Math.round((p * 255) / 100);
  }
  const clamped = Math.min(d.max, Math.max(d.min, v));
  if (d.codec === "time") {
    const n = Math.round(clamped);
    const day = Math.floor(n / 86400);
    const sec = n % 86400;
    return (
      (day << 21) |
      (Math.floor(sec / 3600) << 16) |
      (Math.floor((sec % 3600) / 60) << 8) |
      (sec % 60)
    );
  }
  if (d.codec === "date") {
    const n = Math.round(clamped);
    return (
      ((n % 100) << 16) |
      ((Math.floor(n / 100) % 100) << 8) |
      (Math.floor(n / 10000) % 100)
    );
  }
  if (d.codec === "u16") return Math.round(clamped);
  if (d.codec === "v32") return Math.round(clamped) >>> 0;
  if (d.codec === "f32") return encodeFloat32(clamped);
  if (d.bits === 16) return encodeFloat16(clamped);
  return Math.min(d.max, Math.max(d.min, Math.round(v)));
}

/**
 * Decodes a received payload; a payload that the DPT declares invalid (0x7FFF in DPT 9.xxx)
 * gives `invalid` instead of an exception, so that the receiver can ignore it.
 */
export function decodeOrInvalid(
  dpt: string,
  raw: number,
): { invalid: false; value: number } | { invalid: true } {
  try {
    return { invalid: false, value: decode(dpt, raw) };
  } catch (e) {
    if (e instanceof RangeError) return { invalid: true };
    throw e;
  }
}

/** Transported byte (or bit) → canonical application value. */
export function decode(dpt: string, raw: number): number {
  const d = BY_ID.get(dpt);
  // Not simulated: the value is kept as received and shown in hexadecimal.
  if (!d && isRepresentableDpt(dpt)) return raw >>> 0;
  if (!d) throw new Error(`DPT ${dpt} is not supported`);
  if (d.bits === 1) return raw & 1;
  if (d.bits === 2) return raw & 3;
  if (d.bits === 4) return raw & 15;
  if (d.codec === "time")
    return (
      ((raw >> 21) & 7) * 86400 +
      ((raw >> 16) & 0x1f) * 3600 +
      ((raw >> 8) & 0x3f) * 60 +
      (raw & 0x3f)
    );
  if (d.codec === "date") {
    const yy = raw & 0x7f;
    // Two-digit year: 90–99 → 1990s, 0–89 → 2000s.
    const year = yy >= 90 ? 1900 + yy : 2000 + yy;
    return year * 10000 + ((raw >> 8) & 0x0f) * 100 + ((raw >> 16) & 0x1f);
  }
  if (d.codec === "u16") return raw & 0xffff;
  if (d.codec === "v32") return raw | 0;
  if (d.codec === "f32") return decodeFloat32(raw);
  if (d.bits === 16) return decodeFloat16(raw);
  if (dpt === "5.001") return ((raw & 0xff) * 100) / 255;
  if (dpt === "17.001") return raw & 0x3f;
  if (dpt === "18.001") return raw & 0xbf;
  return raw & 0xff;
}

/** KNX 2-byte float (DPT 9.xxx): MEEEEMMM MMMMMMMM, value = 0.01 × M × 2^E. */
export function encodeFloat16(v: number): number {
  if (!Number.isFinite(v) || v < -671088.64 || v > 670433.28)
    throw new RangeError("DPT 9.xxx value outside the representable range");
  const c = v * 100;
  let e = 0;
  let m = Math.round(c);
  while ((m < -2048 || m > 2047) && e < 15) m = Math.round(c / 2 ** ++e);
  m = Math.min(2047, Math.max(-2048, m));
  const m12 = m & 0xfff;
  return ((m12 & 0x800) << 4) | (e << 11) | (m12 & 0x7ff);
}

export function decodeFloat16(raw: number): number {
  if ((raw & 0xffff) === 0x7fff)
    throw new RangeError("DPT 9.xxx value 0x7FFF is invalid");
  const m12 = ((raw >> 4) & 0x800) | (raw & 0x7ff);
  const m = m12 & 0x800 ? m12 - 4096 : m12;
  const e = (raw >> 11) & 0xf;
  return Math.round(m * 2 ** e) / 100;
}

/** HVAC Mode Wording (DPT 20.102). */
export function hvacModeName(v: number, t: Translate = en): string {
  switch (v) {
    case 0:
      return t`Auto`;
    case 1:
      return t`Comfort`;
    case 2:
      return t`Standby`;
    case 3:
      return t`Economy`;
    case 4:
      return t`Protection`;
    default:
      return t`Reserved (${v})`;
  }
}

export function canonical(dpt: string, v: number): number {
  return decode(dpt, encode(dpt, v));
}

/** Readable display text, rounded for the view. */
export function formatValue(
  dpt: string,
  v: number | null | undefined,
  t: Translate = en,
): string {
  if (v === null || v === undefined) return "—";
  if (!BY_ID.has(dpt)) return rawText(dpt, v);
  switch (dpt) {
    case "1.001":
      return v ? t`On` : t`Off`;
    case "1.002":
      return v ? t`True` : t`False`;
    case "1.003":
      return v ? t`Enabled` : t`Disabled`;
    case "1.005":
      return v ? t`Alarm` : t`No alarm`;
    case "3.007": {
      const step = dimStepPct(v);
      if (!step) return t`Stop dimming`;
      const pct = Number.isInteger(step) ? String(step) : step.toFixed(1);
      return v & 8 ? t`Increase by ${pct} %` : t`Decrease by ${pct} %`;
    }
    case "1.007":
      return v ? t`Step increase` : t`Step decrease`;
    case "1.008":
      return v ? t`Down` : t`Up`;
    case "1.009":
      return v ? t`Closed` : t`Open`;
    case "1.010":
      return v ? t`Start` : t`Stop`;
    case "1.011":
      return v ? t`Active` : t`Inactive`;
    case "1.012":
      return v ? t`Inverted` : t`Not inverted`;
    case "1.015":
      return v ? t`Reset` : t`No action`;
    case "1.017":
      return t`Triggered`;
    case "2.001":
      return v >= 2 ? (v === 3 ? t`Forced on` : t`Forced off`) : t`No forcing`;
    case "1.018":
      return v ? t`Occupied` : t`Vacant`;
    case "1.019":
      return v ? t`Open` : t`Closed`;
    case "1.100":
      return v ? t`Heating` : t`Cooling`;
    case "20.102":
      return hvacModeName(v, t);
    case "9.001":
      return `${fmt1(v, t)} °C`;
    case "9.002":
      return `${v > 0 ? "+" : ""}${fmt1(v, t)} K`;
    case "9.004":
      return `${new Intl.NumberFormat(t.lang ?? "en", { maximumFractionDigits: 0 }).format(v)} lx`;
    case "9.005":
      return `${fmt1(v, t)} m/s`;
    case "9.007":
      return `${fmt1(v, t)} %`;
    case "9.008":
      return `${new Intl.NumberFormat(t.lang ?? "en", { maximumFractionDigits: 0 }).format(v)} ppm`;
    case "7.600":
      return `${Math.round(v)} K`;
    case "10.001":
      return timeText(v, t);
    case "11.001":
      return dateText(v);
    case "13.010":
      return `${new Intl.NumberFormat(t.lang ?? "en").format(v)} Wh`;
    case "13.013":
      return `${new Intl.NumberFormat(t.lang ?? "en").format(v)} kWh`;
    case "9.024":
      return `${new Intl.NumberFormat(t.lang ?? "en", { maximumFractionDigits: 2 }).format(v)} kW`;
    case "9.028":
      return `${fmt1(v, t)} km/h`;
    case "5.004":
      return `${Math.round(v)} %`;
    case "14.056":
      return `${new Intl.NumberFormat(t.lang ?? "en", { maximumFractionDigits: 1 }).format(v)} W`;
    case "5.001":
      return `${Math.round(v)} %`;
    case "17.001":
      return t`Scene ${v + 1}`;
    case "18.001":
      return v & 0x80
        ? t`Store scene ${(v & 0x3f) + 1}`
        : t`Scene ${(v & 0x3f) + 1}`;
    default:
      return String(v);
  }
}

const fmt1 = (v: number, t: Translate) =>
  new Intl.NumberFormat(t.lang ?? "en", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(v);

const pad2 = (n: number) => String(n).padStart(2, "0");

/** DPT 10.001 value as "Mon 07:55:00" (no day name when the day is 0). */
export function timeText(v: number, t: Translate = en): string {
  const day = Math.floor(v / 86400);
  const sec = v % 86400;
  const hms = `${pad2(Math.floor(sec / 3600))}:${pad2(Math.floor((sec % 3600) / 60))}:${pad2(sec % 60)}`;
  const names = ["", t`Mon`, t`Tue`, t`Wed`, t`Thu`, t`Fri`, t`Sat`, t`Sun`];
  return day ? `${names[day]} ${hms}` : hms;
}

/** DPT 11.001 value (YYYYMMDD) as ISO date. */
export const dateText = (v: number) =>
  `${Math.floor(v / 10000)}-${pad2(Math.floor(v / 100) % 100)}-${pad2(v % 100)}`;

/** Relative dimming step (DPT 3.007) as a percentage; 0 means stop. */
export function dimStepPct(v: number): number {
  const code = v & 7;
  return code ? 100 / 2 ** (code - 1) : 0;
}

/** Number with at most `digits` decimals, without trailing zeros. */
const trim = (v: number, digits: number) => String(Number(v.toFixed(digits)));

/**
 * Compact quantity with its unit: one decimal below 100 after scaling, none above,
 * and a k or M prefix from 10,000 so that the text stays short.
 */
function compact(v: number, unit: string, prefixed = true): string {
  const a = Math.abs(v);
  if (prefixed && a >= 1e7) return `${trim(v / 1e6, 1)}M${unit}`;
  if (prefixed && a >= 1e4) return `${trim(v / 1e3, 1)}k${unit}`;
  return `${trim(v, a < 100 ? 1 : 0)}${unit}`;
}

/**
 * Short value displayed in the orange box of an object and in the monitor: the same
 * units as the full display, in a compact form.
 */
export function shortValue(dpt: string, v: number | null | undefined): string {
  if (v === null || v === undefined) return "–";
  if (!BY_ID.has(dpt)) return rawText(dpt, v);
  switch (dpt) {
    case "5.001":
    case "5.004":
    case "9.007":
      return `${Math.round(v)}%`;
    case "3.007":
      return v & 7 ? (v & 8 ? "▲" : "▼") : "■";
    case "9.001":
      return `${v.toFixed(1)}°C`;
    case "9.002":
      return `${v > 0 ? "+" : ""}${v.toFixed(1)}K`;
    case "9.004":
      return v >= 1000
        ? `${trim(v / 1000, v < 10000 ? 1 : 0)}klx`
        : `${Math.round(v)}lx`;
    case "9.005":
      return `${v.toFixed(1)}m/s`;
    case "9.028":
      return `${Math.round(v)}km/h`;
    case "9.008":
      return `${Math.round(v)}ppm`;
    case "7.600":
      return `${Math.round(v)}K`;
    case "9.024":
      return `${trim(v, 2)}kW`;
    case "14.056":
      return compact(v, "W");
    case "13.010":
      return compact(v, "Wh");
    case "13.013":
      return v >= 1e4 ? `${trim(v / 1000, 1)}MWh` : `${v}kWh`;
    case "10.001": {
      const sec = v % 86400;
      return `${pad2(Math.floor(sec / 3600))}:${pad2(Math.floor((sec % 3600) / 60))}`;
    }
    case "11.001":
      return `${pad2(v % 100)}/${pad2(Math.floor(v / 100) % 100)}`;
    case "20.102":
      return ["A", "C", "S", "E", "P"][v] ?? String(v);
    default:
      return String(Math.round(v * 1000) / 1000);
  }
}

/** Detailed value for the inspector (codec precision). */
export function preciseValue(
  dpt: string,
  v: number | null | undefined,
  t: Translate = en,
): string {
  if (v === null || v === undefined) return t`unknown`;
  if (!BY_ID.has(dpt)) return t`${rawText(dpt, v)} (DPT not simulated)`;
  if (dpt.startsWith("9.")) return formatValue(dpt, v, t);
  if (dpt === "20.102") return `${v} · ${hvacModeName(v, t)}`;
  if (dpt === "5.001")
    return `${new Intl.NumberFormat(t.lang ?? "en", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v)} %`;
  return String(v);
}
