import { assetVersion } from "./scripts/build-id.mjs";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { loadData } from "./scripts/site-data.mjs";
import { renderPage } from "./site/markdown.mjs";

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
  // Relative link to a page; directory URLs get index.html so that file:// works.
  eleventyConfig.addFilter("stripLeadingSlash", (url) =>
    url.replace(/^\//, "").replace(/(^|\/)$/, "$1index.html"),
  );
  eleventyConfig.addFilter(
    "sectionTitle",
    (section) =>
      ({ guide: "Guide", examples: "Examples", reference: "Reference" })[
        section
      ] ?? "",
  );
  eleventyConfig.addFilter("sectionGroups", (docs, section) => {
    const groups = new Map();
    for (const item of sectionPages(docs, section)) {
      const name = item.data.group ?? "";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(item);
    }
    return [...groups].map(([name, pages]) => ({ name, pages }));
  });
  eleventyConfig.addFilter("pager", (docs, section, url) => {
    const pages = sectionPages(docs, section);
    const index = pages.findIndex((item) => item.url === url);
    return { previous: pages[index - 1], next: pages[index + 1] };
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
  eleventyConfig.addCollection("docs", (collection) =>
    collection.getFilteredByGlob("site/pages/**/*.md"),
  );
  return {
    dir: { input: "site/pages", includes: "_includes", output: "docs" },
    templateFormats: ["md", "njk", "11ty.js"],
    markdownTemplateEngine: false,
  };
}
