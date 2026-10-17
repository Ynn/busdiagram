// Parameter calculations of a program (ParameterCalculation, knx_xml schema): ETS sets
// hidden parameters from those of the dialog with a small script, its LRTransformation
// (the type of a channel from the choice of its function, a time in 100 ms from one in
// ms…). The script is not run as JavaScript: it is read with the subset that programs
// use — assignments (separated by new lines, commas or semicolons), if / else if / else
// with or without braces, comparisons, && || !, + − * / %, parentheses, numbers, texts
// and the length of a text. Anything else refuses the calculation, which then sets
// nothing.
import type { ApplicationProgram } from "./application";
import type { ParameterValues } from "./config";
import { valueOf } from "./config";

/** A calculation: the parameters it reads (L) and sets (R), by their alias. */
export interface ParameterCalculation {
  id: string;
  /** Script that sets the R parameters from the L ones. */
  script: string;
  inputs: { ref: string; alias: string }[];
  outputs: { ref: string; alias: string }[];
}

type Value = number | string | boolean;

export class CalculationError extends Error {}

const TOKEN =
  /\s*(?:(\d+(?:\.\d+)?)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|([A-Za-z_$][\w$]*)|(===|!==|==|!=|<=|>=|&&|\|\||[-+*/%<>!=(){},;.]))/y;

function tokens(src: string): string[] {
  const out: string[] = [];
  TOKEN.lastIndex = 0;
  for (;;) {
    const at = TOKEN.lastIndex;
    if (/^\s*$/.test(src.slice(at))) break;
    const m = TOKEN.exec(src);
    if (!m)
      throw new CalculationError(
        `unexpected “${src.slice(at).trim().slice(0, 12)}”`,
      );
    out.push(m[1] ?? m[2] ?? m[3] ?? m[4]!);
  }
  return out;
}

