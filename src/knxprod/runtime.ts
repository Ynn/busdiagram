// Memory of a manufacturer's device for a project, as ETS computes it from the product
// database: the parameters written into the program's segments, then the tables (group
// addresses, associations, group objects) written by the device's BCU profile. Used by
// the designer, which has the catalog; the simulation reads only the memory.
import type { ApplicationProgram } from "./application";
import type { ParameterValues } from "./config";
import {
  objectOf,
  readParameters,
  segmentImages,
  visible,
  writeParameters,
} from "./config";
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
