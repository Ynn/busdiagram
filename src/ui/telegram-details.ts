// Telegram details: a dialog with four synchronized views of the TP1 frame of a telegram,
// from the octets of the telegram card: its fields, its bits, its signal on the bus, and the
// calculation of its check octet. Selecting an octet in one view selects it in the others.
import { css, html, nothing, svg, unsafeCSS } from "lit";
import type { TemplateResult } from "lit";
import type { Translate } from "../i18n";
import type { FieldKind, FrameOctet, SegmentFrame } from "../knx/frame-detail";
import {
  ACK,
  checksumDetail,
  frameOctets,
  frameTiming,
  segmentFrames,
  serialCharacter,
} from "../knx/frame-detail";
import type { Topology } from "../knx/network";
import type { Telegram } from "../knx/sim";
import { C, hexA } from "./styles";

export type DetailView = "frame" | "bits" | "signal" | "checksum";

export interface DetailState {
  octet: number | null;
  view: DetailView;
  segment: string | null;
  /** Column selected in the checksum view: bit 7 … 0, or 8 for the parity bits. */
  column: number | null;
  /** Bit pointed at in the selected character of the signal view (0 = start … 10 = stop). */
  bit: number | null;
}

/** Column of the parity bits in the checksum view. */
const PARITY_COLUMN = 8;

/** Colors of the fields, as on the telegram card. */
export const FIELD_COLOR: Record<FieldKind, string> = {
  control: C.mute,
  source: C.bus,
  destination: C.tg,
  routing: C.cpl,
  apdu: C.amber,
  data: C.amber,
  checksum: C.mute,
};

const hex = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");
const bin = (n: number, width = 8) => n.toString(2).padStart(width, "0");

interface Ctx {
  tel: Telegram;
  topology: Topology;
  tr: Translate;
  state: DetailState;
  set: (patch: Partial<DetailState>) => void;
  close: () => void;
}

/** Octets of the frame on the selected segment (routing counter of that segment). */
function frameFor(c: Ctx, segments: SegmentFrame[]) {
  const seg =
    segments.find((s) => s.segId === c.state.segment) ?? segments[0] ?? null;
  const octets = frameOctets(
    {
      source: c.tel.sourceAddress || "0.0.0",
      ga: c.tel.ga,
      service: c.tel.service,
      dpt: c.tel.dpt,
      value: c.tel.value,
      priority: c.tel.priority,
      rc: seg?.rc ?? 6,
    },
    c.tr,
  );
  return { seg, octets };
}

export function renderTelegramDetails(c: Ctx): TemplateResult {
  const { tel, tr, state } = c;
  const segments = segmentFrames(tel.plan, c.topology, tr);
  const { seg, octets } = frameFor(c, segments);
  const timing = frameTiming(octets.length, tel.priority);
  const ms = (bits: number) => ((bits * timing.bitUs) / 1000).toFixed(2);
  const sel =
    state.octet !== null && state.octet < octets.length ? state.octet : null;
  const views: [DetailView, string][] = [
    ["frame", tr`Frame`],
    ["bits", tr`Bits`],
    ["signal", tr`TP1 signal`],
    ["checksum", tr`Checksum`],
  ];
  return html`<dialog
    class="tdetail"
    aria-label=${tr`Telegram details`}
    @close=${c.close}
    @click=${(e: MouseEvent) => {
      e.stopPropagation();
      if (e.target === e.currentTarget) c.close();
    }}
    @keydown=${(e: KeyboardEvent) => e.stopPropagation()}
  >
    <header>
      <div>
        <span class="cap">${tr`Telegram`} #${tel.id}</span>
        <b>${tel.sourceAddress || "IP"} → ${tel.ga}</b>
        <span class="muted">${tel.service} · DPT ${tel.dpt}</span>
      </div>
      <button
        class="btn close"
        title=${tr`Close`}
        aria-label=${tr`Close`}
        @click=${c.close}
      >
        ✕
      </button>
    </header>
    ${
      segments.length > 1
        ? html`<div class="segs" role="group" aria-label=${tr`Segment`}>
            <span class="lbl">${tr`Frame on`}</span>
            ${segments.map(
              (s) =>
                html`<button
                  class=${s.segId === seg?.segId ? "sel" : ""}
                  aria-pressed=${s.segId === seg?.segId ? "true" : "false"}
                  @click=${() => c.set({ segment: s.segId })}
                >
                  ${s.label} <small>RC ${s.rc}</small>
                </button>`,
            )}
            <span class="muted"
              >${tr`Each coupler crossed lowers the routing counter: the routing octet and the check octet change from one segment to the next.`}</span
            >
          </div>`
        : nothing
    }
    <div class="strip" role="listbox" aria-label=${tr`Octets of the frame`}>
      ${octets.map(
        (o) =>
          html`<button
            role="option"
            aria-selected=${sel === o.index ? "true" : "false"}
            class=${sel === o.index ? "sel" : ""}
            style="--f:${FIELD_COLOR[o.field]}"
            title=${o.fieldLabel}
            @click=${() => c.set({ octet: sel === o.index ? null : o.index })}
          >
            <b>${hex(o.value)}</b><small>${o.index + 1}</small>
          </button>`,
      )}
    </div>
    <nav class="views" role="tablist">
      ${views.map(
        ([v, label]) =>
          html`<button
            role="tab"
            aria-selected=${state.view === v ? "true" : "false"}
            class=${state.view === v ? "sel" : ""}
            @click=${() => c.set({ view: v })}
          >
            ${label}
          </button>`,
      )}
    </nav>
    <div class="view">
      ${
        state.view === "frame"
          ? frameView(c, octets, sel)
          : state.view === "bits"
            ? bitsView(c, octets, sel)
            : state.view === "signal"
              ? signalView(c, octets, sel)
              : checksumView(c, octets)
      }
    </div>
    <footer>
      <span>${tr`KNX TP1 · 9600 bit/s · 1 bit = 104 µs`}</span>
      <span
        >${tr`Character: start bit, 8 data bits (least significant first), even parity, stop bit`}</span
      >
      <span
        >${tr`Frame: ${octets.length} octets, sent as ${octets.length} TP1 characters of 11 bits, + ${octets.length - 1} separations of 2 bit times = ${timing.frameBits} bit times = ${ms(timing.frameBits)} ms`}${seg ? ` · ${seg.label}` : ""}</span
      >
      <span
        >${tr`With the bus idle before it and the acknowledgement: ${ms(timing.idleBits + timing.frameBits + timing.ackPauseBits + timing.ackBits)} ms`}</span
      >
    </footer>
  </dialog>`;
}

