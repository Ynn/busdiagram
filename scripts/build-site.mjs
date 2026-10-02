// Build the offline documentation site in docs/:
// bundle, designer, player, reveal.js, guide, examples, and reference.
import { assetVersion as assetVersionOf } from "./build-id.mjs";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "vite";
import { execFileSync } from "node:child_process";
import { loadData } from "./site-data.mjs";
import { MINIMAL, llmReference } from "./llm-reference.mjs";

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "docs");
const external = {
  external: ["bus-diagram"],
  output: { globals: { "bus-diagram": "BusDiagram" } },
};

await rm(out, { recursive: true, force: true });
await mkdir(resolve(out, "assets"), { recursive: true });
// Prevent GitHub Pages from processing this static site with Jekyll.
await writeFile(resolve(out, ".nojekyll"), "");
// Publish templates for src="..." and player.html?src=..., converted to format 2
// so that downloaded files match the format taught in the guide.
const siteData = await loadData(root);
const { convert } = siteData;
await mkdir(resolve(out, "scenarios"), { recursive: true });
const examples = [];
for (const f of (await readdir(resolve(root, "scenarios"))).sort()) {
  if (!f.endsWith(".json")) continue;
  const json = JSON.parse(
    await readFile(resolve(root, "scenarios", f), "utf8"),
  );
  const v2 = convert(json);
  examples.push({ file: f, title: String(v2.title ?? f), json: v2 });
  await writeFile(
    resolve(out, "scenarios", f),
    `${JSON.stringify(v2, null, 2)}\n`,
  );
}
// Authoring reference for language models, and the schema it points to.
const minimalProblems = siteData.validate(MINIMAL);
if (minimalProblems.length)
  throw new Error(
    `llms.txt example is invalid: ${JSON.stringify(minimalProblems)}`,
  );
const reference = llmReference(siteData, examples);
await writeFile(resolve(out, "llms.txt"), reference);
// Same content for the prompt generator page, which must also work from file://.
await writeFile(
  resolve(out, "assets/llm-reference.js"),
  `window.BUSDIAGRAM_LLM=${JSON.stringify({
    reference,
    examples: Object.fromEntries(
      examples.map((x) => [
        x.file.replace(/\.json$/, ""),
        { title: x.title, json: x.json },
      ]),
    ),
  }).replace(/</g, "\\u003c")};\n`,
);
await mkdir(resolve(out, "schema"), { recursive: true });
await cp(
  resolve(root, "schema/scenario-v2.schema.json"),
  resolve(out, "schema/scenario-v2.schema.json"),
);
await cp(
  resolve(root, "dist/bus-diagram.js"),
  resolve(out, "assets/bus-diagram.js"),
);
for (const f of ["delayed-switch.js", "led-lamp-view.js"])
  await cp(
    resolve(root, "site/samples/extensions", f),
    resolve(out, "assets/extensions", f),
    { recursive: true },
  );
await mkdir(resolve(out, "assets/reveal/theme"), { recursive: true });
for (const file of ["reveal.css", "reveal.js"]) {
  await cp(
    resolve(root, "node_modules/reveal.js/dist", file),
    resolve(out, "assets/reveal", file),
  );
}
await cp(
  resolve(root, "site/reveal-theme.css"),
  resolve(out, "assets/reveal/theme/white.css"),
);
await cp(
  resolve(root, "node_modules/reveal.js/LICENSE"),
  resolve(out, "assets/reveal/LICENSE"),
);

const iife = (entry, outDir, fileName, name, rollupOptions = {}) =>
  build({
    configFile: false,
    logLevel: "warn",
    build: {
      lib: {
        entry: resolve(root, entry),
        name,
        formats: ["iife"],
        fileName: () => fileName,
      },
      outDir: resolve(out, outDir),
      emptyOutDir: false,
      target: "es2020",
      rollupOptions,
    },
  });

// Standalone designer: includes the component, CodeMirror, and an export bundle.
await iife(
  "site/designer/main.ts",
  "designer",
  "designer.js",
  "BusDiagramDesigner",
);
// Scripts and style sheets are referenced with the version (?v=X.Y.Z): browsers keep
// files for a while, and a page of a new release must not run with an older script.
const { version } = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
);
// A development build has its own identifier, since its files differ from the release,
// and a fingerprint of its changes, since two builds of a modified tree differ too.
const assetVersion = encodeURIComponent(assetVersionOf(version));
const versioned = (html) =>
  html.replace(
    /((?:src|href)=")((?!https?:|#)[^"?]+\.(?:js|css))"/g,
    `$1$2?v=${assetVersion}"`,
  );
const copyVersioned = async (from, to) =>
  writeFile(
    resolve(out, to),
    versioned(await readFile(resolve(root, from), "utf8")),
  );
await copyVersioned("site/designer/index.html", "designer/index.html");
await cp(
  resolve(root, "site/designer/designer.css"),
  resolve(out, "designer/designer.css"),
);
// The player uses the global bundle.
await iife(
  "site/player/player.ts",
  "assets",
  "player.js",
  "BusDiagramPlayer",
  external,
);
await copyVersioned("site/player/player.html", "player.html");

await cp(resolve(root, "site/docs.css"), resolve(out, "assets/docs.css"));
await cp(resolve(root, "site/docs.js"), resolve(out, "assets/docs.js"));
await cp(
  resolve(root, "site/prompt-generator.js"),
  resolve(out, "assets/prompt-generator.js"),
);
execFileSync(
  resolve(root, "node_modules/.bin/eleventy"),
  ["--config=eleventy.config.js"],
  {
    cwd: root,
    stdio: "inherit",
  },
);

await import("./build-notices.mjs");
console.log("docs/: documentation site built.");
