// Every device template of the designer gives a valid scenario, alone and together, and
// runs without error; templates create no group addresses.
import { describe, expect, it } from "vitest";
import { TEMPLATES } from "../../site/designer/standard-designer";
import { createSimulator } from "../../src/core";
import type { Doc } from "../../site/designer/edit";

const empty = () =>
  ({
    formatVersion: 2,
    lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }],
    groupAddresses: [],
    devices: [],
  }) as unknown as Doc;

const errors = (doc: unknown) =>
  createSimulator(doc)
    .getState()
    .diagnostics.map((d) => d.code);

describe("designer templates", () => {
  it.each(TEMPLATES.map((s) => [s.id, s] as const))(
    "%s gives a valid scenario without group addresses",
    (_id, s) => {
      const doc = s.apply(empty(), { line: "1.1" }) as Doc;
      expect(errors(doc)).toEqual([]);
      if (s.id !== "ga") expect(doc.groupAddresses).toEqual([]);
    },
  );

  it("all together on one installation", () => {
    let doc = empty();
    for (const s of TEMPLATES) doc = s.apply(doc, { line: "1.1" }) as Doc;
    expect(errors(doc)).toEqual([]);
  });
});
