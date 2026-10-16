// Product database of a manufacturer's device, as a product of the simulation carries it:
// the part of its application program that ETS shows and that its parameters and tables
// occupy — parameter types, parameters and their place in memory, the parameter dialog
// (Dynamic), the group objects, the tables, the identification and system part of the
// memory, and the translations. It is plain JSON (generated from the product catalog
// with `npm run product -- <catalog.knxprod> <program> <file.json>`) and is turned back
// into the application program that the designer's pages and the project image use. The
// application code of the manufacturer is not part of it.
import type {
  ApplicationProgram,
  ComObject,
  ComObjectRef,
  DynNode,
  Parameter,
  ParameterRef,
  ParameterType,
  TableLocation,
} from "./application";
import { openCatalog } from "./catalog";
import { branch, segmentImages, sizeOf, writeParameters } from "./config";

export interface ProductDatabase {
  /** Application program, with the identifier ETS gives it ("M-00FE_A-0001-10-0000"). */
  id: string;
  name: string;
  number: number;
  version: number;
  mask: string;
  peiType: number;
  /** Values the product fixes (see DatabaseOptions), as it was generated. */
  fixed?: Record<string, string>;
  /** Segments: address, size, and the octets kept from their default image. */
  segments: {
    id: string;
    address: number;
    size: number;
    /** Kept octets of the default image: [offset, hexadecimal octets]. */
    data: [number, string][];
  }[];
  types: ParameterType[];
  parameters: Parameter[];
  parameterRefs: ParameterRef[];
  objects: ComObject[];
  objectRefs: ComObjectRef[];
  addressTable: TableLocation | null;
  associationTable: TableLocation | null;
  objectTable: TableLocation | null;
  dynamic: DynNode[];
  /** Translations: language → "element|attribute" → text. */
  translations: Record<string, Record<string, string>>;
}

const hex = (b: Uint8Array) =>
  Array.from(b, (x) => x.toString(16).toUpperCase().padStart(2, "0")).join("");

/** What a product fixes of a program it shares with others (its type of module…). */
export interface DatabaseOptions {
  /** Languages of the translations kept. */
  languages?: readonly string[];
  /**
   * Values the product fixes, by ParameterRef (short id, "P-57_R-57"): only the branches
   * they select are kept, and they are shown read-only with this value.
   */
  fixed?: Record<string, string>;
}

/** Merge address ranges [start, length]. */
function merge(ranges: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (const [a, n] of [...ranges].sort((x, y) => x[0] - y[0])) {
    const last = out[out.length - 1];
    if (last && a <= last[0] + last[1])
      last[1] = Math.max(last[1], a + n - last[0]);
    else out.push([a, n]);
  }
  return out;
}

/**
 * System part of the memory that a database keeps: what precedes the address table
 * (identification, pointers), and the group object table with its descriptors.
 */
export function systemRanges(app: ApplicationProgram): [number, number][] {
  const out: [number, number][] = [];
  const t = app.addressTable;
  const seg = t && app.segments.get(t.segment);
  if (t && seg) out.push([seg.address, t.offset]);
  const o = app.objectTable;
  const os = o && app.segments.get(o.segment);
  if (o && os) {
    const at = os.address + o.offset;
    const count = os.data[o.offset] ?? 0;
    // BCU1: count and RAM flags pointer, 3-octet descriptors; BIM M112 (070x): count
    // and a 2-octet pointer, 4-octet descriptors.
    out.push(
      /^MV-070/.test(app.mask) ? [at, 3 + 4 * count] : [at, 2 + 3 * count],
    );
  }
  return out;
}

/**
 * Database of a program of a product catalog (.knxprod), as `npm run product` writes it:
 * its system part, and the branches of the values the product fixes.
 */
export async function catalogDatabase(
  catalog: Uint8Array,
  program: string,
  fixed?: Record<string, string>,
): Promise<ProductDatabase> {
  const app = await (await openCatalog(catalog)).application(program);
  return databaseOf(app, systemRanges(app), fixed ? { fixed } : {});
}

/**
 * Database of a program: the system part of the memory (`keep`: absolute address ranges
 * [start, length]) and the default value of every parameter, the parameter dialog with
 * the branches the product's fixed values select, and what this dialog refers to.
 */
