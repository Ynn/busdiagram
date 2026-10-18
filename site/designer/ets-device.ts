// Manufacturers' products in the scenario (from packages of devices): inserted with their
// application program, set by its parameters (the values of the project, by
// ParameterRef) on the pages of their product database. The memory a complete download
// writes is computed with the database and kept with the device; its
// group objects ("o<number>") are those this memory enables, with the names of the
// product database and the group addresses the project links to them.
import type { ApplicationProgram } from "../../src/knxprod/application";
import { programOfProduct } from "./manufacturers";
import { objectOf, valueProblem, visible } from "../../src/knxprod/config";
import {
  heldDevice,
  objectTexts as textsOfObjects,
} from "../../src/knxprod/held-device";
import type { CalculationProblem } from "../../src/knxprod/calculation";
import type { ReadBack } from "../../src/knxprod/readback";
import { readBack } from "../../src/knxprod/readback";
import {
  ParameterValueError,
  effectiveValues,
  linksOf,
  projectImage,
} from "../../src/knxprod/runtime";
import { heldApplication, projectMemory } from "../../src/bcu/device";
import { TableOverflow } from "../../src/bcu/tables";
import { productOfProgram } from "../../src/bcu/product";
import type { Product } from "../../src/bcu/product";
import { memoryJson, parseMemory } from "../../src/knx/installation";
import type { Registry } from "../../src/knx/registry";
import type { Chan, Dev, Doc, Obj } from "./edit";
import { EditRefusal } from "./edit";
import { freeAddress, freeId } from "./snippet-kit";
import { t } from "./lang";

const maskOf = (app: ApplicationProgram) => app.mask.replace(/^MV-/, "");

type Ets = {
  parameters?: Record<string, string>;
  memory?: unknown;
  mask: string;
};

/**
 * The product of a device: by its behavior (several products of a range share a
 * program), else the one that runs its program; or a refusal.
 */
function productOf(
  app: ApplicationProgram,
  registry: Registry,
  behavior?: string,
): Product {
  const p =
    (behavior && registry.bcuProducts?.get(behavior)) ||
    productOfProgram(registry.bcuProducts?.values() ?? [], app.id);
  if (!p) throw new EditRefusal(t`the program ${app.name} is not simulated`);
  return p;
}

/**
 * Name and function of each group object as ETS shows them with these parameters, in the
 * language of the designer (see objectTexts of the product database).
 */
export const objectTexts = (
  app: ApplicationProgram,
  values: Record<string, string>,
) => textsOfObjects(app, values, t.lang ?? "en");

/** Read backs of the memories shown, by program and memory (the last ones). */
const readBackCache = new Map<string, ReadBack>();

/**
 * Where the memory of a catalog device holds what its pages do not write (see ReadBack):
 * read back from the memory it holds now, for the program shown. It follows that memory
 * whatever the document, its history or a new start: a download from ETS that the
 * parameters do not explain shows until an edit writes what the pages show.
 */
export function unexplainedOf(
  d: Dev,
  app: ApplicationProgram,
): ReadBack["unexplained"] {
  const memory = (d.ets as Ets | undefined)?.memory;
  if (!memory) return [];
  const key = `${app.id}|${JSON.stringify(memory)}`;
  let r = readBackCache.get(key);
  if (!r) {
    const bytes = parseMemory(memory);
    if (!bytes) return [];
    r = readBack(app, bytes);
    if (readBackCache.size >= 32)
      readBackCache.delete(readBackCache.keys().next().value!);
    readBackCache.set(key, r);
  }
  return r.unexplained;
}

/**
 * Set the application of a device from its parameter values and the group addresses of
 * its objects: memory image, channels (keeping their labels, loads and wired
 * push-buttons), and objects (keeping their addresses). Returns the calculations that
 * could not be done (their hidden parameters keep their values): an edit refuses those
 * it adds ({@link setEtsParameter}); a product inserted with those of its own defaults
 * keeps them, and its pages list them.
 */
