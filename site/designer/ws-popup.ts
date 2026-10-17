// The context menu of the workspace: opened at the pointer or under the element, closed by
// Escape wherever the focus is. It knows nothing of what its commands do.
import type { Host, MenuItem } from "./ws-state";

/** Escape closes the open menu wherever the focus is. */
let menuEscape: ((e: KeyboardEvent) => void) | null = null;

export function closeMenu(host: Host) {
  host.ws.menu = null;
  if (menuEscape) document.removeEventListener("keydown", menuEscape, true);
  menuEscape = null;
  host.requestUpdate();
}

export function openMenu(
  host: Host,
  e: MouseEvent | KeyboardEvent,
  items: MenuItem[],
) {
  e.preventDefault();
  e.stopPropagation();
  let x: number;
  let y: number;
  if (e instanceof MouseEvent && e.type === "contextmenu") {
    x = e.clientX;
    y = e.clientY;
  } else {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    x = r.left + 24;
    y = r.bottom;
  }
  host.ws.menu = { x, y, items };
  if (menuEscape) document.removeEventListener("keydown", menuEscape, true);
  menuEscape = (k: KeyboardEvent) => {
    if (k.key !== "Escape") return;
    k.preventDefault();
    closeMenu(host);
  };
  document.addEventListener("keydown", menuEscape, true);
  host.requestUpdate();
  setTimeout(() =>
    document
      .querySelector<HTMLElement>(".w-menu button:not([disabled])")
      ?.focus(),
  );
}
