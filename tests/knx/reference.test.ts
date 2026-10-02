// Non-regression references for the reorganization of the participants (PLAN-SOC):
// the export of each example, and what the model derives from it (object numbers,
// effective flags, telegram classes, objects drawn as driving loads, diagnostics, filter
// tables), plus the registered definitions and the designer catalog. The references are
// files written once with UPDATE_REFERENCES=1, then compared.
import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSimulator } from "../../src/core";
import { toV2 } from "../../src/knx/export";
import { captureRegistry } from "../../src/knx/registry";
import { buildScenario } from "../../src/knx/scenario";
import * as E from "../../site/designer/edit";
import { TEMPLATES } from "../../site/designer/standard-designer";
import { catalogGroups } from "../../site/designer/ws-catalog";
import { activeScenarios, raw } from "./helpers";

const dir = resolve(import.meta.dirname, "fixtures/reference");
const update = process.env.UPDATE_REFERENCES === "1";

/** Compare with a reference file, or write it when updating. */
function matches(name: string, value: unknown) {
  const file = resolve(dir, name);
  const text = JSON.stringify(value, null, 2) + "\n";
  if (update || !existsSync(file)) {
    mkdirSync(resolve(file, ".."), { recursive: true });
    writeFileSync(file, text);
    if (!update)
      throw new Error(`reference ${name} was missing: written, check it`);
  }
  expect(JSON.parse(text)).toEqual(JSON.parse(readFileSync(file, "utf8")));
}

/** What the model derives from a scenario. */
function derived(doc: Record<string, unknown>) {
  const s = buildScenario(doc);
  const sim = createSimulator(doc);
  const reg = captureRegistry();
  const devices = Object.fromEntries(
    s.devices.map((d) => {
      const numbers = E.objectNumbers(
        (doc.devices as E.Dev[]).find((x) => x.id === d.id)!,
        reg.behaviors.get(d.behavior),
      );
      return [
        d.id,
        Object.fromEntries(
          d.objects.map((o) => [
            o.id,
            {
              number: numbers.get(o.id) ?? null,
              R: o.flags.R,
              U: o.flags.U,
              C: o.flags.C,
              I: o.flags.I,
              priority: o.priority,
              telegram: o.telegram === "state" ? "state" : "cmd",
              // Only the objects of an output with loads are drawn linked to them.
              drivesLoad:
                o.drivesLoad &&
                !!d.channels.find((c) => c.id === o.channel)?.loads.length,
            },
          ]),
        ),
      ];
    }),
  );
  const filterTables = Object.fromEntries(
    sim.network.topology.couplers.map((c) => [
      c.address,
      sim.network.filterTable(c),
    ]),
  );
  return {
    devices,
    diagnostics: sim
      .getState()
      .diagnostics.map((d) => d.code)
      .sort(),
    filterTables,
  };
}

describe("references of the examples", () => {
  it.each(activeScenarios())("%s: export", (f) => {
    matches(`export/${f}`, toV2(buildScenario(raw(f))));
  });

  it.each(activeScenarios())("%s: derived model", (f) => {
    matches(`model/${f}`, derived(raw(f)));
  });
});

describe("references of the definitions", () => {
  it("registered behaviors, equipment, templates, and catalog", () => {
    const reg = captureRegistry();
    matches("definitions.json", {
      behaviors: [...reg.behaviors.keys()].sort(),
      equipment: [...reg.equipment.keys()].sort(),
      templates: TEMPLATES.map((s) => s.id),
      catalog: catalogGroups(reg).map(([label, entries]) => [
        label,
        entries.map((e) => e.value),
      ]),
    });
  });
});