export function applyConfiguration(
  d: Dev,
  app: ApplicationProgram,
  registry: Registry,
): CalculationProblem[] {
  const product = productOf(app, registry, d.behavior);
  const ets = d.ets as unknown as Ets;
  const links = linksOf(d.objects);
  const problems: CalculationProblem[] = [];
  const image = fitting(() =>
    projectImage(
      app,
      ets.mask,
      ets.parameters ?? {},
      links,
      d.address ?? "15.15.255",
      problems,
    ),
  );
  d.behavior = product.behavior;
  (d as { kind: string }).kind = product.kind;
  const before = new Map((d.channels ?? []).map((c) => [c.id, c] as const));
  d.channels = product.channels.map(
    (c) =>
      ({
        ...(before.get(c.id) ?? {}),
        id: c.id,
        label: before.get(c.id)?.label ?? c.label,
      }) as Chan,
  );
  // The objects the memory enables, with the project's addresses and the database's names.
  const texts = objectTexts(app, ets.parameters ?? {});
  const old = new Map(d.objects.map((o) => [o.id, o] as const));
  const held = heldApplication(
    product,
    ets.mask,
    image,
    [...texts].map(([id, x]) => ({ id, name: x.name })),
  ) as unknown as { objects: Obj[] } | null;
  // The objects ETS shows with these parameters (the firmware may have more, that the
  // memory does not tell apart).
  const shown = new Set(
    visible(app, ets.parameters ?? {})
      .objects.map((r) => objectOf(app, r)?.number)
      .filter((n): n is number => n !== undefined)
      .map((n) => `o${n}`),
  );
  d.objects = (held?.objects ?? [])
    .filter((o) => shown.has(o.id))
    .map((o) => {
      const was = old.get(o.id);
      return (
        was?.flags ? { ...o, flags: { ...o.flags, ...was.flags } } : o
      ) as Obj;
    });
  // The memory with the flags the project sets.
  ets.memory = memoryJson(
    fitting(() =>
      projectMemory(ets.mask, image, d.objects, d.address ?? "15.15.255"),
    ),
  );
  return problems;
}

/** The tables of the device hold what the project links to it, or the edit is refused. */
function fitting<T>(f: () => T): T {
  try {
    return f();
  } catch (e) {
    if (e instanceof ParameterValueError)
      throw new EditRefusal(
        e.problem === "unknown"
          ? t`The program has no parameter ${e.ref}.`
          : e.problem === "unit"
            ? t`${e.ref} is a time in a unit that the designer does not write`
            : t`“${e.value}” is not a value that ${e.ref} takes.`,
      );
    if (!(e instanceof TableOverflow)) throw e;
    throw new EditRefusal(
      e.table === "addresses"
        ? t`${e.count} group addresses: the address table of this device holds ${e.capacity}.`
        : e.table === "objects"
          ? t`Group object ${e.count}: the group object table of this device holds ${e.capacity}.`
          : t`${e.count} associations: the association table of this device holds ${e.capacity}.`,
    );
  }
}

/** Insert a manufacturer's product on a line, as ETS inserts it; returns its identifier. */
export function addProductDevice(
  doc: Doc,
  behavior: string,
  registry: Registry,
  line: string,
): string {
  const app = programOfProduct(behavior);
  const product = registry.bcuProducts?.get(behavior);
  if (!app || !product) throw new EditRefusal(t`unknown product “${behavior}”`);
  const id = freeId(
    doc,
    product.name.replace(/[^A-Za-z0-9_]+/g, "") || "device",
  );
  const d = {
    id,
    name: product.name,
    address: freeAddress(doc, line),
    kind: product.kind,
    behavior,
    ets: {
      application: app.id,
      mask: maskOf(app),
      manufacturer: product.manufacturer,
      name: product.name,
      orderNumber: product.orderNumber ?? "",
      applicationName: app.name,
    },
    objects: [],
  } as unknown as Dev;
  applyConfiguration(d, app, registry);
  doc.devices.push(d);
  return id;
}

/** Set a parameter of the project for a catalog device, and its application again. */
export function setEtsParameter(
  doc: Doc,
  devId: string,
  app: ApplicationProgram,
  registry: Registry,
  ref: string,
  value: string,
) {
  const d = doc.devices.find((x) => x.id === devId);
  if (!d) throw new EditRefusal(t`device “${devId}” not found`);
  const ets = d.ets as { parameters?: Record<string, string> } | undefined;
  if (!ets) throw new EditRefusal(t`not a device of a product catalog`);
  const r = app.parameterRefs.get(ref);
  const param = r && app.parameters.get(r.ref);
  if (!r || !param) throw new EditRefusal(t`parameter “${ref}” not found`);
  switch (valueProblem(app.types.get(param.type), value)) {
    case "choice":
      throw new EditRefusal(t`“${value}” is not one of the choices of ${ref}`);
    case "number":
      throw new EditRefusal(t`“${value}” is not a number that ${ref} takes`);
    case "range":
      throw new EditRefusal(t`“${value}” is outside the bounds of ${ref}`);
    case "text":
      throw new EditRefusal(t`“${value}” does not fit the text of ${ref}`);
  }
  setValues(
    d,
    app,
    registry,
    { ...ets.parameters, [ref]: value },
    (c, m) =>
      t`“${value}” for ${ref}: the calculation ${c} of the program cannot be done (${m})`,
  );
}

/**
 * Give parameters of the project of a catalog device their default values again (those
 * of a page of its dialog), and its application again.
 */
