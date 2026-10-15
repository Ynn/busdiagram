// Student package BusDiagram-ETS: the busdiagram-ets program (ets-bridge/, Rust), which
// any BusDiagram diagram links to ETS from its toolbar, with a short notice, the licence,
// and the notices of the components compiled into it. Needs Rust (cargo).
//
//   node scripts/build-ets.mjs [--out DIR] [--archive]
//
// --out: package directory (default dist-ets/BusDiagram-ETS). --archive (Windows): also
// writes dist-ets/BusDiagram-ETS-<version>-windows-x64.zip and its .sha256, the files
// attached to the GitHub release.
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { components, noticesText } from "./ets-notices.mjs";

const root = resolve(import.meta.dirname, "..");
const crate = resolve(root, "ets-bridge");
const { values: args } = parseArgs({
  options: { out: { type: "string" }, archive: { type: "boolean" } },
});
const out = resolve(root, args.out ?? "dist-ets/BusDiagram-ETS");
const fail = (message) => {
  console.error(`build-ets: ${message}`);
  process.exit(1);
};

const { version } = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
);
const crateVersion = /^version = "([^"]*)"/m.exec(
  await readFile(resolve(crate, "Cargo.toml"), "utf8"),
)?.[1];
if (crateVersion !== version)
  fail(`ets-bridge is ${crateVersion}, the library ${version}`);

execFileSync("cargo", ["build", "--release", "--locked"], {
  cwd: crate,
  stdio: "inherit",
});
const windows = process.platform === "win32";
const exe = windows ? "busdiagram-ets.exe" : "busdiagram-ets";

// Files are replaced in place: a folder open in Explorer or a terminal cannot be removed.
await mkdir(out, { recursive: true });
await cp(
  resolve(crate, "target/release", exe),
  resolve(out, exe.replace("busdiagram-ets", "BusDiagram-ETS")),
);
await cp(resolve(crate, "LISEZMOI.txt"), resolve(out, "LISEZMOI.txt"));
await cp(resolve(root, "LICENSE"), resolve(out, "LICENCE.txt"));
await cp(resolve(root, "NOTICE"), resolve(out, "NOTICE.txt"));

// Notices of the crates compiled into the program, fonts of the window included.
const list = components(
  windows
    ? "x86_64-pc-windows-msvc"
    : execFileSync("rustc", ["-vV"], { encoding: "utf8" }).match(
        /^host: (.+)$/m,
      )[1],
);
const notices = noticesText(list);
for (const required of [
  "egui",
  "eframe",
  "tungstenite",
  "epaint_default_fonts",
  "knx-rs-core",
])
  if (!list.some((c) => c.name === required))
    fail(`${required} is missing from the notices`);
for (const font of ["fonts/OFL.txt", "fonts/UFL.txt"])
  if (!notices.includes(`${font}:`))
    fail(`the notices lack the font licence ${font}`);
if (!notices.includes("GNU General Public License v3:"))
  fail("the notices lack the text of the GPL v3 (knx-rs-core)");
await writeFile(resolve(out, "THIRD_PARTY_NOTICES.txt"), notices);

if (args.archive) {
  if (!windows) fail("--archive builds the Windows package: run it on Windows");
  const name = `BusDiagram-ETS-${version}-windows-x64.zip`;
  const zip = resolve(out, "..", name);
  await rm(zip, { force: true });
  // The tar of Windows (bsdtar) writes zip archives, the GNU tar that Git puts first in
  // the PATH does not: call it by its path. The files are at the root of the archive.
  const tar = resolve(
    process.env.SystemRoot ?? "C:/Windows",
    "System32/tar.exe",
  );
  execFileSync(tar, ["-a", "-c", "-f", zip, "-C", out, "."], {
    stdio: "inherit",
  });
  const hash = createHash("sha256")
    .update(await readFile(zip))
    .digest("hex");
  await writeFile(`${zip}.sha256`, `${hash}  ${name}\n`);
  console.log(`${zip} (sha256 ${hash})`);
}
console.log(
  `${out}: BusDiagram-ETS ${version}, ${list.length} components in the notices.`,
);