// ── Frame: fields, and the sub-fields of the selected octet ─────────────────────────────

function frameView(c: Ctx, octets: FrameOctet[], sel: number | null) {
  const { tr } = c;
  const groups: FrameOctet[][] = [];
  for (const o of octets) {
    const g = groups[groups.length - 1];
    if (g && g[0]!.field === o.field && o.field !== "data") g.push(o);
    else if (g && o.field === "data" && g[0]!.field === "data") g.push(o);
    else groups.push([o]);
  }
  const summary = (g: FrameOctet[]): string => {
    const f = g[0]!.field;
    if (f === "source") return `${c.tel.sourceAddress || "0.0.0"}`;
    if (f === "destination") return c.tel.ga;
    if (f === "routing") {
      const s = g[0]!.subFields;
      return tr`${s[0]!.meaning}, RC ${s[1]!.value}, ${s[2]!.meaning}`;
    }
    if (f === "apdu") return g[1]?.subFields[0]!.meaning ?? "";
    if (f === "control") return g[0]!.subFields[3]!.meaning;
    if (f === "data") return tr`value of DPT ${c.tel.dpt}`;
    return tr`odd parity per column`;
  };
  return html`<div class="fields">
    ${groups.map(
      (g) =>
        html`<div
          class="field ${g.some((o) => o.index === sel) ? "on" : ""}"
          style="--f:${FIELD_COLOR[g[0]!.field]}"
        >
          <div class="head">
            <span class="name">${g[0]!.fieldLabel}</span>
            <span class="octs"
              >${g.map(
                (o) =>
                  html`<button
                    class=${o.index === sel ? "sel" : ""}
                    @click=${() => c.set({ octet: o.index })}
                  >
                    ${hex(o.value)}
                  </button>`,
              )}</span
            >
            <span class="sum">${summary(g)}</span>
          </div>
          ${g.filter((o) => o.index === sel).map((o) => subFieldTable(c, o))}
        </div>`,
    )}
    ${
      sel === null
        ? html`<p class="muted">
            ${tr`Select an octet to see what each of its bits means.`}
          </p>`
        : nothing
    }
  </div>`;
}

function subFieldTable(c: Ctx, o: FrameOctet) {
  const { tr } = c;
  return html`<table class="subs">
    <caption>
      ${hex(o.value)} =
      <code>${bin(o.value).replace(/(.{4})/, "$1 ")}</code>
    </caption>
    ${o.subFields.map(
      (s) =>
        html`<tr>
          <td class="bits">
            ${s.hi === s.lo ? tr`bit ${s.hi}` : tr`bits ${s.hi}–${s.lo}`}
          </td>
          <td><code>${bin(s.value, s.hi - s.lo + 1)}</code></td>
          <th>${s.name}</th>
          <td>${s.meaning}</td>
        </tr>`,
    )}
  </table>`;
}

// ── Bits: every octet bit by bit, sub-fields underlined ─────────────────────────────────

