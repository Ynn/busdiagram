// View of the dali group in the diagram: read-only state, no access to the engine.
import { html } from "lit";
import type { EquipmentViewDefinition } from "../../ui/equipment";
import { en } from "../../i18n";
import { daliGroupSize } from "./size";
import { bulb } from "../shared/bulb-view";

/**
 * DALI group: one bus and ballasts with short addresses A0–A63. Clicking a lamp
 * simulates a ballast fault; the gateway detects it on the next poll.
 */
export const daliGroupView: EquipmentViewDefinition = {
  size: daliGroupSize,
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
