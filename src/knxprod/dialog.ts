// The pages of the parameter dialog of a program, as ETS shows them: their tree, their
// titles, and what each shows (parameters and separators of the branches that the values
// select). DOM-free: a host renders the rows.
import type { ApplicationProgram, DynNode } from "./application";
import { refTextOf, textOf } from "./application";
import type { ParameterValues } from "./config";
import { branch } from "./config";

/** What a page shows: a parameter, or a separator, with its place in the display order. */
export type DialogEntry =
  | { kind: "param"; ref: string; order: number }
  | { kind: "separator"; id: string; text: string; order: number };

export interface DialogPage {
  /** The block (or channel) of the program. */
  id: string;
  /** Its title in the language asked for. */
  label: string;
  /** What it shows, in the order of the program (a host sorts it by `order`). */
  entries: DialogEntry[];
  /** The pages below it. */
  children: DialogPage[];
}

type Block = Extract<DynNode, { kind: "block" }>;

/**
 * The title of a block: its text, or that of its parameter (ParamRefId). A placeholder
 * for the text of a parameter ("{{0}}", "{{0: default}}") shows its default, as ETS
 * before the name of a channel is entered.
 */
function titleOf(app: ApplicationProgram, n: Block, lang: string): string {
  const text =
    !n.text && app.parameterRefs.has(n.paramRef)
      ? refTextOf(app, n.paramRef, lang)
      : textOf(app, n.id, "Text", n.text || n.name, lang);
  return text.replace(/\{\{\d+(?::([^}]*))?\}\}/g, (_, d: string | undefined) =>
    (d ?? "").trim(),
  );
}

/**
 * What a list of nodes shows on its page: the parameters and separators of the branches
 * that the values select, and of the blocks shown inline (a separator takes the display
 * order of the row before it).
 */
function entriesOf(
  app: ApplicationProgram,
  values: ParameterValues,
  nodes: DynNode[],
): DialogEntry[] {
  const out: DialogEntry[] = [];
  let last = -Infinity;
  const walk = (list: DynNode[]) => {
    for (const n of list) {
      if (n.kind === "param") {
        last = app.parameterRefs.get(n.ref)?.displayOrder ?? last;
        out.push({ kind: "param", ref: n.ref, order: last });
      } else if (n.kind === "separator")
        out.push({ kind: "separator", id: n.id, text: n.text, order: last });
      else if (n.kind === "choose") walk(branch(app, values, n));
      else if (n.kind === "block" && n.inline) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/**
 * The pages of a program of ETS4 and later: a block is a page, the blocks in it are its
 * pages, a channel with a text groups its blocks, and a block without access is hidden.
 */
function nested(
  app: ApplicationProgram,
  values: ParameterValues,
  nodes: DynNode[],
  lang: string,
): DialogPage[] {
  const pages: DialogPage[] = [];
  for (const n of nodes) {
    if (n.kind === "channel") {
      const kids = nested(app, values, n.children, lang);
      const text = textOf(app, n.id, "Text", n.text, lang).trim();
      if (text && kids.length)
        pages.push({ id: n.id, label: text, entries: [], children: kids });
      else pages.push(...kids);
    } else if (n.kind === "choose")
      pages.push(...nested(app, values, branch(app, values, n), lang));
    else if (n.kind === "block" && n.inline)
      pages.push(...nested(app, values, n.children, lang));
    else if (n.kind === "block" && n.access !== "None")
      pages.push({
        id: n.id,
        label: titleOf(app, n, lang).trim() || n.name.trim(),
        entries: entriesOf(app, values, n.children),
        children: nested(app, values, n.children, lang),
      });
  }
  return pages;
}

/**
 * The pages of a program converted from ETS3 (PreEts4Style), as ETS shows them: a
 * parameter is on the page whose title comes last before it in the display order (not on
 * the block that holds it in the program), the pages are in the display order of their
 * titles, and the spaces a title starts with (in the language of the program) indent its
 * page below the one before it. A block without access is no page, its parameters are.
 */
function former(
  app: ApplicationProgram,
  values: ParameterValues,
  lang: string,
): DialogPage[] {
  const blocks: { n: Block; order: number; page: DialogPage }[] = [];
  const entries: DialogEntry[] = [];
  let last = -Infinity;
  const walk = (nodes: DynNode[]) => {
    for (const n of nodes) {
      if (n.kind === "channel") walk(n.children);
      else if (n.kind === "choose") walk(branch(app, values, n));
      else if (n.kind === "block") {
        // A hidden block is no page, but ETS shows the parameters in it that have an
        // access of their own, on the page of their display order.
        if (!n.inline && n.access !== "None")
          blocks.push({
            n,
            order: app.parameterRefs.get(n.paramRef)?.displayOrder ?? last,
            page: {
              id: n.id,
              label: titleOf(app, n, lang).trim() || n.name.trim(),
              entries: [],
              children: [],
            },
          });
        walk(n.children);
      } else if (n.kind === "param") {
        last = app.parameterRefs.get(n.ref)?.displayOrder ?? last;
        entries.push({ kind: "param", ref: n.ref, order: last });
      } else if (n.kind === "separator")
        entries.push({
          kind: "separator",
          id: n.id,
          text: n.text,
          order: last,
        });
    }
  };
  walk(app.dynamic);
  blocks.sort((a, b) => a.order - b.order);
  for (const e of entries) {
    let at = blocks[0];
    for (const b of blocks) if (b.order <= e.order) at = b;
    at?.page.entries.push(e);
  }
  const roots: DialogPage[] = [];
  const stack: { depth: number; page: DialogPage }[] = [];
  for (const b of blocks) {
    const depth = (/^ */.exec(titleOf(app, b.n, ""))?.[0].length ?? 0) / 2;
    while (stack.length && stack[stack.length - 1]!.depth >= depth) stack.pop();
    (stack[stack.length - 1]?.page.children ?? roots).push(b.page);
    stack.push({ depth, page: b.page });
  }
  return roots;
}

/** The pages of the dialog of a program with these values, titled in a language. */
export const dialogPages = (
  app: ApplicationProgram,
  values: ParameterValues,
  lang = "en",
): DialogPage[] =>
  app.preEts4Style
    ? former(app, values, lang)
    : nested(app, values, app.dynamic, lang);
