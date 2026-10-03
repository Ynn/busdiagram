// timeSwitch/v1: sends values at programmed times of the week, on the simulated clock of
// the scenario (`clock`).
import type {
  BehaviorContext,
  BehaviorDefinition,
  JsonObject,
} from "../../knx/contracts";
import { DAY, MINUTE, knxDay, send } from "../shared/clock";

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
  /** Override: a value received holds until the next switching point. */
  overridden: boolean;
  /** Timed override: switching points are held until this clock time, or null. */
  overrideUntilMs: number | null;
  /** Permanent override: the program is suspended. */
  suspended: boolean;
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
  if (!c || ctx.state.suspended) return;
  const e = currentEntry(program(ctx).entries, c.nowMs);
  if (!e) return;
  ctx.note(
    ctx.t`Time switch: program of ${hhmm(e.minute)} applies (${e.value})`,
  );
  send(ctx, "output", e.value);
}

const OUTPUT_DPTS = [
  "1.001",
  "1.002",
  "1.003",
  "1.008",
  "5.001",
  "5.010",
  "17.001",
  "20.102",
];

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
      overrideDurationMin: {
        title: "Duration of the timed override",
        type: "integer",
        minimum: 15,
        maximum: 4320,
        default: 60,
        description:
          "Clock minutes during which a value received on the timed override object holds (15 min to 72 h).",
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
      defaultFlags: { R: true },
      dpts: OUTPUT_DPTS,
      channel: "none",
      title: "Output",
      direction: "out",
      description: "object that receives the programmed values",
    },
    override: {
      dpts: OUTPUT_DPTS,
      channel: "none",
      title: "Override",
      direction: "in",
      description:
        "Value sent at once on the output, held until the next switching point of the program",
    },
    overrideTimed: {
      dpts: OUTPUT_DPTS,
      channel: "none",
      title: "Timed override",
      direction: "in",
      description:
        "Value sent at once on the output, held for overrideDurationMin clock minutes; the program value then applies",
    },
    overridePermanent: {
      dpts: ["1.001", "1.003"],
      channel: "none",
      title: "Permanent override",
      direction: "in",
      description:
        "1 suspends the program (switching points ignored); 0 resumes it and sends its current value",
    },
  },
  createState: () => ({
    nextAtMs: null,
    overridden: false,
    overrideUntilMs: null,
    suspended: false,
  }),
  onObjectWrite(ctx, e) {
    const o = ctx.device.objects.find((x) => x.id === e.objectId);
    if (o?.port === "override") {
      // Manual override: the value is sent now and holds until the next switching point.
      ctx.state.overridden = true;
      ctx.note(
        ctx.t`Time switch: override ${e.newValue} until the next switching point`,
      );
      send(ctx, "output", e.newValue);
    } else if (o?.port === "overrideTimed") {
      // Timed override: the value holds for overrideDurationMin clock minutes; the
      // switching points meanwhile are held, then the program value applies.
      const c = ctx.clock();
      if (!c) return;
      const minutes = Number(ctx.device.parameters.overrideDurationMin ?? 60);
      ctx.state.overrideUntilMs = c.nowMs + minutes * 60_000;
      ctx.schedule(
        "overrideEnd",
        Math.max(1, Math.round((minutes * 60_000) / c.speed)),
      );
      ctx.note(ctx.t`Time switch: override ${e.newValue} for ${minutes} min`);
      send(ctx, "output", e.newValue);
    } else if (o?.port === "overridePermanent") {
      const on = e.newValue === 1;
      if (on === ctx.state.suspended) return;
      ctx.state.suspended = on;
      if (on)
        ctx.note(ctx.t`Time switch: program suspended (permanent override)`);
      else {
        ctx.note(ctx.t`Time switch: program resumed`);
        ctx.state.overridden = false;
        ctx.state.overrideUntilMs = null;
        ctx.cancel("overrideEnd");
        applyCurrent(ctx);
      }
    }
  },
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
    if (key === "overrideEnd") {
      ctx.state.overrideUntilMs = null;
      ctx.note(ctx.t`Time switch: end of the override`);
      applyCurrent(ctx);
      return;
    }
    if (key !== "next") return;
    const c = ctx.clock();
    // The deadline is rounded to whole milliseconds: use the programmed time itself.
    const at = Math.max(c?.nowMs ?? 0, ctx.state.nextAtMs ?? 0);
    const e = c ? currentEntry(program(ctx).entries, at) : null;
    if (e && ctx.state.overrideUntilMs !== null)
      ctx.note(
        ctx.t`Time switch: ${hhmm(e.minute)} held by the timed override`,
      );
    else if (e && ctx.state.suspended)
      ctx.note(
        ctx.t`Time switch: ${hhmm(e.minute)} ignored, program suspended`,
      );
    else if (e) {
      if (ctx.state.overridden)
        ctx.note(ctx.t`Time switch: end of the override`);
      ctx.state.overridden = false;
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
    return {
      nextAtMs: state.nextAtMs,
      overridden: state.overridden || state.overrideUntilMs !== null,
      suspended: state.suspended,
    };
  },
};
