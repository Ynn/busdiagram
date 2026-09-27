// Compile each TypeScript extension as a classic script. The "bus-diagram" import
// becomes the window.BusDiagram global exported by the main bundle.
import { resolve } from "node:path";
import { build } from "vite";

const dir = import.meta.dirname;
for (const name of ["delayed-switch", "led-lamp-view"]) {
  await build({
    configFile: false,
    logLevel: "warn",
    build: {
      lib: {
        entry: resolve(dir, `${name}.ts`),
        name: `BusDiagramExt_${name.replace(/-/g, "_")}`,
        formats: ["iife"],
        fileName: () => `${name}.js`,
      },
      outDir: dir,
      emptyOutDir: false,
      target: "es2020",
      minify: false,
      rollupOptions: {
        external: ["bus-diagram"],
        output: { globals: { "bus-diagram": "BusDiagram" } },
      },
    },
  });
  console.log(`site/samples/extensions/${name}.js built.`);
}
