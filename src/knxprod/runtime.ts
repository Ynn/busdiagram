// Memory of a manufacturer's device for a project, as ETS computes it from the product
// database: the parameters written into the program's segments, then the tables (group
// addresses, associations, group objects) written by the device's BCU profile. Used by
// the designer, which has the catalog; the simulation reads only the memory.
import type { ApplicationProgram } from "./application";
import type { ParameterValues } from "./config";
import {
  knownTime,
  objectOf,
  readParameters,
  segmentImages,
  valueProblem,
  visible,
  writeParameters,
} from "./config";
import { calculate } from "./calculation";
import type { CalculationProblem } from "./calculation";
import { profileOf, typeOctet } from "../bcu";
import type { TableContent } from "../bcu";

const gaWord = (s: string) => {
  const [a, b, c] = s.split("/").map(Number) as [number, number, number];
  return (a << 11) | (b << 8) | c;
};
const iaWord = (s: string) => {
  const [a, l, d] = s.split(".").map(Number) as [number, number, number];
  return (a << 12) | (l << 8) | d;
};
export const gaText = (w: number) =>
  `${(w >> 11) & 0x1f}/${(w >> 8) & 7}/${w & 0xff}`;

const PRIORITY: Record<string, "system" | "urgent" | "normal" | "low"> = {
  System: "system",
  Alert: "urgent",
  Urgent: "urgent",
  Normal: "normal",
  Low: "low",
};

/** A value of the project that its parameter does not take. */
export class ParameterValueError extends Error {
  constructor(
    readonly ref: string,
    readonly value: string,
    readonly problem:
      "unknown" | "choice" | "number" | "range" | "text" | "unit",
  ) {
    super(`${ref} = ${value}: ${problem}`);
  }
}

/**
 * The configuration a device runs with, whoever sets it (the ETS pages of the designer,
 * an imported project, the memory of a download): each value checked against its
 * parameter, then the hidden parameters that the program's calculations set.
 * `problems` says which calculations were not done.
 */
export function effectiveValues(
  app: ApplicationProgram,
  values: ParameterValues,
  problems: CalculationProblem[] = [],
): ParameterValues {
  for (const [ref, v] of Object.entries(values)) {
    const r = app.parameterRefs.get(ref);
    const p = r && app.parameters.get(r.ref);
    if (!p) throw new ParameterValueError(ref, v, "unknown");
    const type = app.types.get(p.type);
    const problem = valueProblem(type, v);
    if (problem) throw new ParameterValueError(ref, v, problem);
    // A time in memory in a unit the codec does not write: refused rather than lost.
    if (p.memory && type && !knownTime(type))
      throw new ParameterValueError(ref, v, "unit");
  }
  return calculate(app, values, problems);
}

/** Absolute address of a segment of the program. */
const segmentAddress = (app: ApplicationProgram, id: string) =>
  app.segments.get(id)?.address ?? 0;

/**
 * The memory a complete download leaves in the device: the program's segments with the
 * parameters of the project, and the tables for the group addresses of its objects.
 */
export function projectImage(
  app: ApplicationProgram,
  mask: string,
  values: ParameterValues,
  links: Map<number, string[]>,
  individualAddress: string,
): Uint8Array {
  const profile = profileOf(mask);
  if (!profile) throw new Error(`mask ${mask}: no BCU profile`);
  const mem = profile.factory();
  const images = segmentImages(app);
  values = effectiveValues(app, values);
  writeParameters(app, values, images);
  images.forEach((img, id) => {
    const at = segmentAddress(app, id);
    mem.set(img.subarray(0, Math.max(0, mem.length - at)), at);
  });
  const objects: TableContent["objects"] = new Map();
  for (const ref of visible(app, values).objects) {
    const o = objectOf(app, ref);
    if (!o) continue;
    objects.set(o.number, {
      C: o.flags.C,
      R: o.flags.R,
      W: o.flags.W,
      T: o.flags.T,
      U: o.flags.U,
      priority: PRIORITY[o.priority] ?? "low",
      type: typeOctet(o.size),
    });
  }
  const at = (t: ApplicationProgram["addressTable"]) =>
    t ? segmentAddress(app, t.segment) + t.offset : 0;
  profile.writeTables(
    mem,
    {
      individualAddress: iaWord(individualAddress),
      links: new Map(
        [...links]
          .filter(([n]) => objects.has(n))
          .map(([n, g]) => [n, g.map(gaWord)]),
      ),
      objects,
    },
    {
      associations: at(app.associationTable),
      objects: at(app.objectTable),
      maxAddresses: app.addressTable?.maxEntries,
      maxAssociations: app.associationTable?.maxEntries,
    },
  );
  profile.start?.(mem, {
    manufacturer: parseInt(/^M-([0-9A-F]{4})/i.exec(app.id)?.[1] ?? "0", 16),
    number: app.number,
    version: app.version,
  });
  return mem;
}

/** The parameter values a memory holds, read with the program. */
export function valuesOf(
  app: ApplicationProgram,
  memory: Uint8Array,
): ParameterValues {
  const images = new Map(
    [...app.segments.values()].map(
      (s) => [s.id, memory.subarray(s.address, s.address + s.size)] as const,
    ),
  );
  return readParameters(app, images);
}

/** Group addresses of the objects of a scenario device ("o<number>"). */
export function linksOf(
  objects: readonly { id: string; ga?: unknown }[],
): Map<number, string[]> {
  const out = new Map<number, string[]>();
  for (const o of objects) {
    const m = /^o(\d+)$/.exec(o.id);
    if (!m) continue;
    out.set(
      Number(m[1]),
      Array.isArray(o.ga)
        ? (o.ga as string[])
        : typeof o.ga === "string"
          ? [o.ga]
          : [],
    );
  }
  return out;
}
