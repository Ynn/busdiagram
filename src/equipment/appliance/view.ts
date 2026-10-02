// View of the appliance in the diagram: read-only state, no access to the engine.
import { html, nothing } from "lit";
import type { EquipmentViewDefinition } from "../../ui/equipment";
import { en } from "../../i18n";
import { applianceSize } from "./size";

/** Appliance: a box with a plug symbol, highlighted while powered. */
export const applianceView: EquipmentViewDefinition = {
  size: applianceSize,
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
