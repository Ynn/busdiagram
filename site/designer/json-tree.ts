// Navigation in the JSON Syntactic Tree of CodeMirror (Lezer): path of a cursor,
// position of an error path such as "devices[0].objects[1].dpt".
import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";

export type Seg = string | number;

const VALUE = new Set([
  "Object",
  "Array",
  "String",
  "Number",
  "True",
  "False",
  "Null",
]);

/** « devices[0].objects[1].dpt » → ["devices", 0, "objects", 1, "dpt"]. */
export function parsePath(path: string): Seg[] {
  const out: Seg[] = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)))
    out.push(m[2] !== undefined ? Number(m[2]) : m[1]!);
  return out;
}

export const unquote = (state: EditorState, n: SyntaxNode) => {
  const t = state.sliceDoc(n.from, n.to);
  try {
    return JSON.parse(t) as string;
  } catch {
    return t.replace(/^"|"$/g, "");
  }
};

const children = (n: SyntaxNode) => {
  const out: SyntaxNode[] = [];
  for (let c = n.firstChild; c; c = c.nextSibling) out.push(c);
  return out;
};

export const propertyValue = (p: SyntaxNode) =>
  children(p).find((c) => VALUE.has(c.name)) ?? null;
const propertyName = (p: SyntaxNode) =>
  children(p).find((c) => c.name === "PropertyName") ?? null;

export function rootValue(state: EditorState): SyntaxNode | null {
  const top = syntaxTree(state).topNode;
  return children(top).find((c) => VALUE.has(c.name)) ?? null;
}

/** Node of value to the given path, or the nearest existing ancestor. */
export function nodeForPath(
  state: EditorState,
  segs: Seg[],
): { node: SyntaxNode; exact: boolean } | null {
  let node = rootValue(state);
  if (!node) return null;
  for (const seg of segs) {
    let next: SyntaxNode | null = null;
    if (node.name === "Object" && typeof seg === "string") {
      const prop: SyntaxNode | undefined = children(node).find((c) => {
        const n = c.name === "Property" ? propertyName(c) : null;
        return n && unquote(state, n) === seg;
      });
      next = prop ? (propertyValue(prop) ?? propertyName(prop)) : null;
    } else if (node.name === "Array" && typeof seg === "number") {
      next = children(node).filter((c) => VALUE.has(c.name))[seg] ?? null;
    }
    if (!next) return { node, exact: false };
    node = next;
  }
  return { node, exact: true };
}

export interface CursorContext {
  /** Path of the object (key mode) or of the value (value mode). */
  path: Seg[];
  mode: "key" | "value";
  /** Range to be replaced by completion. */
  from: number;
  to: number;
  /** Name of the property whose value is completed. */
  key?: string;
  /** Keys already present in the object (key mode). */
  existing: string[];
}

/** Path of a value node from the root. */
function pathOf(state: EditorState, n: SyntaxNode): Seg[] {
  const path: Seg[] = [];
  let cur: SyntaxNode | null = n;
  while (cur && cur.parent) {
    const p: SyntaxNode = cur.parent;
    if (p.name === "Property") {
      const name = propertyName(p);
      if (name && name !== cur) path.unshift(unquote(state, name));
      cur = p.parent;
      continue;
    }
    if (p.name === "Array") {
      // Lezer nodes are recreated at each access: the positions are compared.
      const at = cur.from;
      const idx = children(p)
        .filter((c) => VALUE.has(c.name) || c.name === "⚠")
        .findIndex((c) => c.from === at);
      path.unshift(Math.max(0, idx));
    }
    cur = p;
  }
  return path;
}

const keysOf = (state: EditorState, obj: SyntaxNode) =>
  children(obj).flatMap((c) => {
    const n = c.name === "Property" ? propertyName(c) : null;
    return n ? [unquote(state, n)] : [];
  });

export function cursorContext(
  state: EditorState,
  pos: number,
): CursorContext | null {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, -1);
  // Key being entered: "ab|"
  if (node.name === "PropertyName") {
    const obj = node.parent!.parent!;
    return {
      path: pathOf(state, obj),
      mode: "key",
      from: node.from,
      to: node.to,
      existing: keysOf(state, obj),
    };
  }
  // Value being entered or cursored immediately after ":"
  if (
    node.parent?.name === "Property" &&
    VALUE.has(node.name) &&
    node.name !== "Object" &&
    node.name !== "Array"
  ) {
    const prop = node.parent;
    const name = propertyName(prop);
    const obj = prop.parent!;
    return {
      path: [...pathOf(state, obj), name ? unquote(state, name) : ""],
      mode: "value",
      from: node.from,
      to: node.to,
      key: name ? unquote(state, name) : undefined,
      existing: [],
    };
  }
  if (
    node.name === "Property" ||
    (node.name === "⚠" && node.parent?.name === "Property")
  ) {
    const prop = node.name === "Property" ? node : node.parent!;
    const name = propertyName(prop);
    const colon = children(prop).find((c) => c.name === ":");
    if (colon && pos >= colon.to) {
      const obj = prop.parent!;
      const key = name ? unquote(state, name) : "";
      return {
        path: [...pathOf(state, obj), key],
        mode: "value",
        from: pos,
        to: pos,
        key,
        existing: [],
      };
    }
  }
  // List item being entered: ["1/1/1", "|"]
  if (node.name === "String" && node.parent?.name === "Array") {
    const arr = node.parent;
    const prop = arr.parent;
    const key =
      prop?.name === "Property" && propertyName(prop)
        ? unquote(state, propertyName(prop)!)
        : undefined;
    return {
      path: pathOf(state, node),
      mode: "value",
      from: node.from,
      to: node.to,
      key,
      existing: [],
    };
  }
  // Cursor in an object, between two properties
  while (node && node.name !== "Object" && node.name !== "Array")
    node = node.parent;
  if (node?.name === "Object") {
    const word =
      state
        .sliceDoc(Math.max(node.from, pos - 40), pos)
        .match(/[A-Za-z$_]*$/)?.[0] ?? "";
    return {
      path: pathOf(state, node),
      mode: "key",
      from: pos - word.length,
      to: pos,
      existing: keysOf(state, node),
    };
  }
  return null;
}
