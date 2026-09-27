// Differential test: structural changes generated from the author scheme.
// For each field of v2 scenarios: absent, null, "", bad type. The schema (AJV) and the
// engine validator must render the same verdict; an engine refusal must be located.
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import { captureRegistry } from "../../src/knx/registry";
import { ScenarioError, buildScenario } from "../../src/knx/scenario";
import { buildAuthorSchema } from "../../src/knx/schema";
import { activeScenarios, raw } from "./helpers";

type S = Record<string, unknown>;
const registry = captureRegistry();
const schema = buildAuthorSchema(registry) as S;
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const defs = schema.$defs as Record<string, S>;

const deref = (s: S): S =>
  typeof s.$ref === "string" ? deref(defs[s.$ref.replace("#/$defs/", "")]!) : s;
const objectBranch = (s: S): S | null => {
  s = deref(s);
  if (s.properties) return s;
  if (Array.isArray(s.anyOf))
    for (const x of s.anyOf as S[]) if (deref(x).properties) return deref(x);
  return null;
};

type Path = (string | number)[];
const INHERITED = ['"toString"', '"constructor"', '"__proto__"'];
interface Mutation {
  label: string;
  path: Path;
  apply(doc: S): void;
}

const at = (doc: unknown, path: Path) =>
  path.reduce<unknown>((v, k) => (v as S)?.[k as string], doc);
const pathText = (p: Path) =>
  p.reduce<string>(
    (a, k) => (typeof k === "number" ? `${a}[${k}]` : a ? `${a}.${k}` : k),
    "",
  );

function wrongTypeFor(s: S): unknown[] {
  s = deref(s);
  const t = s.type;
  const out: unknown[] = [];
  const types = new Set(Array.isArray(t) ? t : t ? [t] : []);
  if ("const" in s || s.enum || s.oneOf) out.push(123456);
  if (types.has("string")) out.push(42);
  if (types.has("number") || types.has("integer")) out.push("x");
  if (types.has("boolean")) out.push("oui");
  if (types.has("array")) out.push({});
  if (types.has("object")) out.push([]);
  return out;
}

/** Mutate each field present in `value` and described by `s`. */
function collect(value: unknown, s: S, path: Path, out: Mutation[]) {
  const obj = objectBranch(s);
  if (obj && value && typeof value === "object" && !Array.isArray(value)) {
    const props = obj.properties as Record<string, S>;
    const required = (obj.required as string[] | undefined) ?? [];
    for (const [k, ps] of Object.entries(props)) {
      const here = [...path, k];
      const v = (value as S)[k];
      if (v === undefined) continue;
      if (required.includes(k)) {
        out.push({
          label: "absent",
          path: here,
          apply: (d) => delete (at(d, path) as S)[k],
        });
        out.push({
          label: "null",
          path: here,
          apply: (d) => ((at(d, path) as S)[k] = null),
        });
      }
      if (
        typeof v === "string" &&
        (deref(ps).minLength ||
          deref(ps).pattern ||
          deref(ps).oneOf ||
          deref(ps).enum ||
          deref(ps).anyOf)
      )
        [
          "",
          // Inherited Object.prototype names are never treated as definitions.
          "toString",
          "constructor",
          "__proto__",
        ].forEach((x) =>
          out.push({
            label: JSON.stringify(x),
            path: here,
            apply: (d) => ((at(d, path) as S)[k] = x),
          }),
        );
      for (const w of wrongTypeFor(ps))
        out.push({
          label: `type ${JSON.stringify(w)}`,
          path: here,
          apply: (d) => ((at(d, path) as S)[k] = w),
        });
      collect(v, ps, here, out);
    }
    return;
  }
  const d = deref(s);
  if (Array.isArray(value) && d.items)
    value.forEach((x, i) => collect(x, d.items as S, [...path, i], out));
}

const v2Files = activeScenarios().filter(
  (f) => (raw(f) as { formatVersion?: number }).formatVersion === 2,
);

describe("schema and engine render the same verdict", () => {
  it.each(v2Files)("%s: structural mutations", (f) => {
    const doc = raw(f) as S;
    const muts: Mutation[] = [];
    collect(doc, schema, [], muts);
    expect(muts.length).toBeGreaterThan(50);
    const mismatches: string[] = [];
    for (const m of muts) {
      const copy = structuredClone(doc);
      m.apply(copy);
      const schemaOk = validate(copy) as boolean;
      let engineOk = true;
      let paths: string[] = [];
      try {
        buildScenario(copy, registry);
      } catch (e) {
        if (!(e instanceof ScenarioError)) {
          mismatches.push(
            `${pathText(m.path)} ${m.label} : uncaught exception ${(e as Error).message}`,
          );
          continue;
        }
        engineOk = false;
        paths = e.details.map((p) => p.path);
      }
      // An inherited name changes a cross-reference invisible to the schema; require
      // a scenario error (above), never an uncaught exception.
      if (INHERITED.includes(m.label)) continue;
      if (schemaOk !== engineOk) {
        mismatches.push(
          `${pathText(m.path)} ${m.label} : schema ${schemaOk ? "accepts" : "rejects"}, engine ${engineOk ? "accepts" : "rejects"}`,
        );
        continue;
      }
      // An engine rejection identifies the mutated field or its containing object.
      const target = pathText(m.path);
      const parent = pathText(m.path.slice(0, -1));
      if (
        !engineOk &&
        !paths.some(
          (p) =>
            p === target ||
            p.startsWith(`${target}.`) ||
            p.startsWith(`${target}[`) ||
            p === parent ||
            (parent && p.startsWith(parent)),
        )
      )
        mismatches.push(
          `${target} ${m.label} : error points to the wrong field (${paths.join(", ")})`,
        );
    }
    expect(mismatches).toEqual([]);
  });
});
