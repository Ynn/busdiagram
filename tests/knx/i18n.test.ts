import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import { formatValue, preciseValue } from "../../src/knx/dpt";
import type { ScenarioError } from "../../src/knx/scenario";
import { buildScenario } from "../../src/knx/scenario";
import { frMessages } from "../../src/i18n/fr";
import { designerFr } from "../../site/designer/fr";
import { extractMessages } from "../../src/i18n/extract";
import { registerMessages, translator } from "../../src/i18n";
import { raw } from "./helpers";

const root = resolve(import.meta.dirname, "../..");
const all: Record<string, string> = { ...frMessages, ...designerFr };
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

describe("English source and French catalog", () => {
  it("covers every active tagged message", () => {
    const missing = [...used]
      .filter(([key]) => !(key in all))
      .map(([key, path]) => `${path}: ${key}`);
    expect(missing).toEqual([]);
    expect(used.size).toBeGreaterThan(300);
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
      buildScenario({ lines: "oops", devices: [] });
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
    registry.behaviors.forEach((definition) => {
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
      [...(layout?.device ?? []), ...(layout?.channel ?? [])].forEach(
        (page) => {
          titles.add(page.title);
          items(page.items as unknown as Record<string, unknown>[]);
        },
      );
    });
    registry.equipment.forEach((definition) => {
      if (definition.title) titles.add(definition.title);
      collect(definition.parameters);
      collect(definition.initialState);
    });
    expect([...titles].filter((title) => !(title in frMessages))).toEqual([]);
  });
});
