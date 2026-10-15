// Regenerate schema/scenario-v2.schema.json and src/knx/scenario-v2.generated.ts from the
// standard behaviors (tests/knx/contract.test.ts with UPDATE_SCHEMA=1), on any system.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const r = spawnSync(
  process.execPath,
  [
    resolve(root, "node_modules/vitest/vitest.mjs"),
    "run",
    "tests/knx/contract.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: { ...process.env, UPDATE_SCHEMA: "1" } },
);
process.exit(r.status ?? 1);
