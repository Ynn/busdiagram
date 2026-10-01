// Workspace layout: a separator between the editor and the preview, draggable with the
// mouse or the arrow keys, and a button that hides the preview. The layout is a
// preference of this browser (localStorage), never part of the scenario.
import { t } from "./lang";

const KEY = "busdiagram.designer.layout";
const MIN = 28;
const MAX = 78;

interface Layout {
  /** Width of the editor column, in % of the workspace. */
  left: number;
  previewHidden: boolean;
}

function load(): Layout {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Layout>;
    return {
      left: typeof v.left === "number" ? v.left : 58,
      previewHidden: v.previewHidden === true,
    };
  } catch {
    return { left: 58, previewHidden: false };
  }
}

function save(l: Layout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(l));
  } catch {
    // Storage unavailable (private mode, file:// restrictions): keep the layout for this visit.
  }
}

export function initLayout(onChange: () => void = () => {}) {
  const split = document.querySelector<HTMLElement>(".split")!;
  const gutter = document.querySelector<HTMLElement>("#gutter")!;
  const toggle = document.querySelector<HTMLButtonElement>("#toggle-preview")!;
  const layout = load();

  const apply = () => {
    layout.left = Math.min(MAX, Math.max(MIN, layout.left));
    split.style.setProperty("--left", `${layout.left}%`);
    split.classList.toggle("no-preview", layout.previewHidden);
    gutter.setAttribute("aria-valuenow", String(Math.round(layout.left)));
    gutter.hidden = layout.previewHidden;
    toggle.textContent = layout.previewHidden
      ? t`Show preview`
      : t`Hide preview`;
    toggle.setAttribute("aria-pressed", String(layout.previewHidden));
    save(layout);
    onChange();
  };

  gutter.setAttribute("aria-label", t`Resize the editor and the preview`);
  gutter.setAttribute("aria-valuemin", String(MIN));
  gutter.setAttribute("aria-valuemax", String(MAX));
  gutter.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    gutter.setPointerCapture(e.pointerId);
    const box = split.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      layout.left = ((ev.clientX - box.left) / box.width) * 100;
      apply();
    };
    const up = () => {
      gutter.removeEventListener("pointermove", move);
      gutter.removeEventListener("pointerup", up);
    };
    gutter.addEventListener("pointermove", move);
    gutter.addEventListener("pointerup", up);
  });
  gutter.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") layout.left -= step;
    else if (e.key === "ArrowRight") layout.left += step;
    else if (e.key === "Home") layout.left = MIN;
    else if (e.key === "End") layout.left = MAX;
    else return;
    e.preventDefault();
    apply();
  });
  gutter.addEventListener("dblclick", () => {
    layout.left = 58;
    apply();
  });
  toggle.addEventListener("click", () => {
    layout.previewHidden = !layout.previewHidden;
    apply();
  });
  apply();
}
