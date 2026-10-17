// Packages of devices (.bdpkg): manufacturers' products that BusDiagram does not deliver,
// imported by the user. A package is a zip:
//
//   manifest.json               name, version, products, examples (see PackageManifest)
//   devices.js                  extension script: registers the participants through the
//                               public API (window.BusDiagram.registerParticipant…)
//   databases/<file>.json       product database of each product (pages of ETS, memory)
//   scenarios/<file>.json       examples, offered with the templates
//
// The script runs as an extension (kept with them, embedded when exporting); the
// databases and examples are kept in the browser (IndexedDB) and read back at start.
import type { ProductDatabase } from "../../src/knxprod/database";
import { readText, readZip } from "../../src/knxprod/zip";
import { t } from "./lang";
import { setProductDatabase } from "../../src/knxprod/share";
import { PACKAGE_API } from "../../src/bcu/product";

export const PACKAGE_FORMAT = "bdpkg/1";

export interface PackageManifest {
  format: string;
  name: string;
  version: string;
  /** Version of BusDiagram the package needs ("0.8.0": at least this one). */
  busdiagram?: string;
  /** Contract with BusDiagram it needs (PACKAGE_API: at least this one). */
  api?: number;
  /** Script that the scripts of the products need first (see `products[].script`). */
  common?: string;
  products: {
    behavior: string;
    manufacturer: string;
    name: string;
    /** File of its product database in the package. */
    database: string;
    /**
     * Script that registers this product alone, after `common`: an exported page embeds
     * those of the products its scenario uses, not the whole package.
     */
    script?: string;
  }[];
  scenarios?: {
    id: string;
    file: string;
    title?: Record<string, string>;
    /** The example translated, by language ("fr": its file). */
    translations?: Record<string, string>;
  }[];
}

