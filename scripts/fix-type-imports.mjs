// Declaration files for ES modules: TypeScript projects that resolve modules as Node does
// (moduleResolution node16 or nodenext) require relative imports with their extension.
// tsc keeps the specifiers of the sources ("./core"); they are rewritten to the emitted
// files ("./core.js", or "./folder/index.js" for a folder).
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../dist/types");

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".d.ts") ? [p] : [];
  });

let rewritten = 0;
for (const file of walk(root)) {
  const text = readFileSync(file, "utf8");
  const fixed = text.replace(
    /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"']*)\2/g,
    (match, lead, quote, spec) => {
      if (/\.(js|mjs|cjs|json)$/.test(spec)) return match;
      const target = resolve(dirname(file), spec);
      const next = existsSync(`${target}.d.ts`)
        ? `${spec}.js`
        : existsSync(join(target, "index.d.ts"))
          ? `${spec}/index.js`
          : null;
      if (!next) throw new Error(`${file}: cannot resolve ${spec}`);
      rewritten++;
      return `${lead}${quote}${next}${quote}`;
    },
  );
  if (fixed !== text) writeFileSync(file, fixed);
}
console.log(
  `Type declarations: ${rewritten} relative imports with their extension.`,
);
