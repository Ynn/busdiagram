// A memory read back: the configuration of the dialog that a device holds, as the project
// keeps it (its visible parameters), checked by what it writes again. The memory holds the
// values of its parameters; the reverse scripts of the calculations give some of the
// choices it does not hold (a function chosen for an output, a time in ms), but not always
// the one that was made (a script may return a default); other choices hold nothing at
// all (a box "extended settings"). These free choices are searched, among those that
// control the parameters the project would not write again as the memory holds them: the
// choices of the dialog above them, and the inputs of the calculations that set them.
// What no choice explains is said, with the address of its parameter, not taken as true.
import type { ApplicationProgram, Parameter } from "./application";
import type { CalculationProblem } from "./calculation";
import { calculate, uncalculate } from "./calculation";
import type { ParameterValues } from "./config";
import {
  readParameters,
  segmentImages,
  valueOf,
  valueProblem,
  visible,
  writeParameters,
} from "./config";
import type { DynNode } from "./application";

export interface ReadBack {
  /** The values of the dialog the project keeps: those that are not their default. */
  values: ParameterValues;
  /** The choices of these values that the memory does not hold: inferred. */
  inferred: string[];
  /**
   * The parameters at which these values write another memory (none when the memory is
   * explained): the reference, and its address.
   */
  unexplained: { ref: string; address: number }[];
  /** The calculations that could not run, in one direction or the other. */
  problems: CalculationProblem[];
}

/** What the read back needs of a program, built once. */
interface Plan {
  /** For each reference: the choices of the dialog above it. */
  controllers: Map<string, Set<string>>;
  /** For each reference: the inputs of the calculations that set it. */
  feeders: Map<string, Set<string>>;
  /** The parameters in memory, their references, and their union. */
  stored: { p: Parameter; refs: string[]; address: number }[];
  /** The free choices: no place in memory, set by no calculation, and their values. */
  choices: Map<string, string[]>;
  /** The values the default image of the segments holds (what is not written keeps). */
  delivered: ParameterValues;
}

const plans = new WeakMap<ApplicationProgram, Plan>();

/** The values a choice takes: those of an enumeration, or a small range of numbers. */
function valuesOfChoice(app: ApplicationProgram, ref: string): string[] | null {
  const p = app.parameters.get(app.parameterRefs.get(ref)?.ref ?? "");
  const t = p && app.types.get(p.type);
  if (!p || p.memory || !t) return null;
  if (t.kind === "enum" && t.enums?.length && t.enums.length <= 64)
    return t.enums.map((e) => String(e.value));
  if (t.kind === "number" && t.min !== undefined && t.max !== undefined)
    if (t.max - t.min <= 16)
      return Array.from({ length: t.max - t.min + 1 }, (_, i) =>
        String(t.min! + i),
      );
  return null;
}

function planOf(app: ApplicationProgram): Plan {
  const known = plans.get(app);
  if (known) return known;
  const controllers = new Map<string, Set<string>>();
  const walk = (nodes: readonly DynNode[], above: string[]) => {
    for (const n of nodes) {
      if (n.kind === "param") {
        const set = controllers.get(n.ref) ?? new Set<string>();
        above.forEach((r) => set.add(r));
        controllers.set(n.ref, set);
      } else if (n.kind === "choose")
        for (const w of n.whens) walk(w.children, [...above, n.ref]);
      else if (n.kind === "channel" || n.kind === "block")
        walk(n.children, above);
    }
  };
  walk(app.dynamic, []);
  const computed = new Set<string>();
  const feeders = new Map<string, Set<string>>();
  for (const c of app.calculations ?? [])
    for (const o of c.outputs) {
      computed.add(o.ref);
      const set = feeders.get(o.ref) ?? new Set<string>();
      c.inputs.forEach((i) => set.add(i.ref));
      feeders.set(o.ref, set);
    }
  const refsOf = new Map<string, string[]>();
  app.parameterRefs.forEach((r) =>
    refsOf.set(r.ref, [...(refsOf.get(r.ref) ?? []), r.id]),
  );
  const stored = [...app.parameters.values()].flatMap((p) => {
    const seg = p.memory && app.segments.get(p.memory.segment);
    const refs = refsOf.get(p.id) ?? [];
    return seg && refs.length
      ? [{ p, refs, address: seg.address + p.memory!.offset }]
      : [];
  });
  const choices = new Map<string, string[]>();
  for (const ref of app.parameterRefs.keys()) {
    if (computed.has(ref)) continue;
    const v = valuesOfChoice(app, ref);
    if (v && v.length > 1) choices.set(ref, v);
  }
  const delivered = readParameters(app, segmentImages(app));
  const plan = { controllers, feeders, stored, choices, delivered };
  plans.set(app, plan);
  return plan;
}

