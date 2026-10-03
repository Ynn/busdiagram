// Weekly program of the time switch: "Mon-Fri 07:00 = 1; Sat,Sun 09:00 = 1; Daily 22:30 = 0".

export interface ProgramEntry {
  /** Days of the week, 1 = Monday … 7 = Sunday. */
  days: number[];
  /** Minutes after midnight. */
  minute: number;
  value: number;
}

const DAY_NAMES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function parseDays(text: string): number[] | null {
  const t = text.trim().toLowerCase();
  if (t === "daily" || t === "*" || t === "mon-sun")
    return [1, 2, 3, 4, 5, 6, 7];
  const days = new Set<number>();
  for (const part of t.split(",")) {
    const bounds = part.trim().split("-");
    // A day or a range of two days; "Mon-Fri-Sun" is not a range.
    if (bounds.length > 2) return null;
    const [a, b] = bounds;
    const i = DAY_NAMES.indexOf(a ?? "");
    const j = b === undefined ? i : DAY_NAMES.indexOf(b);
    if (i < 0 || j < 0) return null;
    for (let k = i; ; k = (k + 1) % 7) {
      days.add(k + 1);
      if (k === j) break;
    }
  }
  return [...days].sort();
}

/**
 * Parse a weekly program such as "Mon-Fri 07:00 = 1; Sat,Sun 09:00 = 1; Daily 22:30 = 0".
 * Return the entries and the entries that could not be read.
 */
export function parseProgram(text: string): {
  entries: ProgramEntry[];
  errors: string[];
} {
  const entries: ProgramEntry[] = [];
  const errors: string[] = [];
  for (const raw of text.split(/[;\n]/)) {
    const item = raw.trim();
    if (!item) continue;
    const m = /^(.+?)\s+(\d{1,2}):(\d{2})\s*=\s*(-?\d+(?:\.\d+)?)$/.exec(item);
    const days = m ? parseDays(m[1]!) : null;
    const h = m ? Number(m[2]) : NaN;
    const min = m ? Number(m[3]) : NaN;
    if (!m || !days || h > 23 || min > 59) {
      errors.push(item);
      continue;
    }
    entries.push({ days, minute: h * 60 + min, value: Number(m[4]) });
  }
  return { entries, errors };
}
