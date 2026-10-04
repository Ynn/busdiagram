// Address focus: what each linked object does with the address chosen.
import { describe, expect, it } from "vitest";
import { gaRoles } from "../../src/ui/ga-roles";

describe("address focus", () => {
  const o = (C: boolean, T: boolean, W: boolean, gas: string[]) => ({
    flags: { C, R: false, W, T, U: false, I: false },
    gas,
  });
  it("sends only on its sending address with C and T; written with C and W", () => {
    expect(
      gaRoles(o(true, true, true, ["3/1/1", "3/6/200"]), "3/6/200"),
    ).toEqual({ sends: false, written: true });
    expect(gaRoles(o(true, true, false, ["3/1/1"]), "3/1/1")).toEqual({
      sends: true,
      written: false,
    });
    expect(
      gaRoles(o(false, true, true, ["3/1/1", "3/6/200"]), "3/1/1"),
    ).toEqual({ sends: false, written: false });
  });
});
