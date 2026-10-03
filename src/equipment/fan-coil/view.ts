// View of the fan coil in the diagram: read-only state, no access to the engine.
import { html, svg } from "lit";
import type { EquipmentViewDefinition } from "../../ui/equipment";
import { en } from "../../i18n";
import { fanCoilMedium, type FanCoilState } from "./equipment";
import { fanCoilSize } from "./size";

/**
 * Fan coil: a casing with its coil, red with hot water and blue with cold water as the
 * valve opens, and a fan that turns while water flows.
 */
export const fanCoilView: EquipmentViewDefinition = {
  size: fanCoilSize,
  render: ({ state, label, box, parameters = {}, t = en }) => {
    const open = Math.max(0, Math.min(100, Number(state.openPct ?? 0)));
    const medium = fanCoilMedium(state as FanCoilState, parameters);
    const cool = medium === "cooling";
    const a = open / 100;
    const coil = cool
      ? `rgb(${Math.round(236 - 150 * a)}, ${Math.round(240 - 80 * a)}, ${Math.round(242 + 10 * a)})`
      : `rgb(${Math.round(236 + 12 * a)}, ${Math.round(234 - 140 * a)}, ${Math.round(226 - 160 * a)})`;
    const stroke = open > 0 ? (cool ? "#2f6db3" : "#c2410c") : "#a9a496";
    const water = cool ? t`cold water` : t`hot water`;
    return html`<div
      class="lamp fancoil ${open > 0 ? medium : ""}"
      style="left:${box.x}px;top:${box.y}px"
      title=${t`Fan coil: ${water}, valve ${Math.round(open)} % open, fan ${open > 0 ? t`running` : t`stopped`}`}
    >
      <svg viewBox="0 0 44 30" class="fcu">
        <rect
          x="1"
          y="2"
          width="42"
          height="26"
          rx="3"
          fill="#fff"
          stroke=${stroke}
          stroke-width="1.4"
        ></rect>
        ${[0, 1, 2, 3].map(
          (i) =>
            svg`<rect x=${4 + i * 4.2} y="6" width="2.6" height="18" rx="1.2" fill=${coil} stroke=${stroke} stroke-width="0.8"></rect>`,
        )}
        <g transform="translate(15 0)">
          <g class="fanicon">
            <g
              class="blades"
              style=${open > 0 ? "animation-duration:1.2s" : "animation:none"}
            >
              ${[0, 120, 240].map(
                (r) =>
                  svg`<path transform="rotate(${r} 16 16) translate(8 8) scale(0.5)" d="M16 16 C 14 11 14 6 17 4.5 C 20 6 19 11 16 16 Z" fill=${open > 0 ? "#7fb0e6" : "#d6d2c6"} stroke=${stroke} stroke-width="1"></path>`,
              )}
            </g>
          </g>
          <circle cx="16" cy="16" r="1.4" fill=${stroke}></circle>
        </g>
        ${
          state.energized
            ? svg`<path d="M40 1 l-3 5 h3 l-2.5 5" fill="none" stroke="#d99a00" stroke-width="1.6"></path>`
            : null
        }
      </svg>
      <div class="loadlbl" title=${label}>
        ${label}<small>${t`valve`} ${Math.round(open)} %</small>
      </div>
    </div>`;
  },
};
