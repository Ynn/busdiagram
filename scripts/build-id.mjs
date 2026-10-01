// Identity of a build, written in the banner of the bundles and in the asset URLs of the
// site. A release build (from the vX.Y.Z tag, sources unchanged) names its version and
// the tag that holds its source code; any other build is marked as a development build,
// so that it never claims the source code of a released version.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
export const REPOSITORY = "https://github.com/Ynn/busdiagram";

const git = (...args) => {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
};

/** Files written by the build itself: they do not count as changed sources. */
const GENERATED = [
  "docs",
  "dist",
  "demo/bus-diagram.js",
  "demo/bus-diagram.esm.js",
];

export function buildId(version) {
  const tag = `v${version}`;
  // In the release workflow (tag vX.Y.Z), or while `npm version` prepares the commit
  // that the tag will mark.
  const ci =
    (process.env.GITHUB_REF_TYPE === "tag" &&
      process.env.GITHUB_REF_NAME === tag) ||
    process.env.BUSDIAGRAM_RELEASE === "1";
  const sha = git("rev-parse", "HEAD");
  const changed = git(
    "status",
    "--porcelain",
    "--",
    ".",
    ...GENERATED.map((p) => `:(exclude)${p}`),
  );
  const onTag = git("describe", "--tags", "--exact-match", "HEAD") === tag;
  if (ci || (onTag && changed === ""))
    return {
      label: version,
      release: true,
      source: `${REPOSITORY}/tree/${tag}`,
      note: "Source code of this version",
    };
  const short = sha ? sha.slice(0, 7) : "unknown";
  const modified = changed !== "" && changed !== null;
  return {
    label: `${version}+dev.${short}${modified ? ".modified" : ""}`,
    release: false,
    source: sha && !modified ? `${REPOSITORY}/tree/${sha}` : REPOSITORY,
    note: modified
      ? `Development build, not a released version (commit ${short} with local changes); source code`
      : `Development build, not a released version (commit ${short}); source code`,
  };
}
