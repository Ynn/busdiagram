// Autocomplete uses the v2 authoring schema and the scenario content
// (declared group addresses, device objects and channels, registered behaviors).
import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import type { Seg } from "./json-tree";
import { cursorContext } from "./json-tree";
import { t } from "./lang";

type Schema = Record<string, unknown>;
const isObj = (v: unknown): v is Schema =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export class SchemaNavigator {
  constructor(private readonly root: Schema) {}

  private deref(s: Schema): Schema {
    let cur = s;
    for (let i = 0; i < 10 && typeof cur.$ref === "string"; i++) {
      const name = (cur.$ref as string).replace("#/$defs/", "");
      cur = {
        ...(((this.root.$defs as Schema)[name] as Schema) ?? {}),
        ...Object.fromEntries(
          Object.entries(cur).filter(([k]) => k !== "$ref"),
        ),
      };
    }
    return cur;
  }

  /** Merge if/then clauses whose condition is verified by `value`. */
  private applyConditions(s: Schema, value: unknown): Schema {
    const all = Array.isArray(s.allOf) ? (s.allOf as Schema[]) : [];
    let out: Schema = {
      ...s,
      properties: { ...((s.properties as Schema) ?? {}) },
    };
    for (const c of all) {
      const cond = (c.if as Schema | undefined)?.properties as
        Schema | undefined;
      if (!cond || !isObj(value)) continue;
      const ok = Object.entries(cond).every(
        ([k, v]) => (v as Schema).const === (value as Schema)[k],
      );
      if (!ok) continue;
      const then = (c.then as Schema)?.properties as Schema | undefined;
      if (then)
        for (const [k, v] of Object.entries(then)) {
          const base = (out.properties as Schema)[k];
          (out.properties as Schema)[k] = isObj(base)
            ? this.mergeDeep(this.deref(base), v as Schema)
            : v;
        }
      out = { ...out };
    }
    return out;
  }

  private mergeDeep(a: Schema, b: Schema): Schema {
    const out: Schema = { ...a };
    for (const [k, v] of Object.entries(b)) {
      out[k] =
        isObj(v) && isObj(a[k])
          ? this.mergeDeep(this.deref(a[k] as Schema), v)
          : v;
    }
    return out;
  }

  /** Variant "object" of an anyOf (to descend into the structure). */
  private objectBranch(s: Schema): Schema {
    if (Array.isArray(s.anyOf)) {
      const o = (s.anyOf as Schema[])
        .map((x) => this.deref(x))
        .find((x) => x.type === "object" || x.properties || x.items);
      if (o) return o;
    }
    return s;
  }

  /** Schema at the given path; `doc` is used to evaluate conditions such as behavior and type. */
  at(path: Seg[], doc: unknown): Schema | null {
    let s: Schema = this.deref(this.root);
    let v: unknown = doc;
    s = this.applyConditions(s, v);
    for (const seg of path) {
      s = this.objectBranch(this.deref(s));
      if (typeof seg === "number") {
        if (!isObj(s.items)) return null;
        s = this.deref(s.items as Schema);
        v = Array.isArray(v) ? v[seg] : undefined;
      } else {
        const props = s.properties as Schema | undefined;
        if (!props || !isObj(props[seg])) return null;
        s = this.deref(props[seg] as Schema);
        v = isObj(v) ? v[seg] : undefined;
      }
      s = this.applyConditions(this.objectBranch(s) === s ? s : s, v);
    }
    return s;
  }

  /** Possible values (const, enum, booleans) from a schema. */
  values(s: Schema): unknown[] {
    const out: unknown[] = [];
    const visit = (x: Schema) => {
      x = this.deref(x);
      if ("const" in x) out.push(x.const);
      if (Array.isArray(x.enum)) out.push(...(x.enum as unknown[]));
      if (x.type === "boolean") out.push(true, false);
      if (Array.isArray(x.anyOf)) (x.anyOf as Schema[]).forEach(visit);
      if (Array.isArray(x.oneOf)) (x.oneOf as Schema[]).forEach(visit);
    };
    visit(s);
    return [...new Set(out)];
  }
}

