// Time-based devices using the simulated clock of the scenario (`clock`):
// clockMaster/v1 broadcasts time of day (DPT 10.001) and date (DPT 11.001);
// timeSwitch/v1 sends values at programmed times of the week.
import type {
  BehaviorContext,
  BehaviorDefinition,
  JsonObject,
} from "../contracts";

const MINUTE = 60_000;
const DAY = 86_400_000;
const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

/** KNX day of week: 1 = Monday … 7 = Sunday. */
const knxDay = (ms: number) => {
  const d = new Date(ms).getUTCDay();
  return d === 0 ? 7 : d;
};

/** DPT 10.001 application value (day × 86400 + seconds) for a clock time. */
export const timeOfDayValue = (ms: number) =>
  knxDay(ms) * 86400 + Math.floor((((ms % DAY) + DAY) % DAY) / 1000);

/** DPT 11.001 application value (YYYYMMDD) for a clock time. */
export const dateValue = (ms: number) => {
  const d = new Date(ms);
  return (
    d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
  );
};

function send(ctx: BehaviorContext<unknown>, port: string, value: number) {
  ctx.device.objects
    .filter((o) => o.port === port)
    .forEach((o) => {
      ctx.setObject(o.id, value);
      ctx.transmit(o.id);
    });
}

function setValues(ctx: BehaviorContext<unknown>, nowMs: number) {
  ctx.device.objects.forEach((o) => {
    if (o.port === "time") ctx.setObject(o.id, timeOfDayValue(nowMs));
    if (o.port === "date") ctx.setObject(o.id, dateValue(nowMs));
  });
}

// ── Clock master ──

/** Schedule the next broadcast at the next multiple of the period, in clock time. */
interface ClockState {
  /** Clock time of the last broadcast, ms; null before the first one. */
  lastMs: number | null;
}

function scheduleClock(ctx: BehaviorContext<ClockState>) {
  const c = ctx.clock();
  const period = num(ctx.device.parameters.sendPeriodMin, 1) * MINUTE;
  if (!c || period <= 0) return;
  const wait = period - (c.nowMs % period);
  ctx.schedule("send", Math.max(1, Math.round(wait / c.speed)));
}

function broadcast(ctx: BehaviorContext<ClockState>) {
  const c = ctx.clock();
  if (!c) return;
  // The start-up and periodic sends can fall on the same instant: send once.
  if (ctx.state.lastMs === c.nowMs) return;
  ctx.state.lastMs = c.nowMs;
  send(ctx, "time", timeOfDayValue(c.nowMs));
  send(ctx, "date", dateValue(c.nowMs));
}

export const clockMaster: BehaviorDefinition<ClockState> = {
  description:
    "Clock master: sends the time of day (10.001) and the date (11.001) of the simulated clock at a fixed period and after the clock is set.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      sendPeriodMin: {
        title: "Send period",
        type: "integer",
        minimum: 0,
        maximum: 1440,
        default: 1,
        description:
          "Clock minutes between two broadcasts, aligned on the clock (1 = every full minute); 0 sends only at start and after the clock is set.",
      },
      sendOnStart: {
        title: "Send on start",
        type: "boolean",
        default: true,
        description: "Send time and date shortly after the simulation starts.",
      },
      startDelayMs: {
        title: "Start-up send delay",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 0,
        default: 1000,
        description:
          "Delay after the simulation starts before time and date are sent.",
      },
    },
  },
  ports: {
    time: {
      dpts: ["10.001"],
      channel: "none",
      title: "Time of day",
      direction: "out",
      description: "day of week and time of the simulated clock",
    },
    date: {
      dpts: ["11.001"],
      channel: "none",
      title: "Date",
      direction: "out",
      description: "date of the simulated clock",
    },
  },
  createState: () => ({ lastMs: null }),
  onInit(ctx) {
    const c = ctx.clock();
    if (!c) {
      ctx.note(ctx.t`Clock master: the scenario declares no clock`);
      return;
    }
    // Current values are available to read requests (R flag) from the start.
    setValues(ctx, c.nowMs);
    if (ctx.device.parameters.sendOnStart !== false)
      ctx.schedule("start", num(ctx.device.parameters.startDelayMs, 1000));
    scheduleClock(ctx);
  },
  onTimer(ctx, key) {
    if (key === "start") broadcast(ctx);
    if (key === "send") {
      broadcast(ctx);
      scheduleClock(ctx);
    }
  },
  onClockChange(ctx) {
    ctx.state.lastMs = null;
    broadcast(ctx);
    ctx.cancel("send");
    scheduleClock(ctx);
  },
};

// ── Time switch ──

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
    const [a, b] = part.trim().split("-");
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

