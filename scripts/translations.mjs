// Translations of the documentation: each French page in site/pages/fr/ names the English
// page it translates (translationOf) and the fingerprint of the English version it was
// translated from (sourceHash). The English pages are the reference.
//   node scripts/translations.mjs                 status of every page (up to date, stale, missing)
//   node scripts/translations.mjs --stamp <file>  record the current English version in a French page
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

export const pagesDir = resolve(import.meta.dirname, "../site/pages");
const i18nDir = resolve(import.meta.dirname, "../site/i18n");

/** Texts shown in the diagrams of the scenarios: these fields of any object. */
export const SCENARIO_TEXT_FIELDS = [
  "title",
  "description",
  "name",
  "label",
  "keyLabel",
];

const readDictionary = (lang, name) => {
  const path = join(i18nDir, lang, `${name}.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
};

/**
 * Dictionaries of a language, English text → translation: `interface` (labels of the
 * documentation), `scenarios` (texts of the diagrams), and `reference` (texts generated
 * from the code, then the interface labels). A text without translation stays in English.
 */
export function translations(_root, lang) {
  if (lang === "en") {
    const same = (text) => text;
    return { interface: same, scenarios: same, reference: same };
  }
  const ui = readDictionary(lang, "interface");
  const scenarios = readDictionary(lang, "scenarios");
  const reference = readDictionary(lang, "reference");
  const lookup = (dict) => (text) =>
    typeof text === "string" && text ? (dict[text] ?? text) : text;
  return {
    interface: lookup(ui),
    scenarios: lookup(scenarios),
    reference: lookup({ ...ui, ...reference }),
  };
}

/** A copy of a scenario with its texts translated. */
export function translateScenario(json, translate) {
  if (Array.isArray(json))
    return json.map((x) => translateScenario(x, translate));
  if (!json || typeof json !== "object") return json;
  return Object.fromEntries(
    Object.entries(json).map(([key, value]) => [
      key,
      typeof value === "string" && SCENARIO_TEXT_FIELDS.includes(key)
        ? translate(value)
        : translateScenario(value, translate),
    ]),
  );
}
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
        current === null
          ? "orphan"
          : current === fm.sourceHash
            ? "ok"
            : "stale",
    };
  });
}

/**
 * Texts of the French pages that need a dictionary entry: texts of their diagrams and of
 * their generated reference blocks. Uses the site data built by Eleventy.
 */
export async function neededTexts(lang = "fr") {
  const root = resolve(import.meta.dirname, "..");
  const cache = join(root, "node_modules/.cache/bus-diagram-site/data.mjs");
  if (!existsSync(cache)) return null;
  const { data, normalize } = await import(`${cache}?t=${Date.now()}`);
  const { expand } = await import("./site-reference.mjs");
  const scenarios = new Set();
  const reference = new Set();
  const collect = (json) =>
    translateScenario(json, (text) => (scenarios.add(text), text));
  for (const page of walk(join(pagesDir, lang))) {
    const body = readFileSync(page, "utf8").replace(
      /^---\n[\s\S]*?\n---\n/,
      "",
    );
    for (const m of body.matchAll(/```knx\n([\s\S]*?)```/g)) {
      const scenario = /^scenario:\s*(\S+)/m.exec(m[1])?.[1];
      const file = /^file:\s*(\S+)/m.exec(m[1])?.[1];
      // As the pages show them: scenarios normalized, files as written.
      if (scenario)
        collect(
          normalize(
            JSON.parse(
              readFileSync(join(root, "scenarios", `${scenario}.json`), "utf8"),
            ),
          ),
        );
      else if (file)
        collect(JSON.parse(readFileSync(join(root, file), "utf8")));
    }
    if (/\{\{(options|json:\w+|behaviors|equipment|dpts|ports)\}\}/.test(body))
      expand(body, data, root, lang, (text) => {
        if (typeof text === "string" && text) reference.add(text);
        return text;
      });
  }
  return { scenarios, reference };
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
    for (const p of fr)
      console.log(`${p.status.padEnd(7)} ${p.file} ← ${p.translationOf}`);
    const missing = englishPages().filter((p) => !translated.has(p));
    for (const p of missing) console.log(`missing ${p}`);
    console.log(
      `${fr.filter((p) => p.status === "ok").length} up to date, ${fr.filter((p) => p.status === "stale").length} stale, ${missing.length} not translated`,
    );
    const needed = await neededTexts("fr");
    if (!needed) console.log("Build the site to check the dictionaries.");
    else
      for (const name of ["scenarios", "reference"]) {
        const dict = readDictionary("fr", name);
        const known =
          name === "reference"
            ? { ...readDictionary("fr", "interface"), ...dict }
            : dict;
        const absent = [...needed[name]].filter((text) => !(text in known));
        const unused = Object.keys(dict).filter(
          (text) => !needed[name].has(text),
        );
        for (const text of absent)
          console.log(`untranslated ${name}: ${JSON.stringify(text)}`);
        console.log(
          `site/i18n/fr/${name}.json: ${absent.length} missing, ${unused.length} unused`,
        );
      }
  }
}
