// Reading of a product catalog (.knxprod). No catalog is part of the
// repository (manufacturers' data): these tests run when KNXPROD names one, or when the
// course's catalog is at its usual place, and are skipped otherwise.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { openCatalog } from "../../src/knxprod/catalog";
import { parseXml } from "../../src/knxprod/xml";

const path =
  process.env.KNXPROD ?? "D:/KNX/CoursKNX/Catalogue_Produits_TP.knxprod";
const present = existsSync(path);

describe("xml", () => {
  it("reads elements, attributes, entities, and self-closing tags", () => {
    const d = parseXml(
      '<?xml version="1.0"?><KNX a="1 &amp; 2"><!-- c --><X b=\'&lt;y&gt;\'/><Y>t&#233;</Y></KNX>',
    );
    expect(d.name).toBe("KNX");
    expect(d.attrs.a).toBe("1 & 2");
    expect(d.children[0]!.attrs.b).toBe("<y>");
    expect(d.children[1]!.text).toBe("té");
  });
});

describe.skipIf(!present)("a product catalog", () => {
  it("lists its items with their programs, which are read with their memory and dialog", async () => {
    const cat = await openCatalog(new Uint8Array(readFileSync(path)));
    expect(cat.items.length).toBeGreaterThan(0);
    const item = cat.items.find((x) => x.applications.length > 0)!;
    expect(item.manufacturerName).not.toBe("");
    const app = await cat.application(item.applications[0]!);
    expect(app.id).toBe(item.applications[0]);
    expect(app.mask).toMatch(/^MV-[0-9A-F]{4}$/);
    expect(app.segments.size).toBeGreaterThan(0);
    // Every parameter stored in memory is in one of its segments.
    for (const p of app.parameters.values())
      if (p.memory) expect(app.segments.has(p.memory.segment)).toBe(true);
    expect(app.dynamic.length).toBeGreaterThan(0);
  });
});
