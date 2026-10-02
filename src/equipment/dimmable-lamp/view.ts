// View of the dimmable lamp in the diagram: read-only state, no access to the engine.
import { html, nothing } from "lit";
import type { EquipmentViewDefinition } from "../../ui/equipment";
import { dimmableLampSize } from "./size";
import { bulb } from "../shared/bulb-view";

/** Variable lamp: same drawing, brightness proportional to the level. */
export const dimmableView: EquipmentViewDefinition = {
  size: dimmableLampSize,
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
