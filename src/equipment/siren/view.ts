// View of the alarm sounder in the diagram: read-only state, no access to the engine.
import { html, nothing } from "lit";
import type { EquipmentViewDefinition } from "../../ui/equipment";
import { en } from "../../i18n";
import { sirenSize } from "./size";

/** Sounder with a flash light: waves while it sounds, a lit flash while powered. */
export const sirenView: EquipmentViewDefinition = {
  size: sirenSize,
  render: ({ state, label, box, note, t = en }) => {
    const powered = state.powered === true;
    const ringing = state.ringing === true;
    const tip = ringing
      ? t`Alarm sounder: sounding`
      : powered
        ? t`Alarm sounder: ringing time limit reached, flash light on`
        : t`Alarm sounder: quiet`;
    return html`<div
      class="lamp appliance ${powered ? "on" : ""}"
      style="left:${box.x}px;top:${box.y}px"
      title=${tip}
    >
      <svg viewBox="0 0 30 30" class="appl">
        <path
          d="M6 11 h5 l7 -6 v20 l-7 -6 h-5 z"
          fill=${powered ? "#fbe3e0" : "#f4f2ea"}
          stroke=${powered ? "#c0392b" : "#a9a496"}
          stroke-width="1.6"
          stroke-linejoin="round"
        ></path>
        ${
          ringing
            ? html`<path
                d="M21 10 q3 5 0 10 M24 7 q5 8 0 16"
                fill="none"
                stroke="#c0392b"
                stroke-width="1.6"
                stroke-linecap="round"
              ></path>`
            : nothing
        }
      </svg>
      <div class="loadlbl" title=${label}>
        ${label}${note ? html`<small>${note}</small>` : nothing}
      </div>
    </div>`;
  },
};
