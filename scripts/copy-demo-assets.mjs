// Copy the bundle and extensions into the offline demonstration.
import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bundle = resolve(root, "dist/bus-diagram.js");
await mkdir(resolve(root, "demo"), { recursive: true });
await copyFile(bundle, resolve(root, "demo/bus-diagram.js"));
await mkdir(resolve(root, "demo/extensions"), { recursive: true });
for (const f of ["delayed-switch.js", "led-lamp-view.js"])
  await copyFile(resolve(root, "site/samples/extensions", f), resolve(root, "demo/extensions", f));
console.log("Bundle and extensions copied to demo/.");
