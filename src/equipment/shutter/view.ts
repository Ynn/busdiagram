// View of the shutter in the diagram: read-only state, no access to the engine.
import { html, nothing } from "lit";
import type { EquipmentViewDefinition } from "../../ui/equipment";
import { en } from "../../i18n";
import { shutterSize, venetianBlindSize } from "./size";

export const shutterView: EquipmentViewDefinition = {
  size: shutterSize,
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

/** Venetian blind: the shutter view, taller for its slats. */
export const venetianBlindView: EquipmentViewDefinition = {
  ...shutterView,
  size: venetianBlindSize,
};