export function resetEtsParameters(
  doc: Doc,
  devId: string,
  app: ApplicationProgram,
  registry: Registry,
  refs: readonly string[],
) {
  const d = doc.devices.find((x) => x.id === devId);
  if (!d) throw new EditRefusal(t`device “${devId}” not found`);
  const ets = d.ets as { parameters?: Record<string, string> } | undefined;
  if (!ets) throw new EditRefusal(t`not a device of a product catalog`);
  const drop = new Set(refs);
  setValues(
    d,
    app,
    registry,
    Object.fromEntries(
      Object.entries(ets.parameters ?? {}).filter(([k]) => !drop.has(k)),
    ),
    (c, m) =>
      t`Default values: the calculation ${c} of the program cannot be done (${m})`,
  );
}

/**
 * The parameters of the project of a catalog device: these values, then the hidden
 * parameters that ETS calculates from them; a value that is the default of its reference
 * is not kept. A calculation they make fail is refused (`refusal`): the hidden parameters
 * would keep values that do not agree with it.
 */
function setValues(
  d: Dev,
  app: ApplicationProgram,
  registry: Registry,
  next: Record<string, string>,
  refusal: (calculation: string, message: string) => string,
) {
  const ets = d.ets as { parameters?: Record<string, string> };
  const before: CalculationProblem[] = [];
  effectiveValues(app, ets.parameters ?? {}, before);
  const problems: CalculationProblem[] = [];
  const values = fitting(() => effectiveValues(app, next, problems));
  const known = new Set(before.map((p) => `${p.calculation}|${p.ref ?? ""}`));
  const added = problems.find(
    (p) => !known.has(`${p.calculation}|${p.ref ?? ""}`),
  );
  if (added) throw new EditRefusal(refusal(added.calculation, added.message));
  const kept = Object.fromEntries(
    Object.entries(values).filter(([k, v]) => {
      const rk = app.parameterRefs.get(k);
      return v !== (rk?.value ?? app.parameters.get(rk?.ref ?? "")?.value);
    }),
  );
  if (Object.keys(kept).length) ets.parameters = kept;
  else delete ets.parameters;
  applyConfiguration(d, app, registry);
}

/**
 * The project of a device as a download from ETS left it, read from the memory it holds:
 * the parameter values (those that differ from the defaults, among the active ones), the
 * objects with the group addresses of its tables and the names ETS gives them, and the
 * memory. Returns the group addresses of its objects, or null when the memory holds no
 * running application (the project is then left as it is).
 */
export function configurationFromMemory(
  d: Dev,
  app: ApplicationProgram,
  registry: Registry,
  memory: Uint8Array,
  /** What the read back could not explain, for the device (see ReadBack). */
  report?: (r: ReadBack) => void,
): string[] | null {
  const product = productOf(app, registry, d.behavior);
  const ets = d.ets as unknown as Ets;
  // The configuration of the dialog that the memory holds, checked by what it writes
  // again (the choices it does not hold, inferred), and its objects.
  const held = heldDevice(app, product, ets.mask, memory, t.lang ?? "en");
  if (!held) return null;
  report?.(held.readBack);
  d.objects = held.objects as unknown as Obj[];
  if (Object.keys(held.parameters).length) ets.parameters = held.parameters;
  else delete ets.parameters;
  ets.memory = memoryJson(memory);
  const gaList = (o: Obj) => (o as { ga?: string[] }).ga ?? [];
  return [...new Set(d.objects.flatMap(gaList))];
}

type Held = { device?: unknown; memory?: unknown };
const heldDevices = (installation: unknown): Held[] => {
  const list = (installation as { devices?: unknown } | null)?.devices;
  return Array.isArray(list) ? (list as Held[]) : [];
};

/**
 * After downloads from ETS: the project of each manufacturer's device whose memory changed
 * becomes what this memory holds (configurationFromMemory), so that the scenario says how
 * the device is really configured. Returns the identifiers of the devices changed.
 */
export function projectFromInstallation(
  doc: Doc,
  installation: unknown,
  before: unknown,
  registry: Registry,
  /** A device whose memory the read back does not explain everywhere. */
  report?: (deviceId: string, r: ReadBack) => void,
): string[] {
  const was = new Map(
    heldDevices(before).map((h) => [h.device, JSON.stringify(h.memory)]),
  );
  const changed: string[] = [];
  for (const h of heldDevices(installation)) {
    if (!h.memory || was.get(h.device) === JSON.stringify(h.memory)) continue;
    const d = doc.devices.find((x) => x.id === h.device);
    const app = d?.ets && d.behavior ? programOfProduct(d.behavior) : undefined;
    const memory = parseMemory(h.memory);
    if (!d || !app || !memory) continue;
    const note = (r: ReadBack) => {
      if (r.unexplained.length || r.problems.length) report?.(d.id, r);
    };
    if (configurationFromMemory(d, app, registry, memory, note))
      changed.push(d.id);
  }
  return changed;
}

/** Number of a group object of a catalog device (its id is "o<number>"). */
export const etsObjectNumber = (id: string) => {
  const m = /^o(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
};
