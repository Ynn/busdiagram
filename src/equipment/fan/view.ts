// View of the fan in the diagram: read-only state, no access to the engine.
import { html, svg } from "lit";
import type { EquipmentViewDefinition } from "../../ui/equipment";
import { en } from "../../i18n";
import { fanSize } from "./size";

/** Fan: blades turn at a speed proportional to the level; still at 0 %. */
export const fanView: EquipmentViewDefinition = {
  size: fanSize,
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
