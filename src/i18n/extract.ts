// Static extraction of t`...` messages from a source file: is used to test the
// catalogues and the preparation of a new language. Each ${...} becomes {0}, {1}...
// Small parser: it jumps strings and comments, and descends into ${...} expressions.

const TAGS = ["t", "tr", "hostTranslator()"];

function isTag(src: string, tick: number): boolean {
  const before = src.slice(Math.max(0, tick - 80), tick);
  if (/translator\([^()]*\)$/.test(before)) return true;
  return (
    TAGS.some(
      (tag) =>
        before.endsWith(tag) &&
        !/[\w$.]/.test(before[before.length - tag.length - 1] ?? " "),
    ) || /(?:this|ctx)\s*\.\s*(?:t|tr)$/.test(before)
  );
}

interface Scan {
  keys: string[];
}

/** Runs a template from i (just after ``). Returns the end and static text. */
function template(
  src: string,
  i: number,
  scan: Scan,
): { end: number; parts: string[] } {
  const parts: string[] = [];
  let cur = "";
  while (i < src.length) {
    const c = src[i]!;
    if (c === "\\") {
      const n = src[i + 1] ?? "";
      cur += n === "`" || n === "$" || n === "\\" ? n : c + n;
      i += 2;
      continue;
    }
    if (c === "`") return { end: i + 1, parts: [...parts, cur] };
    if (c === "$" && src[i + 1] === "{") {
      parts.push(cur);
      cur = "";
      i = code(src, i + 2, scan, "}");
      continue;
    }
    cur += c;
    i++;
  }
  return { end: i, parts: [...parts, cur] };
}

/** Runs from code to `close` (not interlocked) or end; collects labelled templates. */
function code(src: string, i: number, scan: Scan, close?: string): number {
  let depth = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === "/" && src[i + 1] === "/") {
      i = src.indexOf("\n", i);
      if (i < 0) return src.length;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i = src.indexOf("*/", i) + 2;
      if (i < 2) return src.length;
      continue;
    }
    // Regular literal expression: it may contain quotation marks or serious accents.
    if (
      c === "/" &&
      /[(,=:[!&|?{};]\s*$|^\s*$|return\s*$/.test(
        src.slice(Math.max(0, i - 12), i),
      )
    ) {
      let inClass = false;
      i++;
      while (i < src.length && src[i] !== "\n") {
        if (src[i] === "\\") i += 2;
        else if (src[i] === "[" || src[i] === "]") {
          inClass = src[i] === "[";
          i++;
        } else if (src[i] === "/" && !inClass) break;
        else i++;
      }
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      i++;
      while (i < src.length && src[i] !== c && src[i] !== "\n")
        i += src[i] === "\\" ? 2 : 1;
      i++;
      continue;
    }
    if (c === "`") {
      const tagged = isTag(src, i);
      const r = template(src, i + 1, scan);
      if (tagged)
        scan.keys.push(
          r.parts.reduce((a, s, k) => (k ? `${a}{${k - 1}}${s}` : s), ""),
        );
      i = r.end;
      continue;
    }
    if (close) {
      if (c === "{") depth++;
      else if (c === "}") {
        if (depth === 0) return i + 1;
        depth--;
      }
    }
    i++;
  }
  return i;
}

export function extractMessages(src: string): string[] {
  const scan: Scan = { keys: [] };
  code(src, 0, scan);
  return scan.keys;
}
