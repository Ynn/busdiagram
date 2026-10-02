import { describe, expect, it } from "vitest";
import { ScenarioError, buildScenario } from "../../src/knx/scenario";
import { translator } from "../../src/i18n";
import { toV2 } from "../../src/knx/export";
import { flags, keypad, raw, v2 } from "./helpers";

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

const pushButton = (extra: Record<string, unknown> = {}) =>
  keypad(
    "pushButton",
    "1.1.1",
    [
      {
        id: "b1",
        object: "b",
        ga: "1/1/1",
        flags: flags(false, true),
        parameters: { onPress: "on" },
      },
    ],
    extra,
  );

describe("structured errors instead of uncaught TypeError", () => {
  it("bounds of a parameter, in the language of the messages", () => {
    const doc = v2([
      {
        id: "t",
        name: "T",
        address: "1.1.1",
        kind: "thermostat",
        behavior: "roomThermostat/v1",
        parameters: { temperatureSendDeltaK: 50 },
        objects: [],
      },
    ]);
    const message = (lang: string) => {
      try {
        buildScenario(doc, undefined, translator(lang));
      } catch (e) {
        return (e as ScenarioError).details[0]!.message;
      }
    };
    expect(message("en")).toBe("value 50 out of bounds (≥ 0.1 and ≤ 5)");
    expect(message("fr")).toBe("valeur 50 hors bornes (≥ 0.1 et ≤ 5)");
  });

  it("format 2 only: formatVersion is required and must be 2", () => {
    const unversioned: Record<string, unknown> = v2([]);
    delete unversioned.formatVersion;
    expect(paths(unversioned)).toEqual(["formatVersion [required]"]);
    expect(paths({ ...v2([]), formatVersion: 1 })).toEqual([
      "formatVersion [version]",
    ]);
    expect(() => buildScenario(v2([]))).not.toThrow();
  });

  it("wrong JSON field types", () => {
    const doc = (fields: Record<string, unknown>) => ({
      formatVersion: 2,
      title: "t",
      ...fields,
    });
    expect(paths(doc({ lines: "oops", devices: [] }))).toContain(
      "lines [type]",
    );
    expect(paths(doc({ lines: [{ address: "1.1" }], devices: "x" }))).toContain(
      "devices [type]",
    );
    expect(
      paths(doc({ lines: [{ address: "1.1" }], devices: [null, 3] })),
    ).toEqual(["devices[0] [type]", "devices[1] [type]"]);
    expect(problems([])).toEqual([
      {
        path: "",
        code: "type",
        message: "The scenario must be a JSON object.",
      },
    ]);
  });

  it("missing references", () => {
    const bad = v2([
      {
        id: "a",
        name: "A",
        address: "1.2.3",
        kind: "panel",
        behavior: "passive/v1",
        objects: [
          {
            id: "o",
            name: "o",
            ga: ["1/1"],
            dpt: "1.001",
            port: "input",
            flags: flags(false, true),
          },
        ],
        inputs: [{ id: "i", type: "number", label: "I", object: "zz" }],
      },
    ]);
    const msg = problems(bad)
      .map((p) => `${p.path} : ${p.message}`)
      .join("\n");
    expect(msg).toContain(
      "devices[0].address : line 1.2 is not declared in “lines”",
    );
    expect(msg).toContain("devices[0].objects[0].ga");
    expect(msg).toContain("devices[0].inputs[0].object");
  });

  it("addresses outside their valid ranges", () => {
    expect(paths(v2([], { lines: [{ address: "99.99" }] }))).toContain(
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

  it("v2: unknown fields, required flags, press + short, toggle on a 2-byte object, keys on a device without keys", () => {
    const detector = {
      id: "pir",
      name: "PIR",
      address: "1.1.1",
      kind: "sensor",
      behavior: "presenceDetector/v1",
      colour: "red",
      objects: [
        { id: "b", name: "B", ga: "1/1/1", dpt: "1.001", port: "input" },
        {
          id: "p",
          name: "P",
          ga: [],
          dpt: "9.004",
          port: "brightness",
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
    };
    const panel = {
      id: "panel",
      address: "1.1.2",
      kind: "visualization",
      behavior: "passive/v1",
      objects: [],
      buttons: [{ id: "k", press: { object: "x", value: 1 } }],
    };
    expect(paths(v2([detector, panel]))).toEqual(
      expect.arrayContaining([
        "devices[0].colour [unknown-field]",
        "devices[0].objects[0].flags [required]",
        "devices[0].buttons[0] [conflict]",
        "devices[0].buttons[1].press.value [toggle]",
        "devices[1].buttons [incompatible]",
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

describe("reserved and unsupported addresses", () => {
  const base = (lines: unknown[], devices: unknown[] = []) => ({
    formatVersion: 2,
    lines,
    devices,
  });

  it("a line repeater or segment coupler cannot use the line coupler address", () => {
    const p = problems(
      base([{ address: "1.1", extension: { address: "1.1.0" } }]),
    );
    expect(p).toContainEqual(
      expect.objectContaining({
        path: "lines[0].extension.address",
        code: "address",
      }),
    );
  });

  it("lines 0.1 to 0.15 are reported as unsupported, not as invalid KNX", () => {
    const p = problems(base([{ address: "0.5" }]));
    expect(p[0]?.message).toContain("not supported by BusDiagram");
  });

  it("device number 0 names the coupler it is reserved for", () => {
    const device = (address: string) => ({
      id: "d",
      address,
      kind: "passive",
      behavior: "passive/v1",
      objects: [],
    });
    const msg = (address: string) =>
      problems(
        base([{ address: "1.1" }, { address: "2.1" }], [device(address)]),
      ).find((x) => x.path === "devices[0].address")?.message;
    expect(msg("1.1.0")).toContain("line coupler");
    expect(msg("1.0.0")).toContain("area (backbone) coupler");
  });

  it("group addresses assigned to a USB interface are validated", () => {
    const p = problems(
      base(
        [{ address: "1.1" }],
        [
          {
            id: "usb",
            address: "1.1.255",
            kind: "interface",
            behavior: "usbInterface/v1",
            parameters: { groupAddresses: "1/1/1 0/0/0 1/9/1" },
            objects: [],
          },
        ],
      ),
    ).filter((x) => x.path === "devices[0].parameters.groupAddresses");
    expect(p).toHaveLength(2);
  });
});

describe("line power supply", () => {
  const lines = (powerSupply: unknown) => ({
    formatVersion: 2,
    lines: [{ address: "1.1", powerSupply }],
    devices: [],
  });

  it("is kept with its current and exported unchanged", () => {
    const s = buildScenario(lines({ name: "PSU", currentMa: 640 }));
    expect(s.lines[0]!.powerSupply).toEqual({ name: "PSU", currentMa: 640 });
  });

  it("rejects a current that is not positive and unknown fields", () => {
    expect(paths(lines({ currentMa: 0 }))).toContain(
      "lines[0].powerSupply.currentMa [range]",
    );
    expect(paths(lines({ amps: 1 }))).toContain(
      "lines[0].powerSupply.amps [unknown-field]",
    );
  });
});

describe("DPTs shown but not simulated", () => {
  const scenario = (behavior: string, dpt: string, extra: object = {}) => ({
    formatVersion: 2,
    lines: [{ address: "1.1" }],
    groupAddresses: [{ address: "9/4/0", dpt: "235.001" }],
    devices: [
      {
        id: "panel",
        address: "1.1.1",
        kind: "display",
        behavior,
        objects: [
          {
            id: "o",
            ga: "9/4/0",
            dpt,
            port: "display",
            flags: { W: true, T: false },
            ...extra,
          },
        ],
      },
    ],
  });

  it("are accepted on a passive or display device, with an unknown value", () => {
    for (const b of ["passive/v1", "display/v1"]) {
      const s = buildScenario(scenario(b, "235.001"));
      expect(s.devices[0]!.objects[0]!.initial).toBeNull();
    }
  });

  it("are refused elsewhere, with a value, or when the main number is unknown", () => {
    expect(paths(scenario("presenceDetector/v1", "235.001"))).toContain(
      "devices[0].objects[0].dpt [dpt]",
    );
    expect(paths(scenario("passive/v1", "235.001", { value: 3 }))).toContain(
      "devices[0].objects[0].value [range]",
    );
    expect(paths(scenario("passive/v1", "999.001"))).toContain(
      "devices[0].objects[0].dpt [dpt]",
    );
  });
});

describe("names of main and middle groups", () => {
  const withRanges = (groupRanges: unknown) => ({
    formatVersion: 2,
    lines: [{ address: "1.1" }],
    devices: [],
    groupRanges,
  });

  it("are kept and exported unchanged", () => {
    const ranges = [
      { address: "1", name: "Lighting" },
      { address: "1/2", name: "Dimming" },
    ];
    const s = buildScenario(withRanges(ranges));
    expect([...s.groupRanges]).toEqual([
      ["1", "Lighting"],
      ["1/2", "Dimming"],
    ]);
    expect(toV2(s).groupRanges).toEqual(ranges);
  });

  it("reject invalid and duplicate groups", () => {
    const p = paths(
      withRanges([
        { address: "32", name: "x" },
        { address: "1/8", name: "x" },
        { address: "1", name: "a" },
        { address: "1", name: "b" },
      ]),
    );
    expect(p).toEqual([
      "groupRanges[0].address [address]",
      "groupRanges[1].address [address]",
      "groupRanges[3] [duplicate]",
    ]);
  });
});
