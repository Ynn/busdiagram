// Organization of the participants (PLAN-SOC): a participant depends neither on the
// registry nor on the library entries, even indirectly; its model entry never reaches the
// designer; and the library never reaches the designer.
import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "../../..");
const rel = (f: string) => relative(root, f).replaceAll("\\", "/");

// The project's compiler options, so that its aliases ("bus-diagram") resolve as in the
// build; JavaScript modules are followed too.
const config = ts.getParsedCommandLineOfConfigFile(
  resolve(root, "tsconfig.json"),
  {},
  { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} },
)!;
const options: ts.CompilerOptions = { ...config.options, allowJs: true };

/** Is an import erased by the compiler (types only: no cycle, no bundled code)? */
function typeOnly(node: ts.ImportDeclaration | ts.ExportDeclaration) {
  if (ts.isExportDeclaration(node))
    return (
      node.isTypeOnly ||
      (!!node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.length > 0 &&
        node.exportClause.elements.every((e) => e.isTypeOnly))
    );
  const clause = node.importClause;
  if (!clause) return false; // import "x": side effects
  if (clause.isTypeOnly) return true;
  const named = clause.namedBindings;
  return (
    !clause.name &&
    !!named &&
    ts.isNamedImports(named) &&
    named.elements.length > 0 &&
    named.elements.every((e) => e.isTypeOnly)
  );
}

/** Specifiers of the runtime imports of a module: static, re-exports, and dynamic. */
function specifiers(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const out: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      !typeOnly(node)
    )
      out.push(node.moduleSpecifier.text);
    else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    )
      out.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

/** Local modules imported by a module; packages (node_modules) are not followed. */
function imports(file: string): string[] {
  return specifiers(file).flatMap((spec) => {
    if (spec.startsWith("node:")) return [];
    const found = ts.resolveModuleName(spec, file, options, ts.sys)
      .resolvedModule?.resolvedFileName;
    if (!found) {
      if (spec.startsWith(".") || spec.startsWith("/"))
        throw new Error(`${rel(file)}: cannot resolve “${spec}”`);
      return []; // a package without types, outside the project
    }
    const abs = resolve(found);
    return abs.includes("/node_modules/") ? [] : [abs];
  });
}

/** Every module reached from a module, itself included. */
function reached(entry: string): Set<string> {
  const seen = new Set<string>();
  const todo = [resolve(root, entry)];
  while (todo.length) {
    const f = todo.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    if (/\.(?:[cm]?[jt]s|tsx|jsx)$/.test(f) && !f.endsWith(".d.ts"))
      todo.push(...imports(f));
  }
  return new Set([...seen].map(rel));
}

const folders = readdirSync(resolve(root, "src/participants")).filter((d) =>
  statSync(resolve(root, "src/participants", d)).isDirectory(),
);
/** Participant folders; "shared" holds code shared explicitly by several of them. */
const participants = folders.filter((d) => d !== "shared");
const filesOf = (d: string) =>
  readdirSync(resolve(root, "src/participants", d))
    .filter((f) => /\.(?:[cm]?[jt]s)$/.test(f))
    .map((f) => `src/participants/${d}/${f}`);

const designerSide = (f: string) =>
  f.startsWith("site/") || /^src\/participants\/[^/]+\/designer/.test(f);

describe("organization of the participants", () => {
  it("each participant has a model entry", () => {
    expect(participants.length).toBeGreaterThan(0);
    for (const d of participants)
      expect(existsSync(resolve(root, `src/participants/${d}/model.ts`))).toBe(
        true,
      );
  });

  it.each(folders)(
    "%s depends on neither the registry nor the library entries",
    (d) => {
      for (const f of filesOf(d)) {
        const all = reached(f);
        for (const banned of [
          "src/knx/registry.ts",
          "src/core.ts",
          "src/index.ts",
          "src/standard-model.ts",
        ])
          expect(all.has(banned), `${f} reaches ${banned}`).toBe(false);
      }
    },
  );

  it.each(participants)(
    "the model entry of %s never reaches the designer",
    (d) => {
      const designer = [...reached(`src/participants/${d}/model.ts`)].filter(
        designerSide,
      );
      expect(designer).toEqual([]);
    },
  );

  it.each(folders)(
    "%s depends on no other participant (only on shared code)",
    (d) => {
      for (const f of filesOf(d)) {
        const others = [...reached(f)].filter((x) => {
          const m = /^src\/participants\/([^/]+)\//.exec(x);
          return m && m[1] !== d && m[1] !== "shared";
        });
        expect(others, f).toEqual([]);
      }
    },
  );

  it("shared modules name no behavior of a participant", () => {
    // Engine, diagram, and designer know participants through their declarations only;
    // the compositions are the only lists of participants.
    const shared = [
      ...["src/knx", "src/ui", "site/designer"].flatMap((dir) =>
        readdirSync(resolve(root, dir))
          .filter((f) => f.endsWith(".ts") && !f.endsWith(".generated.ts"))
          .map((f) => `${dir}/${f}`),
      ),
      "src/core.ts",
      "src/index.ts",
      "site/data.ts",
    ].filter((f) => f !== "site/designer/standard-designer.ts");
    const named = shared.flatMap((f) =>
      [
        ...readFileSync(resolve(root, f), "utf8").matchAll(
          /["'`]([A-Za-z]+\/v\d+)["'`]/g,
        ),
      ].map((m) => `${f}: ${m[1]}`),
    );
    expect(named).toEqual([]);
  });

  it("equipment model entries and the DOM-free entry reach no view", () => {
    const equipment = readdirSync(resolve(root, "src/equipment")).filter((d) =>
      existsSync(resolve(root, "src/equipment", d, "model.ts")),
    );
    expect(equipment.length).toBeGreaterThan(0);
    const views = (f: string) =>
      [...reached(f)].filter(
        (x) => x.startsWith("src/ui/") || /view\.ts$/.test(x),
      );
    for (const d of equipment)
      expect(views(`src/equipment/${d}/model.ts`), d).toEqual([]);
    expect(views("src/core.ts")).toEqual([]);
  });

  it("the library never reaches the designer", () => {
    for (const entry of ["src/index.ts", "src/core.ts"])
      expect([...reached(entry)].filter(designerSide)).toEqual([]);
  });

  it("the registry installs the composition by itself, once", async () => {
    vi.resetModules();
    const alone = await import("../../../src/knx/registry");
    const reference = JSON.parse(
      readFileSync(
        resolve(root, "tests/knx/fixtures/reference/definitions.json"),
        "utf8",
      ),
    ) as { behaviors: string[]; equipment: string[] };
    expect(alone.behaviorIds().sort()).toEqual(reference.behaviors);
    expect(alone.equipmentIds().sort()).toEqual(reference.equipment);
    // The library and the designer data reach the same module, so see the same set.
    vi.resetModules();
    await import("../../../src/core");
    await import("../../../site/data");
    const shared = await import("../../../src/knx/registry");
    expect(shared.behaviorIds().sort()).toEqual(reference.behaviors);
  });

  it("restoring the registry also restores the registered messages", async () => {
    const { registerMessages, translator } = await import("../../../src/i18n");
    const { restoreRegistry, saveRegistry } =
      await import("../../../src/knx/registry");
    const before = saveRegistry();
    registerMessages("fr", { "Probe message": "Message sonde" });
    expect(translator("fr")`Probe message`).toBe("Message sonde");
    restoreRegistry(before);
    expect(translator("fr")`Probe message`).toBe("Probe message");
  });
});
