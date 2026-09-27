// Semantic Versioning: one version in package.json, exposed at run time and checked on release.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { version } from "../../src/core";

const root = resolve(import.meta.dirname, "../..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const check = (...args: string[]) =>
  execFileSync("node", ["scripts/check-version.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });

describe("library version", () => {
  it("exposes the package.json version", () => {
    expect(version).toBe(pkg.version);
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("accepts the matching release tag and refuses another one", () => {
    expect(check(`v${pkg.version}`)).toContain("consistent");
    expect(() => check("v99.0.0")).toThrow();
  });

  it("documents the current version in CHANGELOG.md", () => {
    const changelog = readFileSync(resolve(root, "CHANGELOG.md"), "utf8");
    expect(changelog).toContain(`## [${pkg.version}]`);
  });
});
