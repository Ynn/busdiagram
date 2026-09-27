import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const git = (...args) =>
  spawnSync("git", args, { cwd: root, encoding: "utf8" });
const top = git("rev-parse", "--show-toplevel");
if (top.status !== 0 || resolve(top.stdout.trim()) !== root) {
  console.log("Git hook skipped: no repository at the project root.");
} else {
  const installed = git("config", "--local", "core.hooksPath", ".githooks");
  if (installed.status !== 0) {
    console.error(installed.stderr || "Could not install the Git hook.");
    process.exit(1);
  }
  console.log("Pre-commit hook installed.");
}
