// The example of the guide on manufacturers' devices is these files
// (tests/knx/guide-example), compiled with the project and whose test runs: the code
// blocks of the guide, in English and in French (whose comments are translated), are
// their exact content.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const example = (p: string) => read(`tests/knx/guide-example/${p}`);
const model = example("src/sa-2/model.ts");
const at = model.indexOf("export const sa2 = {");
const files = [
  example("src/sa-2/firmware.ts"),
  model.slice(0, at).trimEnd() + "\n",
  model.slice(at),
  example("src/devices.ts"),
  example("tests/sa-2.test.ts"),
];
// The code without its comments, which the French guide translates.
const code = (s: string) =>
  s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
const blocks = (page: string) =>
  [...read(page).matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => code(m[1]!));

describe("the example of the guide on manufacturers' devices", () => {
  for (const page of [
    "site/pages/guide/12-manufacturer-devices.md",
    "site/pages/fr/guide/12-manufacturer-devices.md",
  ])
    it(`is in ${page} as it is compiled and tested`, () => {
      const shown = blocks(page);
      for (const f of files) expect(shown, f.slice(0, 60)).toContain(code(f));
    });
});
