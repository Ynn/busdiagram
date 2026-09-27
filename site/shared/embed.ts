import { hostTranslator } from "../../src/i18n";
// Integration codes produced by the designer: tag to paste, standalone page, read link.
import type { ViewOptions } from "../../src/ui/options";
import { DEFAULT_OPTIONS, OPTION_DOCS } from "../../src/ui/options";
import { formatJson } from "./format-json";

/** HTML attributes for options that differ from their defaults. */
export function optionAttributes(options: Partial<ViewOptions>): string {
  return OPTION_DOCS.flatMap((d) => {
    const v = options[d.name];
    if (v === undefined || v === null || v === DEFAULT_OPTIONS[d.name])
      return [];
    if (v === true) return [` ${d.attribute}`];
    return [` ${d.attribute}="${String(v)}"`];
  }).join("");
}

export const escapeScript = (json: string) =>
  json.replace(/<\/(script)/gi, "<\\/$1");

/**
 * Contract to execute an extension, identical in the designer and in the pages delivered:
 * the script runs in its own function range. Two extensions can thus
 * declare the same internal variable; they communicate by BusDiagram only.
 */
export const wrapExtension = (source: string, name = "extension") =>
  `(function () {\n${source}\n})();\n//# sourceURL=${name.replace(/[^\w.-]/g, "_")}`;

/** Markup to paste into a page; load the bundle once in that page. */
export function embedSnippet(
  scenario: unknown,
  options: Partial<ViewOptions> = {},
  style = "",
): string {
  const attrs = optionAttributes(options) + (style ? ` style="${style}"` : "");
  return `<bus-diagram${attrs}>\n<script type="application/json">\n${escapeScript(formatJson(scenario))}\n</script>\n</bus-diagram>`;
}

/** standalone HTML page: built-in bundle, no external files, works offline. */
export function standalonePage(
  scenario: unknown,
  bundleSource: string,
  options: Partial<ViewOptions> = {},
  lang = "en",
  extensions: { name: string; source: string }[] = [],
): string {
  const title = String(
    (scenario as { title?: string })?.title ?? "BusDiagram",
  ).replace(/[<&]/g, "");
  return `<!doctype html>
<html lang="${lang.replace(/[^\w-]/g, "")}">
<head>
<meta charset="utf-8">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%231e9a6d'/><path d='M5 23h22' stroke='%23fff' stroke-width='3' stroke-linecap='round'/><rect x='7' y='8' width='7' height='9' rx='2' fill='%23fff2cc'/><rect x='18' y='8' width='7' height='9' rx='2' fill='%23fff2cc'/><path d='M10.5 17v6M21.5 17v6' stroke='%23fff' stroke-width='2'/></svg>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>body{margin:0;padding:16px;background:#fafaf7;font-family:system-ui,sans-serif}</style>
<script>${escapeScript(bundleSource)}</script>
${extensions.map((x) => `<script>${escapeScript(wrapExtension(x.source, x.name))}</script>\n`).join("")}
</head>
<body>
${embedSnippet(scenario, options)}
</body>
</html>
`;
}

// ── Share link: JSON compressed into the URL fragment (never sent to the server) ──

const b64url = (bytes: Uint8Array) => {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeShare(
  scenario: unknown,
  options: Partial<ViewOptions> = {},
  lang?: string,
): Promise<string> {
  const json = new TextEncoder().encode(
    JSON.stringify({ s: scenario, o: options, l: lang }),
  );
  return `d=${b64url(await pipe(json, new CompressionStream("deflate-raw")))}`;
}

export async function decodeShare(hash: string): Promise<{
  scenario: unknown;
  options: Partial<ViewOptions>;
  lang?: string;
}> {
  // Uncompressed form for hand-written or generated links: #json=<percent-encoded JSON>.
  const inline = /(?:^#|&)json=([^&]*)/.exec(hash)?.[1];
  if (inline !== undefined)
    return { scenario: JSON.parse(decodeURIComponent(inline)), options: {} };
  const d = new URLSearchParams(hash.replace(/^#/, "")).get("d");
  if (!d)
    throw new Error(
      hostTranslator()`Link without a scenario (parameter “d” missing).`,
    );
  const bytes = await pipe(
    fromB64url(d),
    new DecompressionStream("deflate-raw"),
  );
  const { s, o, l } = JSON.parse(new TextDecoder().decode(bytes)) as {
    s: unknown;
    o: Partial<ViewOptions>;
    l?: string;
  };
  return { scenario: s, options: o ?? {}, lang: l };
}