function bitsView(c: Ctx, octets: FrameOctet[], sel: number | null) {
  const { tr } = c;
  return html`<table class="bitgrid">
    <thead>
      <tr>
        <th></th>
        <th></th>
        ${[7, 6, 5, 4, 3, 2, 1, 0].map((b) => html`<th>${b}</th>`)}
        <th class="left">${tr`Sub-fields`}</th>
      </tr>
    </thead>
    <tbody>
      ${octets.map((o) => {
        const subOf = (b: number) =>
          o.subFields.findIndex((s) => b <= s.hi && b >= s.lo);
        return html`<tr
          class=${o.index === sel ? "sel" : ""}
          style="--f:${FIELD_COLOR[o.field]}"
          @click=${() => c.set({ octet: o.index })}
        >
          <td class="n">${o.index + 1}</td>
          <td class="hex">${hex(o.value)}</td>
          ${[7, 6, 5, 4, 3, 2, 1, 0].map((b) => {
            const k = subOf(b);
            const s = o.subFields[k];
            return html`<td
              class="bit ${(o.value >> b) & 1 ? "one" : ""} ${k % 2 ? "alt" : ""} ${s && b === s.lo ? "end" : ""}"
              title=${s ? `${s.name}: ${s.meaning}` : ""}
            >
              ${(o.value >> b) & 1}
            </td>`;
          })}
          <td class="left subs-inline">
            ${o.subFields.map(
              (s) => html`<span><b>${s.name}</b> ${s.meaning}</span>`,
            )}
          </td>
        </tr>`;
      })}
    </tbody>
  </table>`;
}

// ── TP1 signal: logical bits and schematic bus voltage, with a time ruler ───────────────

/** One stretch of the timeline: bits drawn one after the other, from a given x. */
export interface BitRun {
  x: number;
  bits: number[];
}

/**
 * Logical lane as one continuous path: a level for each bit, a vertical edge wherever two
 * consecutive bits differ (also across runs, e.g. from the idle bus to a start bit).
 */
export function logicPath(
  runs: BitRun[],
  w: number,
  yHigh: number,
  yLow: number,
  level = 1,
): string {
  let y = level ? yHigh : yLow;
  let d = "";
  for (const run of runs) {
    run.bits.forEach((b, k) => {
      const x = run.x + k * w;
      const ny = b ? yHigh : yLow;
      d += d ? `L${x},${y}` : `M${x},${y}`;
      if (ny !== y) d += `L${x},${ny}`;
      y = ny;
      d += `L${x + w},${y}`;
    });
  }
  return d;
}

/**
 * Schematic bus voltage as one continuous path (KNX Standard 03_02_02, 1.1.1 and 1.1.2): a
 * logical 1 leaves the bus at its DC level; a logical 0 is a voltage drop for t_active = 35 µs,
 * then an equalisation above the DC level that decays back to it by the end of the bit.
 */
export function busPath(
  runs: BitRun[],
  w: number,
  yDc: number,
  drop: number,
  over: number,
): string {
  const active = (35 / 104) * w;
  const tau = (w - active) / 3.5;
  let d = "";
  for (const run of runs) {
    run.bits.forEach((b, k) => {
      const x = run.x + k * w;
      d += d ? `L${x},${yDc}` : `M${x},${yDc}`;
      if (b) {
        d += `L${x + w},${yDc}`;
        return;
      }
      const xa = x + active;
      d += `L${x},${yDc + drop}L${xa},${yDc + drop}L${xa},${yDc - over}`;
      for (let i = 1; i <= 8; i++) {
        const t = ((w - active) * i) / 8;
        const v = i === 8 ? 0 : over * Math.exp(-t / tau);
        d += `L${(xa + t).toFixed(2)},${(yDc - v).toFixed(2)}`;
      }
    });
  }
  return d;
}

/** The selected octet as it is written (b7 first) and as it is sent (b0 first). */
function bitOrder(
  c: Ctx,
  o: FrameOctet,
  ch: ReturnType<typeof serialCharacter>,
  separated: boolean,
) {
  const { tr, state } = c;
  const ones = ch.bits.slice(1, 9).reduce((a, b) => a + b, 0);
  const cell = (k: number, label: string, extra = "", title = "") =>
    html`<span
      class="cellb ${extra} ${state.bit === k ? "hl" : ""}"
      title=${title}
      @mouseenter=${() => c.set({ bit: k })}
      @mouseleave=${() => c.set({ bit: null })}
      ><small>${label}</small>${ch.bits[k] ?? 1}</span
    >`;
  const sepTitle = tr`Character separation: 2 bit times at rest (1) before the start bit of the next character`;
  return html`<div class="lsb" style="--f:${FIELD_COLOR[o.field]}">
    <p>
      ${tr`Octet ${hex(o.value)} is conventionally written from b7 to b0: ${bin(o.value, 8).replace(/(....)(....)/, "$1 $2")}. On the TP1 bus, its data bits are sent in the opposite order: b0 first, b7 last.`}
      ${tr`Each character is a start bit (0), the eight data bits, an even parity bit, and a stop bit (1); 2 bit times at rest separate it from the next character of the frame.`}
    </p>
    <div class="rows">
      <span class="lbl">${tr`Written`}</span>
      <span class="cells">
        ${[7, 6, 5, 4, 3, 2, 1, 0].map((b) => cell(b + 1, `b${b}`))}
      </span>
      <span class="lbl">${tr`Sent`}</span>
      <span class="cells">
        ${cell(0, "S", "ctl")}
        ${[0, 1, 2, 3, 4, 5, 6, 7].map((b) => cell(b + 1, `b${b}`))}
        ${cell(9, "P", "ctl")} ${cell(10, "Stop", "ctl")}
        ${
          separated
            ? html`${cell(11, tr`sep.`, "ctl sep", sepTitle)}${cell(12, tr`sep.`, "ctl sep", sepTitle)}`
            : null
        }
      </span>
    </div>
    <p class="muted">
      ${
        ones % 2
          ? tr`P = 1: the data bits hold ${ones} ones, P makes the count even.`
          : tr`P = 0: the data bits hold ${ones} ones, already even.`
      }
    </p>
  </div>`;
}

