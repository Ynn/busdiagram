// Share link: a scenario, its display options, and its language, compressed into the URL
// fragment (never sent to the server). Used by the designer, the player, and the
// “Open in the designer” link of the component.
import { hostTranslator } from "./i18n";
import type { ViewOptions } from "./ui/options";

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
  // Without compression streams (older browsers), the plain form: the scenario only.
  if (typeof CompressionStream === "undefined")
    return `json=${encodeURIComponent(JSON.stringify(scenario))}`;
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
