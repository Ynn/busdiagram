// English is the source language of tagged messages. A catalog maps each English
// message (with numbered {0}, {1}, ... slots) to its localized wording.
import { frMessages } from "./fr";

export type Translate = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => string) & {
  /** Effective locale code, also used for number formatting. */
  lang?: string;
  /** Translate text supplied as data, such as a port or parameter title. */
  s?: (text: string) => string;
};

const catalogs = new Map<string, Record<string, string>>([["fr", frMessages]]);

/** Add to or replace entries in a locale catalog. */
export function registerMessages(
  lang: string,
  messages: Record<string, string>,
): void {
  if (typeof lang !== "string" || !lang)
    throw new TypeError(
      hostTranslator()`registerMessages: language code required`,
    );
  const key = lang.toLowerCase();
  catalogs.set(key, { ...(catalogs.get(key) ?? {}), ...messages });
  cache.clear();
}

export const availableLanguages = () => ["en", ...catalogs.keys()];

/** Copy of the registered catalogs, to cancel the messages of a refused extension. */
export type MessagesSnapshot = ReadonlyMap<string, Record<string, string>>;
export const saveMessages = (): MessagesSnapshot => new Map(catalogs);
export function restoreMessages(s: MessagesSnapshot): void {
  catalogs.clear();
  s.forEach((v, k) => catalogs.set(k, v));
  cache.clear();
}

/** Static message text with numbered interpolation slots. */
export function messageKey(strings: readonly string[]): string {
  return strings.reduce((a, s, i) => (i ? `${a}{${i - 1}}${s}` : s), "");
}

const cache = new Map<
  string,
  Translate & { lang: string; number: Intl.NumberFormat }
>();

export function translator(
  lang = "en",
): Translate & { lang: string; number: Intl.NumberFormat } {
  const full = lang.toLowerCase();
  const hit = cache.get(full);
  if (hit) return hit;
  const base = full.split("-")[0]!;
  const chain = base === "en" ? [] : [catalogs.get(full), catalogs.get(base)];
  const effective =
    base === "en" || catalogs.has(full) || catalogs.has(base) ? full : "en";
  const t = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const key = messageKey(strings);
    let template = key;
    for (const catalog of chain) {
      const translated = catalog?.[key];
      if (translated !== undefined) {
        template = translated;
        break;
      }
    }
    return template.replace(/\{(\d+)\}/g, (_match, index) =>
      String(values[Number(index)] ?? ""),
    );
  }) as Translate & { lang: string; number: Intl.NumberFormat };
  t.s = (source: string) => {
    for (const catalog of chain)
      if (catalog?.[source] !== undefined) return catalog[source]!;
    return source;
  };
  t.lang = effective;
  t.number = new Intl.NumberFormat(effective, { maximumFractionDigits: 3 });
  cache.set(full, t);
  return t;
}

/** Default English translator used by the engine. */
export const en = translator("en");
/** French translator, available to callers that explicitly select French. */
export const fr = translator("fr");

/** Forget cached translators after a catalog changes. */
export function resetTranslators() {
  cache.clear();
}

/** Translate developer-facing messages using the host page locale. */
export function hostTranslator(): Translate {
  const lang =
    typeof document !== "undefined" ? document.documentElement.lang : "";
  return translator(lang || "en");
}
