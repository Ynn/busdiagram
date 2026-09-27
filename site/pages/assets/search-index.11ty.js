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
    headings.push([text, id]);
  }
  return headings;
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
      h: headingsFromMarkdown(item.inputPath),
    }));
    return `window.BUSDIAGRAM_SEARCH=${JSON.stringify(search)};\n`;
  }
}
