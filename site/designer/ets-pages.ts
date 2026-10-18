// Parameter dialog of a device of a product catalog, as ETS shows it: one page per block
// of the program's Dynamic tree, the parameters of the branches that the current values
// select, with the texts of the program in the designer's language. A change sets the
// value of the project and the device's application again. A parameter that turns on a
// function the simulation lacks is marked, and a first page lists these functions.
import { html, nothing } from "lit";
import type { TemplateResult } from "lit";
import type { ApplicationProgram } from "../../src/knxprod/application";
import { refTextOf, textOf } from "../../src/knxprod/application";
import { valueOf } from "../../src/knxprod/config";
import type { DialogEntry, DialogPage } from "../../src/knxprod/dialog";
import { dialogPages } from "../../src/knxprod/dialog";
import type { Dev, Doc } from "./edit";
import {
  resetEtsParameters,
  setEtsParameter,
  unexplainedOf,
} from "./ets-device";
import { programOfProduct } from "./manufacturers";
import type { GuidedEditor } from "./guided";
import { t, tt } from "./lang";
import type { Page } from "./params";
import type { ProductLimit } from "../../src/bcu/product";
import { limitOfParameter, limitsOf } from "./limits";
import { calculate } from "../../src/knxprod/calculation";
import type { CalculationProblem } from "../../src/knxprod/calculation";

type Ets = { application: string; parameters?: Record<string, string> };

const lang = () => t.lang ?? "en";

/** The mark of a parameter that turns on a function the simulation lacks. */
function limitMark(l: { limit: ProductLimit; inUse: boolean } | null) {
  if (!l) return nothing;
  const what = l.limit.partial ? t`simulated in part` : t`not simulated`;
  return html`<small
    class="g-limit${l.inUse ? " on" : ""}"
    title=${tt(l.limit.text)}
    >⚠ ${what}</small
  >`;
}

