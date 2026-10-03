export interface FrenchPage {
  file: string;
  translationOf: string;
  sourceHash: string;
  currentHash: string | null;
  status: "ok" | "stale" | "orphan";
}
export const pagesDir: string;
export function sourceHash(englishPath: string): string;
export function frontMatter(text: string): Record<string, string>;
export function englishPages(): string[];
export function frenchPages(): FrenchPage[];
export const SCENARIO_TEXT_FIELDS: string[];
export function translations(
  root: string,
  lang: string,
): {
  interface: (text: string) => string;
  scenarios: (text: string) => string;
  reference: (text: string) => string;
};
export function translateScenario<T>(json: T, translate: (text: string) => string): T;