/** Clock time of the next entry strictly after `nowMs`, looking up to eight days ahead. */
export function nextSwitch(
  entries: ProgramEntry[],
  nowMs: number,
): { atMs: number; entry: ProgramEntry } | null {
  const midnight = nowMs - (((nowMs % DAY) + DAY) % DAY);
  let best: { atMs: number; entry: ProgramEntry } | null = null;
  for (let d = 0; d <= 7; d++) {
    const dayStart = midnight + d * DAY;
    const wd = knxDay(dayStart);
    for (const e of entries) {
      const at = dayStart + e.minute * MINUTE;
      if (e.days.includes(wd) && at > nowMs && (!best || at < best.atMs))
        best = { atMs: at, entry: e };
    }
    if (best) return best;
  }
  return best;
}

/** Most recent entry at or before `nowMs` (the state the program requests now). */
export function currentEntry(
  entries: ProgramEntry[],
  nowMs: number,
): ProgramEntry | null {
  const midnight = nowMs - (((nowMs % DAY) + DAY) % DAY);
  let best: { atMs: number; entry: ProgramEntry } | null = null;
  for (let d = 0; d <= 7; d++) {
    const dayStart = midnight - d * DAY;
    const wd = knxDay(dayStart);
    for (const e of entries) {
      const at = dayStart + e.minute * MINUTE;
      if (e.days.includes(wd) && at <= nowMs && (!best || at > best.atMs))
        best = { atMs: at, entry: e };
    }
    if (best) return best.entry;
  }
  return null;
}

interface SwitchTimerState {
  /** Clock time of the next switching point, or null. */
  nextAtMs: number | null;
}

const hhmm = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

function program(ctx: BehaviorContext<SwitchTimerState>) {
  return parseProgram(String(ctx.device.parameters.program ?? ""));
}

function scheduleNext(ctx: BehaviorContext<SwitchTimerState>, fromMs?: number) {
  const c = ctx.clock();
  ctx.cancel("next");
  ctx.state.nextAtMs = null;
  if (!c) return;
  const next = nextSwitch(program(ctx).entries, Math.max(c.nowMs, fromMs ?? 0));
  if (!next) return;
  ctx.state.nextAtMs = next.atMs;
  ctx.schedule(
    "next",
    Math.max(1, Math.round((next.atMs - c.nowMs) / c.speed)),
  );
}

/** Send the value the program requests now (at start or after the clock is set). */
function applyCurrent(ctx: BehaviorContext<SwitchTimerState>) {
  const c = ctx.clock();
  if (!c) return;
  const e = currentEntry(program(ctx).entries, c.nowMs);
  if (!e) return;
  ctx.note(
    ctx.t`Time switch: program of ${hhmm(e.minute)} applies (${e.value})`,
  );
  send(ctx, "output", e.value);
}

export const timeSwitch: BehaviorDefinition<SwitchTimerState> = {
  description:
    "Weekly time switch: sends the programmed value on its output objects at the programmed times of the simulated clock.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      program: {
        title: "Weekly program",
        type: "string",
        default: "",
        description:
          "Switching points separated by semicolons: days, time, and value, for example “Mon-Fri 07:00 = 1; Sat,Sun 09:00 = 1; Daily 22:30 = 0”. Days: Mon … Sun, ranges (Mon-Fri), lists (Sat,Sun), or Daily.",
      },
      sendOnStart: {
        title: "Send current state on start",
        type: "boolean",
        default: true,
        description:
          "At start, and after the clock is set, send the value of the most recent switching point.",
      },
    },
  },
  ports: {
    output: {
      dpts: [
        "1.001",
        "1.002",
        "1.003",
        "1.008",
        "5.001",
        "5.010",
        "17.001",
        "20.102",
      ],
      channel: "none",
      title: "Output",
      direction: "out",
      description: "object that receives the programmed values",
    },
  },
  createState: () => ({ nextAtMs: null }),
  onInit(ctx) {
    if (!ctx.clock()) {
      ctx.note(ctx.t`Time switch: the scenario declares no clock`);
      return;
    }
    const { errors } = program(ctx);
    if (errors.length)
      ctx.note(ctx.t`Time switch: entries ignored: ${errors.join("; ")}`);
    if (ctx.device.parameters.sendOnStart !== false)
      ctx.schedule("start", 1000);
    scheduleNext(ctx);
  },
  onTimer(ctx, key) {
    if (key === "start") applyCurrent(ctx);
    if (key !== "next") return;
    const c = ctx.clock();
    // The deadline is rounded to whole milliseconds: use the programmed time itself.
    const at = Math.max(c?.nowMs ?? 0, ctx.state.nextAtMs ?? 0);
    const e = c ? currentEntry(program(ctx).entries, at) : null;
    if (e) {
      ctx.note(ctx.t`Time switch: ${hhmm(e.minute)} → ${e.value}`);
      send(ctx, "output", e.value);
    }
    scheduleNext(ctx, at);
  },
  onClockChange(ctx) {
    if (ctx.device.parameters.sendOnStart !== false) applyCurrent(ctx);
    scheduleNext(ctx);
  },
  deviceState(state): JsonObject {
    return { nextAtMs: state.nextAtMs };
  },
};
