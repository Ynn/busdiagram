// Parameter calculations of a program (ParameterCalculation, knx_xml schema): ETS sets
// hidden parameters from those of the dialog with a small script, its LRTransformation
// (the type of a channel from the choice of its function, a time in 100 ms from one in
// ms…). The script is not run as JavaScript: it is read with the subset that programs
// use, with the precedence of JavaScript —
// - statements: assignments (var, let and const declare), separated by new lines,
//   commas or semicolons; if / else if / else, with or without braces;
// - expressions: numbers, texts and their length, true and false, parentheses, ! - +,
//   * / %, + -, < <= > >=, == != === !==, & ^ |, && || (the right operand read, not
//   evaluated, when the left one decides), the conditional ? : (only its branch taken).
// Anything else refuses the calculation, which then sets nothing and says why.
import type { ApplicationProgram } from "./application";
import type { ParameterValues } from "./config";
import { valueOf, valueProblem } from "./config";

/** A calculation: the parameters it reads (L) and sets (R), by their alias. */
export interface ParameterCalculation {
  id: string;
  /** Script that sets the R parameters from the L ones. */
  script: string;
  /**
   * Script that sets the L parameters from the R ones (RLTransformation): the values of
   * the dialog that the memory does not hold, read back from those it does.
   */
  reverse?: string;
  inputs: { ref: string; alias: string }[];
  outputs: { ref: string; alias: string }[];
}

type Value = number | string | boolean;

export class CalculationError extends Error {}

/** A calculation that set nothing, or a value it could not set, and why. */
export interface CalculationProblem {
  calculation: string;
  /** The parameter reference it was to set, when the problem is its value. */
  ref?: string;
  message: string;
}

const TOKEN =
  /\s*(?:(\d+(?:\.\d+)?)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|([A-Za-z_$][\w$]*)|(===|!==|==|!=|<=|>=|&&|\|\||[-+*/%<>!=(){},;.?:&|^]))/y;

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

const DECLARE = new Set(["var", "let", "const"]);
const KEYWORDS = new Set(["if", "else", "true", "false", ...DECLARE]);