const deviceOf = (
  path: Seg[],
  doc: unknown,
): Record<string, unknown> | null => {
  const i = path.indexOf("devices");
  const idx = path[i + 1];
  if (i < 0 || typeof idx !== "number") return null;
  const d = (doc as { devices?: unknown[] })?.devices?.[idx];
  return isObj(d) ? d : null;
};

const ids = (list: unknown) =>
  Array.isArray(list)
    ? list.flatMap((x) => (isObj(x) && typeof x.id === "string" ? [x.id] : []))
    : [];

/** Dynamic values from the scenario (cross-references). */
function dynamicValues(
  key: string | undefined,
  path: Seg[],
  doc: unknown,
): Completion[] {
  const dev = deviceOf(path, doc);
  const declared = (doc as { groupAddresses?: unknown })?.groupAddresses;
  const gas = (Array.isArray(declared) ? declared : []).flatMap((g) =>
    isObj(g) && typeof g.address === "string"
      ? [
          {
            label: JSON.stringify(g.address),
            detail: String(g.name ?? ""),
            type: "constant",
          },
        ]
      : [],
  );
  if (
    key === "ga" ||
    (path.includes("ga") && typeof path[path.length - 1] === "number")
  )
    return gas;
  if (key === "channel")
    return ids(dev?.channels).map((c) => ({
      label: JSON.stringify(c),
      detail: t`channel`,
      type: "variable",
    }));
  if (key === "object" || key === "led")
    return ids(dev?.objects).map((o) => ({
      label: JSON.stringify(o),
      detail: t`object`,
      type: "variable",
    }));
  return [];
}

export function scenarioCompletion(
  nav: SchemaNavigator,
  currentDoc: () => unknown,
) {
  return (ctx: CompletionContext): CompletionResult | null => {
    const c = cursorContext(ctx.state, ctx.pos);
    if (!c) return null;
    const doc = currentDoc();
    if (c.mode === "key") {
      const s = nav.at(c.path, doc);
      const props = (s?.properties as Record<string, Schema> | undefined) ?? {};
      const required = (s?.required as string[] | undefined) ?? [];
      const options: Completion[] = Object.entries(props)
        .filter(([k]) => !c.existing.includes(k) && k !== "$schema")
        .map(([k, p]) => ({
          label: k,
          apply: `"${k}": `,
          detail: required.includes(k) ? t`required` : undefined,
          info: typeof p.description === "string" ? p.description : undefined,
          type: "property",
          boost: required.includes(k) ? 1 : 0,
        }));
      if (!options.length) return null;
      return { from: c.from, to: c.to, options, validFor: /^"?[\w$]*"?$/ };
    }
    const s = nav.at(c.path, doc);
    const all: Completion[] = [
      ...dynamicValues(c.key, c.path, doc),
      ...(s
        ? nav.values(s).map((v) => ({
            label: JSON.stringify(v),
            type: "enum",
            info: typeof s.description === "string" ? s.description : undefined,
          }))
        : []),
    ];
    const text = ctx.state.sliceDoc(c.from, c.to);
    if (text.startsWith('"')) {
      // Cursor inside a string: complete the text between the quotes.
      const from = c.from + 1;
      const to = text.length > 1 && text.endsWith('"') ? c.to - 1 : c.to;
      const options = all
        .filter((o) => o.label.startsWith('"'))
        .map((o) => ({ ...o, label: JSON.parse(o.label) as string }));
      if (!options.length) return null;
      return { from, to, options, validFor: /^[^"]*$/ };
    }
    if (!all.length) return null;
    return { from: c.from, to: c.to, options: all, validFor: /^"?[^"]*"?$/ };
  };
}
