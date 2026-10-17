// A memory read back (readBack): the values of the dialog it holds, as the project keeps
// them, and what they write again; with the products of an imaginary manufacturer.
import { describe, expect, it } from "vitest";
import { programOf } from "../../src/knxprod/database";
import { projectImage } from "../../src/knxprod/runtime";
import { readBack } from "../../src/knxprod/readback";
import { visible, valueProblem } from "../../src/knxprod/config";
import { SAMPLE_PRODUCTS } from "./fixtures/sample-devices/products";

describe("a memory read back", () => {
  it.each(SAMPLE_PRODUCTS.map((p) => [p.behavior, p.database] as const))(
    "%s: gives the values that write it again",
    (_behavior, db) => {
      const app = programOf(db);
      const image = (v: Record<string, string>) =>
        projectImage(app, app.mask.slice(3), v, new Map(), "1.1.1");
      // Each visible parameter in memory changed to another value its type takes.
      for (const ref of visible(app, {}).parameters) {
        const p = app.parameters.get(app.parameterRefs.get(ref)!.ref)!;
        const t = app.types.get(p.type);
        if (!p.memory || !t) continue;
        const v = [
          ...(t.enums ?? []).map((e) => String(e.value)),
          "1",
          "0",
        ].find((x) => x !== p.value && !valueProblem(t, x));
        if (v === undefined) continue;
        const mem = image({ [ref]: v });
        const back = readBack(app, mem);
        expect(back.unexplained).toEqual([]);
        expect(back.values[ref]).toBe(v);
        const again = image(back.values);
        for (const s of app.segments.values())
          expect([...again.subarray(s.address, s.address + s.size)]).toEqual([
            ...mem.subarray(s.address, s.address + s.size),
          ]);
      }
    },
  );

  it("keeps nothing of a memory as delivered", () => {
    const app = programOf(SAMPLE_PRODUCTS[0]!.database);
    const back = readBack(
      app,
      projectImage(app, app.mask.slice(3), {}, new Map(), "1.1.1"),
    );
    expect(back).toEqual({
      values: {},
      inferred: [],
      unexplained: [],
      problems: [],
    });
  });
});
