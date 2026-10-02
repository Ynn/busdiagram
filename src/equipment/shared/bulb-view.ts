// Bulb drawn by the views of the dimmable lamp and the DALI group.
import { html } from "lit";

/** Light bulb whose glass is coloured according to the level (0 = off, 100 = full intensity). */
export const bulb = (lvl: number, kelvin: number | null = null) => {
  const on = lvl > 0;
  const a = on ? 0.25 + (0.75 * Math.min(100, lvl)) / 100 : 0;
  // Warm white (2700 K) is amber; cold white (6500 K) is bluish.
  const w =
    kelvin === null ? null : Math.max(0, Math.min(1, (kelvin - 2700) / 3800));
  const rgb =
    w === null
      ? "255, 206, 50"
      : `${Math.round(255 - 50 * w)}, ${Math.round(176 + 54 * w)}, ${Math.round(70 + 185 * w)}`;
  return html`<svg viewBox="0 0 30 36" class="bulb">
    <path
      d="M15 2 C7.5 2 3 7.6 3 13.4 c0 4.4 2.4 7 4.6 9.4 c1.3 1.4 2.1 2.9 2.1 4.6 h10.6 c0-1.7 0.8-3.2 2.1-4.6 C24.6 20.4 27 17.8 27 13.4 C27 7.6 22.5 2 15 2z"
      fill=${on ? `rgba(${rgb}, ${a.toFixed(2)})` : "#f4f2ea"}
      stroke=${on ? "#d99a00" : "#a9a496"}
      stroke-width="1.8"
    ></path>
    <rect
      x="9.6"
      y="28.2"
      width="10.8"
      height="2.6"
      rx="1"
      fill="#a9a496"
    ></rect>
    <rect
      x="10.6"
      y="31.6"
      width="8.8"
      height="2.6"
      rx="1.2"
      fill="#a9a496"
    ></rect>
  </svg>`;
};
