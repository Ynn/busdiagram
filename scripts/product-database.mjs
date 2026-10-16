// Write the product database of a manufacturer's device (src/manufacturers/…/database.json)
// from a product catalog: npm run product -- <catalog.knxprod> <program> <file.json>
// ['{"P-57_R-57": "8"}'], the last argument giving the values the product fixes (its
// type of module in a program shared by a range: only their branches are kept).
// The program is its identifier in the catalog ("M-00FE_A-0001-10-0000"); the database
// keeps what ETS shows and what the parameters and tables occupy, not the application
// code. Runs tests/knx/product-database.test.ts, on any system.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const [catalog, program, out, fixed] = process.argv.slice(2);
if (!catalog || !program || !out) {
  console.error(
    "usage: npm run product -- <catalog.knxprod> <program> <file.json>",
  );
  process.exit(2);
}
const root = resolve(import.meta.dirname, "..");
const r = spawnSync(
  process.execPath,
  [
    resolve(root, "node_modules/vitest/vitest.mjs"),
    "run",
    "tests/knx/product-database.test.ts",
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      PRODUCT_CATALOG: resolve(catalog),
      PRODUCT_PROGRAM: program,
      PRODUCT_OUT: resolve(out),
      ...(fixed ? { PRODUCT_FIXED: fixed } : {}),
    },
  },
);
process.exit(r.status ?? 1);
