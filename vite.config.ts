import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "package.json"), "utf8"),
) as { version: string; license: string };

const banner = `/*! BusDiagram v${pkg.version} | ${pkg.license} | third-party notices: THIRD_PARTY_NOTICES.txt */`;

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