const defaultOf = (app: ApplicationProgram, ref: string) => {
  const r = app.parameterRefs.get(ref);
  return r?.value ?? app.parameters.get(r?.ref ?? "")?.value;
};

/** The values the project keeps of these: the visible ones that are not their default. */
function kept(app: ApplicationProgram, values: ParameterValues) {
  const out: ParameterValues = {};
  for (const ref of visible(app, values).parameters) {
    const v = values[ref];
    if (v !== undefined && v !== defaultOf(app, ref)) out[ref] = v;
  }
  return out;
}

/**
 * The parameters at which the project of these values writes another value than the
 * memory holds (as writeParameters writes them), and its values refused: a weight of their
 * number, the refused ones counting most.
 */
function fault(
  app: ApplicationProgram,
  plan: Plan,
  read: ParameterValues,
  values: ParameterValues,
) {
  const project = kept(app, values);
  // A value its parameter refuses (the octets of another member of its union): what
  // shows it is searched too.
  const refused = refusedOf(app, project);
  const problems: CalculationProblem[] = [];
  const eff = calculate(app, project, problems);
  const shown = new Set(visible(app, eff).parameters);
  const wrong: string[] = [...refused];
  // The members of each union, visible or not; a union none of whose members is visible
  // writes its default member, or nothing (its octets keep the default image).
  const unions = new Map<
    string,
    { refs: string[]; ref?: string; on: boolean }[]
  >();
  for (const { p, refs } of plan.stored) {
    const ref = refs.find((r) => shown.has(r));
    if (p.union) {
      const list = unions.get(p.union) ?? [];
      list.push({ refs, ref, on: p.defaultUnion });
      unions.set(p.union, list);
      continue;
    }
    const at = ref ?? refs[0]!;
    if (valueOf(app, eff, at) !== read[at]) wrong.push(at);
  }
  for (const members of unions.values()) {
    const on = members.filter((m) => m.ref);
    if (on.length) {
      for (const m of on)
        if (valueOf(app, eff, m.ref!) !== read[m.ref!]) wrong.push(m.ref!);
      continue;
    }
    const first = members.find((m) => m.on);
    if (first) {
      const at = first.refs[0]!;
      if (valueOf(app, eff, at) !== read[at]) wrong.push(at);
      continue;
    }
    // Nothing written: the memory must hold the default image there; else one of the
    // members holds it, and what shows it is searched.
    const at = members[0]!.refs[0]!;
    if (read[at] !== plan.delivered[at])
      for (const m of members) wrong.push(...m.refs);
  }
  return {
    weight: wrong.length + 1000 * refused.length + 100 * problems.length,
    wrong,
  };
}

/** The references of these values that their parameter refuses. */
function refusedOf(app: ApplicationProgram, values: ParameterValues) {
  return Object.entries(values).flatMap(([ref, v]) => {
    const p = app.parameters.get(app.parameterRefs.get(ref)?.ref ?? "");
    return p && valueProblem(app.types.get(p.type), v) ? [ref] : [];
  });
}

