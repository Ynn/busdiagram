// Manufacturers' products in the scenario (from packages of devices): inserted with their
// application program, set by its parameters (the values of the project, by
// ParameterRef) on the pages of their product database. The memory a complete download
// writes is computed with the database and kept with the device; its
// group objects ("o<number>") are those this memory enables, with the names of the
// product database and the group addresses the project links to them.
import type { ApplicationProgram } from "../../src/knxprod/application";
import { textOf } from "../../src/knxprod/application";
import { programOfProduct } from "./manufacturers";
import { objectOf, valueProblem, visible } from "../../src/knxprod/config";
import {
  ParameterValueError,
  effectiveValues,
  linksOf,
  projectImage,
  valuesOf,
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
 * Name and function of each group object as ETS shows them with these parameters
 * ("Channel 1 value", "Send value"), by object identifier.
 */
export function objectTexts(
  app: ApplicationProgram,
  values: Record<string, string>,
): Map<string, { name: string; function: string }> {
  const out = new Map<string, { name: string; function: string }>();
  const add = (ref: string) => {
    const o = objectOf(app, ref);
    if (!o || out.has(`o${o.number}`)) return;
    // In the language of the designer, as ETS shows them: the reference's text, else
    // the object's.
    const r = app.objectRefs.get(ref)!;
    const text = (attr: string, value: string) =>
      (
        textOf(app, ref, attr, "", t.lang ?? "en") ||
        textOf(app, r.ref, attr, value, t.lang ?? "en")
      ).trim();
    out.set(`o${o.number}`, {
      name: text("Text", o.text ?? `Object ${o.number}`),
      function: text("FunctionText", o.functionText ?? ""),
    });
  };
  // The references the parameters show first, then the others.
  visible(app, values).objects.forEach(add);
  [...app.objectRefs.keys()].forEach(add);
  return out;
}

/**
 * Set the application of a device from its parameter values and the group addresses of
 * its objects: memory image, channels (keeping their labels, loads and wired
 * push-buttons), and objects (keeping their addresses).
 */
export function applyConfiguration(
  d: Dev,
  app: ApplicationProgram,
  registry: Registry,
) {
  const product = productOf(app, registry, d.behavior);
  const ets = d.ets as unknown as Ets;
  const links = linksOf(d.objects);
  const image = fitting(() =>
    projectImage(
      app,
      ets.mask,
      ets.parameters ?? {},
      links,
      d.address ?? "15.15.255",
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
  // The value, then the hidden parameters that ETS calculates from it; a value that is the
  // default of its reference is not kept.
  const values = fitting(() =>
    effectiveValues(app, { ...ets.parameters, [ref]: value }),
  );
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
): string[] | null {
  const product = productOf(app, registry, d.behavior);
  const ets = d.ets as unknown as Ets;
  const read = valuesOf(app, memory);
  const parameters: Record<string, string> = {};
  for (const ref of visible(app, read).parameters) {
    const r = app.parameterRefs.get(ref);
    const def = r?.value ?? app.parameters.get(r?.ref ?? "")?.value;
    const v = read[ref];
    if (v !== undefined && v !== def) parameters[ref] = v;
  }
  const texts = objectTexts(app, parameters);
  const held = heldApplication(
    product,
    ets.mask,
    memory,
    [...texts].map(([id, x]) => ({ id, name: x.name })),
  ) as unknown as { objects: Obj[] } | null;
  if (!held) return null;
  // The objects ETS shows with these parameters, and any the tables link.
  const shown = new Set(
    visible(app, parameters)
      .objects.map((r) => objectOf(app, r)?.number)
      .filter((n): n is number => n !== undefined)
      .map((n) => `o${n}`),
  );
  const gaList = (o: Obj) => (o as { ga?: string[] }).ga ?? [];
  d.objects = held.objects.filter(
    (o) => shown.has(o.id) || gaList(o).length > 0,
  );
  if (Object.keys(parameters).length) ets.parameters = parameters;
  else delete ets.parameters;
  ets.memory = memoryJson(memory);
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
    if (configurationFromMemory(d, app, registry, memory)) changed.push(d.id);
  }
  return changed;
}

/** Number of a group object of a catalog device (its id is "o<number>"). */
export const etsObjectNumber = (id: string) => {
  const m = /^o(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
};
