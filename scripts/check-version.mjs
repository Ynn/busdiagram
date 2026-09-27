// Version consistency (Semantic Versioning 2.0.0): package.json holds a valid version,
// CHANGELOG.md documents it, and a release tag (vX.Y.Z), when given, matches it.
// Usage: node scripts/check-version.mjs [tag]
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const lock = JSON.parse(
  await readFile(resolve(root, "package-lock.json"), "utf8"),
);
const changelog = await readFile(resolve(root, "CHANGELOG.md"), "utf8");
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const problems = [];
if (!SEMVER.test(pkg.version))
  problems.push(
    `package.json version "${pkg.version}" is not a Semantic Version`,
  );
if (
  lock.version !== pkg.version ||
  lock.packages?.[""]?.version !== pkg.version
)
  problems.push(
    "package-lock.json version differs from package.json (run npm install)",
  );
const escaped = pkg.version.replace(/[.+]/g, "\\$&");
if (!new RegExp(`^## \\[${escaped}\\]`, "m").test(changelog))
  problems.push(`CHANGELOG.md has no "## [${pkg.version}]" section`);
const tag = process.argv[2] ?? "";
if (tag && tag !== `v${pkg.version}`)
  problems.push(`tag "${tag}" does not match version v${pkg.version}`);

if (problems.length) {
  console.error(problems.map((p) => `version: ${p}`).join("\n"));
  process.exit(1);
}
console.log(
  `Version ${pkg.version} consistent${tag ? ` with tag ${tag}` : ""}.`,
);
