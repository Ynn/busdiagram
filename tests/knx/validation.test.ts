import { describe, expect, it } from "vitest";
import { ScenarioError, buildScenario } from "../../src/knx/scenario";
import { flags, raw, v2 } from "./helpers";

function problems(data: unknown) {
  try {
    buildScenario(data);
  } catch (e) {
    expect(e).toBeInstanceOf(ScenarioError);
    return (e as ScenarioError).details;
  }
  throw new Error("scenario incorrectly accepted");
}

const paths = (data: unknown) =>
  problems(data).map((p) => `${p.path} [${p.code}]`);

const pushButton = (extra: Record<string, unknown> = {}) => ({
  id: "pushButton",
  name: "BP",
  address: "1.1.1",
  kind: "pushButton",
  behavior: "pushButton/v1",
  objects: [
    {
      id: "b",
      name: "B",
      ga: "1/1/1",
      dpt: "1.001",
      port: "input",
      flags: flags(false, true),
    },
  ],
  buttons: [{ id: "b1", press: { object: "b", value: 1 } }],
  ...extra,
});

describe("structured errors instead of uncaught TypeError", () => {
  it("wrong JSON field types", () => {
    expect(paths({ lines: "oops", devices: [] })).toContain("lines [type]");
    expect(paths({ lines: [{ address: "1.1" }], devices: "x" })).toContain(
      "devices [type]",
    );
    expect(paths({ lines: [{ address: "1.1" }], devices: [null, 3] })).toEqual([
      "devices[0] [type]",
      "devices[1] [type]",
    ]);
    expect(problems([])).toEqual([
      {
        path: "",
        code: "type",
        message: "The scenario must be a JSON object.",
      },
    ]);
  });

  it("missing references, in v1 as in v2", () => {
    const bad = {
      lines: [{ address: "1.1" }],
      devices: [
        {
          id: "a",
          address: "1.2.3",
          objects: [{ id: "o", name: "o", ga: "1/1" }],
          buttons: [{ label: "B", press: { object: "zz", value: 1 } }],
        },
      ],
    };
    const msg = problems(bad)
      .map((p) => `${p.path} : ${p.message}`)
      .join("\n");
    expect(msg).toContain(
      "devices[0].address : line 1.2 is not declared in “lines”",
    );
    expect(msg).toContain("devices[0].objects[0].ga");
    expect(msg).toContain("devices[0].buttons[0].press.object");
  });

  it("addresses outside their valid ranges", () => {
    expect(paths({ lines: [{ address: "99.99" }], devices: [] })).toContain(
      "lines[0].address [address]",
    );
    expect(paths(v2([pushButton({ address: "1.1.300" })]))).toContain(
      "devices[0].address [address]",
    );
    const ga = v2([
      pushButton({
        objects: [
          {
            id: "b",
            name: "B",
            ga: "32/1/1",
            dpt: "1.001",
            port: "input",
            flags: flags(false, true),
          },
        ],
      }),
    ]);
    expect(paths(ga)).toContain("devices[0].objects[0].ga [address]");
  });

  it("null or negative times, unknown parameters", () => {
    const shutterActuator = (
      params: Record<string, unknown>,
      eq: Record<string, unknown> = { actualTravelTimeMs: 1000 },
    ) =>
      v2([
        {
          id: "shutterActuator",
          name: "VR",
          address: "1.1.2",
          kind: "shutterActuator",
          behavior: "shutterActuator/v1",
          objects: [],
          channels: [
            {
              id: "s1",
              parameters: params,
              equipment: { type: "shutter", parameters: eq },
            },
          ],
        },
      ]);
    expect(paths(shutterActuator({ estimatedTravelTimeMs: 0 }))).toEqual([
      "devices[0].channels[0].parameters.estimatedTravelTimeMs [range]",
    ]);
    expect(
      paths(
        shutterActuator(
          { estimatedTravelTimeMs: 1000 },
          { actualTravelTimeMs: -5 },
        ),
      ),
    ).toEqual([
      "devices[0].channels[0].equipment.parameters.actualTravelTimeMs [range]",
    ]);
    expect(paths(shutterActuator({}))).toEqual([
      "devices[0].channels[0].parameters.estimatedTravelTimeMs [required]",
    ]);
    expect(
      paths(shutterActuator({ estimatedTravelTimeMs: 1000, bogus: 1 })),
    ).toEqual(["devices[0].channels[0].parameters.bogus [unknown-field]"]);
    const v1 = raw("timers.json") as {
      devices: { channels?: { timer?: number }[] }[];
    };
    v1.devices[3]!.channels![0]!.timer = 0;
    expect(paths(v1)).toEqual(["devices[3].channels[0].timer [range]"]);
  });

  it("incompatible or unsupported DPT", () => {
    const sw = (dpt: string) =>
      v2([
        pushButton(),
        {
          id: "switchActuator",
          name: "TOR",
          address: "1.1.2",
          kind: "switchActuator",
          behavior: "switchActuator/v1",
          objects: [
            {
              id: "c",
              name: "C",
              ga: "1/1/1",
              dpt,
              port: "switch",
              channel: "s1",
              flags: flags(true, false),
            },
          ],
          channels: [{ id: "s1", equipment: { type: "lamp" } }],
        },
      ]);
    expect(paths(sw("5.001"))).toEqual(
      expect.arrayContaining([
        "devices[1].objects[0].dpt [dpt]",
        "devices[1].objects[0].dpt [association]",
      ]),
    );
    expect(paths(sw("18.001"))).toContain("devices[1].objects[0].dpt [dpt]");
  });

  it("unknown extension (behavior or equipment)", () => {
    const d = v2([pushButton({ behavior: "unknownBehavior/v1" })]);
    const p = problems(d);
    expect(p.map((x) => x.code)).toContain("unknown-behavior");
    expect(p.find((x) => x.code === "unknown-behavior")!.message).toMatch(
      /extension not loaded/,
    );
    const e = v2([
      {
        id: "switchActuator",
        name: "TOR",
        address: "1.1.2",
        kind: "switchActuator",
        behavior: "switchActuator/v1",
        objects: [],
        channels: [{ id: "s1", equipment: { type: "fontaine" } }],
      },
    ]);
    expect(paths(e)).toEqual([
      "devices[0].channels[0].equipment.type [unknown-equipment]",
    ]);
  });

  it("v2 : unknown fields, required flags, press + shorts, toggle on an object 1 byte, input without GA", () => {
    const d = v2([
      pushButton({
        colour: "red",
        objects: [
          { id: "b", name: "B", ga: "1/1/1", dpt: "1.001", port: "input" },
          {
            id: "p",
            name: "P",
            ga: [],
            dpt: "5.001",
            port: "input",
            flags: flags(false, true),
          },
        ],
        buttons: [
          {
            id: "b1",
            press: { object: "b", value: 1 },
            short: { object: "b", value: 0 },
          },
          { id: "b2", press: { object: "p", value: "toggle" } },
        ],
        inputs: [
          { id: "n", type: "number", object: "p", min: 0, max: 100, step: 1 },
        ],
      }),
    ]);
    expect(paths(d)).toEqual(
      expect.arrayContaining([
        "devices[0].colour [unknown-field]",
        "devices[0].objects[0].flags [required]",
        "devices[0].buttons[0] [conflict]",
        "devices[0].buttons[1].press.value [toggle]",
        "devices[0].inputs[0].object [no-ga]",
      ]),
    );
  });

  it("unknown format version", () => {
    expect(paths({ formatVersion: 3, lines: [], devices: [] })).toEqual([
      "formatVersion [version]",
    ]);
  });

  it("incompatible stage presets", () => {
    const d = v2([
      {
        id: "switchActuator",
        name: "TOR",
        address: "1.1.2",
        kind: "switchActuator",
        behavior: "switchActuator/v1",
        objects: [],
        channels: [
          {
            id: "s1",
            equipment: { type: "lamp" },
            scenes: { "1": 0.5, "65": 1 },
          },
        ],
      },
    ]);
    expect(paths(d)).toEqual([
      "devices[0].channels[0].scenes.1 [range]",
      "devices[0].channels[0].scenes.65 [range]",
    ]);
  });
});

