// Compact timeline: up to four traces on the axis of simulated time. Object values and
// on/off states are drawn as steps, physical quantities (room temperature, opening,
// position, level) as curves, and the telegrams on the addresses of a traced object as
// marks. The component samples the simulation after each of its events (Simulation.onStep)
// and while time runs; the engine stores nothing for the timeline.
import { html, nothing, svg, type TemplateResult } from "lit";
import type { Translate } from "../i18n";
import type { Scenario } from "../knx/scenario";
import type { Simulation, Telegram } from "../knx/sim";
import { C, hexA } from "./styles";

/** At most this many traces, to keep the timeline readable. */
export const MAX_TRACES = 4;
/** Samples kept per trace. */
const MAX_SAMPLES = 6000;
/** A room temperature, which varies smoothly, is sampled at most this often (simulated ms). */
const SMOOTH_MS = 250;

/**
 * A trace, named with separators that identifiers cannot contain: `device/object` for an
 * object, `device:channel` for the equipment of an output, `@room` for the temperature of
 * a room.
 */
export interface TraceSpec {
  id: string;
  kind: "object" | "room" | "equipment";
  device?: string;
  key: string;
  /** Short name shown on the lane; `title` gives the device too. */
  label: string;
  title: string;
  /** Fixed scale of the lane, or null to follow the values. */
  range: [number, number] | null;
  /** Drawn as steps: an object value, or an on/off state of equipment. */
  step: boolean;
  /** State field of the equipment that the trace follows. */
  field?: string;
}

/** Fields of equipment states that a trace can follow, numeric ones first, then on/off ones. */
const NUMERIC_FIELDS = [
  "openPct",
  "positionPct",
  "levelPct",
  "tempC",
  "temperatureC",
];
const BINARY_FIELDS = ["on", "running", "ringing"];

/** The field of an equipment state to follow, and whether it is on/off; null if none. */
export function equipmentField(
  state: Readonly<Record<string, unknown>> | null,
): { field: string; binary: boolean } | null {
  if (!state) return null;
  const n = NUMERIC_FIELDS.find((k) => typeof state[k] === "number");
  if (n) return { field: n, binary: false };
  const b = BINARY_FIELDS.find((k) => typeof state[k] === "boolean");
  return b ? { field: b, binary: true } : null;
}

/** Traces of an option value: identifiers separated by spaces or commas; unknown ones are left out. */
export function parseTraces(
  text: string,
  s: Scenario,
  sim?: Simulation,
): TraceSpec[] {
  const out: TraceSpec[] = [];
  for (const id of text.split(/[\s,]+/).filter(Boolean)) {
    const t = traceOf(id, s, sim);
    if (t && !out.some((x) => x.id === t.id)) out.push(t);
    if (out.length === MAX_TRACES) break;
  }
  return out;
}

export function traceOf(
  id: string,
  s: Scenario,
  sim?: Simulation,
): TraceSpec | null {
  if (id.startsWith("@")) {
    const r = s.rooms.find((x) => x.id === id.slice(1));
    return r
      ? {
          id,
          kind: "room",
          key: r.id,
          label: r.name || r.id,
          title: r.name || r.id,
          range: null,
          step: false,
        }
      : null;
  }
  const colon = id.indexOf(":");
  if (colon > 0) {
    const d = s.devicesById.get(id.slice(0, colon));
    const c = d?.channels.find((x) => x.id === id.slice(colon + 1));
    if (!d || !c || !c.equipmentConfigs.length) return null;
    // Only an equipment whose state has a value to draw can be traced.
    const f = sim ? equipmentField(sim.equipmentState(d.id, c.id)) : null;
    if (sim && !f) return null;
    return {
      id,
      kind: "equipment",
      device: d.id,
      key: c.id,
      label: c.label || c.id,
      title: `${d.name || d.id} · ${c.label || c.id}`,
      range: f?.binary ? [0, 1] : null,
      step: f?.binary ?? false,
      ...(f ? { field: f.field } : {}),
    };
  }
  const slash = id.indexOf("/");
  if (slash > 0) {
    const d = s.devicesById.get(id.slice(0, slash));
    const o = d?.objects.find((x) => x.id === id.slice(slash + 1));
    if (!d || !o) return null;
    return {
      id,
      kind: "object",
      device: d.id,
      key: o.id,
      label: o.name || o.id,
      title: `${d.name || d.id} · ${o.name || o.id}`,
      // One bit from 0 to 1, a percentage from 0 to 100; other values set their scale.
      range: o.dpt.startsWith("1.")
        ? [0, 1]
        : o.dpt.startsWith("5.001")
          ? [0, 100]
          : null,
      step: true,
    };
  }
  return null;
}

