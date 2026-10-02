// View of the lamp in the diagram: read-only state, no access to the engine.
import { html, nothing } from "lit";
import type { EquipmentViewDefinition } from "../../ui/equipment";
import { lampSize } from "./size";

export const lampView: EquipmentViewDefinition = {
  size: lampSize,
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
