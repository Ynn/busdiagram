// CDN tags of the site: a release build loads itself; a development build loads the last
// published version, whose hash is recorded, since its own file was never published.
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { release } from "../../scripts/site-reference.mjs";

const PUBLISHED = { version: "0.5.0", integrity: "sha384-published" };

function root(version: string, banner: string) {
  const dir = mkdtempSync(join(tmpdir(), "bd-release-"));
  mkdirSync(join(dir, "dist"));
  mkdirSync(join(dir, "site"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ version }));
  writeFileSync(join(dir, "site/release.json"), JSON.stringify(PUBLISHED));
  const bundle = `/*! BusDiagram v${banner} | AGPL-3.0-only */\nconsole.log(1);\n`;
  writeFileSync(join(dir, "dist/bus-diagram.js"), bundle);
  const hash = `sha384-${createHash("sha384").update(bundle).digest("base64")}`;
  return { dir, hash };
}

describe("CDN version of the site", () => {
  it("a development build points to the last published version and its hash", () => {
    const { dir } = root("0.5.0", "0.5.0+dev.abc1234.modified");
    expect(release(dir)).toEqual(PUBLISHED);
  });

  it("a release build of a new version uses its own file", () => {
    const { dir, hash } = root("0.5.1", "0.5.1");
    expect(release(dir)).toEqual({ version: "0.5.1", integrity: hash });
  });

  it("a release build of the recorded version, with the same file, is accepted", () => {
    const { dir, hash } = root("0.5.0", "0.5.0");
    writeFileSync(
      join(dir, "site/release.json"),
      JSON.stringify({ version: "0.5.0", integrity: hash }),
    );
    expect(release(dir)).toEqual({ version: "0.5.0", integrity: hash });
  });

  it("a release build that differs from the recorded published file is refused", () => {
    const { dir } = root("0.5.0", "0.5.0");
    expect(() => release(dir)).toThrow(/differs from the published file/);
  });
});