/** Run a script with its variables; the variables after it. */
export function runScript(
  script: string,
  vars: Record<string, Value>,
): Record<string, Value> {
  const t = tokens(script);
  let i = 0;
  const env = { ...vars };
  // Inside what is read but not run (a branch not taken, the right operand of a decided
  // && or ||): variables may be unset, and nothing is assigned.
  let skipped = 0;
  const peek = () => t[i];
  const next = () => {
    if (i >= t.length) throw new CalculationError("unexpected end");
    return t[i++]!;
  };
  const expect = (s: string) => {
    if (next() !== s) throw new CalculationError(`“${s}” expected`);
  };
  /** Read `f` without running it. */
  const skip = <T>(f: () => T): T => {
    skipped++;
    try {
      return f();
    } finally {
      skipped--;
    }
  };
  const num = (v: Value) => Number(v);
  const truthy = (v: Value) => (typeof v === "string" ? v !== "" : !!v);
  const int32 = (v: Value) => num(v) | 0;

  const primary = (): Value => {
    const s = next();
    let v: Value;
    if (s === "(") {
      v = expression();
      expect(")");
    } else if (/^\d/.test(s)) v = Number(s);
    else if (/^['"]/.test(s)) v = s.slice(1, -1).replace(/\\(.)/g, "$1");
    else if (s === "true" || s === "false") v = s === "true";
    else if (/^[A-Za-z_$]/.test(s) && !KEYWORDS.has(s)) {
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
  /** A left-associative level of binary operators. */
  const level =
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
  const mul = level(["*", "/", "%"], unary, (op, a, b) =>
    op === "*"
      ? num(a) * num(b)
      : op === "/"
        ? num(a) / num(b)
        : num(a) % num(b),
  );
  const add = level(["+", "-"], mul, (op, a, b) =>
    op === "-"
      ? num(a) - num(b)
      : typeof a === "string" || typeof b === "string"
        ? String(a) + String(b)
        : num(a) + num(b),
  );
  const rel = level(["<", "<=", ">", ">="], add, (op, a, b) => {
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
  const eq = level(["==", "!=", "===", "!=="], rel, (op, a, b) =>
    op === "==="
      ? a === b
      : op === "!=="
        ? a !== b
        : op === "=="
          ? same(a, b)
          : !same(a, b),
  );
  const band = level(["&"], eq, (_, a, b) => int32(a) & int32(b));
  const bxor = level(["^"], band, (_, a, b) => int32(a) ^ int32(b));
  const bor = level(["|"], bxor, (_, a, b) => int32(a) | int32(b));
  // && and ||: the value of the operand that decides, the other read only.
  const and = (): Value => {
    let a = bor();
    while (peek() === "&&") {
      next();
      if (truthy(a)) a = bor();
      else skip(bor);
    }
    return a;
  };
  const or = (): Value => {
    let a = and();
    while (peek() === "||") {
      next();
      if (truthy(a)) skip(and);
      else a = and();
    }
    return a;
  };
  const expression = (): Value => {
    const c = or();
    if (peek() !== "?") return c;
    next();
    let v: Value;
    if (truthy(c)) {
      v = expression();
      expect(":");
      skip(expression);
    } else {
      skip(expression);
      expect(":");
      v = expression();
    }
    return v;
  };

  // Statements.
  const assignment = (run: boolean) => {
    if (DECLARE.has(peek() ?? "")) next();
    const name = next();
    if (!/^[A-Za-z_$]/.test(name) || KEYWORDS.has(name))
      throw new CalculationError(`unexpected “${name}”`);
    expect("=");
    const v = run ? expression() : skip(expression);
    if (run) env[name] = v;
  };
  const block = (run: boolean) => {
    const read = () => {
      if (peek() !== "{") statement(run);
      else {
        next();
        while (peek() !== "}") statement(run);
        next();
      }
    };
    if (run) read();
    else skip(read);
  };
  const statement = (run: boolean): void => {
    if (peek() === ";") return void next();
    if (peek() === "if") {
      next();
      expect("(");
      const c = run ? truthy(expression()) : (skip(expression), false);
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
    // The semicolon that ends it, before an else too.
    if (peek() === ";") next();
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

/** The text of a value calculated for a parameter, as its type keeps it, or why not. */
function outputText(
  app: ApplicationProgram,
  ref: string,
  v: Value,
): { text: string } | { problem: string } {
  const p = app.parameters.get(app.parameterRefs.get(ref)?.ref ?? "");
  if (!p) return { problem: `no parameter ${ref}` };
  const type = app.types.get(p.type);
  if (typeof v === "number" && !Number.isFinite(v))
    return { problem: `${v} for ${ref}` };
  // A number for an integer (or a choice): rounded, as a division gives it; a float
  // keeps its digits.
  const text =
    typeof v === "boolean"
      ? v
        ? "1"
        : "0"
      : typeof v === "number"
        ? type?.kind === "float"
          ? String(v)
          : String(Math.round(v))
        : v;
  const problem = valueProblem(type, text);
  return problem ? { problem: `${text} is not a value of ${ref}` } : { text };
}

/**
 * The values with what the calculations of the program set, run in their order until
 * none changes anything. A calculation that cannot be read, or whose value does not fit
 * its parameter, sets nothing: `problems` says which and why, as it does for
 * calculations that do not settle.
 */
export function calculate(
  app: ApplicationProgram,
  values: ParameterValues,
  problems: CalculationProblem[] = [],
): ParameterValues {
  const out = { ...values };
  const calcs = app.calculations ?? [];
  const found = new Map<string, CalculationProblem>();
  let settled = false;
  for (let pass = 0; pass <= calcs.length && !settled; pass++) {
    settled = true;
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
        if (!(e instanceof CalculationError)) throw e;
        found.set(c.id, { calculation: c.id, message: e.message });
        continue;
      }
      // All its outputs or none: a calculation whose one output its parameter does not
      // take sets none of the others, which would not agree with it.
      const texts: [string, string][] = [];
      let refused = false;
      for (const o of c.outputs) {
        if (!(o.alias in env)) continue;
        const r = outputText(app, o.ref, env[o.alias]!);
        if ("problem" in r) {
          found.set(`${c.id}|${o.ref}`, {
            calculation: c.id,
            ref: o.ref,
            message: r.problem,
          });
          refused = true;
        } else texts.push([o.ref, r.text]);
      }
      if (refused) continue;
      for (const [ref, text] of texts) {
        if (valueOf(app, out, ref) === text) continue;
        out[ref] = text;
        settled = false;
      }
    }
  }
  if (!settled && calcs.length)
    found.set("", {
      calculation: calcs.map((c) => c.id).join(", "),
      message: "the calculations do not settle",
    });
  problems.push(...found.values());
  return out;
}

/**
 * The values of the dialog that the memory does not hold, as the reverse scripts of the
 * calculations give them from the values it does (a download read back): run once, in
 * their order, as ETS does; a parameter kept in memory keeps the value read there.
 */
export function uncalculate(
  app: ApplicationProgram,
  values: ParameterValues,
  problems: CalculationProblem[] = [],
): ParameterValues {
  const out = { ...values };
  for (const c of app.calculations ?? []) {
    if (!c.reverse) continue;
    let env: Record<string, Value>;
    try {
      env = runScript(
        c.reverse,
        Object.fromEntries(
          [...c.inputs, ...c.outputs].map((x) => [
            x.alias,
            scriptValue(app, out, x.ref),
          ]),
        ),
      );
    } catch (e) {
      if (!(e instanceof CalculationError)) throw e;
      problems.push({ calculation: c.id, message: e.message });
      continue;
    }
    // All its inputs or none, as in the other direction.
    const texts: [string, string][] = [];
    let refused = false;
    for (const i of c.inputs) {
      const p = app.parameters.get(app.parameterRefs.get(i.ref)?.ref ?? "");
      if (!p || p.memory || !(i.alias in env)) continue;
      const r = outputText(app, i.ref, env[i.alias]!);
      if ("problem" in r) {
        problems.push({ calculation: c.id, ref: i.ref, message: r.problem });
        refused = true;
      } else texts.push([i.ref, r.text]);
    }
    if (!refused) for (const [ref, text] of texts) out[ref] = text;
  }
  return out;
}
