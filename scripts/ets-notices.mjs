// Notices of the components compiled into BusDiagram-ETS (ets-bridge/): the Rust crates
// that the program links for its target, with their licence texts, and the fonts of the
// window. Licences such as MIT, Apache-2.0, the SIL Open Font License and the Ubuntu Font
// Licence ask that their notices travel with the program.
//
//   node scripts/ets-notices.mjs [--target x86_64-pc-windows-msvc] [--out FILE]
//
// Only the crates reachable from the program through normal dependencies, for the target,
// count: build scripts and procedural macros run at build time and are not distributed.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

const root = resolve(import.meta.dirname, "..");
const GPL = resolve(root, "ets-bridge/licenses/GPL-3.0.txt");
const crate = resolve(root, "ets-bridge");

/** Files that carry a licence or a notice, in the crate and one level below (fonts/). */
const NOTICE =
  /^(licen[cs]e|copying|notice|copyright|ofl|ufl|unlicense)([-_.].*)?$/i;
function noticeFiles(dir, depth = 0) {
  let out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (
        depth === 0 &&
        !["src", "tests", "benches", "examples", "target", ".git"].includes(
          name,
        )
      )
        out = out.concat(noticeFiles(p, 1));
    } else if (NOTICE.test(name) && st.size < 200_000) out.push(p);
  }
  return out;
}

/** Crates compiled into the program for `target`, with their licence files. */
export function components(target = "x86_64-pc-windows-msvc") {
  const meta = JSON.parse(
    execFileSync(
      "cargo",
      [
        "metadata",
        "--format-version",
        "1",
        "--locked",
        "--filter-platform",
        target,
      ],
      { cwd: crate, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    ),
  );
  const nodes = new Map(meta.resolve.nodes.map((n) => [n.id, n]));
  const packages = new Map(meta.packages.map((p) => [p.id, p]));
  const seen = new Set();
  const queue = [meta.resolve.root];
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const d of nodes.get(id)?.deps ?? [])
      // Normal dependencies only (kind null); --filter-platform already chose the target.
      if (d.dep_kinds.some((k) => k.kind === null)) queue.push(d.pkg);
  }
  seen.delete(meta.resolve.root);
  return (
    [...seen]
      .map((id) => packages.get(id))
      // A procedural macro runs in the compiler; none of it is in the program.
      .filter((p) => !p.targets.every((t) => t.kind.includes("proc-macro")))
      .map((p) => ({
        name: p.name,
        version: p.version,
        license:
          p.license ?? (p.license_file ? `see ${p.license_file}` : "unknown"),
        repository: p.repository ?? "",
        authors: p.authors ?? [],
        dir: dirname(p.manifest_path),
        files: noticeFiles(dirname(p.manifest_path)),
      }))
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
      )
  );
}

/** Standard texts of the licences of crates that publish none (SPDX). */
const MIT = `Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in the
Software without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
to permit persons to whom the Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be included in all copies
or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.`;
const BSL = `Boost Software License - Version 1.0 - August 17th, 2003

Permission is hereby granted, free of charge, to any person or organization obtaining a
copy of the software and accompanying documentation covered by this license (the
"Software") to use, reproduce, display, distribute, execute, and transmit the Software,
and to prepare derivative works of the Software, and to permit third-parties to whom the
Software is furnished to do so, all subject to the following:

The copyright notices in the Software and this entire statement, including the above
license grant, this restriction and the following disclaimer, must be included in all
copies of the Software, in whole or in part, and all derivative works of the Software,
unless such copies or derivative works are solely in the form of machine-executable
object code generated by a source language processor.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE, TITLE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR ANYONE
DISTRIBUTING THE SOFTWARE BE LIABLE FOR ANY DAMAGES OR OTHER LIABILITY, WHETHER IN
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

export function noticesText(list) {
  const texts = new Map();
  // The full Apache-2.0 text, as one of the components ships it.
  const apache = list
    .flatMap((c) => c.files)
    .find((f) => /licen[cs]e-apache/i.test(f));
  const standard = new Set();
  const head = [
    "Third-party components compiled into BusDiagram-ETS",
    "====================================================",
    "",
    "BusDiagram-ETS is distributed under the GNU Affero General Public License v3",
    "(LICENCE.txt). It includes the Rust standard library (MIT OR Apache-2.0) and the",
    "components below, each under its own licence, reproduced after the list. The window",
    "uses the fonts of epaint_default_fonts (Ubuntu Font Licence, SIL Open Font Licence,",
    "and others), whose licence texts follow with that component.",
    "",
  ];
  for (const c of list)
    head.push(
      `${c.name} ${c.version} — ${c.license}${c.repository ? ` — ${c.repository}` : ""}`,
    );
  const body = [];
  for (const c of list) {
    body.push(
      "",
      "-".repeat(78),
      `${c.name} ${c.version} (${c.license})`,
      "-".repeat(78),
    );
    if (!c.files.length) {
      // The crate publishes no licence file: its authors, and the standard texts of its
      // licence at the end of this file.
      const holders = c.authors.length
        ? c.authors.join(", ")
        : `the authors of ${c.name}`;
      body.push(
        "",
        `Copyright (c) ${holders}.`,
        `Licence: ${c.license}; texts under "Standard licence texts" below.`,
      );
      for (const id of ["MIT", "Apache-2.0", "BSL-1.0", "GPL-3.0"])
        if (c.license.includes(id)) standard.add(id);
      continue;
    }
    for (const f of c.files) {
      const text = readFileSync(f, "utf8").replace(/\r\n/g, "\n").trim();
      const hash = createHash("sha256").update(text).digest("hex");
      const rel = relative(c.dir, f).replaceAll("\\", "/");
      if (texts.has(hash)) {
        body.push("", `${rel}: same text as ${texts.get(hash)}.`);
        continue;
      }
      texts.set(hash, `${c.name} ${c.version}, ${rel}`);
      body.push("", `${rel}:`, "", text);
    }
  }
  if (standard.size) {
    body.push("", "=".repeat(78), "Standard licence texts", "=".repeat(78));
    if (standard.has("MIT")) body.push("", "MIT License:", "", MIT);
    if (standard.has("Apache-2.0") && apache)
      body.push(
        "",
        "Apache License 2.0:",
        "",
        readFileSync(apache, "utf8").replace(/\r\n/g, "\n").trim(),
      );
    if (standard.has("BSL-1.0")) body.push("", BSL);
    // The GNU GPL v3, kept in ets-bridge/licenses/ (crates under it ship no text).
    if (standard.has("GPL-3.0"))
      body.push(
        "",
        "GNU General Public License v3:",
        "",
        readFileSync(GPL, "utf8").replace(/\r\n/g, "\n").trim(),
      );
  }
  return `${head.join("\n")}\n${body.join("\n")}\n`;
}

if (import.meta.filename === process.argv[1]) {
  const { values } = parseArgs({
    options: { target: { type: "string" }, out: { type: "string" } },
  });
  const list = components(values.target);
  const text = noticesText(list);
  if (values.out) writeFileSync(values.out, text);
  else process.stdout.write(text);
  console.error(`${list.length} components.`);
}