/** Every trace that can be chosen, for the menu of the timeline. */
export function availableTraces(s: Scenario, sim?: Simulation): TraceSpec[] {
  const ids: string[] = [];
  for (const r of s.rooms) ids.push(`@${r.id}`);
  for (const d of s.devices) {
    for (const c of d.channels)
      if (c.equipmentConfigs.length) ids.push(`${d.id}:${c.id}`);
    for (const o of d.objects) if (o.gas.length) ids.push(`${d.id}/${o.id}`);
  }
  return ids
    .map((id) => traceOf(id, s, sim))
    .filter((t): t is TraceSpec => t !== null);
}

export function traceValue(sim: Simulation, t: TraceSpec): number | null {
  if (t.kind === "room") return sim.room(t.key)?.temperatureC ?? null;
  if (t.kind === "equipment") {
    const state = sim.equipmentState(t.device!, t.key);
    const field = t.field ?? equipmentField(state)?.field;
    const v = field ? state?.[field] : undefined;
    return typeof v === "boolean"
      ? v
        ? 1
        : 0
      : typeof v === "number"
        ? v
        : null;
  }
  return sim.objectValue(t.device!, t.key);
}

/** Samples of each trace: [simulated ms, value or null]. */
export class TimelineRecorder {
  readonly series = new Map<string, [number, number | null][]>();

  /**
   * Record the current value of each trace. A value drawn as steps is recorded when it
   * changes; a curve keeps its turning points (a ramp is stored as its two ends), and a
   * room temperature is sampled at most every SMOOTH_MS.
   */
  sample(sim: Simulation, traces: TraceSpec[]) {
    const now = sim.timeMs;
    for (const t of traces) {
      let list = this.series.get(t.id);
      if (!list) this.series.set(t.id, (list = []));
      const v = traceValue(sim, t);
      const last = list[list.length - 1];
      if (last && last[0] > now) list.length = 0; // the simulation went back to 0
      const prev = list[list.length - 1];
      if (prev && prev[0] === now) {
        prev[1] = v;
        continue;
      }
      if (t.step || v === null || !prev || prev[1] === null) {
        if (!prev || prev[1] !== v) list.push([now, v]);
      } else if (t.kind === "room") {
        if (now - prev[0] >= SMOOTH_MS) list.push([now, v]);
      } else {
        // Same slope as the last segment: the ramp goes on, move its end.
        const before = list[list.length - 2];
        const ramp =
          before &&
          before[1] !== null &&
          Math.abs(
            (prev[1] - before[1]) * (now - prev[0]) -
              (v - prev[1]) * (prev[0] - before[0]),
          ) <
            1e-6 * Math.max(1, now - before[0]);
        if (ramp) prev.splice(0, 2, now, v);
        else list.push([now, v]);
      }
      if (list.length > MAX_SAMPLES) list.splice(0, list.length - MAX_SAMPLES);
    }
  }

  clear() {
    this.series.clear();
  }
}

/** Telegrams on the addresses of a traced object, inside the time window. */
function marks(sim: Simulation, t: TraceSpec, from: number): Telegram[] {
  if (t.kind !== "object") return [];
  const o = sim.scenario.devicesById
    .get(t.device!)
    ?.objects.find((x) => x.id === t.key);
  if (!o) return [];
  return sim.history.filter((h) => h.timeMs >= from && o.gas.includes(h.ga));
}

const COLORS = [C.tg, C.amber, C.bus, C.cpl];
const fmt = (v: number) =>
  Math.abs(v) >= 100 || Number.isInteger(v)
    ? String(Math.round(v))
    : v.toFixed(1);

/**
 * The timeline: a menu to add a trace, then one lane per trace with its scale, and a
 * shared time ruler.
 */