function signalView(c: Ctx, octets: FrameOctet[], sel: number | null) {
  const { tr, tel } = c;
  const timing = frameTiming(octets.length, tel.priority);
  const W = 18; // pixels per bit time
  const idleShown = 6; // the idle time before the frame is drawn shortened
  const x0 = 70 + idleShown * W;
  const gap = timing.characterBits - 11; // idle bits between two characters
  const chars = octets.map((o, i) => ({
    o,
    start: x0 + i * timing.characterBits * W,
    ch: serialCharacter(o.value),
  }));
  const frameEnd = x0 + timing.frameBits * W;
  const ackStart = frameEnd + timing.ackPauseBits * W;
  const ackChar = serialCharacter(ACK.ack);
  const ackEnd = ackStart + timing.ackBits * W;
  const width = ackEnd + 4 * W + 20;
  const yLog = 34; // logical lane: high = 1
  const yHigh = yLog - 14;
  const yLow = yLog + 6;
  const yBus = 104; // bus lane: DC level
  const ones = (n: number) => Array<number>(n).fill(1);
  // The whole timeline at once, so that the lanes never break: idle bus, the characters with
  // the idle bits between them, then the pause before the acknowledgement.
  const frameRuns: BitRun[] = [
    { x: 70, bits: ones(idleShown) },
    ...chars.map(({ start, ch }, i) => ({
      x: start,
      bits: i < chars.length - 1 ? [...ch.bits, ...ones(gap)] : ch.bits,
    })),
    { x: frameEnd, bits: ones(timing.ackPauseBits) },
  ];
  const ackRuns: BitRun[] = [
    { x: ackStart, bits: ackChar.bits },
    { x: ackEnd, bits: ones(4) },
  ];
  const labels = [
    "S",
    "b0",
    "b1",
    "b2",
    "b3",
    "b4",
    "b5",
    "b6",
    "b7",
    "P",
    "Stop",
  ];
  const shown = octets[sel ?? 0]!;
  const shownChar = serialCharacter(shown.value);
  // What one bit of a character is, for its tooltip.
  const bitTitle = (value: number, bits: number[], k: number) =>
    k === 0
      ? tr`S: start bit, always 0`
      : k === 10
        ? tr`Stop: stop bit, always 1`
        : k === 9
          ? tr`P: even parity, ${bits[9]!}: the 8 data bits and P hold an even number of 1`
          : tr`b${k - 1}: bit ${k - 1} of ${hex(value)} (weight ${1 << (k - 1)}), sent in position ${k} after the start bit`;
  const ticks: TemplateResult[] = [];
  for (let msT = 0; ; msT++) {
    const x = x0 + ((msT * 1000) / timing.bitUs) * W;
    if (x > width - 20) break;
    ticks.push(
      svg`<line x1=${x} y1="138" x2=${x} y2="144" stroke=${C.mute}/><text x=${x} y="156" text-anchor="middle" class="tick">${msT} ms</text>`,
    );
  }
  return html`<div class="signal">
    <div class="scroll">
      <svg
        width=${width}
        height="190"
        role="img"
        aria-label=${tr`TP1 signal of the frame`}
      >
        <text x="4" y=${yLog} class="lane">${tr`Logical`}</text>
        <text x="4" y=${yBus + 4} class="lane">${tr`Bus`}</text>
        <line
          x1="70"
          y1=${yBus}
          x2=${width - 10}
          y2=${yBus}
          stroke=${hexA(C.ink, 0.25)}
          stroke-dasharray="3 3"
        />
        <text
          x=${70 + (idleShown * W) / 2}
          y=${yLog - 22}
          text-anchor="middle"
          class="note"
        >
          ${tr`idle ${timing.idleBits} bit times`}
        </text>
        ${chars.map(({ o, start, ch }) => {
          const on = o.index === sel;
          return svg`<g class="char ${on ? "sel" : ""}" @click=${() => c.set({ octet: o.index })}>
            <rect x=${start - 2} y="0" width=${11 * W + 4} height="132" rx="4" fill=${on ? hexA(FIELD_COLOR[o.field], 0.16) : "transparent"} />
            <text x=${start + (11 * W) / 2} y="10" text-anchor="middle" class="hexl" fill=${FIELD_COLOR[o.field]}>${hex(o.value)}</text>
            ${ch.bits.map(
              (b, k) =>
                svg`<g class="bit ${o === shown && c.state.bit === k ? "hl" : ""}" @mouseenter=${() => o === shown && c.set({ bit: k })} @mouseleave=${() => o === shown && c.set({ bit: null })}><title>${bitTitle(o.value, ch.bits, k)}</title><rect x=${start + k * W} y=${yHigh - 4} width=${W} height=${yLog + 38 - yHigh} /><text x=${start + k * W + W / 2} y=${yLog + 22} text-anchor="middle" class="bitl ${k === 0 || k > 8 ? "frame" : ""}">${labels[k]}</text><text x=${start + k * W + W / 2} y=${yLog + 34} text-anchor="middle" class="bitv">${b}</text></g>`,
            )}
            ${
              o.index < octets.length - 1
                ? svg`<g class="sep"><title>${tr`Character separation: 2 bit times at rest (1) before the start bit of the next character`}</title><rect x=${start + 11 * W} y=${yHigh - 4} width=${gap * W} height=${yLog + 38 - yHigh} /><text x=${start + (11 + gap / 2) * W} y=${yLog + 22} text-anchor="middle" class="bitl frame">${tr`sep.`}</text><text x=${start + (11 + gap / 2) * W} y=${yLog + 34} text-anchor="middle" class="bitv">${Array(gap).fill(1).join(" ")}</text></g>`
                : null
            }
          </g>`;
        })}
        <path d=${logicPath(frameRuns, W, yHigh, yLow)} class="logic" />
        <path d=${busPath(frameRuns, W, yBus, 22, 12)} class="busp" />
        <text
          x=${(frameEnd + ackStart) / 2}
          y=${yLog - 22}
          text-anchor="middle"
          class="note"
        >
          ${tr`${timing.ackPauseBits} bit times`}
        </text>
        <g class="ack">
          <text
            x=${ackStart + (11 * W) / 2}
            y="10"
            text-anchor="middle"
            class="hexl"
          >
            ${hex(ACK.ack)} · ACK
          </text>
          <path d=${logicPath(ackRuns, W, yHigh, yLow)} class="logic dashed" />
          <path d=${busPath(ackRuns, W, yBus, 22, 12)} class="busp dashed" />
        </g>
        <line x1="70" y1="138" x2=${width - 10} y2="138" stroke=${C.mute} />
        ${ticks}
        <text x=${x0} y="178" class="note">
          ${tr`S start · b0–b7 data, least significant first · P even parity · Stop stop bit · sep. 2 bit times between characters`}
        </text>
      </svg>
    </div>
    ${bitOrder(c, shown, shownChar, shown.index < octets.length - 1)}
    <p class="muted">
      ${tr`Schematic TP1 waveform, not an electrical simulation. A logical 0 is a voltage drop of about 35 µs followed by an equalisation; a logical 1 leaves the bus at rest, which is why 0 wins when two devices send at once. The acknowledgement that the receivers send 15 bit times after the frame is drawn for illustration: the model does not simulate it.`}
    </p>
  </div>`;
}