export interface DevicePackage {
  manifest: PackageManifest;
  /** Extension script that registers the participants. */
  script: string;
  /** The scripts of its products, when it has them: common, then one by behavior. */
  productScripts?: { common: string; products: Map<string, string> };
  databases: Map<string, ProductDatabase>;
  scenarios: {
    id: string;
    title: Record<string, string>;
    data: unknown;
    /** The example in other languages. */
    translations: Record<string, unknown>;
  }[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Compare two versions "x.y.z" (prerelease and build ignored). */
export function compareVersions(a: string, b: string) {
  const parts = (v: string) =>
    v
      .split(/[-+]/)[0]!
      .split(".")
      .map((x) => Number(x) || 0);
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < 3; i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** Read and check a package; throws an error that says what is wrong. */
export async function readPackage(
  bytes: Uint8Array,
  libraryVersion: string,
): Promise<DevicePackage> {
  let entries;
  try {
    entries = readZip(bytes);
  } catch (e) {
    throw new Error(
      t`not a package of devices (.bdpkg): it is not a zip file`,
      { cause: e },
    );
  }
  const file = (name: string) => entries.find((e) => e.name === name);
  const text = async (name: string) => {
    const e = file(name);
    if (!e) throw new Error(t`the package has no file ${name}`);
    return readText(e);
  };
  const json = async (name: string): Promise<unknown> => {
    try {
      return JSON.parse(await text(name)) as unknown;
    } catch (e) {
      if (e instanceof SyntaxError)
        throw new Error(t`${name} of the package is not JSON`, { cause: e });
      throw e;
    }
  };
  const m = await json("manifest.json");
  if (!isRecord(m) || m.format !== PACKAGE_FORMAT)
    throw new Error(
      t`manifest.json: format ${PACKAGE_FORMAT} expected (a package of devices of BusDiagram)`,
    );
  if (typeof m.name !== "string" || !/^[\w.-]+$/.test(m.name))
    throw new Error(t`manifest.json: name expected (letters, digits, - . _)`);
  if (typeof m.version !== "string")
    throw new Error(t`manifest.json: version expected`);
  // The contract, when the package names it, says what it needs; the version of
  // BusDiagram is for the readers that know no contract (0.7 and before), which refuse a
  // package for a later one before they run its script.
  if (
    m.api === undefined &&
    typeof m.busdiagram === "string" &&
    compareVersions(libraryVersion, m.busdiagram) < 0
  )
    throw new Error(
      t`the package needs BusDiagram ${m.busdiagram} or later (this is ${libraryVersion})`,
    );
  if (m.api !== undefined && (typeof m.api !== "number" || m.api > PACKAGE_API))
    throw new Error(
      t`the package needs the contract ${String(m.api)} with BusDiagram, which has ${PACKAGE_API}: a later BusDiagram is needed`,
    );
  if (!Array.isArray(m.products))
    throw new Error(t`manifest.json: list of products expected`);
  const manifest = m as unknown as PackageManifest;
  const databases = new Map<string, ProductDatabase>();
  for (const p of manifest.products) {
    if (
      !isRecord(p) ||
      typeof p.behavior !== "string" ||
      typeof p.database !== "string"
    )
      throw new Error(
        t`manifest.json: a product needs its behavior and its database`,
      );
    const db = await json(p.database);
    if (
      !isRecord(db) ||
      typeof db.id !== "string" ||
      !Array.isArray(db.dynamic)
    )
      throw new Error(
        t`${p.database} of the package is not a product database`,
      );
    databases.set(p.behavior, db as unknown as ProductDatabase);
  }
  const scenarios: DevicePackage["scenarios"] = [];
  for (const s of manifest.scenarios ?? []) {
    if (!isRecord(s) || typeof s.id !== "string" || typeof s.file !== "string")
      throw new Error(t`manifest.json: an example needs its id and its file`);
    scenarios.push({
      id: s.id,
      title: (isRecord(s.title) ? s.title : {}) as Record<string, string>,
      data: await json(s.file),
      translations: Object.fromEntries(
        await Promise.all(
          Object.entries(isRecord(s.translations) ? s.translations : {}).map(
            async ([lang, file]) => [lang, await json(String(file))] as const,
          ),
        ),
      ),
    });
  }
  // The scripts of its products: all of them, or none (the whole script is embedded).
  let productScripts: DevicePackage["productScripts"];
  if (
    typeof m.common === "string" &&
    manifest.products.every((p) => typeof p.script === "string")
  )
    productScripts = {
      common: await text(m.common),
      products: new Map(
        await Promise.all(
          manifest.products.map(
            async (p) => [p.behavior, await text(p.script!)] as const,
          ),
        ),
      ),
    };
  return {
    manifest,
    script: await text("devices.js"),
    ...(productScripts ? { productScripts } : {}),
    databases,
    scenarios,
  };
}

// ── What the imported packages bring to the designer ──────────────────────────

const databases = new Map<string, ProductDatabase>();
const examples = new Map<string, DevicePackage["scenarios"]>();
const scriptsOf = new Map<string, DevicePackage["productScripts"]>();
const listeners = new Set<() => void>();

/** A package brings a product that another package already brings. */
export class PackageConflict extends Error {
  constructor(
    readonly behavior: string,
    readonly owner: string,
  ) {
    super(t`the device ${behavior} is already brought by the package ${owner}`);
  }
}

/** The package that brings the database of a behavior, if one does. */
export const ownerOf = (behavior: string) =>
  [...owners].find(([, list]) => list.includes(behavior))?.[0] ?? null;

/**
 * Register the databases and examples of a package (replacing a former version).
 * Returns what puts back the former state, the former version included, when its
 * script does not run. A device that another package brings is refused
 * (PackageConflict), before anything changes.
 */
export function installPackage(p: DevicePackage): () => void {
  const name = p.manifest.name;
  for (const behavior of p.databases.keys()) {
    const owner = ownerOf(behavior);
    if (owner !== null && owner !== name)
      throw new PackageConflict(behavior, owner);
  }
  const former = {
    databases: new Map(
      behaviorsOfPackage(name).flatMap((b) => {
        const db = databases.get(b);
        return db ? [[b, db] as const] : [];
      }),
    ),
    examples: examples.get(name),
    scripts: scriptsOf.get(name),
  };
  forgetPackage(name, false);
  p.databases.forEach((db, behavior) => {
    databases.set(behavior, db);
    setProductDatabase(behavior, db);
  });
  examples.set(p.manifest.name, p.scenarios);
  owners.set(p.manifest.name, [...p.databases.keys()]);
  if (p.productScripts) scriptsOf.set(name, p.productScripts);
  listeners.forEach((f) => f());
  return () => {
    forgetPackage(name, false);
    former.databases.forEach((db, b) => {
      databases.set(b, db);
      setProductDatabase(b, db);
    });
    if (former.databases.size) owners.set(name, [...former.databases.keys()]);
    if (former.examples) examples.set(name, former.examples);
    if (former.scripts) scriptsOf.set(name, former.scripts);
    listeners.forEach((f) => f());
  };
}

const owners = new Map<string, string[]>();

/** The behaviors whose databases a package brings. */
export const behaviorsOfPackage = (name: string) => owners.get(name) ?? [];

export function forgetPackage(name: string, notify = true) {
  (owners.get(name) ?? []).forEach((b) => {
    databases.delete(b);
    setProductDatabase(b, null);
  });
  owners.delete(name);
  examples.delete(name);
  scriptsOf.delete(name);
  if (notify) listeners.forEach((f) => f());
}

/**
 * The script of a package that a scenario using these behaviors needs: its common script
 * and those of these products, or null when the package has no scripts by product.
 */
export function scriptFor(name: string, used: Set<unknown>): string | null {
  const s = scriptsOf.get(name);
  if (!s) return null;
  return [
    s.common,
    ...[...s.products].filter(([b]) => used.has(b)).map(([, x]) => x),
  ].join(";\n");
}

/** Product database of a behavior, from an imported package. */
export const databaseOf = (behavior: string) => databases.get(behavior);

/** Examples of the imported packages, with the name of their package. */
export const packageExamples = () =>
  [...examples].flatMap(([pkg, list]) => list.map((s) => ({ ...s, pkg })));

export function onPackagesChange(f: () => void) {
  listeners.add(f);
  return () => listeners.delete(f);
}

// ── Storage in the browser ───────────────────────────────────────────────────

const DB = "busdiagram-packages";
const STORE = "packages";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error("indexedDB"));
  });
}

