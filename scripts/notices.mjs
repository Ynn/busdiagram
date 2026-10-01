// Licenses of the third-party packages distributed with BusDiagram, shared by the
// notice files (build-notices.mjs) and the banner of the library (vite.config.ts).
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

// Direct dependencies bundled in the site (designer, slides) and in the library.
export const SITE = [
  "@codemirror/autocomplete",
  "@codemirror/commands",
  "@codemirror/lang-json",
  "@codemirror/language",
  "@codemirror/lint",
  "@codemirror/state",
  "@codemirror/view",
  "@lezer/common",
  "ajv",
  "codemirror",
  "lit",
  "reveal.js",
];
export const LIBRARY = ["lit"];

/** License sections of the given packages and their dependencies. */
export function notices(roots) {
  const packages = [...roots];
  const seen = new Set();
  const sections = [];
  const list = [];
  while (packages.length) {
    const name = packages.pop();
    if (seen.has(name)) continue;
    seen.add(name);
    const dir = resolve(root, "node_modules", name);
    const info = JSON.parse(readFileSync(resolve(dir, "package.json"), "utf8"));
    packages.push(...Object.keys(info.dependencies ?? {}));
    const licenseFile = readdirSync(dir).find((file) =>
      /^licen[sc]e(?:\..*)?$/i.test(file),
    );
    const notice = licenseFile
      ? readFileSync(resolve(dir, licenseFile), "utf8")
      : name === "@lit-labs/ssr-dom-shim"
        ? readFileSync(
            resolve(root, "node_modules/@lit/reactive-element/LICENSE"),
            "utf8",
          )
        : null;
    if (!notice) throw new Error(`License not found: ${name}`);
    const head = `${name} ${info.version} — ${info.license ?? "see notice"}`;
    list.push(head);
    sections.push(`${head}\n${"=".repeat(72)}\n${notice.trim()}\n`);
  }
  sections.sort((a, b) => a.localeCompare(b));
  list.sort((a, b) => a.localeCompare(b));
  return { count: seen.size, text: sections.join("\n"), packages: list };
}
