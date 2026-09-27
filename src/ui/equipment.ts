import type { Translate } from "../i18n";
import { en, hostTranslator } from "../i18n";
// Reusable views of controlled equipment receive only read-only state.
// No GAs, no access to the engine.
import { html, nothing, svg } from "lit";
import type { TemplateResult } from "lit";
import type { JsonObject } from "../knx/contracts";
import type { EquipmentSize } from "../knx/layout";

export interface EquipmentViewProps {
  state: Readonly<JsonObject>;
  label: string;
  /** Placement points (logical coordinates of the scene). */
  box: { x: number; y: number; width: number; height: number };
  /** Optional annotation from the interface, such as remaining timer time. */
  note?: string;
  /** Translation into the language of the component (view-specific labels). */
  t?: Translate;
  /** Equipment parameters (e.g. number of ballasts in a DALI group). */
  parameters?: Readonly<JsonObject>;
  /** Physical action on the equipment (simulated pane...), if the equipment supports it. */
  act?: (action: string, payload?: number) => void;
}

export interface EquipmentViewDefinition {
  size: EquipmentSize;
  render(props: EquipmentViewProps): TemplateResult;
}

const views = new Map<string, EquipmentViewDefinition>();

export function registerEquipmentView(
  id: string,
  definition: EquipmentViewDefinition,
): void {
  if (typeof id !== "string" || !id)
    throw new TypeError(hostTranslator()`view identifier required`);
  if (views.has(id))
    throw new Error(
      hostTranslator()`Equipment view “${id}” already registered`,
    );
  if (typeof definition?.render !== "function" || !definition.size)
    throw new TypeError(
      hostTranslator()`View “${id}”: size and render are required`,
    );
  const { width, height, anchorY } = definition.size;
  const ok = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && n > 0;
  if (
    !ok(width) ||
    !ok(height) ||
    (anchorY !== undefined &&
      !(typeof anchorY === "number" && Number.isFinite(anchorY)))
  )
    throw new TypeError(
      hostTranslator()`View “${id}”: size.width and size.height must be finite positive numbers`,
    );
  views.set(id, Object.freeze({ ...definition }));
}

export const equipmentView = (id: string) => views.get(id);

/** Copy of the view register (cancellation of an extension load refused). */
export const saveViews = (): ReadonlyMap<string, EquipmentViewDefinition> =>
  new Map(views);
export function restoreViews(s: ReadonlyMap<string, EquipmentViewDefinition>) {
  views.clear();
  s.forEach((v, k) => views.set(k, v));
}

const lampView: EquipmentViewDefinition = {
  size: { width: 84, height: 32 },
  render: ({ state, label, box, note }) =>
    html`<div
      class="lamp ${state.on ? "on" : ""}"
      style="left:${box.x}px;top:${box.y}px"
    >
      <svg viewBox="0 0 30 36">
        <path
          class="glass"
          stroke-width="1.8"
          d="M15 2 C7.5 2 3 7.6 3 13.4 c0 4.4 2.4 7 4.6 9.4 c1.3 1.4 2.1 2.9 2.1 4.6 h10.6 c0-1.7 0.8-3.2 2.1-4.6 C24.6 20.4 27 17.8 27 13.4 C27 7.6 22.5 2 15 2z"
        ></path>
        <path
          class="fil"
          stroke-width="1.5"
          d="M11.5 27 v-6 l2-5 l1.5 3 l1.5-3 l2 5 v6"
        ></path>
        <rect
          class="base"
          x="9.6"
          y="28.2"
          width="10.8"
          height="2.6"
          rx="1"
        ></rect>
        <rect
          class="base"
          x="10.6"
          y="31.6"
          width="8.8"
          height="2.6"
          rx="1.2"
        ></rect>
      </svg>
      <div class="loadlbl" title=${label}>
        ${label}${note ? html`<small>${note}</small>` : nothing}
      </div>
    </div>`,
};

