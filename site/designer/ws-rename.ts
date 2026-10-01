// Renaming in place: double-click the name, press F2, or choose Rename in the
// context menu; Enter or leaving the field confirms, Escape cancels.
import { html } from "lit";
import type { TemplateResult } from "lit";
import { ref } from "lit/directives/ref.js";
import { t } from "./lang";
import { nameOf } from "./ws-state";
import type { Host } from "./ws-state";

const focused = new WeakSet<Element>();

/** The name of an element, or the field that edits it while it is being renamed. */
export function renamable(
  host: Host,
  key: string,
  where: string,
  display: TemplateResult | string,
): TemplateResult | string {
  const r = host.ws.renaming;
  const target = host.doc && nameOf(host.doc, key);
  if (!target || r?.key !== key || r.where !== where) return display;
  let done = false;
  const finish = (input: HTMLInputElement, keep: boolean) => {
    if (done) return;
    done = true;
    host.ws.renaming = null;
    const v = input.value;
    if (keep && v !== target.value)
      host.run(t`Rename`, (d) => target.apply(d, v));
    else host.requestUpdate();
  };
  return html`<input
    class="w-rename"
    aria-label=${t`New name`}
    placeholder=${target.placeholder}
    .value=${target.value}
    ${ref((el) => {
      if (!el || focused.has(el)) return;
      focused.add(el);
      setTimeout(() => {
        (el as HTMLInputElement).focus();
        (el as HTMLInputElement).select();
      });
    })}
    @click=${(e: Event) => e.stopPropagation()}
    @dblclick=${(e: Event) => e.stopPropagation()}
    @keydown=${(e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Enter") finish(e.target as HTMLInputElement, true);
      else if (e.key === "Escape") finish(e.target as HTMLInputElement, false);
    }}
    @blur=${(e: Event) => finish(e.target as HTMLInputElement, true)}
  />`;
}
