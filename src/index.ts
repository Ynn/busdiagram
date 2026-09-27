// Bundle browser: displayed under window.BusDiagram (classic script, IIFE).
// The import does not present any simulation; it only records the <bus-diagram> element.
export * from "./core";
export { BusDiagram, create } from "./ui/bus-diagram";
export { DEFAULT_OPTIONS, OPTION_DOCS } from "./ui/options";
export type { ViewOptions } from "./ui/options";
export { registerEquipmentView, equipmentView } from "./ui/equipment";
export type {
  EquipmentViewDefinition,
  EquipmentViewProps,
} from "./ui/equipment";
export { layout } from "./knx/layout";
// For extensions in classic script, which cannot import Lit themselves.
export { html, svg, nothing } from "lit";

// The JSON written in the tag must not be displayed before the element definition.
if (
  typeof document !== "undefined" &&
  !document.getElementById("bus-diagram-style")
) {
  const st = document.createElement("style");
  st.id = "bus-diagram-style";
  st.textContent =
    "bus-diagram:not(:defined){display:none}bus-diagram{display:block}";
  document.head.appendChild(st);
}
