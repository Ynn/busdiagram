// Confirmation of an action that cannot be undone (outside the undo history) or that
// changes what the browser keeps: a modal dialog that says what the action does and
// what is lost, with the cancel button focused. Escape or a click outside cancels.
import { t } from "./lang";

export interface Confirmation {
  title: string;
  /** What the action does, and what is lost. */
  message: string;
  /** Label of the button that runs the action. */
  confirm: string;
  /** Says that it cannot be undone. */
  irreversible?: boolean;
}

/** Ask before an action: true once the reader confirms it. */
export function confirmAction(c: Confirmation): Promise<boolean> {
  const dialog = document.createElement("dialog");
  dialog.className = "confirm-dialog";
  dialog.setAttribute("aria-labelledby", "confirm-title");
  const h = document.createElement("h2");
  h.id = "confirm-title";
  h.textContent = c.title;
  const p = document.createElement("p");
  p.textContent = c.message;
  dialog.append(h, p);
  if (c.irreversible) {
    const w = document.createElement("p");
    w.className = "confirm-warn";
    w.textContent = t`This cannot be undone.`;
    dialog.append(w);
  }
  const actions = document.createElement("div");
  actions.className = "actions";
  const cancel = document.createElement("button");
  cancel.textContent = t`Cancel`;
  const ok = document.createElement("button");
  ok.className = "danger";
  ok.textContent = c.confirm;
  actions.append(cancel, ok);
  dialog.append(actions);
  document.body.append(dialog);
  return new Promise((resolve) => {
    let answer = false;
    const close = (v: boolean) => {
      answer = v;
      dialog.close();
    };
    cancel.addEventListener("click", () => close(false));
    ok.addEventListener("click", () => close(true));
    // A click on the backdrop (outside the box) cancels.
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) close(false);
    });
    dialog.addEventListener("close", () => {
      dialog.remove();
      resolve(answer);
    });
    dialog.showModal();
    cancel.focus();
  });
}
