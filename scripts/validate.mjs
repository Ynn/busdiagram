// Validate scenario files without a browser: npm run validate -- file.json [...]
// Use "-" to read one scenario from standard input. Exit code 1 when a file is invalid.
// With --json, print one machine-readable result per file.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadData } from "./site-data.mjs";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const files = args.filter((a) => a !== "--json");
if (!files.length) {
  console.error("Usage: npm run validate -- [--json] <file.json | -> ...");
  process.exit(2);
}

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
};

const { validate } = await loadData(root);
let failed = false;
for (const file of files) {
  const label = file === "-" ? "<stdin>" : file;
  let problems;
  try {
    // npm runs scripts from the package root; resolve paths from the caller's directory.
    const text =
      file === "-"
        ? await readStdin()
        : await readFile(
            resolve(process.env.INIT_CWD ?? process.cwd(), file),
            "utf8",
          );
    problems = validate(JSON.parse(text));
  } catch (e) {
    problems = [{ path: "", code: "json", message: e.message }];
  }
  failed ||= problems.length > 0;
  if (asJson)
    console.log(
      JSON.stringify({ file: label, valid: !problems.length, problems }),
    );
  else if (!problems.length) console.log(`${label}: valid`);
  else {
    console.log(`${label}: ${problems.length} problem(s)`);
    for (const p of problems)
      console.log(`  ${p.path || "(root)"} [${p.code}] ${p.message}`);
  }
}
process.exit(failed ? 1 : 0);