export function databaseOf(
  app: ApplicationProgram,
  keep: readonly [number, number][],
  options: DatabaseOptions = {},
): ProductDatabase {
  const languages = options.languages ?? ["fr-FR"];
  const fixed = Object.fromEntries(
    Object.entries(options.fixed ?? {}).map(([k, v]) => [`${app.id}_${k}`, v]),
  );
  // The dialog with the branches of the fixed values only.
  const prune = (nodes: readonly DynNode[]): DynNode[] =>
    nodes.flatMap((n): DynNode[] => {
      switch (n.kind) {
        case "choose":
          return n.ref in fixed
            ? prune(branch(app, fixed, n))
            : [
                {
                  ...n,
                  whens: n.whens.map((w) => ({
                    ...w,
                    children: prune(w.children),
                  })),
                },
              ];
        case "channel":
        case "block":
          return [{ ...n, children: prune(n.children) }];
        default:
          return [n];
      }
    });
  const dynamic = prune(app.dynamic);
  // What the dialog refers to.
  const refs = new Set<string>();
  const objectRefs = new Set<string>();
  const ids = new Set<string>();
  const walk = (nodes: readonly DynNode[]) =>
    nodes.forEach((n) => {
      if ("id" in n) ids.add(n.id);
      if (n.kind === "param" || n.kind === "choose") refs.add(n.ref);
      if (n.kind === "block" && n.paramRef) refs.add(n.paramRef);
      if (n.kind === "object") objectRefs.add(n.ref);
      if (n.kind === "choose") n.whens.forEach((w) => walk(w.children));
      else if ("children" in n) walk(n.children);
    });
  walk(dynamic);
  const parameterRefs = [...app.parameterRefs.values()]
    .filter((r) => refs.has(r.id))
    .map((r) =>
      r.id in fixed ? { ...r, value: fixed[r.id], access: "Read" } : r,
    );
  const params = new Set(parameterRefs.map((r) => r.ref));
  const parameters = [...app.parameters.values()].filter((p) =>
    params.has(p.id),
  );
  const types = new Set(parameters.map((p) => p.type));
  const comRefs = [...app.objectRefs.values()].filter((r) =>
    objectRefs.has(r.id),
  );
  const objects = new Set(comRefs.map((r) => r.ref));
  [
    ...parameterRefs.map((r) => r.id),
    ...params,
    ...types,
    ...comRefs.map((r) => r.id),
    ...objects,
  ].forEach((x) => ids.add(x));
  const kept = (key: string) => {
    const id = key.slice(0, key.indexOf("|"));
    // Enumeration texts belong to their type ("PT-x_EN-1").
    return ids.has(id) || ids.has(id.replace(/_EN-[^_]*$/, ""));
  };
  // Default image: every parameter of the program with its default value (and the
  // fixed ones), so that the memory of the product is complete.
  const images = segmentImages(app);
  writeParameters(app, fixed, images);
  const ranges = merge([
    ...keep.map(([a, n]) => [a, n] as [number, number]),
    ...[...app.parameters.values()].flatMap((p): [number, number][] => {
      const seg = p.memory && app.segments.get(p.memory.segment);
      if (!p.memory || !seg) return [];
      const bits = p.memory.bitOffset + sizeOf(app.types.get(p.type));
      return [[seg.address + p.memory.offset, Math.ceil(bits / 8) || 1]];
    }),
  ]);
  const db: ProductDatabase = {
    id: app.id,
    name: app.name,
    number: app.number,
    version: app.version,
    mask: app.mask,
    peiType: app.peiType,
    ...(options.fixed ? { fixed: options.fixed } : {}),
    segments: [...app.segments.values()].map((s) => {
      const img = images.get(s.id) ?? s.data;
      const data: [number, string][] = [];
      for (const [start, n] of ranges) {
        const from = Math.max(start, s.address) - s.address;
        const to = Math.min(start + n, s.address + s.size) - s.address;
        if (to > from) data.push([from, hex(img.subarray(from, to))]);
      }
      return { id: s.id, address: s.address, size: s.size, data };
    }),
    types: [...app.types.values()].filter((t) => types.has(t.id)),
    parameters,
    parameterRefs,
    objects: [...app.objects.values()].filter((o) => objects.has(o.id)),
    objectRefs: comRefs,
    addressTable: app.addressTable,
    associationTable: app.associationTable,
    objectTable: app.objectTable,
    dynamic,
    translations: Object.fromEntries(
      [...app.translations]
        .filter(([l]) =>
          languages.some((x) => x.toLowerCase() === l.toLowerCase()),
        )
        .map(([l, m]) => [
          l,
          Object.fromEntries([...m].filter(([k]) => kept(k))),
        ]),
    ),
  };
  // Identifiers without the program's prefix: they are used inside the database only.
  const short = JSON.parse(
    JSON.stringify(db)
      .replaceAll(`"${app.id}_`, '"')
      .replaceAll(`|${app.id}_`, "|"),
  ) as ProductDatabase;
  return { ...short, id: app.id };
}

const programs = new WeakMap<ProductDatabase, ApplicationProgram>();

/** The application program of a database (built once). */
export function programOf(db: ProductDatabase): ApplicationProgram {
  const hit = programs.get(db);
  if (hit) return hit;
  const byId = <T extends { id: string }>(list: readonly T[]) =>
    new Map(list.map((x) => [x.id, x] as const));
  const app: ApplicationProgram = {
    id: db.id,
    name: db.name,
    number: db.number,
    version: db.version,
    mask: db.mask,
    peiType: db.peiType,
    loadProcedureStyle: "",
    segments: new Map(
      db.segments.map((s) => {
        const data = new Uint8Array(s.size);
        for (const [at, h] of s.data)
          for (let i = 0; i < h.length / 2; i++)
            data[at + i] = parseInt(h.slice(2 * i, 2 * i + 2), 16);
        return [s.id, { id: s.id, address: s.address, size: s.size, data }];
      }),
    ),
    types: byId(db.types),
    parameters: byId(db.parameters),
    parameterRefs: byId(db.parameterRefs),
    objects: byId(db.objects),
    objectRefs: byId(db.objectRefs),
    addressTable: db.addressTable,
    associationTable: db.associationTable,
    objectTable: db.objectTable,
    dynamic: db.dynamic,
    translations: new Map(
      Object.entries(db.translations).map(([l, m]) => [
        l,
        new Map(Object.entries(m)),
      ]),
    ),
  };
  programs.set(db, app);
  return app;
}
