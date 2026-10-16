// Manufacturers' products in the scenario (src/manufacturers): inserted with their
// application program, set by its parameters (the values of the project, by
// ParameterRef) on the pages of their product database. The memory a complete download
// writes is computed with the database and kept with the device; its
// group objects ("o<number>") are those this memory enables, with the names of the
// product database and the group addresses the project links to them.
import type { ApplicationProgram } from "../../src/knxprod/application";
import { textOf } from "../../src/knxprod/application";
import { programOfProduct } from "./manufacturers";
import { objectOf, visible } from "../../src/knxprod/config";
import { linksOf, projectImage } from "../../src/knxprod/runtime";
import { heldApplication, projectMemory } from "../../src/bcu/device";
import { productOfProgram } from "../../src/bcu/product";
import type { Product } from "../../src/bcu/product";
import { memoryJson } from "../../src/knx/installation";
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
    (behavior && registry.bcuProducts.get(behavior)) ||
    productOfProgram(registry.bcuProducts.values(), app.id);
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
  const image = projectImage(
    app,
    ets.mask,
    ets.parameters ?? {},
    links,
    d.address ?? "15.15.255",
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
    projectMemory(ets.mask, image, d.objects, d.address ?? "15.15.255"),
  );
}

/** Insert a manufacturer's product on a line, as ETS inserts it; returns its identifier. */
export function addProductDevice(
  doc: Doc,
  behavior: string,
  registry: Registry,
  line: string,
): string {
  const app = programOfProduct(behavior);
  const product = registry.bcuProducts.get(behavior);
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
  const def = r?.value ?? app.parameters.get(r?.ref ?? "")?.value;
  ets.parameters ??= {};
  if (value === def) delete ets.parameters[ref];
  else ets.parameters[ref] = value;
  if (!Object.keys(ets.parameters).length) delete ets.parameters;
  applyConfiguration(d, app, registry);
}

/** Number of a group object of a catalog device (its id is "o<number>"). */
export const etsObjectNumber = (id: string) => {
  const m = /^o(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
};
