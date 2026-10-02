// Contract test: the author scheme and the types generated remain consistent with the
// validator actually used (buildScenario). `npm run schema` regenerates files.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { compile } from "json-schema-to-typescript";
import { describe, expect, it } from "vitest";
import { captureRegistry } from "../../src/knx/registry";
import { buildScenario } from "../../src/knx/scenario";
import { buildAuthorSchema } from "../../src/knx/schema";
import { toV2 } from "../../src/knx/export";
import { activeScenarios, raw, readJson } from "./helpers";

const root = resolve(import.meta.dirname, "../..");
const schemaPath = resolve(root, "schema/scenario-v2.schema.json");
const typesPath = resolve(root, "src/knx/scenario-v2.generated.ts");
const update = process.env.UPDATE_SCHEMA === "1";

// Schema for standard behaviors only, captured before loading the extension.
const standard = captureRegistry();
const schema = buildAuthorSchema(standard);
const schemaText = JSON.stringify(schema, null, 2) + "\n";

describe("v2 authoring schema", () => {
  it("versioned file is up to date", async () => {
    if (update) writeFileSync(schemaPath, schemaText);
    expect(existsSync(schemaPath)).toBe(true);
    expect(readFileSync(schemaPath, "utf8")).toBe(schemaText);
  });

  it("TypeScript types generated are up-to-date", async () => {
    const ts = await compile(schema as never, "ScenarioV2", {
      bannerComment:
        "// Generated from schema/scenario-v2.schema.json by `npm run schema`. Do not edit by hand.",
      additionalProperties: false,
      format: false,
    });
    if (update) writeFileSync(typesPath, ts);
    expect(readFileSync(typesPath, "utf8")).toBe(ts);
  });
});

describe("all scenarios and examples", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);

  it.each(activeScenarios())("%s: accepted by the engine validator", (f) => {
    expect(() => buildScenario(raw(f), standard)).not.toThrow();
  });

  it.each(
    activeScenarios().filter(
      (f) => (raw(f) as { formatVersion?: number }).formatVersion === 2,
    ),
  )("%s: valid against the v2 authoring schema", (f) => {
    const ok = validate(raw(f));
    expect(validate.errors ?? [], f).toEqual([]);
    expect(ok).toBe(true);
  });

  it("the extension example is valid once its script is loaded", async () => {
    const data = readJson(
      resolve(root, "site/samples/extensions/delayed-switch.json"),
    );
    expect(() => buildScenario(data, standard)).toThrow(/delayedSwitch\/v1/);
    await import("../../site/samples/extensions/delayed-switch.ts");
    const withExt = captureRegistry();
    expect(() => buildScenario(data, withExt)).not.toThrow();
    const v = new Ajv2020({ allErrors: true, strict: false }).compile(
      buildAuthorSchema(withExt),
    );
    expect(v(data)).toBe(true);
  });

  it("schema and validator reject the same structural errors", () => {
    const base = raw("shutter-calibration.json") as Record<string, unknown>;
    const mutations: ((
      d: Record<string, unknown> & { devices: Record<string, unknown>[] },
    ) => void)[] = [
      (d) => (d.formatVersion = 3),
      (d) => (d.devices[0]!.colour = "red"),
      (d) =>
        ((d.devices[1]!.objects as Record<string, unknown>[])[0]!.flags = {
          W: true,
        }),
      (d) =>
        ((
          d.devices[1]!.channels as Record<string, Record<string, unknown>>[]
        )[0]!.parameters!.estimatedTravelTimeMs = 0),
      (d) =>
        ((
          d.devices[1]!.channels as Record<string, Record<string, unknown>>[]
        )[0]!.parameters!.bogus = 1),
      (d) =>
        ((d.devices[1]!.objects as Record<string, unknown>[])[0]!.ga =
          "40/1/1"),
      (d) => (d.devices[0]!.address = "1.1.256"),
      (d) =>
        ((d.devices[1]!.objects as Record<string, unknown>[])[0]!.port =
          "move2"),
    ];
    mutations.forEach((m, i) => {
      const d = structuredClone(base) as Parameters<typeof m>[0];
      m(d);
      expect(validate(d), `mutation ${i}: schema`).toBe(false);
      expect(
        () => buildScenario(d, standard),
        `mutation ${i}: engine`,
      ).toThrow();
    });
  });
});

describe("normalized export (toV2)", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const norm = (m: ReturnType<typeof buildScenario>) =>
    JSON.stringify(m, (_k, v) => (v instanceof Map ? [...v.entries()] : v));

  it.each(activeScenarios())(
    "%s: the export matches the schema and produces the same model",
    (f) => {
      const m1 = buildScenario(raw(f), standard);
      const v2doc = toV2(m1, standard);
      expect(validate(v2doc), JSON.stringify(validate.errors)).toBe(true);
      const m2 = buildScenario(v2doc, standard);
      expect(norm(m2)).toBe(norm(m1));
    },
  );
});

describe("error code documentation", () => {
  it("each code issued by the engine or interface is documented", () => {
    const codes = new Set<string>();
    for (const dir of ["src/knx", "src/ui"])
      for (const f of readdirSync(resolve(root, dir)).filter((x) =>
        x.endsWith(".ts"),
      )) {
        const s = readFileSync(resolve(root, dir, f), "utf8");
        for (const m of s.matchAll(
          /err\(\s*(?:`[^`]*`|"[^"]*"|[\w.]+)\s*,\s*"([a-z-]+)"/gs,
        ))
          codes.add(m[1]!);
        for (const m of s.matchAll(/code:\s*"([a-z-]+)"/g)) codes.add(m[1]!);
        for (const m of s.matchAll(/this\.warn\(\s*"([a-z-]+)"/g))
          codes.add(m[1]!);
      }
    const doc = readFileSync(
      resolve(root, "site/pages/reference/08-errors.md"),
      "utf8",
    );
    expect(
      [...codes].filter((c) => !new RegExp(`\\|\\s*\`${c}\`\\s*\\|`).test(doc)),
    ).toEqual([]);
    expect(codes.size).toBeGreaterThan(20);
  });
});
