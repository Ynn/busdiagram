// Translations of the documentation: each French page in site/pages/fr/ names the English
// page it translates (translationOf) and the fingerprint of the English version it was
// translated from (sourceHash). The English pages are the reference.
//   node scripts/translations.mjs                 status of every page (up to date, stale, missing)
//   node scripts/translations.mjs --stamp <file>  record the current English version in a French page
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export const pagesDir = resolve(import.meta.dirname, "../site/pages");
const frDir = join(pagesDir, "fr");

/** Fingerprint of an English page: the first 12 hex digits of the SHA-256 of its file. */
export const sourceHash = (englishPath) =>
  createHash("sha256")
    .update(readFileSync(join(pagesDir, englishPath), "utf8"))
    .digest("hex")
    .slice(0, 12);

/** Front matter fields of a Markdown page (flat "key: value" lines). */
export function frontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  const out = {};
  for (const line of m ? m[1].split("\n") : []) {
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (kv) out[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".md") ? [p] : [];
  });

/** English pages (outside fr/ and _includes/). */
export const englishPages = () =>
  walk(pagesDir)
    .map((p) => relative(pagesDir, p))
    .filter((p) => !p.startsWith("fr/") && !p.startsWith("_"));

/** French pages and their translation status. */
export function frenchPages() {
  return walk(frDir).map((p) => {
    const fm = frontMatter(readFileSync(p, "utf8"));
    const of = fm.translationOf ?? "";
    let current = null;
    try {
      current = sourceHash(of);
    } catch {
      current = null;
    }
    return {
      file: relative(pagesDir, p),
      translationOf: of,
      sourceHash: fm.sourceHash ?? "",
      currentHash: current,
      status:
        current === null ? "orphan" : current === fm.sourceHash ? "ok" : "stale",
    };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const stamp = process.argv.indexOf("--stamp");
  if (stamp > 0) {
    const file = process.argv[stamp + 1];
    const path = join(pagesDir, file.replace(/^site\/pages\//, ""));
    const text = readFileSync(path, "utf8");
    const of = frontMatter(text).translationOf;
    const hash = sourceHash(of);
    writeFileSync(
      path,
      text.replace(/^sourceHash:.*$/m, `sourceHash: ${hash}`),
    );
    console.log(`${file}: translates ${of} at ${hash}`);
  } else {
    const fr = frenchPages();
    const translated = new Set(fr.map((p) => p.translationOf));
    for (const p of fr) console.log(`${p.status.padEnd(7)} ${p.file} ← ${p.translationOf}`);
    const missing = englishPages().filter((p) => !translated.has(p));
    for (const p of missing) console.log(`missing ${p}`);
    console.log(
      `${fr.filter((p) => p.status === "ok").length} up to date, ${fr.filter((p) => p.status === "stale").length} stale, ${missing.length} not translated`,
    );
  }
}