// ── Checksum: odd parity over each column of bits, or XOR then NOT ──────────────────────

function checksumView(c: Ctx, octets: FrameOctet[]) {
  const { tr, state } = c;
  const frame = octets.map((o) => o.value);
  const d = checksumDetail(frame);
  const cols = [7, 6, 5, 4, 3, 2, 1, 0];
  const col = state.column;
  const colIdx = col === null || col === PARITY_COLUMN ? -1 : 7 - col;
  const parityCell = (o: number) => {
    const p = serialCharacter(o).parity;
    return html`<td
      class="bit par ${p ? "one" : ""} ${col === PARITY_COLUMN ? "colsel" : ""}"
      title=${tr`Even parity of this octet, sent after its 8 data bits`}
    >
      ${p}
    </td>`;
  };
  return html`<div class="checksum">
    <div class="ck-grid">
      <table>
        <thead>
          <tr class="groups">
            <th></th>
            <th></th>
            <th colspan="8">${tr`Data bits 7 … 0: check octet (columns)`}</th>
            <th class="par">${tr`Character parity`}</th>
          </tr>
          <tr>
            <th></th>
            <th></th>
            ${cols.map(
              (b) =>
                html`<th>
                  <button
                    class=${col === b ? "sel" : ""}
                    title=${tr`Column of bit ${b}`}
                    @click=${() => c.set({ column: col === b ? null : b })}
                  >
                    ${b}
                  </button>
                </th>`,
            )}
            <th class="par">
              <button
                class=${col === PARITY_COLUMN ? "sel" : ""}
                title=${tr`Parity bit of each character`}
                @click=${() =>
                  c.set({
                    column: col === PARITY_COLUMN ? null : PARITY_COLUMN,
                  })}
              >
                P
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          ${d.octets.map(
            (o, i) =>
              html`<tr
                class=${state.octet === i ? "selrow" : ""}
                style="--f:${FIELD_COLOR[octets[i]!.field]}"
                @click=${() => c.set({ octet: i })}
              >
                <td class="n">${i + 1}</td>
                <td class="hex">${hex(o)}</td>
                ${cols.map(
                  (b) =>
                    html`<td
                      class="bit ${(o >> b) & 1 ? "one" : ""} ${col === b ? "colsel" : ""}"
                    >
                      ${(o >> b) & 1}
                    </td>`,
                )}
                ${parityCell(o)}
              </tr>`,
          )}
          <tr class="count">
            <td></td>
            <td>${tr`ones`}</td>
            ${d.ones.map(
              (n, i) =>
                html`<td class=${colIdx === i ? "colsel" : ""}>${n}</td>`,
            )}
            <td class="par"></td>
          </tr>
          <tr class="check">
            <td class="n">${octets.length}</td>
            <td class="hex">${hex(d.check)}</td>
            ${cols.map(
              (b, i) =>
                html`<td
                  class="bit ${(d.check >> b) & 1 ? "one" : ""} ${col === b ? "colsel" : ""}"
                  title=${d.ones[i]! % 2 ? tr`odd already: 0` : tr`even: 1 to make it odd`}
                >
                  ${(d.check >> b) & 1}
                </td>`,
            )}
            ${parityCell(d.check)}
          </tr>
        </tbody>
      </table>
      <div class="ck-explain">
        <p>
          ${tr`Two checks cross. Each row: the parity bit P, sent on the bus right after the 8 data bits of each character, makes the number of 1 even in that character. Each data column (7 to 0): the check octet, sent as the last character, makes the number of 1 odd over the whole frame. Column P is not covered by the check octet.`}
        </p>
        ${
          col === null
            ? html`<p class="muted">
                ${tr`Click a column to follow its calculation.`}
              </p>`
            : col === PARITY_COLUMN
              ? html`<p class="focus">
                  ${tr`Column P is not part of the check octet: each P only covers its own row. A single wrong bit breaks the parity of its row and of its column, so the receiver sees it twice.`}
                </p>`
              : html`<p class="focus">
                  ${
                    d.ones[colIdx]! % 2
                      ? tr`Column ${col}: ${d.ones[colIdx]!} ones, already odd, so the check bit is 0.`
                      : tr`Column ${col}: ${d.ones[colIdx]!} ones, even, so the check bit is 1, which makes ${d.ones[colIdx]! + 1}.`
                  }
                </p>`
        }
        <p>
          ${tr`Equivalent calculation: XOR of the octets, then every bit inverted (NOT).`}
        </p>
        <ol class="xor">
          ${d.octets.map(
            (o, i) =>
              html`<li>
                ${
                  i === 0
                    ? html`<code>${hex(o)}</code>`
                    : html`<code
                        >${hex(d.running[i - 1]!)} ⊕ ${hex(o)} =
                        ${hex(d.running[i]!)}</code
                      >`
                }
              </li>`,
          )}
          <li>
            <code
              >NOT ${hex(d.running[d.running.length - 1]!)} =
              <b>${hex(d.check)}</b></code
            >
          </li>
        </ol>
        <p class="muted">
          ${tr`A receiver checks the parity of every character and computes the check octet again from the octets it received. If either check fails, the frame is invalid and is not acknowledged.`}
        </p>
      </div>
    </div>
  </div>`;
}