export function renderTimeline(opts: {
  sim: Simulation;
  traces: TraceSpec[];
  recorder: TimelineRecorder;
  tr: Translate;
  add: (id: string) => void;
  remove: (id: string) => void;
}): TemplateResult {
  const { sim, traces, recorder, tr } = opts;
  const now = sim.timeMs;
  const all = availableTraces(sim.scenario, sim).filter(
    (a) => !traces.some((t) => t.id === a.id),
  );
  // The whole recorded run, at least 30 s.
  const first = Math.min(
    ...traces.map((t) => recorder.series.get(t.id)?.[0]?.[0] ?? now),
    now,
  );
  const from = Math.max(0, Math.min(first, now - 30_000));
  const span = Math.max(1, now - from);
  const W = 1000;
  const H = 40;
  const x = (t: number) => ((t - from) / span) * W;
  const lane = (t: TraceSpec, i: number) => {
    const pts = (recorder.series.get(t.id) ?? []).filter(
      ([, v]) => v !== null,
    ) as [number, number][];
    const vals = pts.map(([, v]) => v);
    let lo = t.range ? t.range[0] : Math.min(...vals);
    let hi = t.range ? t.range[1] : Math.max(...vals);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      lo = 0;
      hi = 1;
    }
    if (hi - lo < 1e-9) {
      hi = lo + 1;
    }
    const y = (v: number) => H - 4 - ((v - lo) / (hi - lo)) * (H - 8);
    const col = COLORS[i % COLORS.length]!;
    let d = "";
    pts.forEach(([tm, v], k) => {
      const px = x(Math.max(tm, from)).toFixed(1);
      const py = y(v).toFixed(1);
      if (!k) d = `M${px},${py}`;
      // A value drawn as steps holds until it changes; a curve varies in between.
      else if (t.step) d += `H${px}V${py}`;
      else d += `L${px},${py}`;
    });
    if (pts.length) d += `H${x(now).toFixed(1)}`;
    const current = pts.length ? pts[pts.length - 1]![1] : null;
    return html`<div class="tl-row">
      <div class="tl-label" title=${t.title}>
        <i style="background:${col}"></i>
        <span>${t.label}</span>
        <b>${current === null ? "—" : fmt(current)}</b>
        <button
          class="tl-x"
          title=${tr`Remove this trace`}
          aria-label=${tr`Remove this trace`}
          @click=${() => opts.remove(t.id)}
        >
          ×
        </button>
      </div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="tl-lane">
        <line
          x1="0"
          y1=${H - 4}
          x2=${W}
          y2=${H - 4}
          stroke=${hexA(C.ink, 0.12)}
        />
        ${marks(sim, t, from).map(
          (m) =>
            svg`<line class="tl-mark" x1=${x(m.timeMs)} y1="0" x2=${x(m.timeMs)} y2="7" stroke=${col} stroke-width="3"><title>${m.service} ${m.ga} = ${m.value}</title></line>`,
        )}
        <path
          d=${d}
          fill="none"
          stroke=${col}
          stroke-width="2"
          vector-effect="non-scaling-stroke"
        />
      </svg>
      <div class="tl-scale"><span>${fmt(hi)}</span><span>${fmt(lo)}</span></div>
    </div>`;
  };
  const step =
    [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600].find(
      (s) => span / 1000 / s <= 8,
    ) ?? 7200;
  const ticks: number[] = [];
  for (let s = Math.ceil(from / 1000 / step) * step; s * 1000 <= now; s += step)
    ticks.push(s);
  const tickLabel = (s: number) =>
    s >= 60
      ? `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ""}`
      : `${s} s`;
  return html`<div
    class="panel timeline"
    @click=${(e: Event) => e.stopPropagation()}
  >
    <header>
      <span class="cap">${tr`Timeline`}</span>
      <span class="hint"
        >${tr`simulated time · steps: object values · curves: physical quantities · marks: telegrams`}</span
      >
    </header>
    ${traces.map(lane)}
    ${
      traces.length
        ? html`<div class="tl-row tl-axis">
            <div class="tl-label"></div>
            <div class="tl-ticks">
              ${ticks.map(
                (s) =>
                  html`<span style="left:${(x(s * 1000) / W) * 100}%"
                    >${tickLabel(s)}</span
                  >`,
              )}
            </div>
            <div class="tl-scale"></div>
          </div>`
        : nothing
    }
    ${
      traces.length < MAX_TRACES
        ? html`<label class="tl-add">
            <span>${tr`Add a trace`}</span>
            <select
              @change=${(e: Event) => {
                const sel = e.target as HTMLSelectElement;
                if (sel.value) opts.add(sel.value);
                sel.value = "";
              }}
            >
              <option value="">${tr`object, room, or output…`}</option>
              ${all.map((a) => html`<option value=${a.id}>${a.title}</option>`)}
            </select>
          </label>`
        : nothing
    }
  </div>`;
}
