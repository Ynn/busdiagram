import { describe, expect, it } from "vitest";
import { captureRegistry } from "../../src/knx/registry";
import { buildAuthorSchema } from "../../src/knx/schema";
import { SchemaNavigator } from "../../site/designer/completion";
import {
  SNIPPETS,
  SnippetRefusal,
  freeAddress,
  freeGa,
} from "../../site/designer/snippets";
import { raw } from "./helpers";
import { buildScenario } from "../../src/knx/scenario";

const nav = new SchemaNavigator(buildAuthorSchema(captureRegistry()));
const doc = raw("shutter-calibration.json");

describe("designer: navigation in the diagram", () => {
  it("available ports depend on device behavior", () => {
    const pushButton = nav.at(["devices", 0, "objects", 0, "port"], doc)!;
    expect(nav.values(pushButton)).toEqual(["input", "display"]);
    const shutterActuator = nav.at(["devices", 1, "objects", 0, "port"], doc)!;
    expect(nav.values(shutterActuator)).toEqual(
      expect.arrayContaining(["move", "stopStep", "positionCommand"]),
    );
  });

  it("DPT, behaviors, flag booleans", () => {
    expect(
      nav.values(nav.at(["devices", 0, "objects", 0, "dpt"], doc)!),
    ).toContain("5.001");
    expect(nav.values(nav.at(["devices", 0, "behavior"], doc)!)).toContain(
      "shutterActuator/v1",
    );
    expect(
      nav.values(nav.at(["devices", 0, "objects", 0, "flags", "W"], doc)!),
    ).toEqual([true, false]);
  });

  it("connect a key to a shutter channel with behavior parameters", () => {
    const params = nav.at(["devices", 1, "channels", 0, "parameters"], doc)!;
    expect(Object.keys(params.properties as object)).toEqual(
      expect.arrayContaining([
        "estimatedTravelTimeMs",
        "startDelayMs",
        "invertOutput",
      ]),
    );
  });
});

describe("safe insertions", () => {
  const pushButton4 = SNIPPETS.find((s) => s.id === "pushButton4")!;
  const switchActuator4 = SNIPPETS.find((s) => s.id === "switchActuator4")!;
  const empty = (lines: Record<string, unknown>[]) => ({
    formatVersion: 2,
    lines,
    groupAddresses: [],
    devices: [],
  });

  it("the address of an extension or coupler is never reassigned", () => {
    const doc = {
      ...empty([{ address: "1.1", extension: { address: "1.1.1" } }]),
      topology: { ip: "lineCouplers" },
    };
    const next = pushButton4.apply(doc);
    expect((next.devices as { address: string }[])[0]!.address).toBe("1.1.2");
    expect(() => buildScenario(next)).not.toThrow();
  });

  it("target line, unknown line, and full capacity produce explicit refusals without mutation", () => {
    const doc = empty([{ address: "1.1" }, { address: "1.2" }]);
    expect(
      (
        switchActuator4.apply(doc, { line: "1.2" }).devices as {
          address: string;
        }[]
      )[0]!.address,
    ).toBe("1.2.1");
    expect(() => switchActuator4.apply(doc, { line: "3.3" })).toThrow(
      SnippetRefusal,
    );
    const full = {
      ...doc,
      devices: Array.from({ length: 255 }, (_, i) => ({
        id: `d${i}`,
        address: `1.1.${i + 1}`,
      })),
    };
    expect(() => freeAddress(full, "1.1")).toThrow(
      /no free address left on line 1\.1/,
    );
    const gas = {
      ...doc,
      groupAddresses: Array.from({ length: 255 }, (_, i) => ({
        address: `1/1/${i + 1}`,
      })),
    };
    expect(() => freeGa(gas)).toThrow(SnippetRefusal);
    const lines = empty(
      Array.from({ length: 15 }, (_, i) => ({ address: `1.${i + 1}` })),
    );
    expect(() => SNIPPETS.find((s) => s.id === "line")!.apply(lines)).toThrow(
      /15 lines/,
    );
  });

  it.each([null, [], { devices: {} }, { groupAddresses: {} }, { lines: [42] }])(
    "malformed document %j: rejected without an uncaught exception",
    (doc) => {
      for (const s of SNIPPETS)
        expect(() => s.apply(doc as never)).toThrow(SnippetRefusal);
    },
  );
});
