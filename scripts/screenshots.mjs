// The reference screenshots of the diagrams (tests/e2e/demo.spec.ts) are those of Linux
// Chromium. This runs their test in the Playwright image of the version the project uses,
// with Docker, from any system: `npm run screenshots` compares, `npm run screenshots --
// --update` writes them again. The demo is built first (`npm run build`); the image only
// runs the browser, on the files of this checkout.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const version = JSON.parse(
  readFileSync(
    resolve(root, "node_modules/@playwright/test/package.json"),
    "utf8",
  ),
).version;
const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const update = process.argv.includes("--update");

const docker = (args, inherit = true) =>
  spawnSync("docker", args, { stdio: inherit ? "inherit" : "pipe" });

if (docker(["version", "--format", "{{.Server.Os}}"], false).status !== 0) {
  console.error("Docker is required, and its engine must be running.");
  process.exit(1);
}
const run = docker([
  "run",
  "--rm",
  "--init",
  // Chromium needs more shared memory than the default of Docker.
  "--ipc=host",
  "-v",
  `${root}:/work`,
  "-w",
  "/work",
  image,
  "node",
  "node_modules/@playwright/test/cli.js",
  "test",
  "tests/e2e/demo.spec.ts",
  "--grep",
  "reference screenshots",
  ...(update ? ["--update-snapshots"] : []),
]);
process.exit(run.status ?? 1);
