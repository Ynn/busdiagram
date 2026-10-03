// View of the heat pump in the diagram: read-only state, no access to the engine.
import { html, nothing, svg } from "lit";
import type { EquipmentViewDefinition } from "../../ui/equipment";
import { en } from "../../i18n";
import { heatPumpSize } from "./size";

/** Outdoor unit with a fan that turns while the compressor runs. */
export const heatPumpView: EquipmentViewDefinition = {
  size: heatPumpSize,
  render: ({ state, label, box, note, parameters, t = en }) => {
    const running = state.running === true;
    const waiting = state.enabled === true && !running;
    const cooling = parameters?.mode === "cooling";
    const elec = Number(parameters?.electricPowerW ?? 1500);
    const heat = Math.round(elec * Number(parameters?.cop ?? 3.5));
    const color = !running ? "#a9a496" : cooling ? "#2f6db3" : "#d9622b";
    const tip = running
      ? cooling
        ? t`Heat pump cooling: ${elec} W drawn, ${heat} W of cold`
        : t`Heat pump heating: ${elec} W drawn, ${heat} W of heat`
      : waiting
        ? t`Heat pump: compressor waiting for its minimum off time`
        : t`Heat pump off`;
    return html`<div
      class="lamp appliance ${running ? "on" : ""}"
      style="left:${box.x}px;top:${box.y}px"
      title=${tip}
    >
      <svg viewBox="0 0 40 30" class="appl">
        <rect
          x="2"
          y="3"
          width="36"
          height="24"
          rx="3"
          fill="#f4f2ea"
          stroke=${color}
          stroke-width="1.6"
        ></rect>
        <circle
          cx="15"
          cy="15"
          r="8"
          fill="none"
          stroke=${color}
          stroke-width="1.4"
        ></circle>
        ${[0, 120, 240].map(
          (a) =>
            svg`<path transform="rotate(${a} 15 15)" d="M15 15 C 13 11 13 8 15.5 7.5 C 18 8 17.5 11 15 15 Z" fill=${color}></path>`,
        )}
        <path
          d="M27 9 h7 M27 15 h7 M27 21 h7"
          stroke=${color}
          stroke-width="1.4"
          stroke-linecap="round"
        ></path>
      </svg>
      <div class="loadlbl" title=${label}>
        ${label}${
          waiting
            ? html`<small>${t`waiting`}</small>`
            : note
              ? html`<small>${note}</small>`
              : nothing
        }
      </div>
    </div>`;
  },
};
