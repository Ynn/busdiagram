// What must not be published is refused by the rules of the publication check
// (.pre-commit-config.yaml) and ignored by git, tried on witness paths and texts.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const config = readFileSync(resolve(root, ".pre-commit-config.yaml"), "utf8");

// The pattern of a hook: its `files` or `entry`, single-quoted in YAML.
function pattern(id: string, key: "files" | "entry") {
  const at = config.indexOf(`- id: ${id}`);
  const m = new RegExp(`\\n\\s*${key}: '((?:[^']|'')*)'`).exec(
    config.slice(at),
  );
  if (at < 0 || !m) throw new Error(`no ${key} for ${id}`);
  return new RegExp(m[1]!.replaceAll("''", "'"));
}

const local = [
  ".vitest/json/output.json",
  ".local/notes.md",
  "dist/bus-diagram.js",
  "test-results/run.json",
  "coverage/index.html",
  "tests/out.log",
];

describe("publication rules", () => {
  it("refuse the local and generated files", () => {
    const forbidden = pattern("forbidden-publication-paths", "files");
    for (const p of local) expect(p, p).toMatch(forbidden);
    for (const p of [
      "src/core.ts",
      "tests/knx/sim.test.ts",
      "site/pages/guide/07-ets.md",
    ])
      expect(p).not.toMatch(forbidden);
  });

  it("are ignored by git, so that adding everything leaves them out", () => {
    for (const p of local) {
      const out = execFileSync("git", ["check-ignore", "--no-index", p], {
        cwd: root,
      })
        .toString()
        .trim();
      expect(out, p).toBe(p);
    }
  });

  it("refuse the absolute path of a local account", () => {
    const paths = pattern("no-local-paths", "entry");
    // Joined here, so that this file does not hold one.
    const u = ["Users", "home"].map((d) => d + "/someone");
    for (const t of [
      `"file": "C:/${u[0]}/project/tests/a.test.ts"`,
      `C:\\${u[0]!.replace("/", "\\")}\\x`,
      `/${u[1]}/src`,
      `/${u[0]}/src`,
    ])
      expect(t, t).toMatch(paths);
    for (const t of [
      "C:/Program Files/nodejs",
      "the Users guide",
      "/usr/bin/node",
      "./home/index.html",
    ])
      expect(t, t).not.toMatch(paths);
  });
});