const shutterView: EquipmentViewDefinition = {
  size: { width: 92, height: 142, anchorY: 58 },
  render: ({ state, label, box, parameters, t = en }) => {
    const pos = Number(state.positionPct ?? 0);
    const h = (78 * pos) / 100;
    const moving = state.moving === true;
    const arrow = moving ? (state.drive === "down" ? "▼" : "▲") : "";
    const venetian = Number(parameters?.slatTravelMs ?? 0) > 0;
    const slat = Math.max(0, Math.min(100, Number(state.slatPct ?? 0)));
    // Venetian blind: each 6 px slat looks thicker as it closes (seen edge-on when open).
    const thick = 1.2 + (4.8 * slat) / 100;
    const slatsStyle = venetian
      ? `background-image:repeating-linear-gradient(#9aa0a8 0 ${thick.toFixed(2)}px, transparent ${thick.toFixed(2)}px 6px);background-color:transparent`
      : "";
    return html`<div
      class="shutter ${venetian ? "venetian" : ""}"
      style="left:${box.x}px;top:${box.y}px"
      title=${
        venetian
          ? t`Actual blind: ${pos.toFixed(1)} %, slats ${slat.toFixed(0)} %`
          : t`Actual shutter: ${pos.toFixed(1)} %`
      }
    >
      <div class="box"></div>
      <div class="win">
        <div
          class="slats"
          style="height:${h}px;${h < 1 ? "border-bottom:none;" : ""}${slatsStyle}"
        ></div>
      </div>
      <div class="foot">
        <span style="font-weight:600" title=${label}>${label}</span
        ><span class=${moving ? "mv" : ""}>${arrow}${Math.round(pos)}%</span>
      </div>
      ${
        venetian
          ? html`<div class="slatinfo">
              <svg
                viewBox="0 0 16 16"
                width="15"
                height="15"
                aria-hidden="true"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="7"
                  fill="none"
                  stroke="#d6d2c6"
                  stroke-width="1"
                ></circle>
                <line
                  x1="2"
                  y1="8"
                  x2="14"
                  y2="8"
                  stroke="#6b7079"
                  stroke-width="2.4"
                  stroke-linecap="round"
                  transform="rotate(${(70 * slat) / 100} 8 8)"
                ></line>
              </svg>
              ${t`slats`} <b>${Math.round(slat)}%</b>
            </div>`
          : nothing
      }
    </div>`;
  },
};

/** Variable lamp: same drawing, brightness proportional to the level. */
const dimmableView: EquipmentViewDefinition = {
  size: { width: 84, height: 32 },
  render: ({ state, label, box }) => {
    const lvl = Number(state.levelPct ?? 0);
    const k =
      typeof state.colourTemperatureK === "number"
        ? state.colourTemperatureK
        : null;
    return html`<div class="lamp dim" style="left:${box.x}px;top:${box.y}px">
      ${bulb(lvl, k)}
      <div class="loadlbl" title=${label}>
        ${label}<small>${Math.round(lvl)} %</small>${
          k === null ? nothing : html`<small>${Math.round(k)} K</small>`
        }
      </div>
    </div>`;
  },
};

/** Light bulb whose glass is coloured according to the level (0 = off, 100 = full intensity). */
const bulb = (lvl: number, kelvin: number | null = null) => {
  const on = lvl > 0;
  const a = on ? 0.25 + (0.75 * Math.min(100, lvl)) / 100 : 0;
  // Warm white (2700 K) is amber; cold white (6500 K) is bluish.
  const w =
    kelvin === null ? null : Math.max(0, Math.min(1, (kelvin - 2700) / 3800));
  const rgb =
    w === null
      ? "255, 206, 50"
      : `${Math.round(255 - 50 * w)}, ${Math.round(176 + 54 * w)}, ${Math.round(70 + 185 * w)}`;
  return html`<svg viewBox="0 0 30 36" class="bulb">
    <path
      d="M15 2 C7.5 2 3 7.6 3 13.4 c0 4.4 2.4 7 4.6 9.4 c1.3 1.4 2.1 2.9 2.1 4.6 h10.6 c0-1.7 0.8-3.2 2.1-4.6 C24.6 20.4 27 17.8 27 13.4 C27 7.6 22.5 2 15 2z"
      fill=${on ? `rgba(${rgb}, ${a.toFixed(2)})` : "#f4f2ea"}
      stroke=${on ? "#d99a00" : "#a9a496"}
      stroke-width="1.8"
    ></path>
    <rect
      x="9.6"
      y="28.2"
      width="10.8"
      height="2.6"
      rx="1"
      fill="#a9a496"
    ></rect>
    <rect
      x="10.6"
      y="31.6"
      width="8.8"
      height="2.6"
      rx="1.2"
      fill="#a9a496"
    ></rect>
  </svg>`;
};

