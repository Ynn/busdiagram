// The device of a project as a download left it, read from the memory it holds: the
// values of its dialog (readBack), its group objects with the names ETS gives them and the
// group addresses of its tables. No project is changed here: the host (the designer)
// applies what this gives to its device.
import type { ApplicationProgram } from "./application";
import { textOf } from "./application";
import { objectOf, visible } from "./config";
import type { ParameterValues } from "./config";
import { readBack } from "./readback";
import type { ReadBack } from "./readback";
import { heldApplication } from "../bcu/device";
import type { Product } from "../bcu/product";
import type { JsonObject } from "../knx/contracts";

/**
 * Name and function of each group object as ETS shows them with these parameters
 * ("Channel 1 value", "Send value"), by object identifier, in a language ("fr").
 */
export function objectTexts(
  app: ApplicationProgram,
  values: ParameterValues,
  lang = "en",
): Map<string, { name: string; function: string }> {
  const out = new Map<string, { name: string; function: string }>();
  const add = (ref: string) => {
    const o = objectOf(app, ref);
    if (!o || out.has(`o${o.number}`)) return;
    // As ETS shows them: the reference's text, else the object's.
    const r = app.objectRefs.get(ref)!;
    const text = (attr: string, value: string) =>
      (
        textOf(app, ref, attr, "", lang) ||
        textOf(app, r.ref, attr, value, lang)
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

export interface HeldDevice {
  /** The values of its dialog that are not their default (see ReadBack). */
  parameters: ParameterValues;
  /**
   * Its group objects ("o<number>"): those ETS shows with these parameters and those
   * its tables link, with their group addresses (`ga`).
   */
  objects: JsonObject[];
  /** How its memory was read back: inferred, unexplained, problems. */
  readBack: ReadBack;
}

/**
 * What a memory holds for a device of this product and mask, or null when it runs no
 * application of the product (a memory not loaded, another program).
 */
export function heldDevice(
  app: ApplicationProgram,
  product: Product,
  mask: string,
  memory: Uint8Array,
  lang = "en",
): HeldDevice | null {
  const back = readBack(app, memory);
  const parameters = back.values;
  const texts = objectTexts(app, parameters, lang);
  const held = heldApplication(
    product,
    mask,
    memory,
    [...texts].map(([id, x]) => ({ id, name: x.name })),
  ) as { objects?: JsonObject[] } | null;
  if (!held) return null;
  const shown = new Set(
    visible(app, parameters)
      .objects.map((r) => objectOf(app, r)?.number)
      .filter((n): n is number => n !== undefined)
      .map((n) => `o${n}`),
  );
  const linked = (o: JsonObject) => Array.isArray(o.ga) && o.ga.length > 0;
  return {
    parameters,
    objects: (held.objects ?? []).filter(
      (o) => shown.has(String(o.id)) || linked(o),
    ),
    readBack: back,
  };
}
