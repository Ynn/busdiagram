import { assetVersion } from "./scripts/build-id.mjs";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { loadData } from "./scripts/site-data.mjs";
import { renderPage } from "./site/markdown.mjs";
import { frenchPages } from "./scripts/translations.mjs";

const root = resolve(import.meta.dirname);
const siteData = loadData(root);
const scenarios = (async () => {
  const entries = await readdir(resolve(root, "scenarios"));
  return new Map(
    await Promise.all(
      entries
        .filter((name) => name.endsWith(".json"))
        .map(async (name) => [
          name.replace(/\.json$/, ""),
          JSON.parse(await readFile(resolve(root, "scenarios", name), "utf8")),
        ]),
    ),
  );
})();

const sectionPages = (docs, section) =>
  docs
    .filter((item) => item.data.section === section && !item.data.hidden)
    .sort(
      (a, b) =>
        Number(a.data.order ?? 99) - Number(b.data.order ?? 99) ||
        a.url.localeCompare(b.url),
    );

// Labels of the documentation interface, in French (English is the source).
const FR = {
  Guide: "Guide",
  Examples: "Exemples",
  Reference: "Référence",
  Designer: "Designer",
  "Getting started": "Premiers pas",
  "Write a scenario": "Écrire un scénario",
  Installations: "Installations",
  "Simulation model": "Modèle de simulation",
  Integrate: "Intégrer",
  Integration: "Intégration",
  "For developers": "Pour les développeurs",
  Tools: "Outils",
  "Systems and mechanisms": "Systèmes et mécanismes",
  "Search…": "Rechercher…",
  "Search documentation": "Rechercher dans la documentation",
  Download: "Télécharger",
  "On this page": "Sur cette page",
  "offline documentation": "documentation hors ligne",
  "Source code (GitHub)": "Code source (GitHub)",
  Changes: "Modifications",
  "Third-party notices": "Mentions des tiers",
};
const tr = (text, lang) => (lang === "fr" ? (FR[text] ?? text) : text);

/**
 * Pages of a section in a language: the English order; in French, each page translated
 * if a translation exists, otherwise the English page (marked as such).
 */
function localizedPages(collections, section, lang) {
  const english = sectionPages(collections.docs, section);
  if (lang !== "fr") return english;
  const byUrl = new Map(
    collections.docsFr.map((item) => [item.data.otherLanguage, item]),
  );
  return english.map((item) => {
    const fr = byUrl.get(item.url.replace(/^\//, ""));
    return fr ?? { ...item, untranslated: true };
  });
}

const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));

export default function (eleventyConfig) {
  eleventyConfig.addGlobalData("version", pkg.version);
  // Version in the asset URLs: changes with every development build (see build-id.mjs).
  eleventyConfig.addGlobalData(
    "assetVersion",
    encodeURIComponent(assetVersion(pkg.version)),
  );
  // Web address of the source repository, from package.json.
  eleventyConfig.addGlobalData(
    "repository",
    pkg.repository.url.replace(/^git\+/, "").replace(/\.git$/, ""),
  );
  eleventyConfig.addFilter("sectionPages", sectionPages);
  eleventyConfig.addFilter("tr", tr);
  // Relative link to a page; directory URLs get index.html so that file:// works.
  eleventyConfig.addFilter("stripLeadingSlash", (url) =>
    url.replace(/^\//, "").replace(/(^|\/)$/, "$1index.html"),
  );
  eleventyConfig.addFilter("sectionTitle", (section, lang) =>
    tr(
      ({ guide: "Guide", examples: "Examples", reference: "Reference" })[
        section
      ] ?? "",
      lang,
    ),
  );
  eleventyConfig.addFilter("sectionGroups", (collections, section, lang) => {
    const groups = new Map();
    for (const item of localizedPages(collections, section, lang)) {
      // Groups follow the English pages, named in the language of the page.
      const english = item.untranslated
        ? item
        : (collections.docs.find(
            (x) => x.url.replace(/^\//, "") === item.data.otherLanguage,
          ) ?? item);
      const name = tr(english.data.group ?? "", lang);
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(item);
    }
    return [...groups].map(([name, pages]) => ({ name, pages }));
  });
  eleventyConfig.addFilter("pager", (collections, section, url, lang) => {
    const pages = localizedPages(collections, section, lang);
    const index = pages.findIndex((item) => item.url === url);
    return { previous: pages[index - 1], next: pages[index + 1] };
  });
  // In a French page, a link to a page that has no French version (yet), to an asset, or
  // to the designer goes to the English site: same path without "fr/".
  const frenchOutputs = new Set(
    frenchPages().map(
      (p) =>
        `${p.file.replace(/\.md$/, "").replace(/(^|\/)\d+-/, "$1")}.html`,
    ),
  );
  eleventyConfig.addTransform("french-links", function (content) {
    const out = (this.page.outputPath ?? "").replace(/\\/g, "/");
    const rel = out.replace(/^.*?docs\//, "");
    if (!rel.startsWith("fr/") || !rel.endsWith(".html")) return content;
    const dir = rel.split("/").slice(0, -1);
    return content.replace(
      /(href|src)="(?![a-z]+:|#|\/|data:)([^"#?]+)([^"]*)"/g,
      (match, attr, path, rest) => {
        const parts = [...dir];
        for (const seg of path.split("/")) {
          if (seg === "..") parts.pop();
          else if (seg !== ".") parts.push(seg);
        }
        const target = parts.join("/");
        if (!target.startsWith("fr/") || frenchOutputs.has(target)) return match;
        const english = target.slice(3);
        const up = "../".repeat(dir.length);
        return `${attr}="${up}${english}${rest}"`;
      },
    );
  });
  eleventyConfig.addExtension("md", {
    compile(content) {
      return async (pageData) => {
        const result = renderPage(
          content,
          pageData,
          await siteData,
          await scenarios,
          root,
        );
        pageData.headings = result.headings;
        return result.html;
      };
    },
  });
  // English pages (the reference), and their French translations.
  eleventyConfig.addCollection("docs", (collection) =>
    collection
      .getFilteredByGlob("site/pages/**/*.md")
      .filter((item) => !item.inputPath.includes("/pages/fr/")),
  );
  eleventyConfig.addCollection("docsFr", (collection) =>
    collection.getFilteredByGlob("site/pages/fr/**/*.md"),
  );
  return {
    dir: { input: "site/pages", includes: "_includes", output: "docs" },
    templateFormats: ["md", "njk", "11ty.js"],
    markdownTemplateEngine: false,
  };
}
