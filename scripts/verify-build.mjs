import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const bundlePath = resolve(import.meta.dirname, "../dist/bus-diagram.js");
const bundle = await readFile(bundlePath, "utf8");
const size = (await stat(bundlePath)).size;
const gzipSize = gzipSync(bundle).byteLength;
const allowedUrls = new Set(["https://json-schema.org/draft/2020-12/schema"]);
const urls = bundle.match(/https?:\/\/[^\s"'`]+/g) ?? [];
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
  if (!code.startsWith(`/*! BusDiagram v${pkg.version} `))
    throw new Error(`${name} does not start with the v${pkg.version} banner.`);
await stat(resolve(import.meta.dirname, "../dist/types/index.d.ts"));

console.log(
  `Bundle verified: ${size} bytes, ${gzipSize} bytes gzip, no network dependency.`,
);
