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
