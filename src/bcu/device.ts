// A manufacturer's device in the scenario: what it runs is what its memory holds. Its
// application (the group objects, their associations and flags) is read from the tables
// of the memory with its BCU profile, the objects of its firmware with this memory, and
// the names the project gives them. A memory whose application is not started runs nothing.
import { parseGA, parseIA } from "../knx/address";
import { gaText } from "../knx/cemi";
import type { JsonObject } from "../knx/contracts";
import type { Product } from "./product";
import { numberOf, objectId } from "./product";
import type { ObjectDescriptor } from "./profile";
import { bcuState, profileOf } from "./profile";

type Rec = Record<string, unknown>;

/**
 * Does a memory hold a started application that the product runs? A System 7 holds the
 * identifier of its program (manufacturer, type, version), which must be one of the
 * product's. A BCU1 holds at 104h the low octet of the program's manufacturer, which ETS
 * checks, then the type and version of its code image, which differ from the program's
 * number: only the manufacturer is compared.
 */
export function runsProduct(
  product: Product,
  mask: string,
  memory: Uint8Array,
) {
  const profile = profileOf(mask);
  if (!profile) return false;
  const id = profile.applicationId(
    bcuState(parseInt(mask, 16), memory, product),
  );
  if (!id) return false;
  const bcu1 = /^001/.test(mask);
  return product.programs.some((key) => {
    const m = /^M-([0-9A-F]{4})_A-([0-9A-F]{4})-([0-9A-F]{2})/i.exec(key);
    if (!m) return false;
    const manufacturer = parseInt(m[1]!, 16);
    if (bcu1) return (manufacturer & 0xff) === id.manufacturer;
    return (
      manufacturer === id.manufacturer &&
      parseInt(m[2]!, 16) === id.deviceType &&
      parseInt(m[3]!, 16) === id.version
    );
  });
}

/**
 * The application a memory holds, as the scenario writes it (behavior and objects), or
 * null when no application of the product is started in it (see runsProduct).
 */
export function heldApplication(
  product: Product,
  mask: string,
  memory: Uint8Array,
  projectObjects: readonly unknown[] = [],
): JsonObject | null {
  const profile = profileOf(mask);
  if (!profile) return null;
  const s = bcuState(parseInt(mask, 16), memory, product);
  if (!runsProduct(product, mask, memory)) return null;
  const tables = profile.tables(s);
  const named = new Map(
    projectObjects
      .filter((o): o is Rec => typeof o === "object" && o !== null)
      .map((o) => [o.id, o] as const),
  );
  const objects = product
    .objects(s.memory)
    .filter((o) => tables.objects.has(o.number))
    .map((o) => {
      const d = tables.objects.get(o.number)!;
      const id = objectId(o.number);
      const name = named.get(id)?.name;
      return {
        id,
        name:
          typeof name === "string" ? name : (o.name ?? `Object ${o.number}`),
        port: "object",
        ...(o.channel ? { channel: o.channel } : {}),
        dpt: o.dpt,
        ga: d.gas.map(gaText),
        flags: { C: d.C, R: d.R, W: d.W, T: d.T, U: d.U },
        // System priority is the management's: a group object of the scenario has the others.
        ...(d.priority === "system" ? {} : { priority: d.priority }),
      };
    });
  return { behavior: product.behavior, objects } as unknown as JsonObject;
}

/**
 * Do two memories hold the same parameters? Only the memory of the parameters counts:
 * the tables, the individual address, and the application code ETS writes are left out.
 */
export function sameParameters(product: Product, a: Uint8Array, b: Uint8Array) {
  return product.parameterMemory.every(([at, n]) => {
    for (let i = at; i < at + n; i++)
      if ((a[i] ?? 0) !== (b[i] ?? 0)) return false;
    return true;
  });
}

type Priority = ObjectDescriptor["priority"];

/**
 * The memory a complete download of the project writes: the image of the application
 * with the project's settings, its tables made from the group objects of the project
 * (their addresses, flags and priorities) and its individual address.
 */
export function projectMemory(
  mask: string,
  image: Uint8Array,
  objects: readonly unknown[],
  individualAddress: string,
): Uint8Array {
  const profile = profileOf(mask)!;
  const s = bcuState(parseInt(mask, 16), image);
  const loaded = profile.tables(s).objects;
  const links = new Map<number, number[]>();
  const descriptors = new Map<number, ObjectDescriptor>();
  for (const raw of objects) {
    if (typeof raw !== "object" || raw === null) continue;
    const o = raw as Rec;
    const n = typeof o.id === "string" ? numberOf(o.id) : null;
    const d = n === null ? undefined : loaded.get(n);
    if (n === null || !d) continue;
    const gas = (
      Array.isArray(o.ga) ? o.ga : typeof o.ga === "string" ? [o.ga] : []
    )
      .map((g) => (typeof g === "string" ? parseGA(g) : null))
      .filter((g): g is [number, number, number] => !!g)
      .map(([a, b, c]) => (a << 11) | (b << 8) | c);
    links.set(n, gas);
    const f = (
      typeof o.flags === "object" && o.flags !== null ? o.flags : {}
    ) as Rec;
    const flag = (k: "C" | "R" | "W" | "T" | "U") =>
      typeof f[k] === "boolean" ? (f[k] as boolean) : d[k];
    descriptors.set(n, {
      C: flag("C"),
      R: flag("R"),
      W: flag("W"),
      T: flag("T"),
      U: flag("U"),
      priority:
        typeof o.priority === "string" ? (o.priority as Priority) : d.priority,
      type: d.type,
    });
  }
  const ia = parseIA(individualAddress) ?? [15, 15, 255];
  const mem = s.memory;
  profile.writeTables(
    mem,
    {
      individualAddress: (ia[0] << 12) | (ia[1] << 8) | ia[2],
      links,
      objects: new Map(
        [...loaded].map(([n, d]) => [n, descriptors.get(n) ?? d]),
      ),
    },
    profile.tableLocations(mem),
  );
  return mem;
}
