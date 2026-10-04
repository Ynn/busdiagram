// Release preparation, run by `npm version patch|minor|major` (npm lifecycle scripts).
//   --preflight (preversion): the release starts from main, and CHANGELOG.md lists changes
//                             under [Unreleased].
//   default (version):        package.json already holds the new version. Dates the
//                             [Unreleased] section, updates the version in README.md,
//                             rebuilds dist/, demo/ and docs/, records the version and the
//                             hash of the published file in site/release.json, and stages
//                             the files for the commit and tag that npm then creates.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const fail = (message) => {
  console.error(`release: ${message}`);
  process.exit(1);
};

const changelogPath = resolve(root, "CHANGELOG.md");
const changelog = await readFile(changelogPath, "utf8");
const unreleased = /^## \[Unreleased\]\n([\s\S]*?)(?=^## \[)/m.exec(changelog);
if (!unreleased) fail("CHANGELOG.md has no ## [Unreleased] section");
if (!/^- /m.test(unreleased[1]))
  fail("the [Unreleased] section of CHANGELOG.md lists no change");

if (process.argv.includes("--preflight")) {
  const branch = git("rev-parse", "--abbrev-ref", "HEAD");
  if (branch !== "main") fail(`releases are made from main, not ${branch}`);
  process.exit(0);
}

const { version } = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
);
const date = new Date().toISOString().slice(0, 10);
await writeFile(
  changelogPath,
  changelog.replace(
    /^## \[Unreleased\]\n/m,
    `## [Unreleased]\n\n## [${version}] - ${date}\n`,
  ),
);

const readmePath = resolve(root, "README.md");
const readme = await readFile(readmePath, "utf8");
await writeFile(
  readmePath,
  readme.replace(
    /bus-diagram@\d+\.\d+\.\d+[\w.+-]*/g,
    `bus-diagram@${version}`,
  ),
);

// The banner, the documentation footer, and the CDN integrity hashes depend on the version.
// This build is the release: npm creates its commit and the vX.Y.Z tag right after.
const env = { ...process.env, BUSDIAGRAM_RELEASE: "1" };
// First the library: the file that npm will publish for this version. Its version and hash
// are recorded before the site and the designer are built, since both read the record
// (development builds point their CDN tags to it; see release() in site-reference.mjs).
execFileSync("npx", ["vite", "build"], { cwd: root, stdio: "inherit", env });
const bundle = await readFile(resolve(root, "dist/bus-diagram.js"));
await writeFile(
  resolve(root, "site/release.json"),
  `${JSON.stringify(
    {
      version,
      integrity: `sha384-${createHash("sha384").update(bundle).digest("base64")}`,
    },
    null,
    2,
  )}\n`,
);
// Then everything, the library again (the same file: the build checks it against the record).
execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit", env });
git("add", "CHANGELOG.md", "README.md", "docs", "demo", "site/release.json");
console.log(`release: version ${version} prepared.`);
