// View of the radiator in the diagram: read-only state, no access to the engine.
import { html, nothing, svg } from "lit";
import type { EquipmentViewDefinition } from "../../ui/equipment";
import { en } from "../../i18n";
import { radiatorSize } from "./size";

/**
 * Radiator and thermoelectric valve: elements color according to the actual opening
 * (red in heating, blue in cooling); the flash signals the valve under tension.
 */
export const radiatorView: EquipmentViewDefinition = {
  size: radiatorSize,
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
