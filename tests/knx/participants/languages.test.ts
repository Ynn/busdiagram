// Languages of the participants: a participant brings its texts in any language, in its
// model entry (library) and its designer entry. The catalogs keep the interpolation slots,
// hold only texts the participant uses, and a language the library lacks works: its texts
// are translated, the others fall back to English.
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { availableLanguages, translator } from "../../../src/i18n";
import { extractMessages } from "../../../src/i18n/extract";
import type {
  BehaviorDefinition,
  EquipmentDefinition,
  ParticipantModel,
} from "../../../src/knx/contracts";
import { configWarnings } from "../../../src/knx/consistency";
import {
  registerParticipant,
  restoreRegistry,
  saveRegistry,
} from "../../../src/knx/registry";
import { buildScenario } from "../../../src/knx/scenario";
import type { DesignerContribution } from "../../../site/designer/snippet-kit";
import { beaconDesigner } from "./fixture-participant/designer";
import { beaconModel } from "./fixture-participant/model";
import { v2 } from "../helpers";

const root = resolve(import.meta.dirname, "../../..");
const before = saveRegistry();
afterEach(() => restoreRegistry(before));

const slots = (text: string) =>
  [...text.matchAll(/\{(\d+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join();

/** Texts carried as data by a definition: description, titles, options, pages, notes. */
function titles(
  d: BehaviorDefinition<unknown> | EquipmentDefinition,
): Set<string> {
  const out = new Set<string>();
  const add = (v: unknown) => typeof v === "string" && out.add(v);
  const schema = (s?: {
    properties: Record<
      string,
      { title?: string; enumTitles?: readonly string[]; nullTitle?: string }
    >;
  }) =>
    Object.values(s?.properties ?? {}).forEach((p) => {
      add(p.title);
      p.enumTitles?.forEach(add);
      add(p.nullTitle);
    });
  if ("ports" in d) {
    add(d.description);
    Object.values(d.ports).forEach((p) => add(p.title));
    schema(d.parameters);
    schema(d.channelParameters);
    schema(d.channelInitialState);
    const items = (list: readonly Record<string, unknown>[]): void =>
      list.forEach((i) => {
        add(i.heading);
        add(i.note);
        if (Array.isArray(i.items)) items(i.items);
      });
    for (const page of [
      ...(d.parameterLayout?.device ?? []),
      ...(d.parameterLayout?.channel ?? []),
    ]) {
      add(page.title);
      items(page.items as unknown as Record<string, unknown>[]);
    }
  } else {
    add(d.title);
    schema(d.parameters);
    schema(d.initialState);
  }
  return out;
}

/** Folders of participants and equipment, with their entries. */
const entries = {
  ...import.meta.glob("../../../src/participants/*/model.ts", { eager: true }),
  ...import.meta.glob("../../../src/equipment/*/model.ts", { eager: true }),
} as Record<string, Record<string, ParticipantModel>>;
const designers = import.meta.glob("../../../src/participants/*/designer.ts", {
  eager: true,
}) as Record<string, Record<string, DesignerContribution>>;
function folders() {
  return Object.entries(entries).map(([path, m]) => {
    const dir = path.replace("../../../", "").replace(/\/model\.ts$/, "");
    const d = designers[path.replace(/model\.ts$/, "designer.ts")];
    return {
      dir,
      model: Object.values(m)[0]!,
      designer: d ? Object.values(d)[0] : undefined,
    };
  });
}
const textsOf = (dir: string, designer: boolean) =>
  new Set(
    readdirSync(join(root, dir))
      .filter(
        (f) =>
          f.endsWith(".ts") &&
          !/\.[a-z]{2}\.ts$/.test(f) &&
          f.startsWith("designer") === designer,
      )
      .flatMap((f) =>
        extractMessages(readFileSync(join(root, dir, f), "utf8")),
      ),
  );

describe("catalogs of the participants and equipment", () => {
  it("are found for every participant and equipment", () => {
    // 20 participants and 7 equipment; each has a French catalog.
    const all = folders();
    expect(all).toHaveLength(27);
    expect(all.filter((f) => f.model.messages?.fr).length).toBe(27);
  });

  it("keep the interpolation slots, in every language", () => {
    const bad: string[] = [];
    for (const { dir, model, designer } of folders())
      for (const [lang, catalog] of [
        ...Object.entries(model.messages ?? {}),
        ...Object.entries(designer?.messages ?? {}),
      ])
        for (const [key, value] of Object.entries(catalog))
          if (slots(key) !== slots(value)) bad.push(`${dir} ${lang}: ${key}`);
    expect(bad).toEqual([]);
  });

  it("hold only texts their participant uses", () => {
    const orphans: string[] = [];
    for (const { dir, model, designer } of folders()) {
      const own = textsOf(dir, false);
      for (const d of [
        ...Object.values(model.behaviors ?? {}),
        ...Object.values(model.equipment ?? {}),
      ])
        titles(d).forEach((x) => own.add(x));
      for (const [lang, catalog] of Object.entries(model.messages ?? {}))
        for (const key of Object.keys(catalog))
          if (!own.has(key)) orphans.push(`${dir} model ${lang}: ${key}`);
      const ownDesigner = textsOf(dir, true);
      for (const [lang, catalog] of Object.entries(designer?.messages ?? {}))
        for (const key of Object.keys(catalog))
          if (!ownDesigner.has(key))
            orphans.push(`${dir} designer ${lang}: ${key}`);
    }
    expect(orphans).toEqual([]);
  });
});

describe("texts shared by several participants", () => {
  it("are in a common catalog, not in the catalog of one of them", () => {
    // Each participant's texts (code and data); a text of one participant's catalog that
    // another participant also uses would vanish with the first one.
    const all = folders();
    const usedBy = new Map<string, Set<string>>();
    for (const { dir, model } of all) {
      const texts = new Set([...textsOf(dir, false), ...textsOf(dir, true)]);
      for (const d of [
        ...Object.values(model.behaviors ?? {}),
        ...Object.values(model.equipment ?? {}),
      ])
        titles(d).forEach((x) => texts.add(x));
      texts.forEach((x) =>
        usedBy.set(x, (usedBy.get(x) ?? new Set()).add(dir)),
      );
    }
    const shared: string[] = [];
    for (const { dir, model, designer } of all)
      for (const catalog of [
        ...Object.values(model.messages ?? {}),
        ...Object.values(designer?.messages ?? {}),
      ])
        for (const key of Object.keys(catalog)) {
          const others = [...(usedBy.get(key) ?? [])].filter((d) => d !== dir);
          if (others.length)
            shared.push(`${dir}: ${key} (also ${others.join(", ")})`);
        }
    expect(shared).toEqual([]);
  });
});

describe("a language the library lacks", () => {
  it("is brought by a participant, and falls back to English elsewhere", () => {
    expect(availableLanguages()).not.toContain("de");
    registerParticipant(beaconModel);
    expect(availableLanguages()).toContain("de");
    const de = translator("de-AT");
    expect(de.s!("Beacon signal")).toBe("Signal der Bake");
    expect(de.s!("Status feedback")).toBe("Status feedback");
    const doc = beaconDesigner.templates[0]!.apply(v2([]) as never, {
      line: "1.1",
    }) as { devices: { parameters?: object }[] };
    doc.devices[0]!.parameters = { loud: true };
    expect(
      configWarnings(buildScenario(doc), de).find(
        (w) => w.code === "beacon-loud",
      )?.message,
    ).toBe("Beacon: die Bake ist laut");
  });

  it("is gone with its participant", () => {
    expect(availableLanguages()).not.toContain("de");
    expect(translator("de").s!("Beacon signal")).toBe("Beacon signal");
  });
});