/** Run a script with its variables; the variables after it. */
export function runScript(
  script: string,
  vars: Record<string, Value>,
): Record<string, Value> {
  const t = tokens(script);
  let i = 0;
  const env = { ...vars };
  // Inside a branch not taken: read, not run (its variables may not be set).
  let skipped = 0;
  const peek = () => t[i];
  const next = () => {
    if (i >= t.length) throw new CalculationError("unexpected end");
    return t[i++]!;
  };
  const expect = (s: string) => {
    if (next() !== s) throw new CalculationError(`“${s}” expected`);
  };

  // Expressions, by precedence.
  const binary =
    (
      ops: readonly string[],
      sub: () => Value,
      f: (op: string, a: Value, b: Value) => Value,
    ) =>
    (): Value => {
      let a = sub();
      while (ops.includes(peek() ?? "")) {
        const op = next();
        a = f(op, a, sub());
      }
      return a;
    };
  const num = (v: Value) => (typeof v === "string" ? Number(v) : Number(v));
  const primary = (): Value => {
    const s = next();
    let v: Value;
    if (s === "(") {
      v = or();
      expect(")");
    } else if (/^\d/.test(s)) v = Number(s);
    else if (/^['"]/.test(s)) v = s.slice(1, -1).replace(/\\(.)/g, "$1");
    else if (s === "true" || s === "false") v = s === "true";
    else if (/^[A-Za-z_$]/.test(s)) {
      if (s in env) v = env[s]!;
      else if (skipped) v = 0;
      else throw new CalculationError(`unknown “${s}”`);
    } else throw new CalculationError(`unexpected “${s}”`);
    while (peek() === ".") {
      next();
      if (next() !== "length") throw new CalculationError("only .length");
      v = String(v).length;
    }
    return v;
  };
  const unary = (): Value => {
    if (peek() === "!") return (next(), !truthy(unary()));
    if (peek() === "-") return (next(), -num(unary()));
    if (peek() === "+") return (next(), num(unary()));
    return primary();
  };
  const truthy = (v: Value) => (typeof v === "string" ? v !== "" : !!v);
  const mul = binary(["*", "/", "%"], unary, (op, a, b) =>
    op === "*"
      ? num(a) * num(b)
      : op === "/"
        ? num(a) / num(b)
        : num(a) % num(b),
  );
  const add = binary(["+", "-"], mul, (op, a, b) =>
    op === "-"
      ? num(a) - num(b)
      : typeof a === "string" || typeof b === "string"
        ? String(a) + String(b)
        : num(a) + num(b),
  );
  const rel = binary(["<", "<=", ">", ">="], add, (op, a, b) => {
    const [x, y] =
      typeof a === "string" && typeof b === "string"
        ? [a, b]
        : [num(a), num(b)];
    return op === "<"
      ? x < y
      : op === "<="
        ? x <= y
        : op === ">"
          ? x > y
          : x >= y;
  });
  // == compares as JavaScript does a text and a number: as numbers.
  const same = (a: Value, b: Value) =>
    typeof a === typeof b ? a === b : num(a) === num(b);
  const eq = binary(["==", "!=", "===", "!=="], rel, (op, a, b) =>
    op === "==="
      ? a === b
      : op === "!=="
        ? a !== b
        : op === "=="
          ? same(a, b)
          : !same(a, b),
  );
  const and = binary(["&&"], eq, (_, a, b) => truthy(a) && truthy(b));
  const or: () => Value = binary(
    ["||"],
    and,
    (_, a, b) => truthy(a) || truthy(b),
  );

  // Statements.
  const assignment = (run: boolean) => {
    const name = next();
    if (!/^[A-Za-z_$]/.test(name))
      throw new CalculationError(`unexpected “${name}”`);
    expect("=");
    const v = or();
    if (run) env[name] = v;
  };
  const block = (run: boolean) => {
    if (!run) skipped++;
    if (peek() !== "{") statement(run);
    else {
      next();
      while (peek() !== "}") statement(run);
      next();
    }
    if (!run) skipped--;
  };
  const statement = (run: boolean): void => {
    if (peek() === ";") return void next();
    if (peek() === "if") {
      next();
      expect("(");
      const c = truthy(or());
      expect(")");
      block(run && c);
      if (peek() === "else") {
        next();
        block(run && !c);
      }
      return;
    }
    assignment(run);
    while (peek() === ",") {
      next();
      assignment(run);
    }
  };
  while (i < t.length) statement(true);
  return env;
}

/** The value of a parameter as its script sees it: a number, or its text. */
function scriptValue(
  app: ApplicationProgram,
  values: ParameterValues,
  ref: string,
): Value {
  const v = valueOf(app, values, ref);
  const p = app.parameters.get(app.parameterRefs.get(ref)?.ref ?? "");
  const kind = p && app.types.get(p.type)?.kind;
  return kind === "text" || v === "" || !Number.isFinite(Number(v))
    ? v
    : Number(v);
}

/**
 * The values with what the calculations of the program set, run in their order until
 * none changes anything; a calculation that cannot be read sets nothing.
 */
export function calculate(
  app: ApplicationProgram,
  values: ParameterValues,
): ParameterValues {
  const out = { ...values };
  const calcs = app.calculations ?? [];
  for (let pass = 0; pass <= calcs.length; pass++) {
    let changed = false;
    for (const c of calcs) {
      let env: Record<string, Value>;
      try {
        env = runScript(
          c.script,
          Object.fromEntries(
            c.inputs.map((x) => [x.alias, scriptValue(app, out, x.ref)]),
          ),
        );
      } catch (e) {
        if (e instanceof CalculationError) continue;
        throw e;
      }
      for (const o of c.outputs) {
        if (!(o.alias in env)) continue;
        const v = env[o.alias]!;
        if (typeof v === "number" && !Number.isFinite(v)) continue;
        const text =
          typeof v === "number"
            ? String(Math.round(v))
            : typeof v === "boolean"
              ? v
                ? "1"
                : "0"
              : v;
        if (valueOf(app, out, o.ref) === text) continue;
        out[o.ref] = text;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return out;
}
