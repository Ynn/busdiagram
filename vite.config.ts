import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { LIBRARY, notices } from "./scripts/notices.mjs";

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "package.json"), "utf8"),
) as { version: string; license: string; author: string };

// The banner travels with every copy of the file (CDN, download from the designer,
// standalone page): it carries the license, the address of the corresponding source,
// and the notices of the third-party components included in the bundle.
const banner = `/*! BusDiagram v${pkg.version} | ${pkg.license} | Copyright (C) 2026 ${pkg.author}
Source code of this version: https://github.com/Ynn/busdiagram/tree/v${pkg.version}

Third-party components included in this file:

${notices(LIBRARY).text.replaceAll("*/", "* /")}*/`;

/** Prepend the banner after minification, which would otherwise drop it. */
const bannerPlugin = (): Plugin => ({
  name: "bus-diagram-banner",
  generateBundle(_options, bundle) {
    for (const chunk of Object.values(bundle))
      if (chunk.type === "chunk" && !chunk.code.startsWith("/*!"))
        chunk.code = `${banner}\n${chunk.code}`;
  },
});

// Classic script (window.BusDiagram) and ES module, both with a version banner.
export default defineConfig({
  plugins: [bannerPlugin()],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      name: "BusDiagram",
      formats: ["iife", "es"],
      fileName: (format) =>
        format === "es" ? "bus-diagram.esm.js" : "bus-diagram.js",
    },
    target: "es2020",
    sourcemap: false,
    emptyOutDir: true,
  },
});
