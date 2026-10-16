// Minimal XML reader for the KNX product databases (knx_master.xml, Catalog, Hardware,
// application programs): elements, attributes, text; no DTD, no namespaces resolution
// (prefixes are dropped). Written for speed on files of tens of megabytes, without
// depending on a DOM, so that it runs the same in the browser and in tests.

export interface XmlElement {
  name: string;
  attrs: Record<string, string>;
  children: XmlElement[];
  text: string;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decode(s: string): string {
  if (s.indexOf("&") < 0) return s;
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, e: string) => {
    if (e[0] === "#")
      return String.fromCodePoint(
        e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10),
      );
    return ENTITIES[e] ?? m;
  });
}

const local = (n: string) => {
  const i = n.indexOf(":");
  return i < 0 ? n : n.slice(i + 1);
};

/** Parse an XML document; throws on malformed markup. */
export function parseXml(src: string): XmlElement {
  const root: XmlElement = {
    name: "#document",
    attrs: {},
    children: [],
    text: "",
  };
  const stack: XmlElement[] = [root];
  let i = 0;
  const n = src.length;
  const attrRe = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  while (i < n) {
    const lt = src.indexOf("<", i);
    if (lt < 0) break;
    if (lt > i) {
      const top = stack[stack.length - 1]!;
      const t = src.slice(i, lt);
      if (top !== root && t.trim()) top.text += decode(t);
    }
    const c = src.charCodeAt(lt + 1);
    if (c === 0x3f /* ? */) {
      i = src.indexOf("?>", lt) + 2;
      continue;
    }
    if (c === 0x21 /* ! */) {
      if (src.startsWith("<!--", lt)) i = src.indexOf("-->", lt) + 3;
      else if (src.startsWith("<![CDATA[", lt)) {
        const end = src.indexOf("]]>", lt);
        stack[stack.length - 1]!.text += src.slice(lt + 9, end);
        i = end + 3;
      } else i = src.indexOf(">", lt) + 1;
      continue;
    }
    const gt = src.indexOf(">", lt);
    if (gt < 0) throw new Error("unterminated tag");
    if (c === 0x2f /* / */) {
      const name = local(src.slice(lt + 2, gt).trim());
      const top = stack.pop();
      if (!top || top.name !== name)
        throw new Error(`mismatched </${name}> at ${lt}`);
      i = gt + 1;
      continue;
    }
    // Attribute values cannot contain ">" unescaped in these files, except inside
    // quotes: find the real end of the tag.
    let end = lt + 1;
    for (let q = 0; ; end++) {
      if (end >= n) throw new Error("unterminated tag");
      const ch = src.charCodeAt(end);
      if (q) {
        if (ch === q) q = 0;
      } else if (ch === 0x22 || ch === 0x27) q = ch;
      else if (ch === 0x3e) break;
    }
    const selfClosing = src.charCodeAt(end - 1) === 0x2f;
    const body = src.slice(lt + 1, selfClosing ? end - 1 : end);
    const sp = body.search(/\s/);
    const name = local(sp < 0 ? body : body.slice(0, sp));
    const attrs: Record<string, string> = {};
    if (sp >= 0) {
      attrRe.lastIndex = sp;
      let m: RegExpExecArray | null;
      while ((m = attrRe.exec(body))) {
        const key = local(m[1]!);
        attrs[key] = decode(m[3] ?? m[4] ?? "");
      }
    }
    const el: XmlElement = { name, attrs, children: [], text: "" };
    stack[stack.length - 1]!.children.push(el);
    if (!selfClosing) stack.push(el);
    i = end + 1;
  }
  if (stack.length !== 1) throw new Error(`unclosed <${stack.at(-1)!.name}>`);
  const doc = root.children[0];
  if (!doc) throw new Error("empty document");
  return doc;
}

/** First child of a name, or undefined. */
export const child = (e: XmlElement | undefined, name: string) =>
  e?.children.find((c) => c.name === name);

/** Children of a name. */
export const kids = (e: XmlElement | undefined, name: string) =>
  e ? e.children.filter((c) => c.name === name) : [];

/** Every descendant of a name, depth first. */
export function descendants(e: XmlElement, name: string): XmlElement[] {
  const out: XmlElement[] = [];
  const walk = (x: XmlElement) => {
    for (const c of x.children) {
      if (c.name === name) out.push(c);
      walk(c);
    }
  };
  walk(e);
  return out;
}