/**
 * DALI group: one bus and ballasts with short addresses A0–A63. Clicking a lamp
 * simulates a ballast fault; the gateway detects it on the next poll.
 */
const daliGroupView: EquipmentViewDefinition = {
  size: { width: 168, height: 78, anchorY: 22 },
  render: ({ state, label, box, parameters, act, t = en }) => {
    const lvl = Number(state.levelPct ?? 0);
    const n = Math.max(1, Math.min(16, Number(parameters?.ballasts ?? 2)));
    const first = Number(parameters?.firstAddress ?? 0);
    const mask = Number(state.failedMask ?? 0);
    const perRow = Math.min(n, 8);
    return html`<div
      class="dali"
      style="left:${box.x}px;top:${box.y}px;width:${box.width}px"
    >
      <div class="dali-bus"><span>DALI</span></div>
      <div
        class="dali-ecgs"
        style="grid-template-columns:repeat(${perRow}, 1fr)"
      >
        ${Array.from({ length: n }, (_, i) => {
          const failed = (mask >> i) & 1;
          return html`<button
            class="dali-ecg ${failed ? "failed" : ""}"
            title=${failed ? t`Ballast A${first + i} faulty (click to repair)` : t`Ballast A${first + i}: click to simulate a fault`}
            @click=${(e: Event) => {
              e.stopPropagation();
              act?.("toggleBallast", i);
            }}
          >
            ${bulb(failed ? 0 : lvl)}
            <small>A${first + i}</small>
          </button>`;
        })}
      </div>
      <div class="dali-foot">
        <b title=${label}>${label}</b><span>${Math.round(lvl)} %</span>
      </div>
    </div>`;
  },
};

/**
 * Radiator and thermoelectric valve: elements color according to the actual opening
 * (red in heating, blue in cooling); the flash signals the valve under tension.
 */
const radiatorView: EquipmentViewDefinition = {
  size: { width: 96, height: 36 },
  render: ({ state, label, box, parameters, t = en }) => {
    const open = Math.max(0, Math.min(100, Number(state.openPct ?? 0)));
    const cool = parameters?.emitter === "cooling";
    const a = open / 100;
    const fill = cool
      ? `rgb(${Math.round(236 - 150 * a)}, ${Math.round(240 - 80 * a)}, ${Math.round(242 + 10 * a)})`
      : `rgb(${Math.round(236 + 12 * a)}, ${Math.round(234 - 140 * a)}, ${Math.round(226 - 160 * a)})`;
    const stroke = open > 0 ? (cool ? "#2f6db3" : "#c2410c") : "#a9a496";
    return html`<div
      class="lamp radiator ${open > 0 ? "hot" : ""} ${cool ? "cool" : ""}"
      style="left:${box.x}px;top:${box.y}px"
      title=${cool ? t`Cooling emitter: valve ${Math.round(open)} % open` : t`Radiator: valve ${Math.round(open)} % open`}
    >
      <svg viewBox="0 0 40 32" class="rad">
        ${[0, 1, 2, 3, 4].map(
          (i) =>
            svg`<rect
              x=${2 + i * 7.4}
              y="4"
              width="6"
              height="22"
              rx="2.6"
              fill=${fill}
              stroke=${stroke}
              stroke-width="1.4"
            ></rect>`,
        )}
        <rect x="1" y="7" width="38" height="2.2" fill=${stroke}></rect>
        <rect x="1" y="21" width="38" height="2.2" fill=${stroke}></rect>
        ${
          state.energized
            ? svg`<path
                d="M35 0 l-3 5 h3 l-2.5 5"
                fill="none"
                stroke="#d99a00"
                stroke-width="1.6"
              ></path>`
            : nothing
        }
      </svg>
      <div class="loadlbl" title=${label}>
        ${label}<small>${t`valve`} ${Math.round(open)} %</small>
      </div>
    </div>`;
  },
};