describe("empty identities and fields", () => {
  const disp = (id: string, objects: unknown[]) => ({
    id,
    kind: "generic",
    behavior: "display/v1",
    medium: "IP",
    objects,
  });
  const o = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    ga: [],
    dpt: "1.001",
    port: "display",
    flags: flags(true, false),
    ...extra,
  });
  const ip = { topology: { ip: "lineCouplers" } };

  it("pairs (a/b, c) and (a, b/c) are not confused", () => {
    const d = v2(
      [disp("a/b", [o("c")]), disp("a", [o("b/c", { value: 1 })])],
      ip,
    );
    expect(paths(d)).toEqual([
      "devices[0].id [id]",
      "devices[1].objects[0].id [id]",
    ]);
  });

  it("empty ID or empty port refused, never silently omitted object", () => {
    const d = v2([disp("x", [o(""), o("p", { port: "" })])], ip);
    expect(paths(d)).toEqual([
      "devices[0].objects[0].id [required]",
      "devices[0].objects[1].port [required]",
    ]);
    const b = v2([
      pushButton({ buttons: [{ id: "", press: { object: "b", value: 1 } }] }),
    ]);
    expect(paths(b)).toContain("devices[0].buttons[0].id [required]");
  });

  it('A7: a scene has only one writing ("01" refused)', () => {
    const d = v2([
      {
        id: "switchActuator",
        kind: "switchActuator",
        behavior: "switchActuator/v1",
        address: "1.1.2",
        objects: [],
        channels: [
          {
            id: "s1",
            equipment: { type: "lamp" },
            scenes: { "01": 1, "1": 0 },
          },
        ],
      },
    ]);
    expect(paths(d)).toEqual(["devices[0].channels[0].scenes.01 [range]"]);
  });

  it("a v2 file without formatVersion is reported as such", () => {
    const doc = raw("shutter-calibration.json");
    delete doc.formatVersion;
    expect(problems(doc)[0]).toMatchObject({
      path: "formatVersion",
      code: "required",
    });
  });

  it("name is optional: the ID supplies the name", () => {
    const s = buildScenario(v2([disp("sup", [o("l1")])], ip));
    expect(s.devices[0]!.name).toBe("sup");
    expect(s.devices[0]!.objects[0]!.name).toBe("l1");
  });
});