function field(
  ed: GuidedEditor,
  d: Dev,
  app: ApplicationProgram,
  values: Record<string, string>,
  ref: string,
  limits?: readonly ProductLimit[],
): TemplateResult | typeof nothing {
  const r = app.parameterRefs.get(ref);
  const p = r ? app.parameters.get(r.ref) : undefined;
  if (!r || !p) return nothing;
  const access = r.access ?? p.access;
  if (access === "None") return nothing;
  const type = app.types.get(p.type);
  const label = refTextOf(app, r.id, lang());
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
  else if (
    type.kind === "number" ||
    type.kind === "float" ||
    type.kind === "time"
  )
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
    ><span
      >${label}${limitMark(limitOfParameter(limits, app, values, ref))}</span
    >${input}</label
  >`;
}

/**
 * Rows of a page, in the order ETS shows them: by the DisplayOrder of the parameters;
 * and the parameters it sets.
 */
function rowsOf(
  ed: GuidedEditor,
  d: Dev,
  app: ApplicationProgram,
  values: Record<string, string>,
  entries: DialogEntry[],
  limits?: readonly ProductLimit[],
): { rows: TemplateResult[]; refs: string[] } {
  const rows: { order: number; row: TemplateResult }[] = [];
  const refs: string[] = [];
  for (const e of entries) {
    if (e.kind === "param") {
      const f = field(ed, d, app, values, e.ref, limits);
      if (f === nothing) continue;
      rows.push({ order: e.order, row: f as TemplateResult });
      refs.push(e.ref);
    } else {
      const text = textOf(app, e.id, "Text", e.text, lang());
      rows.push({
        order: e.order,
        row: text
          ? html`<h4 class="w-psep">${text}</h4>`
          : html`<hr class="w-psep" />`,
      });
    }
  }
  // A page of separators only shows nothing.
  if (!refs.length) return { rows: [], refs };
  return {
    rows: rows
      .map((r, i) => ({ ...r, i }))
      .sort((a, b) => a.order - b.order || a.i - b.i)
      .map((r) => r.row),
    refs,
  };
}

/** The parameters of a page and of the pages below it. */
const refsBelow = (p: EtsPage): string[] => [
  ...p.refs,
  ...(p.children ?? []).flatMap((c) => refsBelow(c as EtsPage)),
];

/** A page of the dialog, with the parameters it shows. */
type EtsPage = Page & { refs: string[] };

/** Pages of a manufacturer's product, as ETS shows them, from its product database. */
export function etsPages(ed: GuidedEditor, _doc: Doc, d: Dev): Page[] {
  const ets = d.ets as Ets | undefined;
  const app = programOfProduct(d.behavior);
  if (!ets || !app) return [];
  const values = ets.parameters ?? {};
  const limits = ed.registry.bcuProducts?.get(d.behavior)?.limits;
  const out: Page[] = [];
  // What the simulation lacks: those that the values of the project turn on first.
  const states = limitsOf(limits, app, values).sort(
    (a, b) => Number(b.inUse) - Number(a.inUse),
  );
  // The calculations of the program that the designer cannot do: the hidden parameters
  // they set keep their values.
  const problems: CalculationProblem[] = [];
  calculate(app, values, problems);
  // What the memory read back from the device holds that these pages do not show.
  const unexplained = unexplainedOf(d, app);
  if (states.length || problems.length || unexplained.length) {
    const used =
      states.filter((s) => s.inUse).length +
      (problems.length ? 1 : 0) +
      (unexplained.length ? 1 : 0);
    out.push({
      key: "ets:limits",
      label: t`Simulation limits`,
      sum: used ? t`${used} in use` : undefined,
      body: () =>
        html`<div class="g-row g-ets-page">
          <p class="w-info">
            ${t`Functions of the program that the simulation lacks: ETS sets them, the diagram does not run them.`}
          </p>
          <ul class="g-limits">
            ${states.map(
              (s) =>
                html`<li class=${s.inUse ? "on" : ""}>
                  ${tt(s.limit.text)}${
                    s.limit.partial
                      ? html` <small>(${t`simulated in part`})</small>`
                      : nothing
                  }${
                    s.inUse
                      ? html` <strong
                          >${t`turned on by the parameters`}</strong
                        >`
                      : nothing
                  }
                </li>`,
            )}
            ${problems.map(
              (p) =>
                html`<li class="on">
                  ${t`Parameter calculation ${p.calculation} of the program not done (${p.message}): the parameters it sets keep their values.`}
                </li>`,
            )}
            ${
              unexplained.length
                ? html`<li class="on">
                    ${t`The memory read back from the device holds, at these parameters, values that these pages do not write: its memory is kept as it is; an edit of its parameters writes what the pages show.`}
                    <ul>
                      ${unexplained.map((u) => {
                        const label = refTextOf(app, u.ref, lang()) || u.ref;
                        return html`<li>
                          ${label}
                          <code>${u.address.toString(16).toUpperCase()}h</code>
                        </li>`;
                      })}
                    </ul>
                  </li>`
                : nothing
            }
          </ul>
        </div>`,
    });
  }
  const reset = (refs: string[], what: string) => () => [
    {
      label: t`Default values`,
      disabled: refs.some((r) => values[r] !== undefined)
        ? undefined
        : t`These parameters have their default values`,
      run: () => {
        ed.run(t`Default values of ${what}`, (x) =>
          resetEtsParameters(x, d.id, app, ed.registry, refs),
        );
      },
    },
  ];
  // A page shows its rows; one that shows nothing, nor pages below it, is hidden.
  const pageOf = (p: DialogPage): EtsPage | null => {
    const shown = rowsOf(ed, d, app, values, p.entries, limits);
    const children = p.children.flatMap((c) => pageOf(c) ?? []);
    if (!shown.rows.length && !children.length) return null;
    const page: EtsPage = {
      key: `ets:${p.id}`,
      label: p.label,
      refs: shown.refs,
      ...(shown.rows.length
        ? {
            body: () => html`<div class="g-row g-ets-page">${shown.rows}</div>`,
          }
        : {}),
      ...(children.length ? { children } : {}),
    };
    page.menu = reset(refsBelow(page), p.label);
    return page;
  };
  out.push(...dialogPages(app, values, lang()).flatMap((p) => pageOf(p) ?? []));
  return out;
}