export const detailStyles = css`
  dialog.tdetail {
    width: min(1180px, 100vw);
    max-height: 96vh;
    padding: 14px 16px;
    border: 1px solid ${unsafeCSS(C.line)};
    border-radius: 14px;
    background: #fafaf7;
    box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.45);
    box-sizing: border-box;
    overflow: auto;
    color: ${unsafeCSS(C.ink)};
  }
  dialog.tdetail::backdrop {
    background: rgba(28, 30, 35, 0.45);
  }
  .tdetail header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .tdetail header > div {
    display: flex;
    gap: 10px;
    align-items: baseline;
    flex-wrap: wrap;
  }
  .tdetail .muted {
    color: ${unsafeCSS(C.mute)};
    font-size: 12.5px;
  }
  .tdetail .segs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-top: 10px;
  }
  .tdetail .segs button,
  .tdetail .views button {
    border: 1.5px solid #cfccc1;
    background: #fff;
    border-radius: 8px;
    padding: 4px 9px;
    cursor: pointer;
    font: inherit;
    font-size: 12.5px;
    color: ${unsafeCSS(C.ink)};
  }
  .tdetail .segs button.sel,
  .tdetail .views button.sel {
    background: ${unsafeCSS(C.ink)};
    border-color: ${unsafeCSS(C.ink)};
    color: #fff;
  }
  .tdetail .strip {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 12px 0 10px;
  }
  .tdetail .strip button {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 46px;
    padding: 5px 6px 3px;
    border: 2px solid var(--f);
    border-radius: 8px;
    background: #fff;
    color: var(--f);
    cursor: pointer;
    font-family: var(--mono);
  }
  .tdetail .strip button b {
    font-size: 16px;
  }
  .tdetail .strip button small {
    font-size: 10px;
    color: ${unsafeCSS(C.mute)};
  }
  .tdetail .strip button.sel {
    background: var(--f);
    color: #fff;
  }
  .tdetail .strip button.sel small {
    color: #fff;
  }
  .tdetail .views {
    display: flex;
    gap: 6px;
    border-bottom: 1px solid ${unsafeCSS(C.line)};
    padding-bottom: 8px;
  }
  .tdetail .view {
    padding: 12px 0;
    min-height: 260px;
  }
  .tdetail footer {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    border-top: 1px solid ${unsafeCSS(C.line)};
    padding-top: 8px;
    font-size: 12px;
    color: ${unsafeCSS(C.mute)};
  }
  .tdetail code {
    font-family: var(--mono);
  }
  /* Frame */
  .tdetail .fields {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .tdetail .field {
    border-left: 4px solid var(--f);
    background: #fff;
    border-radius: 6px;
    padding: 6px 10px;
  }
  .tdetail .field.on {
    background: ${unsafeCSS(hexA(C.tg, 0.04))};
  }
  .tdetail .field .head {
    display: grid;
    grid-template-columns: minmax(9em, 16em) auto 1fr;
    gap: 12px;
    align-items: center;
  }
  .tdetail .field .name {
    font-weight: 600;
    font-size: 13px;
  }
  .tdetail .field .octs button {
    font-family: var(--mono);
    border: 1.5px solid var(--f);
    color: var(--f);
    background: #fff;
    border-radius: 6px;
    margin-right: 4px;
    padding: 2px 6px;
    cursor: pointer;
  }
  .tdetail .field .octs button.sel {
    background: var(--f);
    color: #fff;
  }
  .tdetail .field .sum {
    font-size: 13px;
    color: ${unsafeCSS(C.mute)};
  }
  .tdetail table.subs {
    margin: 8px 0 4px;
    border-collapse: collapse;
    font-size: 13px;
  }
  .tdetail table.subs caption {
    text-align: left;
    font-family: var(--mono);
    padding-bottom: 4px;
  }
  .tdetail table.subs td,
  .tdetail table.subs th {
    padding: 3px 10px 3px 0;
    text-align: left;
    vertical-align: top;
  }
  .tdetail table.subs .bits {
    color: ${unsafeCSS(C.mute)};
    white-space: nowrap;
  }
  /* Bits */
  .tdetail table.bitgrid {
    border-collapse: separate;
    border-spacing: 2px;
    font-size: 13px;
  }
  .tdetail table.bitgrid th {
    font-size: 11px;
    color: ${unsafeCSS(C.mute)};
    font-weight: 500;
  }
  .tdetail table.bitgrid tr {
    cursor: pointer;
  }
  .tdetail table.bitgrid .n,
  .tdetail .checksum .n {
    color: ${unsafeCSS(C.mute)};
    font-size: 11px;
    text-align: right;
  }
  .tdetail .hex {
    font-family: var(--mono);
    font-weight: 600;
    color: var(--f);
    padding: 0 6px;
  }
  .tdetail td.bit {
    width: 22px;
    height: 22px;
    text-align: center;
    font-family: var(--mono);
    border-radius: 4px;
    background: ${unsafeCSS(hexA(C.ink, 0.04))};
    color: ${unsafeCSS(C.mute)};
  }
  .tdetail table.bitgrid td.bit {
    background: color-mix(in srgb, var(--f) 9%, white);
  }
  .tdetail table.bitgrid td.bit.alt {
    background: color-mix(in srgb, var(--f) 20%, white);
  }
  .tdetail td.bit.one {
    color: ${unsafeCSS(C.ink)};
    font-weight: 700;
  }
  .tdetail table.bitgrid td.bit.end {
    box-shadow: inset -2px 0 0 #fff;
  }
  .tdetail table.bitgrid tr.sel td.bit {
    outline: 2px solid var(--f);
  }
  .tdetail .left {
    text-align: left;
  }
  .tdetail .subs-inline {
    padding-left: 10px;
    font-size: 12px;
    color: ${unsafeCSS(C.mute)};
  }
  .tdetail .subs-inline span {
    margin-right: 12px;
    white-space: nowrap;
  }
  .tdetail .subs-inline b {
    color: ${unsafeCSS(C.ink)};
    font-weight: 600;
  }
  /* Signal */
  .tdetail .signal .scroll {
    overflow-x: auto;
    background: #fff;
    border: 1px solid ${unsafeCSS(C.line)};
    border-radius: 8px;
  }
  .tdetail .signal svg {
    display: block;
    font-family: var(--mono);
  }
  .tdetail .signal .lane {
    font-size: 11px;
    fill: ${unsafeCSS(C.mute)};
    font-family: "IBM Plex Sans", system-ui, sans-serif;
  }
  .tdetail .signal .note,
  .tdetail .signal .tick {
    font-size: 10px;
    fill: ${unsafeCSS(C.mute)};
  }
  .tdetail .signal .logic {
    fill: none;
    stroke: ${unsafeCSS(C.tg)};
    stroke-width: 1.6;
    stroke-linejoin: round;
    pointer-events: none;
  }
  .tdetail .signal .busp {
    fill: none;
    stroke: ${unsafeCSS(C.bus)};
    stroke-width: 1.6;
    stroke-linejoin: round;
    pointer-events: none;
  }
  .tdetail .signal .dashed {
    stroke-dasharray: 3 2;
    opacity: 0.6;
  }
  .tdetail .signal .ack .hexl {
    fill: ${unsafeCSS(C.mute)};
  }
  .tdetail .signal .hexl {
    font-size: 11px;
    font-weight: 700;
  }
  .tdetail .signal .bitl {
    font-size: 9px;
    fill: ${unsafeCSS(C.mute)};
  }
  .tdetail .signal .bitl.frame {
    fill: ${unsafeCSS(C.v230)};
  }
  .tdetail .signal .bitv {
    font-size: 10px;
    fill: ${unsafeCSS(C.ink)};
  }
  .tdetail .signal .char {
    cursor: pointer;
  }
  /* Checksum */
  .tdetail .ck-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: flex-start;
  }
  .tdetail .ck-grid table {
    border-collapse: separate;
    border-spacing: 2px;
    font-size: 13px;
  }
  .tdetail .ck-grid th button {
    width: 24px;
    border: 1.5px solid #cfccc1;
    background: #fff;
    border-radius: 6px;
    cursor: pointer;
    font: inherit;
    font-size: 11px;
  }
  .tdetail .ck-grid th button.sel {
    background: ${unsafeCSS(C.ink)};
    color: #fff;
    border-color: ${unsafeCSS(C.ink)};
  }
  .tdetail .ck-grid tr.selrow td.hex {
    text-decoration: underline;
  }
  .tdetail .ck-grid td.colsel {
    outline: 2px solid ${unsafeCSS(C.tg)};
  }
  .tdetail .ck-grid tr.count td {
    text-align: center;
    font-size: 11px;
    color: ${unsafeCSS(C.mute)};
    padding-top: 4px;
    border-top: 1px solid ${unsafeCSS(C.line)};
  }
  .tdetail .ck-grid tr.check {
    --f: ${unsafeCSS(C.mute)};
  }
  .tdetail .ck-grid tr.check td.bit {
    background: ${unsafeCSS(C.amberSoft)};
  }
  .tdetail .ck-grid th.par,
  .tdetail .ck-grid td.par {
    border-left: 4px double ${unsafeCSS(hexA(C.ink, 0.45))};
    padding-left: 6px;
    background: ${unsafeCSS(hexA(C.amber, 0.08))};
  }
  .tdetail .ck-grid tr.groups th {
    font-size: 11px;
    font-weight: 500;
    color: ${unsafeCSS(C.mute)};
    text-align: center;
    padding-bottom: 2px;
    border-bottom: 1px solid ${unsafeCSS(hexA(C.ink, 0.15))};
  }
  .tdetail .ck-grid tr.groups th.par {
    color: ${unsafeCSS(C.amber)};
  }
  .tdetail .ck-grid td.bit.par {
    color: ${unsafeCSS(C.amber)};
  }
  .tdetail .signal g.sep rect {
    fill: transparent;
  }
  .tdetail .lsb .cellb.sep {
    border: 1px dashed ${unsafeCSS(hexA(C.ink, 0.3))};
  }
  .tdetail .signal g.bit rect {
    fill: transparent;
  }
  .tdetail .signal g.bit.hl rect {
    fill: ${unsafeCSS(hexA(C.tg, 0.18))};
  }
  .tdetail .lsb {
    margin-top: 8px;
    font-size: 13.5px;
  }
  .tdetail .lsb p {
    margin: 4px 0;
  }
  .tdetail .lsb .rows {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px 10px;
    align-items: center;
  }
  .tdetail .lsb .lbl {
    color: ${unsafeCSS(C.mute)};
    font-size: 12px;
  }
  .tdetail .lsb .cells {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .tdetail .lsb .cellb {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    min-width: 26px;
    padding: 2px 0;
    border-radius: 5px;
    font-family: var(--mono);
    background: color-mix(in srgb, var(--f) 10%, white);
    cursor: default;
  }
  .tdetail .lsb .cellb small {
    font-size: 10px;
    color: ${unsafeCSS(C.mute)};
  }
  .tdetail .lsb .cellb.ctl {
    background: ${unsafeCSS(hexA(C.ink, 0.05))};
  }
  .tdetail .lsb .cellb.hl {
    outline: 2px solid ${unsafeCSS(C.tg)};
  }
  .tdetail .ck-explain {
    flex: 1;
    min-width: 260px;
    font-size: 13.5px;
  }
  .tdetail .ck-explain .focus {
    background: ${unsafeCSS(hexA(C.tg, 0.08))};
    border-left: 3px solid ${unsafeCSS(C.tg)};
    padding: 6px 10px;
    border-radius: 4px;
  }
  .tdetail .xor {
    font-size: 13px;
    padding-left: 1.4em;
  }
  /* Phones: the dialog takes the whole screen, a field name goes on its own line. */
  @media (max-width: 640px) {
    dialog.tdetail {
      width: 100vw;
      max-width: 100vw;
      height: 100dvh;
      max-height: 100dvh;
      margin: 0;
      border-radius: 0;
      padding: 10px;
    }
    .tdetail .field .head {
      grid-template-columns: auto 1fr;
      gap: 4px 10px;
    }
    .tdetail .field .name {
      grid-column: 1 / -1;
    }
    .tdetail .strip button {
      min-width: 38px;
    }
  }
`;
