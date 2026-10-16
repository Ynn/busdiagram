// Parameter dialog of a device of a product catalog, as ETS shows it: one page per block
// of the program's Dynamic tree, the parameters of the branches that the current values
// select, with the texts of the program in the designer's language. A change sets the
// value of the project and the device's application again.
import { html, nothing } from "lit";
import type { TemplateResult } from "lit";
import type {
  ApplicationProgram,
  DynNode,
} from "../../src/knxprod/application";
import { textOf } from "../../src/knxprod/application";
import { branch, valueOf } from "../../src/knxprod/config";
import type { Dev, Doc } from "./edit";
import { setEtsParameter } from "./ets-device";
import { programOfProduct } from "./manufacturers";
import type { GuidedEditor } from "./guided";
import { t } from "./lang";
import type { Page } from "./params";

type Ets = { application: string; parameters?: Record<string, string> };

const lang = () => t.lang ?? "en";

function field(
  ed: GuidedEditor,
  d: Dev,
  app: ApplicationProgram,
  values: Record<string, string>,
  ref: string,
): TemplateResult | typeof nothing {
  const r = app.parameterRefs.get(ref);
  const p = r ? app.parameters.get(r.ref) : undefined;
  if (!r || !p) return nothing;
  const access = r.access ?? p.access;
  if (access === "None") return nothing;
  const type = app.types.get(p.type);
  const label =
    textOf(app, r.id, "Text", "", lang()) ||
    textOf(app, p.id, "Text", r.text ?? p.text, lang());
  const value = valueOf(app, values, ref);
  const readOnly = access === "Read";
  const set = (v: string) =>
    ed.run(label || t`Parameter`, (x) =>
      setEtsParameter(x, d.id, app, ed.registry, ref, v),
    );
  if (!type || type.kind === "none")
    return label.trim() ? html`<p class="w-info">${label}</p>` : nothing;
  let input: TemplateResult;
  if (type.kind === "enum")
    input = html`<select
      data-v=${value}
      ?disabled=${readOnly}
      @change=${(e: Event) => set((e.target as HTMLSelectElement).value)}
    >
      ${type.enums!.map(
        (o) =>
          html`<option
            value=${String(o.value)}
            ?selected=${String(o.value) === value}
          >
            ${textOf(app, o.id, "Text", o.text, lang())}
          </option>`,
      )}
    </select>`;
  else if (type.kind === "number" || type.kind === "float")
    input = html`<input
      type="number"
      .value=${value}
      min=${String(type.min ?? "")}
      max=${String(type.max ?? "")}
      ?disabled=${readOnly}
      @change=${(e: Event) => set((e.target as HTMLInputElement).value)}
    />`;
  else
    input = html`<input
      .value=${value}
      ?disabled=${readOnly}
      @change=${(e: Event) => set((e.target as HTMLInputElement).value)}
    />`;
  return html`<label class="g-field g-ets"
    ><span>${label}</span>${input}</label
  >`;
}

/** Rows of a page, in the order ETS shows them: by the DisplayOrder of the parameters. */
function items(
  ed: GuidedEditor,
  d: Dev,
  app: ApplicationProgram,
  values: Record<string, string>,
  nodes: DynNode[],
): TemplateResult[] {
  const rows: { order: number; row: TemplateResult }[] = [];
  // A row without an order of its own (a separator) follows the one before it.
  let last = -Infinity;
  const walk = (list: DynNode[]) => {
    for (const n of list) {
      if (n.kind === "param") {
        const f = field(ed, d, app, values, n.ref);
        last = app.parameterRefs.get(n.ref)?.displayOrder ?? last;
        if (f !== nothing) rows.push({ order: last, row: f as TemplateResult });
      } else if (n.kind === "separator") {
        const text = textOf(app, n.id, "Text", n.text, lang());
        rows.push({
          order: last,
          row: text
            ? html`<h4 class="w-psep">${text}</h4>`
            : html`<hr class="w-psep" />`,
        });
      } else if (n.kind === "choose") walk(branch(app, values, n));
      else if (n.kind === "block" && n.inline) walk(n.children);
    }
  };
  walk(nodes);
  return rows
    .map((r, i) => ({ ...r, i }))
    .sort((a, b) => a.order - b.order || a.i - b.i)
    .map((r) => r.row);
}

/** Pages of a manufacturer's product, as ETS shows them, from its product database. */
export function etsPages(ed: GuidedEditor, _doc: Doc, d: Dev): Page[] {
  const ets = d.ets as Ets | undefined;
  const app = programOfProduct(d.behavior);
  if (!ets || !app) return [];
  const values = ets.parameters ?? {};
  const out: Page[] = [];
  const top = (nodes: DynNode[]) => {
    for (const n of nodes) {
      if (n.kind === "channel") top(n.children);
      else if (n.kind === "choose") top(branch(app, values, n));
      else if (n.kind === "block" && n.access !== "None") {
        const rows = items(ed, d, app, values, n.children);
        // ETS hides a block that shows nothing.
        if (!rows.length) continue;
        // A block without a text of its own takes that of its parameter (ParamRefId).
        const r = n.text ? undefined : app.parameterRefs.get(n.paramRef);
        const p = r && app.parameters.get(r.ref);
        const title = p
          ? textOf(app, p.id, "Text", r.text ?? p.text, lang())
          : textOf(app, n.id, "Text", n.text || n.name, lang());
        out.push({
          key: `ets:${n.id}`,
          label: title.trim() || n.name.trim(),
          body: () => html`<div class="g-row g-ets-page">${rows}</div>`,
        });
      }
    }
  };
  top(app.dynamic);
  return out;
}
