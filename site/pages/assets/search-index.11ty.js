import { readFileSync } from "node:fs";

function headingsFromMarkdown(path) {
  const headings = [];
  let inCode = false;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const match = /^(#{1,3})\s+(.+)$/.exec(line);
    if (!match) continue;
    const text = match[2]
      .replace(/`/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
    const id = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\w]+/g, "-")
      .replace(/^-|-$/g, "");
    headings.push([text, id, match[1].length]);
  }
  return headings;
}

/** Headings of a page; a translation takes the anchors of its source, heading by heading. */
function pageHeadings(item) {
  const own = headingsFromMarkdown(item.inputPath);
  const source = item.data.translationOf;
  if (source) {
    const en = headingsFromMarkdown(`site/pages/${source}`);
    if (en.length === own.length && en.every((h, i) => h[2] === own[i][2]))
      return own.map(([text], i) => [text, en[i][1]]);
  }
  return own.map(([text, id]) => [text, id]);
}

export default class SearchIndex {
  data() {
    return { layout: false, eleventyExcludeFromCollections: true };
  }
  render({ collections }) {
    const search = collections.docs.map((item) => ({
      t: item.data.title,
      u: item.url.replace(/^\//, "").replace(/(^|\/)$/, "$1index.html"),
      s: item.data.section ?? "",
      o: item.data.otherLanguage ?? undefined,
      h: pageHeadings(item),
    }));
    return `window.BUSDIAGRAM_SEARCH=${JSON.stringify(search)};\n`;
  }
}