/** The configuration of the dialog that a memory holds, checked by what it writes again. */
export function readBack(
  app: ApplicationProgram,
  memory: Uint8Array,
  options: { budget?: number } = {},
): ReadBack {
  const plan = planOf(app);
  const images = new Map(
    [...app.segments.values()].map(
      (s) => [s.id, memory.subarray(s.address, s.address + s.size)] as const,
    ),
  );
  const read = readParameters(app, images);
  const problems: CalculationProblem[] = [];
  let values = uncalculate(app, read, problems);
  let now = fault(app, plan, read, values);
  // The free choices that control what is not explained, tried one at a time, the best
  // kept: a bounded number of trials (each writes the configuration once).
  let trials = options.budget ?? 400;
  const tried = new Set<string>();
  while (now.weight > 0 && trials > 0) {
    const candidates = new Set<string>();
    for (const ref of now.wrong) {
      plan.controllers.get(ref)?.forEach((r) => candidates.add(r));
      plan.feeders.get(ref)?.forEach((r) => candidates.add(r));
    }
    let best: {
      values: ParameterValues;
      weight: number;
      wrong: string[];
    } | null = null;
    for (const ref of candidates) {
      const choices = plan.choices.get(ref);
      if (!choices) continue;
      const current = valueOf(app, values, ref);
      for (const v of choices) {
        if (v === current || tried.has(`${ref}=${v}`) || trials <= 0) continue;
        trials--;
        const next = { ...values, [ref]: v };
        const f = fault(app, plan, read, next);
        if (f.weight < (best?.weight ?? now.weight))
          best = { values: next, ...f };
      }
    }
    if (!best) break;
    // A choice kept is not tried again with the value it had.
    for (const ref of candidates) {
      const v = valueOf(app, values, ref);
      if (v !== undefined) tried.add(`${ref}=${v}`);
    }
    values = best.values;
    now = { weight: best.weight, wrong: best.wrong };
  }
  const project = kept(app, values);
  // A value still refused is not kept (the project could not be written again): said.
  const refused = refusedOf(app, project);
  for (const ref of refused) delete project[ref];
  // The problems of the reverse scripts at the parameters the project shows (those of
  // the parameters of a function not chosen, invisible, are of no matter).
  const seen = new Set(visible(app, project).parameters);
  const reported = problems.filter((p) => !p.ref || seen.has(p.ref));
  problems.length = 0;
  problems.push(...reported);
  // What is not explained, from the image the project writes (the search judges without
  // it): the parameters at which it differs from the memory.
  const again = segmentImages(app);
  writeParameters(app, calculate(app, project, problems), again);
  const unexplained = plan.stored.flatMap(({ refs, address }) =>
    refs.some((r) => refused.includes(r)) ||
    memoryDiffers(app, images, again, refs)
      ? [{ ref: refs[0]!, address }]
      : [],
  );
  return {
    values: project,
    inferred: Object.keys(project).filter(
      (r) => !app.parameters.get(app.parameterRefs.get(r)?.ref ?? "")?.memory,
    ),
    unexplained,
    problems,
  };
}

/** Do the octets of a parameter differ between the memory and the image written again? */
function memoryDiffers(
  app: ApplicationProgram,
  memory: Map<string, Uint8Array>,
  again: Map<string, Uint8Array>,
  refs: string[],
) {
  const p = app.parameters.get(app.parameterRefs.get(refs[0]!)?.ref ?? "");
  if (!p?.memory) return false;
  const a = memory.get(p.memory.segment);
  const b = again.get(p.memory.segment);
  if (!a || !b) return false;
  const bits = p.memory.bitOffset + (app.types.get(p.type)?.sizeInBit ?? 0);
  const n = Math.ceil(bits / 8) || 1;
  for (let i = 0; i < n; i++)
    if (a[p.memory.offset + i] !== b[p.memory.offset + i]) return true;
  return false;
}
