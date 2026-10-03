// KNX addresses: individual (area.line.device), line and group 3 levels.

// Canonical decimal forms only, as in the authoring schema: "01.1.1" would be the same
// two-byte address as "1.1.1" under another spelling, so it is refused.
const N2 = "(0|[1-9]\\d?)";
const N3 = "(0|[1-9]\\d{0,2})";
const IA = new RegExp(`^${N2}\\.${N2}\\.${N3}$`);
const GA = new RegExp(`^${N2}/${N2}/${N3}$`);
const LINE = new RegExp(`^${N2}\\.${N2}$`);

/** Individual address bounded (area 0–15, line 0–15, device 0–255). */
export function parseIA(ia: string): [number, number, number] | null {
  const m = IA.exec(ia);
  if (!m) return null;
  const r: [number, number, number] = [
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
  ];
  return r[0] <= 15 && r[1] <= 15 && r[2] <= 255 ? r : null;
}

/** Group address 3 bounded levels (principal 0–31, medium 0–7, subgroup 0–255). */
export function parseGA(ga: string): [number, number, number] | null {
  const m = GA.exec(ga);
  if (!m) return null;
  const r: [number, number, number] = [
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
  ];
  return r[0] <= 31 && r[1] <= 7 && r[2] <= 255 ? r : null;
}

/** 0/0/0 is the broadcast destination; it cannot be assigned to a group object. */
export const isBroadcastGA = (ga: string) =>
  parseGA(ga)?.every((n) => n === 0) ?? false;

export function parseLine(line: string): [number, number] | null {
  const m = LINE.exec(line);
  if (!m) return null;
  const r: [number, number] = [Number(m[1]), Number(m[2])];
  return r[0] <= 15 && r[1] <= 15 ? r : null;
}

export const compareAddress = (a: string, b: string) =>
  a.localeCompare(b, "en", { numeric: true });
