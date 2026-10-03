// French documentation: each page translates an existing English page (translationOf),
// records the version it was translated from (sourceHash), and keeps the structure of its
// source: same headings, code blocks, diagrams, and tables. A translation of an older
// version is allowed (the page then shows a banner); its structure is not compared.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { frenchPages, pagesDir } from "../../scripts/translations.mjs";

/** Structure of a page: levels of its headings, kinds of its code blocks, table count. */
function structure(text: string) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, "");
  const headings: number[] = [];
  const blocks: string[] = [];
  let tables = 0;
  let inCode = false;
  let inTable = false;
  for (const line of body.split("\n")) {
    const fence = /^\s*```(\w*)/.exec(line);
    if (fence) {
      if (!inCode) blocks.push(fence[1] || "text");
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const h = /^(#{1,6})\s/.exec(line);
    if (h) headings.push(h[1]!.length);
    const row = /^\|.*\|\s*$/.test(line);
    if (row && !inTable) tables++;
    inTable = row;
  }
  return { headings, blocks, tables };
}

/** Code spans of each heading: identifiers, the same in every language. */
function headingCode(text: string) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, "");
  const out: string[] = [];
  let inCode = false;
  for (const line of body.split("\n")) {
    if (/^\s*```/.test(line)) inCode = !inCode;
    else if (!inCode && /^#{1,6}\s/.test(line))
      out.push((line.match(/`[^`]+`/g) ?? []).join(" "));
  }
  return out;
}

describe("French documentation", () => {
  const pages = frenchPages();

  it("translates existing English pages, each once, with a fingerprint", () => {
    expect(pages.length).toBeGreaterThan(0);
    for (const p of pages) {
      expect(existsSync(join(pagesDir, p.translationOf)), p.file).toBe(true);
      expect(p.sourceHash, p.file).toMatch(/^[0-9a-f]{12}$/);
    }
    const sources = pages.map((p) => p.translationOf);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it.each(pages.filter((p) => p.status === "ok").map((p) => [p.file, p]))(
    "%s keeps the structure of its English page",
    (_file, p) => {
      const fr = structure(readFileSync(join(pagesDir, p.file), "utf8"));
      const en = structure(
        readFileSync(join(pagesDir, p.translationOf), "utf8"),
      );
      expect(fr).toEqual(en);
      // A translated page takes the anchors of its source by position: the headings must
      // stay in the same order; their code spans (identifiers) show it.
      expect(headingCode(readFileSync(join(pagesDir, p.file), "utf8"))).toEqual(
        headingCode(readFileSync(join(pagesDir, p.translationOf), "utf8")),
      );
    },
  );
});
