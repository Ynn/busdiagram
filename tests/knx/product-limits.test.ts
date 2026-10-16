// The functions of a product's program that the simulation lacks (ProductLimit): the
// designer finds the ones that the values of the project turn on.
import { describe, expect, it } from "vitest";
import { programOf } from "../../src/knxprod/database";
import type { ProductDatabase } from "../../src/knxprod/database";
import { limitOfParameter, limitsOf } from "../../site/designer/limits";
import sa2 from "./fixtures/sample-devices/sa-2.json";

const app = programOf(sa2 as unknown as ProductDatabase);
// SA 2: the reaction of its outputs at bus voltage recovery (P-2, P-4), "unchanged" as
// delivered, is said not simulated when it switches; "on" only for P-4.
const limits = [
  { text: "Reaction at recovery", parameters: ["P-2"] },
  { text: "Switch on at recovery", parameters: ["P-4"], values: ["2"] },
  { text: "Manual operation" },
];

describe("limits of a product", () => {
  it("are listed, none in use with the program's values", () => {
    expect(limitsOf(limits, app, {}).map((s) => s.inUse)).toEqual([
      false,
      false,
      false,
    ]);
  });

  it("are in use when a parameter turns them on", () => {
    const on = limitsOf(limits, app, { "P-2_R-2": "1", "P-4_R-4": "1" });
    expect(on.map((s) => s.inUse)).toEqual([true, false, false]);
    expect(
      limitsOf(limits, app, { "P-4_R-4": "2" }).map((s) => s.inUse),
    ).toEqual([false, true, false]);
  });

  it("mark the parameters that turn them on", () => {
    expect(limitOfParameter(limits, app, {}, "P-2_R-2")).toMatchObject({
      inUse: false,
    });
    expect(limitOfParameter(limits, app, {}, "P-1_R-1")).toBeNull();
  });
});