/**
 * A request in a transaction: its result once the transaction is committed (a write is
 * then durable), the connection closed after it.
 */
async function tx<T>(
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const r = run(transaction.objectStore(STORE));
    const fail = () =>
      reject(transaction.error ?? r.error ?? new Error("indexedDB"));
    transaction.oncomplete = () => resolve(r.result);
    transaction.onerror = fail;
    transaction.onabort = fail;
  }).finally(() => db.close());
}

/**
 * Keep a package in the browser, by its name: true once it is stored, false when the
 * browser does not keep it (it is then imported for this page only).
 */
export const storePackage = (name: string, bytes: Uint8Array) =>
  tx("readwrite", (s) => s.put(bytes, name)).then(
    () => true,
    () => false,
  );

export const deleteStoredPackage = (name: string) =>
  tx("readwrite", (s) => s.delete(name)).catch(() => undefined);

/** The packages kept in the browser: name → bytes. */
export async function storedPackages(): Promise<Map<string, Uint8Array>> {
  try {
    const keys = (await tx("readonly", (s) => s.getAllKeys())) as string[];
    const out = new Map<string, Uint8Array>();
    for (const k of keys) {
      const v = (await tx("readonly", (s) => s.get(k))) as
        Uint8Array | undefined;
      if (v) out.set(k, v);
    }
    return out;
  } catch {
    return new Map();
  }
}
