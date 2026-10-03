// View of the hot water cylinder in the diagram: read-only state, no access to the engine.
import { html, nothing } from "lit";
import type { EquipmentViewDefinition } from "../../ui/equipment";
import { en } from "../../i18n";
import { waterHeaterSize } from "./size";

/** Cylinder filled up to its temperature; the element glows while it heats. */
export const waterHeaterView: EquipmentViewDefinition = {
  size: waterHeaterSize,
  render: ({ state, label, box, note, parameters, act, t = en }) => {
    const temp = Number(state.tempC ?? 0);
    const heating = state.heating === true;
    const sp = Number(parameters?.setpointC ?? 60);
    // Fill from 10 °C (empty) to the setpoint (full).
    const level = Math.max(0, Math.min(1, (temp - 10) / Math.max(1, sp - 10)));
    const h = 26 * level;
    const tip = heating
      ? t`Hot water cylinder: ${temp.toFixed(1)} °C, heating (click to draw off hot water)`
      : t`Hot water cylinder: ${temp.toFixed(1)} °C (click to draw off hot water)`;
    return html`<div
      class="lamp appliance ${heating ? "on" : ""}"
      style="left:${box.x}px;top:${box.y}px;cursor:${act ? "pointer" : "default"}"
      title=${tip}
      @click=${() => act?.("draw")}
    >
      <svg viewBox="0 0 30 34" class="appl">
        <rect
          x="7"
          y="2"
          width="16"
          height="30"
          rx="7"
          fill="#f4f2ea"
          stroke="#8a8578"
          stroke-width="1.4"
        ></rect>
        <rect
          x="8.5"
          y=${30.5 - h}
          width="13"
          height=${h}
          rx="5"
          fill=${temp >= 45 ? "#e0654a" : temp >= 30 ? "#e9a04f" : "#7fb0e6"}
        ></rect>
        <path
          d="M11 27 h8"
          stroke=${heating ? "#d99a00" : "#a9a496"}
          stroke-width="2"
          stroke-linecap="round"
        ></path>
      </svg>
      <div class="loadlbl" title=${label}>
        ${label}<small
          >${temp.toFixed(0)} °C${note ? html` · ${note}` : nothing}</small
        >
      </div>
    </div>`;
  },
};
