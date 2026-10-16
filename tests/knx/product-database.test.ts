// Product database of a manufacturer's device, written from a product catalog by
// `npm run product` (scripts/product-database.mjs), which sets PRODUCT_CATALOG,
// PRODUCT_PROGRAM, PRODUCT_OUT and PRODUCT_FIXED. Without them, the database of the sample
// products is checked against what the generator keeps of a program.
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  catalogDatabase,
  programOf,
  systemRanges,
} from "../../src/knxprod/database";
import { SAMPLE_PRODUCTS } from "./fixtures/sample-devices/products";

const catalog = process.env.PRODUCT_CATALOG;

describe.runIf(!!catalog)("product database", () => {
  it("is written from the catalog", async () => {
    const fixed = process.env.PRODUCT_FIXED;
    const db = await catalogDatabase(
      new Uint8Array(readFileSync(catalog!)),
      process.env.PRODUCT_PROGRAM!,
      fixed ? (JSON.parse(fixed) as Record<string, string>) : undefined,
    );
    writeFileSync(process.env.PRODUCT_OUT!, JSON.stringify(db) + "\n");
  });
});

describe.skipIf(!!catalog)("system part of a program", () => {
  it("is what precedes the address table, and the group object table", () => {
    const [sa2, be1] = SAMPLE_PRODUCTS.map((p) => programOf(p.database));
    // BCU1: 100h–115h, then the object table at 146h (count 2, 3-octet descriptors).
    expect(systemRanges(sa2!)).toEqual([
      [0x100, 22],
      [0x146, 8],
    ]);
    // BIM M112: no octet before its address table; 4-octet descriptors.
    expect(systemRanges(be1!)).toEqual([
      [0x4000, 0],
      [0x4200, 7],
    ]);
  });
});
