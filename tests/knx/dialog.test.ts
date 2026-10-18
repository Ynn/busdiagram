// The pages of the parameter dialog of a program, as ETS shows them: the tree of its
// blocks (ETS4 and later), or, for a program converted from ETS3, the pages of the
// display order and the indent of their titles. Products of an imaginary manufacturer.
import { describe, expect, it } from "vitest";
import type { DynNode } from "../../src/knxprod/application";
import { programOf } from "../../src/knxprod/database";
import type { ProductDatabase } from "../../src/knxprod/database";
import { dialogPages, type DialogPage } from "../../src/knxprod/dialog";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const base = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, "fixtures/sample-devices/sa-2.json"),
    "utf8",
  ),
) as ProductDatabase;

/** A program with these blocks, parameters (ref → [text, display order]) and titles. */
function program(
  dynamic: DynNode[],
  params: Record<string, [string, number]>,
  former = false,
) {
  const db = structuredClone(base) as ProductDatabase & {
    types: unknown[];
    parameters: unknown[];
    parameterRefs: unknown[];
  };
  db.types.push({ id: "PT-Title", kind: "none" });
  db.parameters = Object.entries(params).map(([id, [text]]) => ({
    id,
    name: id,
    type: id.startsWith("T-") ? "PT-Title" : "PT-Contact",
    text,
    value: "0",
    access: "ReadWrite",
    memory: null,
    defaultUnion: false,
    union: null,
  }));
  db.parameterRefs = Object.entries(params).map(([id, [, order]]) => ({
    id: `${id}_R`,
    ref: id,
    displayOrder: order,
  }));
  db.dynamic = dynamic as ProductDatabase["dynamic"];
  if (former) db.preEts4Style = true;
  return programOf(db);
}
const block = (
  id: string,
  children: DynNode[],
  more: { text?: string; paramRef?: string; access?: string } = {},
): DynNode => ({
  kind: "block",
  id,
  name: id,
  text: more.text ?? "",
  paramRef: more.paramRef ?? "",
  access: more.access ?? "",
  inline: false,
  children,
});
const param = (ref: string): DynNode => ({ kind: "param", ref: `${ref}_R` });
const shape = (pages: DialogPage[]): unknown =>
  pages.map((p) => ({
    label: p.label,
    params: p.entries.flatMap((e) => (e.kind === "param" ? [e.ref] : [])),
    ...(p.children.length ? { children: shape(p.children) } : {}),
  }));

describe("pages of the dialog", () => {
  it("of ETS4: a block in a block is its page, a channel with a text groups them", () => {
    const app = program(
      [
        {
          kind: "channel",
          id: "CH-1",
          text: "Outputs",
          children: [
            block(
              "PB-1",
              [
                param("P-1"),
                {
                  kind: "choose",
                  ref: "P-1_R",
                  whens: [
                    {
                      test: ["0"],
                      isDefault: false,
                      children: [
                        block("PB-2", [param("P-2")], { text: "Details" }),
                      ],
                    },
                  ],
                },
              ],
              { text: "Output A" },
            ),
            block("PB-3", [param("P-3")], { text: "Hidden", access: "None" }),
          ],
        },
      ],
      { "P-1": ["Contact", 10], "P-2": ["Recovery", 20], "P-3": ["Spare", 30] },
    );
    expect(shape(dialogPages(app, {}))).toEqual([
      {
        label: "Outputs",
        params: [],
        children: [
          {
            label: "Output A",
            params: ["P-1_R"],
            children: [{ label: "Details", params: ["P-2_R"] }],
          },
        ],
      },
    ]);
    // Another value: the branch, and its page, go.
    expect(shape(dialogPages(app, { "P-1_R": "1" }))).toEqual([
      {
        label: "Outputs",
        params: [],
        children: [{ label: "Output A", params: ["P-1_R"] }],
      },
    ]);
  });

  it("of ETS3: by the display order of the titles, indented by their spaces", () => {
    const app = program(
      [
        block("PB-10", [param("P-1"), param("P-2")], { paramRef: "T-10_R" }),
        block("PB-11", [], { paramRef: "T-11_R" }),
        // A hidden block is no page, but its parameters show where their order puts them.
        block("PB-12", [param("P-3")], { access: "None" }),
        block("PB-13", [param("P-4")], { paramRef: "T-13_R" }),
        block("PB-14", [param("P-5")], { paramRef: "T-14_R" }),
      ],
      {
        "T-10": ["Output A: {{0: function}}", 1000],
        "P-1": ["Contact", 1010],
        "P-2": ["Runtime", 1110],
        "T-11": ["  Drive", 1100],
        "P-3": ["Pause", 1120],
        "T-13": ["  Safety", 1050],
        "P-4": ["Priority", 1060],
        "T-14": ["Output B", 2000],
        "P-5": ["Contact", 2010],
      },
      true,
    );
    expect(shape(dialogPages(app, {}))).toEqual([
      {
        label: "Output A: function",
        params: ["P-1_R"],
        children: [
          { label: "Safety", params: ["P-4_R"] },
          { label: "Drive", params: ["P-2_R", "P-3_R"] },
        ],
      },
      { label: "Output B", params: ["P-5_R"] },
    ]);
  });

  it("titles a page by the text of its reference, then of its parameter", () => {
    // P-1 keeps the text of its parameter; P-2's reference has a text of its own.
    const app = program(
      [
        block("PB-1", [param("P-1")], { paramRef: "T-1_R" }),
        block("PB-2", [param("P-2")], { paramRef: "T-2_R" }),
        block("PB-3", [param("P-3")], { paramRef: "T-3_R" }),
      ],
      {
        "T-1": ["General name", 10],
        "T-2": ["General name", 20],
        "T-3": ["General name", 30],
        "P-1": ["Contact", 11],
        "P-2": ["Contact", 21],
        "P-3": ["Contact", 31],
      },
    );
    const fr = new Map([
      ["T-1|Text", "Nom général"],
      ["T-2|Text", "Nom général"],
      ["T-2_R|Text", "Nom spécifique"],
      ["T-3|Text", "Nom général"],
    ]);
    app.translations.set("fr-FR", fr);
    // T-3's reference says another text, without a translation of its own.
    app.parameterRefs.get("T-3_R")!.text = "Specific name";
    expect(dialogPages(app, {}, "fr").map((p) => p.label)).toEqual([
      "Nom général",
      "Nom spécifique",
      "Specific name",
    ]);
  });
});
