import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
// Direct dependencies bundled in the site (designer, slides) and in the library.
const SITE = [
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
const LIBRARY = ["lit"];

/** License sections of the given packages and their dependencies. */
async function notices(roots) {
  const packages = [...roots];
  const seen = new Set();
  const sections = [];
  while (packages.length) {
    const name = packages.pop();
    if (seen.has(name)) continue;
    seen.add(name);
    const dir = resolve(root, "node_modules", name);
    const info = JSON.parse(
      await readFile(resolve(dir, "package.json"), "utf8"),
    );
    packages.push(...Object.keys(info.dependencies ?? {}));
    const entries = await readdir(dir);
    const licenseFile = entries.find((file) =>
      /^licen[sc]e(?:\..*)?$/i.test(file),
    );
    const notice = licenseFile
      ? await readFile(resolve(dir, licenseFile), "utf8")
      : name === "@lit-labs/ssr-dom-shim"
        ? await readFile(
            resolve(root, "node_modules/@lit/reactive-element/LICENSE"),
            "utf8",
          )
        : null;
    if (!notice) throw new Error(`License not found: ${name}`);
    sections.push(
      `${name} ${info.version} — ${info.license ?? "see notice"}\n${"=".repeat(72)}\n${notice.trim()}\n`,
    );
  }
  sections.sort((a, b) => a.localeCompare(b));
  return { count: seen.size, text: sections.join("\n") };
}

const site = await notices(SITE);
await writeFile(
  resolve(root, "docs/THIRD_PARTY_NOTICES.txt"),
  `Licenses for third-party components distributed with this site.\n\n${site.text}\n`,
);
const library = await notices(LIBRARY);
await mkdir(resolve(root, "dist"), { recursive: true });
await writeFile(
  resolve(root, "dist/THIRD_PARTY_NOTICES.txt"),
  `Licenses for third-party components included in bus-diagram.js and bus-diagram.esm.js.\n\n${library.text}\n`,
);
console.log(
  `Third-party notices: ${site.count} packages (site), ${library.count} (library).`,
);
