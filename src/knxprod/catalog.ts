// A product catalog (.knxprod): the catalog items of each manufacturer, the hardware and
// products they name, and their application programs, read when first needed. The
// catalog is the user's: BusDiagram reads it as ETS imports it, and keeps none of it.
import type { ApplicationProgram } from "./application";
import { parseApplication } from "./application";
import { descendants, parseXml } from "./xml";
import type { ZipEntry } from "./zip";
import { readText, readZip } from "./zip";

export interface CatalogItem {
  /** Identifier of the catalog item (what ETS adds to a project). */
  id: string;
  manufacturer: string;
  manufacturerName: string;
  name: string;
  description: string;
  product: string;
  productText: string;
  orderNumber: string;
  hardware: string;
  hardware2program: string;
  /** Application programs of the item (usually one). */
  applications: string[];
}

export interface Catalog {
  items: CatalogItem[];
  /** Application program by identifier, parsed on first use. */
  application(id: string): Promise<ApplicationProgram>;
}

/** Open a .knxprod archive. */
export async function openCatalog(bytes: Uint8Array): Promise<Catalog> {
  const entries = readZip(bytes);
  const byName = new Map(entries.map((e) => [e.name, e] as const));
  const MANUFACTURERS: Record<string, string> = {};
  const master = byName.get("knx_master.xml");
  if (master) {
    const doc = parseXml(await readText(master));
    for (const m of descendants(doc, "Manufacturer"))
      if (m.attrs.Id && m.attrs.Name) MANUFACTURERS[m.attrs.Id] = m.attrs.Name;
  }
  const items: CatalogItem[] = [];
  const appFiles = new Map<string, ZipEntry>();
  for (const e of entries) {
    const m = /^(M-[0-9A-F]{4})\/(M-[0-9A-F]{4}_A-[^/]+)\.xml$/.exec(e.name);
    if (m) appFiles.set(m[2]!, e);
  }
  for (const dir of new Set(
    entries
      .map((e) => /^(M-[0-9A-F]{4})\//.exec(e.name)?.[1])
      .filter(Boolean) as string[],
  )) {
    const hw = byName.get(`${dir}/Hardware.xml`);
    const cat = byName.get(`${dir}/Catalog.xml`);
    if (!hw || !cat) continue;
    const hdoc = parseXml(await readText(hw));
    const products = new Map<
      string,
      { text: string; order: string; hardware: string }
    >();
    const h2p = new Map<string, string[]>();
    for (const h of descendants(hdoc, "Hardware")) {
      for (const p of descendants(h, "Product"))
        products.set(p.attrs.Id!, {
          text: p.attrs.Text ?? "",
          order: p.attrs.OrderNumber ?? "",
          hardware: h.attrs.Id!,
        });
      for (const x of descendants(h, "Hardware2Program"))
        h2p.set(
          x.attrs.Id!,
          descendants(x, "ApplicationProgramRef").map((r) => r.attrs.RefId!),
        );
    }
    const cdoc = parseXml(await readText(cat));
    for (const ci of descendants(cdoc, "CatalogItem")) {
      const p = products.get(ci.attrs.ProductRefId ?? "");
      const apps = h2p.get(ci.attrs.Hardware2ProgramRefId ?? "") ?? [];
      if (!p) continue;
      items.push({
        id: ci.attrs.Id!,
        manufacturer: dir,
        manufacturerName: MANUFACTURERS[dir] ?? dir,
        name: ci.attrs.Name ?? p.text,
        description: ci.attrs.VisibleDescription ?? "",
        product: ci.attrs.ProductRefId!,
        productText: p.text,
        orderNumber: p.order,
        hardware: p.hardware,
        hardware2program: ci.attrs.Hardware2ProgramRefId ?? "",
        applications: apps.filter((a) => appFiles.has(a)),
      });
    }
  }
  const cache = new Map<string, Promise<ApplicationProgram>>();
  return {
    items,
    application(id) {
      let p = cache.get(id);
      if (!p) {
        const e = appFiles.get(id);
        if (!e)
          return Promise.reject(
            new Error(`application program ${id} not in the catalog`),
          );
        p = readText(e).then((t) => parseApplication(parseXml(t)));
        cache.set(id, p);
      }
      return p;
    },
  };
}
