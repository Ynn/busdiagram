import type { Translate } from "../i18n";
import { en } from "../i18n";
// Validation of parameters and states reported by behaviours and equipment.
import type {
  JsonObject,
  JsonValue,
  ParamProperty,
  ParamSchema,
} from "./contracts";

export interface Problem {
  path: string;
  code: string;
  message: string;
}

const typeOf = (v: unknown): string =>
  v === null
    ? "null"
    : Array.isArray(v)
      ? "array"
      : typeof v === "number" && Number.isInteger(v)
        ? "integer"
        : typeof v;

function matchesType(p: ParamProperty, v: unknown): boolean {
  const types = Array.isArray(p.type) ? p.type : [p.type];
  const t = typeOf(v);
  return types.some(
    (x) =>
      x === t ||
      (x === "number" &&
        (t === "integer" || t === "number") &&
        Number.isFinite(v)),
  );
}

const typeName = (x: string, t: Translate) =>
  ({
    integer: t`integer`,
    number: t`number`,
    boolean: t`boolean`,
    string: t`text`,
    null: "null",
  })[x] ?? x;

/**
 * Validated `value` according to `schema` and returns a copy supplemented by default values.
 * Problems are added to `problems` with their JSON path.
 */
export function validateParams(
  schema: ParamSchema | undefined,
  value: unknown,
  path: string,
  problems: Problem[],
  t: Translate = en,
): JsonObject {
  const out: JsonObject = {};
  if (
    value !== undefined &&
    (typeof value !== "object" || value === null || Array.isArray(value))
  ) {
    problems.push({ path, code: "type", message: t`object expected` });
    return out;
  }
  const input = (value ?? {}) as Record<string, unknown>;
  const props = schema?.properties ?? {};
  for (const k of Object.keys(input)) {
    if (!Object.hasOwn(props, k))
      problems.push({
        path: `${path}.${k}`,
        code: "unknown-field",
        message: schema
          ? t`unknown parameter “${k}”`
          : t`unknown parameter “${k}” (this behavior has no parameters)`,
      });
  }
  for (const [k, p] of Object.entries(props)) {
    const v = input[k];
    const at = `${path}.${k}`;
    if (v === undefined) {
      if (schema?.required?.includes(k))
        problems.push({
          path: at,
          code: "required",
          message: t`required parameter`,
        });
      else if (p.default !== undefined) out[k] = p.default as JsonValue;
      continue;
    }
    if (!matchesType(p, v)) {
      const types = (Array.isArray(p.type) ? p.type : [p.type]).map((x) =>
        typeName(x, t),
      );
      problems.push({
        path: at,
        code: "type",
        message: t`${types.join(t` or `)} expected`,
      });
      continue;
    }
    if (typeof v === "number") {
      const bad =
        (p.minimum !== undefined && v < p.minimum) ||
        (p.maximum !== undefined && v > p.maximum) ||
        (p.exclusiveMinimum !== undefined && v <= p.exclusiveMinimum) ||
        (p.exclusiveMaximum !== undefined && v >= p.exclusiveMaximum);
      if (bad) {
        const range = [
          p.minimum !== undefined ? `≥ ${p.minimum}` : "",
          p.exclusiveMinimum !== undefined ? `> ${p.exclusiveMinimum}` : "",
          p.maximum !== undefined ? `≤ ${p.maximum}` : "",
          p.exclusiveMaximum !== undefined ? `< ${p.exclusiveMaximum}` : "",
        ]
          .filter(Boolean)
          .reduce((all, part) => (all ? t`${all} and ${part}` : part), "");
        problems.push({
          path: at,
          code: "range",
          message: t`value ${v} out of bounds (${range})`,
        });
        continue;
      }
    }
    if (p.enum && !p.enum.includes(v as never)) {
      problems.push({
        path: at,
        code: "enum",
        message: t`unknown value “${String(v)}” (${p.enum.join(", ")})`,
      });
      continue;
    }
    out[k] = v as JsonValue;
  }
  return out;
}
