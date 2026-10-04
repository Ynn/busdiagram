import { frenchPages, sourceHash } from "../../scripts/translations.mjs";

/** Published path of a page from its source path ("guide/05-devices.md" → "guide/devices.html"). */
const urlOf = (path) =>
  `${path.replace(/\.md$/, "").replace(/(^|\/)\d+-/, "$1")}.html`;

// French translation of each English page, if any (by source path).
const translations = new Map(
  frenchPages().map((p) => [p.translationOf, urlOf(p.file)]),
);

const stem = (data) => data.page.filePathStem.replace(/^\//, "");
const isFrench = (data) => stem(data).startsWith("fr/");

export default {
  layout: "layout.njk",
  eleventyComputed: {
    permalink: (data) =>
      /\/assets\/search-index/.test(data.page.filePathStem)
        ? `${stem(data)}.js`
        : `${stem(data).replace(/(^|\/)\d+-/, "$1")}.html`,
    lang: (data) => (isFrench(data) ? "fr" : "en"),
    section: (data) => {
      const parts = stem(data).split("/");
      const section = parts[isFrench(data) ? 1 : 0];
      return ["guide", "examples", "reference"].includes(section)
        ? section
        : null;
    },
    /** Path from this page to the root of the site. */
    base: (data) => "../".repeat(stem(data).split("/").length - 1),
    /** The page in the other language: the translation, or the English source. */
    otherLanguage: (data) => {
      if (isFrench(data))
        return data.translationOf ? urlOf(data.translationOf) : null;
      const source = data.page.inputPath
        .replace(/^\.\/site\/pages\//, "")
        .replace(/^site\/pages\//, "");
      return translations.get(source) ?? null;
    },
    /** A French page translated from an older version of its English page. */
    translationStale: (data) => {
      if (!isFrench(data) || !data.translationOf) return false;
      try {
        return sourceHash(data.translationOf) !== String(data.sourceHash);
      } catch {
        return true;
      }
    },
  },
};
