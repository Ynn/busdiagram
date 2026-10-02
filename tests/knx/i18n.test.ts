import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import { formatValue, preciseValue } from "../../src/knx/dpt";
import type { BehaviorDefinition } from "../../src/knx/contracts";
import type { ScenarioError } from "../../src/knx/scenario";
import { buildScenario } from "../../src/knx/scenario";
import { frMessages } from "../../src/i18n/fr";
import { designerFr } from "../../site/designer/fr";
import { extractMessages } from "../../src/i18n/extract";
import { registerMessages, translator } from "../../src/i18n";
import { STANDARD_MODEL } from "../../src/standard-model";
import { DESIGNER } from "../../site/designer/standard-designer";
import { raw } from "./helpers";

const root = resolve(import.meta.dirname, "../..");
// Common catalogs, then the catalogs of the participants (model and designer entries).
const catalogs: [string, Record<string, string>][] = [
  ["src/i18n/fr.ts", frMessages],
  ["site/designer/fr.ts", designerFr],
  ...STANDARD_MODEL.flatMap((p, i) =>
    p.messages?.fr
      ? [[`model ${i}`, p.messages.fr] as [string, Record<string, string>]]
      : [],
  ),
  ...DESIGNER.flatMap((c) =>
    c.messages?.fr
      ? [
          [`designer ${c.behavior}`, c.messages.fr] as [
            string,
            Record<string, string>,
          ],
        ]
      : [],
  ),
];
const all: Record<string, string> = Object.assign(
  {},
  ...catalogs.map(([, c]) => c),
);
/** Catalogs the library installs (without the designer's). */
const modelFr: Record<string, string> = Object.assign(
  {},
  frMessages,
  ...STANDARD_MODEL.map((p) => p.messages?.fr ?? {}),
);
const sources = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { cwd: root, encoding: "utf8" },
)
  .split("\n")
  .filter(
    (path) =>
      (path.startsWith("src/") || path.startsWith("site/")) &&
      path.endsWith(".ts") &&
      !path.endsWith(".generated.ts") &&
      !path.endsWith("/fr.ts") &&
      !path.endsWith(".fr.ts") &&
      !path.startsWith("site/samples/") &&
      existsSync(join(root, path)),
  );
const used = new Map<string, string>();
for (const path of sources)
  for (const key of extractMessages(readFileSync(join(root, path), "utf8")))
    used.set(key, path);

const slots = (text: string) =>
  [...text.matchAll(/\{(\d+)\}/g)]
    .map((match) => match[1])
    .sort()
    .join();

/** Texts carried as data by a behavior: description, titles, options, pages, notes. */
function behaviorTitles(definition: BehaviorDefinition<unknown>): Set<string> {
  const titles = new Set<string>();
  const collect = (schema?: {
    properties: Record<
      string,
      { title?: string; enumTitles?: readonly string[]; nullTitle?: string }
    >;
  }) =>
    Object.values(schema?.properties ?? {}).forEach((property) => {
      if (property.title) titles.add(property.title);
      property.enumTitles?.forEach((title) => titles.add(title));
      if (property.nullTitle) titles.add(property.nullTitle);
    });
  if (definition.description) titles.add(definition.description);
  Object.values(definition.ports).forEach(
    (port) => port.title && titles.add(port.title),
  );
  collect(definition.parameters);
  collect(definition.channelParameters);
  collect(definition.channelInitialState);
  // Titles, headings, and notes of the parameter pages.
  const items = (list: readonly Record<string, unknown>[]): void =>
    list.forEach((item) => {
      if (typeof item.heading === "string") titles.add(item.heading);
      if (typeof item.note === "string") titles.add(item.note);
      if (Array.isArray(item.items)) items(item.items);
    });
  const layout = definition.parameterLayout;
  [...(layout?.device ?? []), ...(layout?.channel ?? [])].forEach((page) => {
    titles.add(page.title);
    items(page.items as unknown as Record<string, unknown>[]);
  });
  return titles;
}

/** Participant folder of each delivered behavior, read from the model entries. */
const folderOf = new Map(
  readdirSync(join(root, "src/participants"))
    .filter((d) => existsSync(join(root, "src/participants", d, "model.ts")))
    .flatMap((d) =>
      [
        ...readFileSync(
          join(root, "src/participants", d, "model.ts"),
          "utf8",
        ).matchAll(/"(\w+\/v\d+)"/g),
      ].map((m) => [m[1]!, `src/participants/${d}/`] as const),
    ),
);

/** Folder of each delivered equipment, read from the model entries. */
const equipmentFolderOf = new Map(
  readdirSync(join(root, "src/equipment"))
    .filter((d) => existsSync(join(root, "src/equipment", d, "model.ts")))
    .flatMap((d) =>
      [
        ...readFileSync(
          join(root, "src/equipment", d, "model.ts"),
          "utf8",
        ).matchAll(/equipment: \{ (\w+) \}/g),
      ].map((m) => [m[1]!, `src/equipment/${d}/`] as const),
    ),
);