/** Fan: blades turn at a speed proportional to the level; still at 0 %. */
const fanView: EquipmentViewDefinition = {
  size: { width: 84, height: 34 },
  render: ({ state, label, box, t = en }) => {
    const lvl = Math.max(0, Math.min(100, Number(state.levelPct ?? 0)));
    // One turn every 2.4 s at low speed, down to 0.5 s at full speed.
    const period = lvl > 0 ? 2.4 - (1.9 * lvl) / 100 : 0;
    return html`<div
      class="lamp fan ${lvl > 0 ? "on" : ""}"
      style="left:${box.x}px;top:${box.y}px"
      title=${t`Fan: ${Math.round(lvl)} %`}
    >
      <svg viewBox="0 0 32 32" class="fanicon">
        <circle
          cx="16"
          cy="16"
          r="14"
          fill="#fff"
          stroke=${lvl > 0 ? "#2f6db3" : "#a9a496"}
          stroke-width="1.6"
        ></circle>
        <g
          class="blades"
          style=${period ? `animation-duration:${period.toFixed(2)}s` : "animation:none"}
        >
          ${[0, 120, 240].map(
            (a) =>
              svg`<path transform="rotate(${a} 16 16)" d="M16 16 C 14 11 14 6 17 4.5 C 20 6 19 11 16 16 Z" fill=${lvl > 0 ? "#7fb0e6" : "#d6d2c6"} stroke=${lvl > 0 ? "#2f6db3" : "#a9a496"} stroke-width="0.8"></path>`,
          )}
        </g>
        <circle
          cx="16"
          cy="16"
          r="2.2"
          fill=${lvl > 0 ? "#2f6db3" : "#a9a496"}
        ></circle>
      </svg>
      <div class="loadlbl" title=${label}>
        ${label}<small>${Math.round(lvl)} %</small>
      </div>
    </div>`;
  },
};

/** Appliance: a box with a plug symbol, highlighted while powered. */
const applianceView: EquipmentViewDefinition = {
  size: { width: 84, height: 34 },
  render: ({ state, label, box, note, parameters, t = en }) => {
    const on = state.on === true;
    return html`<div
      class="lamp appliance ${on ? "on" : ""}"
      style="left:${box.x}px;top:${box.y}px"
      title=${t`Appliance: ${Number(parameters?.powerW ?? 2000)} W rated`}
    >
      <svg viewBox="0 0 30 30" class="appl">
        <rect
          x="2"
          y="3"
          width="26"
          height="24"
          rx="4"
          fill=${on ? "#fff4d6" : "#f4f2ea"}
          stroke=${on ? "#d99a00" : "#a9a496"}
          stroke-width="1.6"
        ></rect>
        <path
          d="M11 10 v4 M19 10 v4 M9 14 h12 v3 a6 6 0 0 1 -12 0 z M15 23 v2"
          fill="none"
          stroke=${on ? "#d99a00" : "#a9a496"}
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
      </svg>
      <div class="loadlbl" title=${label}>
        ${label}${note ? html`<small>${note}</small>` : nothing}
      </div>
    </div>`;
  },
};

registerEquipmentView("fan", fanView);
registerEquipmentView("appliance", applianceView);
registerEquipmentView("lamp", lampView);
registerEquipmentView("radiator", radiatorView);
registerEquipmentView("dimmableLamp", dimmableView);
registerEquipmentView("daliGroup", daliGroupView);
registerEquipmentView("shutter", shutterView);
registerEquipmentView("venetianBlind", {
  ...shutterView,
  size: { width: 92, height: 178, anchorY: 58 },
});
