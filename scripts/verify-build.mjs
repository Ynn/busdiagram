import { LIBRARY, notices } from "./notices.mjs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const bundlePath = resolve(import.meta.dirname, "../dist/bus-diagram.js");
const bundle = await readFile(bundlePath, "utf8");
const size = (await stat(bundlePath)).size;
const gzipSize = gzipSync(bundle).byteLength;
const allowedUrls = new Set([
  "https://json-schema.org/draft/2020-12/schema",
  // Address of the published designer: only the href of the “Open in the designer” link,
  // followed when the reader clicks it; nothing is loaded from it.
  "https://ynn.github.io/busdiagram/designer/index.html",
]);
// The code must not reach the network; the banner comment may cite the source address.
const code = bundle.slice(bundle.indexOf("*/") + 2);
const urls = code.match(/https?:\/\/[^\s"'`]+/g) ?? [];
const unexpectedUrls = [...new Set(urls)].filter(
  (url) => !allowedUrls.has(url),
);

if (unexpectedUrls.length > 0) {
  throw new Error(
    `The bundle contains unexpected external URLs: ${unexpectedUrls.join(", ")}`,
  );
}

if (gzipSize > 200 * 1024) {
  throw new Error(
    `The gzip bundle (${gzipSize} bytes) exceeds the 200 KiB limit.`,
  );
}

// Both distributed files carry the version banner; the ES module and types exist.
const pkg = JSON.parse(
  await readFile(resolve(import.meta.dirname, "../package.json"), "utf8"),
);
const esm = await readFile(
  resolve(import.meta.dirname, "../dist/bus-diagram.esm.js"),
  "utf8",
);
for (const [name, code] of [
  ["bus-diagram.js", bundle],
  ["bus-diagram.esm.js", esm],
])
  // A release build names its version; a development build adds "+dev.<commit>".
  if (
    !new RegExp(
      `^/\\*! BusDiagram v${pkg.version.replaceAll(".", "\\.")}[ +]`,
    ).test(code)
  )
    throw new Error(`${name} does not start with the v${pkg.version} banner.`);
// The banner carries the license notices of every bundled package.
for (const head of notices(LIBRARY).packages)
  for (const [name, code] of [
    ["bus-diagram.js", bundle],
    ["bus-diagram.esm.js", esm],
  ])
    if (!code.slice(0, code.indexOf("*/")).includes(head))
      throw new Error(`${name}: the banner lacks the notice of ${head}.`);
await stat(resolve(import.meta.dirname, "../dist/types/index.d.ts"));

// The type declarations work in a project that resolves modules as Node does (nodenext)
// and in one that uses a bundler: a file importing the package type-checks in both.
{
  const ts = (await import("typescript")).default;
  const dir = resolve(
    import.meta.dirname,
    "../node_modules/.cache/types-check",
  );
  await mkdir(dir, { recursive: true });
  const entry = resolve(dir, "check.ts");
  await writeFile(
    entry,
    `import { createSimulator, create, version, type ViewOptions } from "../../../dist/types/index.js";\n` +
      `const sim = createSimulator({ formatVersion: 2, lines: [{ address: "1.1" }], devices: [] });\n` +
      `sim.advance(1);\nconst options: Partial<ViewOptions> = { toolbar: "compact" };\n` +
      `export const used = [create, version, options];\n`,
  );
  for (const [moduleResolution, module] of [
    [ts.ModuleResolutionKind.NodeNext, ts.ModuleKind.NodeNext],
    [ts.ModuleResolutionKind.Bundler, ts.ModuleKind.ESNext],
  ]) {
    const program = ts.createProgram([entry], {
      strict: true,
      noEmit: true,
      target: ts.ScriptTarget.ES2022,
      lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
      module,
      moduleResolution,
      types: [],
    });
    const problems = ts
      .getPreEmitDiagnostics(program)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
    if (problems.length)
      throw new Error(
        `The type declarations do not type-check (${ts.ModuleResolutionKind[moduleResolution]}):\n${problems.slice(0, 5).join("\n")}`,
      );
  }
}

console.log(
  `Bundle verified: ${size} bytes, ${gzipSize} bytes gzip, no network dependency.`,
);