describe("English source and French catalog", () => {
  it("covers every active tagged message", () => {
    const missing = [...used]
      .filter(([key]) => !(key in all))
      .map(([key, path]) => `${path}: ${key}`);
    expect(missing).toEqual([]);
    expect(used.size).toBeGreaterThan(300);
  });

  it("translates a text of a participant in its own catalog only", () => {
    const twice: string[] = [];
    catalogs.forEach(([name, catalog], i) => {
      if (i < 2) return; // the two common catalogs are checked below
      for (const key of Object.keys(catalog))
        catalogs.forEach(([other, c], j) => {
          if (j !== i && key in c) twice.push(`${key} (${name}, ${other})`);
        });
    });
    expect(twice).toEqual([]);
  });

  it("the designer catalog redefines a library text only with another wording", () => {
    expect(
      Object.keys(designerFr).filter(
        (key) => key in frMessages && frMessages[key] === designerFr[key],
      ),
    ).toEqual([]);
  });

  it("keeps the texts of a participant in its own catalog", async () => {
    // A text used only by a participant (its files, the data of its behaviors) is not in a
    // common catalog. Code shared by several participants (shared/) keeps common texts.
    const { captureRegistry } = await import("../../src/knx/registry");
    const users = new Map<string, Set<string>>();
    const use = (key: string, who: string) =>
      users.set(key, (users.get(key) ?? new Set()).add(who));
    for (const path of sources)
      for (const key of extractMessages(readFileSync(join(root, path), "utf8")))
        use(
          key,
          /^src\/(?:participants|equipment)\/(?!shared\/)[^/]+\//.exec(
            path,
          )?.[0] ?? path,
        );
    const registry = captureRegistry();
    registry.behaviors.forEach((definition, id) =>
      behaviorTitles(definition).forEach((key) =>
        use(key, folderOf.get(id) ?? id),
      ),
    );
    registry.equipment.forEach((definition, id) =>
      [
        definition.title,
        ...[definition.parameters, definition.initialState].flatMap((schema) =>
          Object.values(schema?.properties ?? {}).flatMap((p) => [
            p.title,
            ...(p.enumTitles ?? []),
            p.nullTitle,
          ]),
        ),
      ]
        .filter((key): key is string => !!key)
        .forEach((key) => use(key, equipmentFolderOf.get(id) ?? id)),
    );
    const misplaced = [...users]
      .filter(
        ([key, who]) =>
          who.size === 1 &&
          /^src\/(?:participants|equipment)\/(?!shared\/)[^/]+\/$/.test(
            [...who][0]!,
          ) &&
          (key in frMessages || key in designerFr),
      )
      .map(([key, who]) => `${[...who][0]}: ${key}`);
    expect(misplaced).toEqual([]);
  });

  it("installs every text of every participant", () => {
    const fr = translator("fr");
    const missing = catalogs.slice(2).flatMap(([name, catalog]) =>
      Object.entries(catalog)
        .filter(([key, value]) => fr.s!(key) !== value)
        .map(([key]) => `${name}: ${key}`),
    );
    expect(missing).toEqual([]);
  });

  it("installs the texts of the participants, model and designer", () => {
    // Model texts are installed by the registry, designer texts by its composition.
    expect(translator("fr").s!("Push-button interface · 1 input")).toBe(
      "Interface de boutons-poussoirs · 1 entrée",
    );
    expect(translator("fr").s!("Short press")).toBe("Appui court");
  });

  it("preserves interpolation slots", () => {
    expect(
      Object.entries(all)
        .filter(([key, value]) => slots(key) !== slots(value))
        .map(([key]) => key),
    ).toEqual([]);
  });

  it("uses English by default and French when requested", () => {
    expect(translator("en")`relay closed`).toBe("relay closed");
    expect(translator("fr")`relay closed`).toBe("relais fermé");
    expect(translator("fr").s!("Status feedback")).toBe("Retour d'état");
  });
});

describe("locale behavior", () => {
  it("reports validation errors in English by default", () => {
    try {
      buildScenario({ formatVersion: 2, lines: "oops", devices: [] });
      expect.unreachable();
    } catch (error) {
      expect((error as ScenarioError).problems).toEqual([
        "lines : list expected",
      ]);
    }
  });

  it("formats event log messages and numbers in both languages", () => {
    const sim = createSimulator(raw("status-feedback.json"));
    sim.press("pushButton", 1, "press");
    sim.advance(5000);
    expect(
      sim.journal.find((entry) => entry.kind === "output-changed")!.message,
    ).toBe("relay closed");
    expect(formatValue("1.008", 1)).toBe("Down");
    expect(preciseValue("5.001", 50.19607843)).toBe("50.196 %");
    expect(preciseValue("5.001", 50.19607843, translator("fr"))).toBe(
      "50,196 %",
    );
  });

  it("falls back to English for missing translations in another locale", () => {
    registerMessages("de", { "relay closed": "Relais geschlossen" });
    const german = translator("de-DE");
    expect(german`relay closed`).toBe("Relais geschlossen");
    expect(german`relay open`).toBe("relay open");
  });
});

describe("registered metadata", () => {
  it("provides French translations for standard titles and parameters", async () => {
    const { captureRegistry } = await import("../../src/knx/registry");
    const registry = captureRegistry();
    const titles = new Set<string>();
    const collect = (schema?: {
      properties: Record<
        string,
        { title?: string; enumTitles?: readonly string[]; nullTitle?: string }
      >;
    }) =>
      Object.values(schema?.properties ?? {}).forEach((property) => {
        if (property.title) titles.add(property.title);
        property.enumTitles?.forEach((title) => titles.add(title));
        if (property.nullTitle) titles.add(property.nullTitle);
      });
    registry.behaviors.forEach((definition) =>
      behaviorTitles(definition).forEach((title) => titles.add(title)),
    );
    registry.equipment.forEach((definition) => {
      if (definition.title) titles.add(definition.title);
      collect(definition.parameters);
      collect(definition.initialState);
    });
    expect([...titles].filter((title) => !(title in modelFr))).toEqual([]);
  });
});
