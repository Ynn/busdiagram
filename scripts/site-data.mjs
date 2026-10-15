import { rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

export async function loadData(root) {
  const tmp = resolve(root, "node_modules/.cache/bus-diagram-site");
  await rm(tmp, { recursive: true, force: true });
  await build({
    configFile: false,
    logLevel: "warn",
    build: {
      ssr: resolve(root, "site/data.ts"),
      outDir: tmp,
      emptyOutDir: true,
      rollupOptions: { output: { format: "es", entryFileNames: "data.mjs" } },
    },
  });
  // A file URL, not a native path: on Windows "C:\…" would be read as a URL scheme.
  const mod = await import(
    `${pathToFileURL(join(tmp, "data.mjs")).href}?t=${Date.now()}`
  );
  return { ...mod.data, normalize: mod.normalize, validate: mod.validate };
}
