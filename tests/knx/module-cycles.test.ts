// The modules of the library and of the site import one another without a cycle (their
// runtime imports; a type import does not run): each layer can be read, tested and
// changed below those that use it.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");

function modules(dirs: string[]) {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (f === "node_modules" || f.startsWith(".")) continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.ts$/.test(f) && !/\.d\.ts$/.test(f)) files.push(p);
    }
  };
  dirs.forEach((d) => walk(resolve(root, d)));
  return files;
}

/** The groups of modules that import one another, in a cycle. */
function cycles(files: string[]) {
  const known = new Set(files);
  const isFile = (p: string) => {
    try {
      return statSync(p).isFile();
    } catch {
      return false;
    }
  };
  const edges = new Map<string, string[]>();
  for (const f of files) {
    const out: string[] = [];
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(
      /^\s*(?:import|export)\s+(type\s+)?(?:[^"';]*?\sfrom\s+)?["'](\.[^"']+)["']/gm,
    )) {
      if (m[1]) continue;
      let p = resolve(dirname(f), m[2]!);
      if (!p.endsWith(".ts"))
        p = isFile(`${p}.ts`) ? `${p}.ts` : join(p, "index.ts");
      if (known.has(p)) out.push(p);
    }
    edges.set(f, out);
  }
  // Strongly connected components (Tarjan) of more than one module.
  let n = 0;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const on = new Set<string>();
  const found: string[][] = [];
  const visit = (v: string) => {
    index.set(v, n);
    low.set(v, n++);
    stack.push(v);
    on.add(v);
    for (const w of edges.get(v) ?? []) {
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (on.has(w)) low.set(v, Math.min(low.get(v)!, index.get(w)!));
    }
    if (low.get(v) === index.get(v)) {
      const c: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        on.delete(w);
        c.push(relative(root, w).split("\\").join("/"));
      } while (w !== v);
      if (c.length > 1) found.push(c.sort());
    }
  };
  files.forEach((f) => index.has(f) || visit(f));
  return found;
}

describe("the modules", () => {
  it("of the library and the site import one another without a cycle", () => {
    expect(cycles(modules(["src", "site"]))).toEqual([]);
  });
});
