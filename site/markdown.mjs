import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Marked } from "marked";
import { expand } from "../scripts/site-reference.mjs";

// ── Minimal syntax highlighting (JSON, JS, HTML, shell) ──────────────────────
const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function highlightJs(code) {
  const re =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(const|let|var|function|return|new|await|async|import|from|export|if|else|true|false|null|undefined|for|of)\b|(-?\b\d+(?:\.\d+)?\b)/g;
  let out = "";
  let last = 0;
  for (const m of code.matchAll(re)) {
    out += esc(code.slice(last, m.index));
    const [t] = m;
    const cls = m[1]
      ? "c"
      : m[2]
        ? /^"[^"]*"\s*$/.test(t) &&
          code.slice(m.index + t.length).match(/^\s*:/)
          ? "k"
          : "s"
        : m[3]
          ? "kw"
          : "n";
    out += `<span class="${cls}">${esc(t)}</span>`;
    last = m.index + t.length;
  }
  return out + esc(code.slice(last));
}
function highlightHtml(code) {
  let out = "";
  let last = 0;
  const re =
    /(<!--[\s\S]*?-->)|(<\/?)([\w-]+)((?:\s+[\w:-]+(?:="[^"]*")?)*)\s*(\/?>)/g;
  for (const m of code.matchAll(re)) {
    out += esc(code.slice(last, m.index));
    if (m[1]) out += `<span class="c">${esc(m[1])}</span>`;
    else {
      const attrs = m[4].replace(
        /([\w:-]+)(="[^"]*")?/g,
        (_a, n, v) =>
          `<span class="a">${esc(n)}</span>${v ? `=<span class="s">${esc(v.slice(1))}</span>` : ""}`,
      );
      out += `${esc(m[2])}<span class="t">${m[3]}</span>${attrs}${esc(m[5])}`;
    }
    last = m.index + m[0].length;
  }
  out += esc(code.slice(last));
  return out;
}
export function highlight(code, lang) {
  if (lang === "html") return highlightHtml(code);
  if (["json", "js", "javascript", "ts", "typescript", "jsonc"].includes(lang))
    return highlightJs(code);
  if (lang === "bash" || lang === "sh")
    return esc(code).replace(/(#[^\n]*)/g, '<span class="c">$1</span>');
  return esc(code);
}

// ── Readable JSON formatting (matches the designer) ────────────────────────
function inline(v) {
  if (Array.isArray(v))
    return v.length ? `[${v.map(inline).join(", ")}]` : "[]";
  if (v && typeof v === "object") {
    const e = Object.entries(v).filter(([, x]) => x !== undefined);
    return e.length
      ? `{ ${e.map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(", ")} }`
      : "{}";
  }
  return JSON.stringify(v);
}
export function formatJson(v, indent = 0, width = 100, prefix = 0) {
  const one = inline(v);
  if (
    indent + prefix + one.length <= width ||
    v === null ||
    typeof v !== "object"
  )
    return one;
  const pad = " ".repeat(indent + 2);
  if (Array.isArray(v))
    return `[\n${v.map((x) => pad + formatJson(x, indent + 2, width)).join(",\n")}\n${" ".repeat(indent)}]`;
  return `{\n${Object.entries(v)
    .filter(([, x]) => x !== undefined)
    .map(
      ([k, x]) =>
        pad +
        `${JSON.stringify(k)}: ` +
        formatJson(x, indent + 2, width, JSON.stringify(k).length + 2),
    )
    .join(",\n")}\n${" ".repeat(indent)}}`;
}

function makeRenderer(root, page, examples) {
  let n = 0;
  const marked = new Marked();
  marked.use({
    renderer: {
      code({ text, lang }) {
        const [language, flag] = (lang ?? "").split(/\s+/);
        if (language === "knx") return examples(text, `ex${++n}`);
        if (flag === "live")
          return `<figure class="live"><pre class="code"><code>${highlight(text, language)}</code></pre><div class="live-out">${text}</div></figure>`;
        return `<pre class="code"><code>${highlight(text, language)}</code></pre>`;
      },
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        // Plain heading text: strip tags and decode entities (&#39;, &lt;…).
        const plain = inner
          .replace(/<[^>]+>/g, "")
          .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&");
        const id = plain
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^\w]+/g, "-")
          .replace(/^-|-$/g, "");
        page.headings.push({ depth, id, text: plain });
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}">#</a>${inner}</h${depth}>`;
      },
      table(token) {
        const html = marked.Renderer.prototype.table.call(this, token);
        return `<div class="table">${html}</div>`;
      },
    },
  });
  return marked;
}

export function renderPage(source, pageData, siteData, scenarios, root) {
  const data = siteData;
  const page = { out: pageData.page.url, headings: [] };
  const base = pageData.base ?? (pageData.section ? "../" : "");
  const fr = pageData.lang === "fr";
  const examples = (spec, id) => {
    const conf = Object.fromEntries(
      spec
        .trim()
        .split("\n")
        .map((l) => [
          l.slice(0, l.indexOf(":")).trim(),
          l.slice(l.indexOf(":") + 1).trim(),
        ]),
    );
    let json;
    if (conf.scenario)
      json =
        scenarios.get(conf.scenario) &&
        data.normalize(scenarios.get(conf.scenario));
    else if (conf.file)
      json = JSON.parse(readFileSync(resolve(root, conf.file)));
    if (!json)
      throw new Error(`${page.out} : example with unknown scenario (${spec})`);
    const attrs = conf.attrs ? ` ${conf.attrs}` : "";
    const style = conf.style ? ` style="${conf.style}"` : "";
    const jsonText = formatJson(json);
    const htmlCode = `<bus-diagram${attrs}${style}>\n<script type="application/json">\n${jsonText}\n</script>\n</bus-diagram>`;
    const tabs =
      conf.tabs === "none"
        ? []
        : (conf.tabs ?? "html,json").split(",").map((t) => t.trim());
    const tabHtml = tabs
      .map(
        (t, i) =>
          `<button role="tab" aria-selected="${i === 0}" data-tab="${id}-${t}">${t === "html" ? "HTML" : t === "json" ? "JSON" : t}</button>`,
      )
      .join("");
    const panels = tabs
      .map(
        (t, i) =>
          `<pre class="code" id="${id}-${t}"${i ? " hidden" : ""}><code>${t === "html" ? highlight(htmlCode, "html") : highlight(jsonText, "json")}</code></pre>`,
      )
      .join("");
    return `<figure class="example" id="${id}">
<div class="demo"><bus-diagram${attrs}${style}><script type="application/json">${JSON.stringify(json).replace(/<\//g, "<\\/")}</script></bus-diagram></div>
${tabs.length ? `<div class="tabs" role="tablist">${tabHtml}${conf.scenario ? `<a class="try" href="${base}designer/index.html#template=${conf.scenario}" title="${fr ? "Ouvrir dans le designer" : "Open in designer"}">${fr ? "Modifier dans le designer ↗" : "Edit in designer ↗"}</a>` : ""}</div>` : ""}
${panels}
</figure>`;
  };
  const md = makeRenderer(root, page, examples);
  const html = md.parse(expand(source, siteData, root));
  return { html, headings: page.headings };
}
