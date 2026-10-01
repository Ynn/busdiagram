// Tables of the workspace: columns sorted by a click on their header and resized by
// dragging its right edge (double-click on the edge: automatic widths again). Column
// widths are remembered by the browser; the sort order lasts for the visit.
import { html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { t } from "./lang";
import type { Host } from "./ws-state";

export interface Column<R> {
  id: string;
  label: string;
  /** Tooltip of the header (C, W, T, R, U flags). */
  title?: string;
  /** Sort key of a row; a column without one is not sortable. */
  sort?: (row: R) => string | number;
  /** Content of the cell. */
  cell?: (row: R) => TemplateResult | string | number | typeof nothing;
  /** Whole cell, when it needs its own events (renaming in place). */
  td?: (row: R) => TemplateResult;
  className?: string;
}

interface TableState {
  sort?: string;
  dir: 1 | -1;
  widths?: Record<string, number>;
}

const STORE = "busdiagram.designer.columns";
const states = new Map<string, TableState>();
let loaded = false;

function stateOf(id: string): TableState {
  if (!loaded) {
    loaded = true;
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "{}") as Record<
        string,
        Record<string, number>
      >;
      Object.entries(saved).forEach(([k, widths]) =>
        states.set(k, { dir: 1, widths }),
      );
    } catch {
      // Storage unavailable: automatic widths.
    }
  }
  let s = states.get(id);
  if (!s) states.set(id, (s = { dir: 1 }));
  return s;
}

function saveWidths() {
  try {
    const out: Record<string, Record<string, number>> = {};
    states.forEach((s, k) => s.widths && (out[k] = s.widths));
    localStorage.setItem(STORE, JSON.stringify(out));
  } catch {
    // Storage unavailable: the widths last for this visit.
  }
}

const compare = (a: string | number, b: string | number) =>
  typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b), undefined, { numeric: true });

/**
 * A table of rows. `row` wraps the cells in the row element, with its own attributes
 * and events (drag, double-click, context menu).
 */
export function dataTable<R>(
  host: Host,
  id: string,
  columns: Column<R>[],
  rows: R[],
  row: (r: R, cells: TemplateResult) => TemplateResult,
  className = "",
): TemplateResult {
  const st = stateOf(id);
  const col = columns.find((c) => c.id === st.sort && c.sort);
  const shown = col
    ? rows
        .map((r, i) => [r, i] as const)
        .sort(
          ([a, i], [b, j]) =>
            st.dir * compare(col.sort!(a), col.sort!(b)) || i - j,
        )
        .map(([r]) => r)
    : rows;
  const fixed = !!st.widths;
  /** From automatic to fixed widths: start from the widths on screen. */
  const fix = (grip: HTMLElement) => {
    if (st.widths) return st.widths;
    st.widths = {};
    grip
      .closest("table")!
      .querySelectorAll<HTMLElement>("thead th")
      .forEach((th, i) => (st.widths![columns[i]!.id] = th.offsetWidth));
    return st.widths;
  };
  const reset = () => {
    st.widths = undefined;
    saveWidths();
    host.requestUpdate();
  };
  const resize = (e: PointerEvent, c: Column<R>) => {
    e.preventDefault();
    e.stopPropagation();
    const grip = e.currentTarget as HTMLElement;
    const width = fix(grip)[c.id] ?? 80;
    const start = e.clientX;
    grip.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      st.widths![c.id] = Math.max(36, Math.round(width + ev.clientX - start));
      host.requestUpdate();
    };
    const up = () => {
      grip.removeEventListener("pointermove", move);
      grip.removeEventListener("pointerup", up);
      grip.removeEventListener("pointercancel", up);
      saveWidths();
    };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", up);
    grip.addEventListener("pointercancel", up);
  };
  /** Keyboard: arrows widen or narrow the column (Shift: by larger steps), Home resets. */
  const key = (e: KeyboardEvent, c: Column<R>) => {
    if (e.key === "Home") {
      e.preventDefault();
      return reset();
    }
    const dir = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const widths = fix(e.currentTarget as HTMLElement);
    widths[c.id] = Math.max(
      36,
      (widths[c.id] ?? 80) + dir * (e.shiftKey ? 40 : 10),
    );
    saveWidths();
    host.requestUpdate();
  };
  // Resized columns: the table takes the sum of their widths.
  const total = fixed
    ? columns.reduce((a, c) => a + (st.widths![c.id] ?? 80), 0)
    : 0;
  return html`<table
    class="w-table ${className} ${fixed ? "fixed" : ""}"
    data-table=${id}
    style=${fixed ? `width:${total}px` : nothing}
  >
    ${
      fixed
        ? html`<colgroup>
            ${columns.map((c) => html`<col style="width:${st.widths![c.id] ?? 80}px" />`)}
          </colgroup>`
        : nothing
    }
    <thead>
      <tr>
        ${columns.map(
          (c) =>
            html`<th
              title=${c.title ?? nothing}
              aria-sort=${
                st.sort === c.id && c.sort
                  ? st.dir === 1
                    ? "ascending"
                    : "descending"
                  : nothing
              }
            >
              ${
                c.sort
                  ? html`<button
                      class="w-sort"
                      title=${c.title ?? t`Sort by ${c.label}`}
                      @click=${() => {
                        // Ascending, descending, then the order of the model.
                        if (st.sort !== c.id) {
                          st.sort = c.id;
                          st.dir = 1;
                        } else if (st.dir === 1) st.dir = -1;
                        else st.sort = undefined;
                        host.requestUpdate();
                      }}
                    >
                      ${c.label}${
                        st.sort === c.id
                          ? html`<span class="w-arrow"
                              >${st.dir === 1 ? "▲" : "▼"}</span
                            >`
                          : nothing
                      }
                    </button>`
                  : c.label
              }
              <span
                class="w-colgrip"
                role="separator"
                tabindex="0"
                aria-orientation="vertical"
                aria-label=${t`Resize column ${c.label || t`actions`}`}
                aria-valuetext=${
                  st.widths?.[c.id]
                    ? t`${st.widths[c.id]} pixels`
                    : t`automatic width`
                }
                title=${t`Drag, or use the arrow keys; double-click or Home: automatic widths`}
                @pointerdown=${(e: PointerEvent) => resize(e, c)}
                @keydown=${(e: KeyboardEvent) => key(e, c)}
                @dblclick=${(e: Event) => {
                  e.stopPropagation();
                  reset();
                }}
              ></span>
            </th>`,
        )}
      </tr>
    </thead>
    <tbody>
      ${shown.map((r) =>
        row(
          r,
          html`${columns.map((c) =>
            c.td
              ? c.td(r)
              : html`<td class=${c.className ?? nothing}>
                  ${c.cell?.(r) ?? nothing}
                </td>`,
          )}`,
        ),
      )}
    </tbody>
  </table>`;
}
