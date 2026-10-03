// Polarity and compensation parameters: the transmitted value always follows the DPT,
// the physical load decides the effect, and mismatched compensations are reported.
import { describe, expect, it } from "vitest";
import { buildScenario, createSimulator, toV2 } from "../../src/core";
import { raw } from "./helpers";

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const dev = (doc: Doc, id: string) =>
  doc.devices.find((d: Doc) => d.id === id) as Doc;
const codes = (sim: ReturnType<typeof createSimulator>) =>
  sim.diagnostics.map((d) => d.code).filter((c) => c.startsWith("config-"));

describe("window contact polarity", () => {
  const cases: [string, boolean, string, boolean, number, boolean][] = [
    // contact type, invert, DPT, window open, expected value, warning
    ["normallyOpen", false, "1.019", true, 1, false],
    ["normallyOpen", false, "1.019", false, 0, false],
    ["normallyClosed", true, "1.019", true, 1, false],
    ["normallyOpen", false, "1.009", true, 0, false],
    ["normallyClosed", true, "1.009", false, 1, false],
    ["normallyOpen", true, "1.019", true, 0, true],
    ["normallyClosed", false, "1.019", true, 0, true],
  ];
  it.each(cases)(
    "%s, invert %s, DPT %s, open %s → %i",
    (contactType, invert, dpt, open, expected, warning) => {
      const doc = raw("room-heating.json") as Doc;
      const c = dev(doc, "windowContact");
      c.parameters = { contactType, invert, sendOnStart: false };
      c.objects[0].dpt = dpt;
      c.objects[0].ga = "3/3/9";
      const sim = createSimulator(doc);
      if (open) sim.roomAction("livingRoom", "window", 1);
      sim.advance(3000);
      expect(sim.objectValue("windowContact", "c")).toBe(expected);
      expect(codes(sim).includes("config-contact")).toBe(warning);
    },
  );

  it("a thermostat window input in DPT 1.009 reads 0 as open", () => {
    const doc = raw("room-heating.json") as Doc;
    dev(doc, "windowContact").objects[0].dpt = "1.009";
    dev(doc, "livingThermostat").objects.find(
      (o: Doc) => o.port === "window",
    ).dpt = "1.009";
    doc.groupAddresses = (doc.groupAddresses ?? []).filter(
      (g: Doc) => g.address !== "3/3/1",
    );
    const sim = createSimulator(doc);
    sim.advance(3000);
    expect(sim.deviceState("livingThermostat").window).toBe(false);
    sim.roomAction("livingRoom", "window", 1);
    sim.advance(5000);
    expect(sim.deviceState("livingThermostat").window).toBe(true);
    expect(codes(sim)).toEqual([]);
  });

  it("linking DPT 1.009 and DPT 1.019 on one address is reported", () => {
    const doc = raw("room-heating.json") as Doc;
    dev(doc, "windowContact").objects[0].dpt = "1.009";
    doc.groupAddresses = (doc.groupAddresses ?? []).filter(
      (g: Doc) => g.address !== "3/3/1",
    );
    expect(codes(createSimulator(doc))).toContain("config-polarity");
  });
});

describe("shutter motor wiring", () => {
  const setup = (wiringReversed: boolean, invertOutput: boolean) => {
    const doc = raw("shutter-calibrated.json") as Doc;
    const ch = dev(doc, "shutterActuator").channels[0];
    ch.parameters.invertOutput = invertOutput;
    ch.equipment.parameters.wiringReversed = wiringReversed;
    ch.equipment.initialState = { positionPct: 50 };
    ch.initialState = { estimatedPositionPct: 50 };
    const sim = createSimulator(doc);
    sim.input("pushButton", "key2", "long");
    sim.advance(3000);
    return sim;
  };
  it("a reversed motor compensated by the actuator moves as commanded", () => {
    const sim = setup(true, true);
    expect(sim.equipmentState("shutterActuator", "s1")!.drive).toBe("down");
    expect(codes(sim)).toEqual([]);
  });
  it("an uncompensated reversed motor moves the wrong way and is reported", () => {
    const sim = setup(true, false);
    expect(sim.equipmentState("shutterActuator", "s1")!.drive).toBe("up");
    expect(codes(sim)).toContain("config-wiring");
  });
  it("inverting the output of a normally wired motor is reported", () => {
    const sim = setup(false, true);
    expect(sim.equipmentState("shutterActuator", "s1")!.drive).toBe("up");
    expect(codes(sim)).toContain("config-wiring");
  });
});

describe("heating valve direction", () => {
  it("an actuator and a valve of different types are reported", () => {
    const doc = raw("room-heating.json") as Doc;
    dev(doc, "heatingActuator").channels[0].parameters = {
      valveType: "normallyOpen",
    };
    expect(codes(createSimulator(doc))).toContain("config-valve");
    expect(codes(createSimulator(raw("room-heating.json")))).toEqual([]);
  });
});

describe("weather station and room model", () => {
  const withStation = (applies?: boolean) => {
    const doc = raw("room-heating.json") as Doc;
    doc.groupAddresses = [
      ...(doc.groupAddresses ?? []),
      { address: "4/1/3", name: "Outdoor temperature", dpt: "9.001" },
    ];
    doc.devices.push({
      id: "weather",
      address: "1.1.50",
      kind: "weatherStation",
      behavior: "weatherStation/v1",
      ...(applies === undefined
        ? {}
        : { parameters: { setsRoomOutdoorTemperature: applies } }),
      objects: [
        {
          id: "t",
          ga: "4/1/3",
          dpt: "9.001",
          port: "outdoorTemp",
          flags: { W: false, T: true },
        },
      ],
      inputs: [
        {
          id: "t",
          type: "number",
          label: "Outdoor",
          object: "t",
          min: -20,
          max: 40,
          step: 1,
        },
      ],
    });
    return createSimulator(doc);
  };
  it("an entered outdoor temperature applies to every room and is transmitted", () => {
    const sim = withStation();
    const [tel] = sim.input("weather", "t", "value", 30);
    expect(tel!.dpt).toBe("9.001");
    const rooms = sim.getState().rooms;
    expect(rooms.livingRoom!.outsideTemperatureC).toBe(30);
    expect(rooms.bedroom!.outsideTemperatureC).toBe(30);
  });
  it("the link can be disabled", () => {
    const sim = withStation(false);
    sim.input("weather", "t", "value", 30);
    expect(sim.getState().rooms.livingRoom!.outsideTemperatureC).toBe(5);
  });
});

describe("external temperature timeout", () => {
  it("falls back to the internal sensor, then uses new values again", () => {
    const doc = raw("room-heating.json") as Doc;
    const th = dev(doc, "livingThermostat");
    th.parameters.externalTempTimeoutMs = 10000;
    th.objects.push({
      id: "ext",
      ga: "3/4/9",
      dpt: "9.001",
      port: "externalTemp",
      flags: { W: true, T: false },
    });
    const sim = createSimulator(doc);
    sim.groupWrite("usbInterface", "3/4/9", 30);
    sim.advance(3000);
    expect(sim.deviceState("livingThermostat").measuredC).toBeCloseTo(30, 1);
    sim.advance(15000);
    const st = sim.deviceState("livingThermostat");
    expect(st.externalStale).toBe(true);
    expect(Number(st.measuredC)).toBeLessThan(25);
    sim.groupWrite("usbInterface", "3/4/9", 30);
    sim.advance(3000);
    expect(sim.deviceState("livingThermostat").externalStale).toBe(false);
  });
});

describe("normally closed relay", () => {
  const setup = () => {
    const v2 = toV2(buildScenario(raw("lighting-control.json"))) as Doc;
    const act = v2.devices.find((d: Doc) => d.id === "switchActuator");
    act.channels[0].parameters = { relayMode: "normallyClosed" };
    return createSimulator(v2);
  };
  it("powers the load while the channel is off, and reports the switching state", () => {
    const sim = setup();
    sim.advance(1000);
    expect(sim.output("switchActuator", "s1")).toEqual({
      type: "switch",
      on: true,
    });
    expect(sim.equipmentState("switchActuator", "s1")!.on).toBe(true);
    expect(sim.channelState("switchActuator", "s1").on).toBe(false);
    sim.input("pushButton", "in1", "press"); // Key 1: on
    sim.advance(6000);
    expect(sim.channelState("switchActuator", "s1").on).toBe(true);
    expect(sim.equipmentState("switchActuator", "s1")!.on).toBe(false);
    // A normally open channel of the same actuator is unaffected.
    expect(sim.equipmentState("switchActuator", "s2")!.on).toBe(true);
  });
});

describe("different kinds of data on one group address", () => {
  it("a scene number and a brightness value on one address are reported", () => {
    // Real commissioning error: a panel sends scene numbers on the address of a
    // dimming actuator's brightness object.
    const doc = raw("dimming.json") as Doc;
    const panel = dev(doc, "panel");
    const scene = panel.objects.find((o: Doc) => o.id === "level");
    scene.dpt = "17.001";
    doc.groupAddresses = (doc.groupAddresses ?? []).filter(
      (g: Doc) => g.address !== "1/3/1",
    );
    panel.inputs = [];
    const sim = createSimulator(doc);
    expect(codes(sim)).toContain("config-datatype");
  });

  it("a declared DPT that differs from the objects is reported", () => {
    const doc = raw("dimming.json") as Doc;
    doc.groupAddresses.find((g: Doc) => g.address === "1/3/1").dpt = "5.004";
    expect(codes(createSimulator(doc))).toContain("config-datatype");
  });

  it("one-bit DPTs sharing an address are not reported", () => {
    expect(codes(createSimulator(raw("shutter-control.json")))).not.toContain(
      "config-datatype",
    );
  });
});

describe("TP1 segment size", () => {
  it("warns above 64 devices on one segment", async () => {
    const { buildScenario } = await import("../../src/knx/scenario");
    const { configWarnings } = await import("../../src/knx/consistency");
    const { en } = await import("../../src/i18n");
    const scenario = (n: number) =>
      buildScenario({
        formatVersion: 2,
        title: "Segment",
        lines: [{ address: "1.1" }],
        groupAddresses: [],
        devices: Array.from({ length: n }, (_, i) => ({
          id: `d${i}`,
          address: `1.1.${i + 1}`,
          kind: "generic",
          behavior: "passive/v1",
          objects: [],
        })),
      });
    const codes = (n: number) =>
      configWarnings(scenario(n), en).map((w) => w.code);
    expect(codes(64)).not.toContain("config-segment-size");
    expect(codes(65)).toContain("config-segment-size");
    // A repeater or a line coupler is connected to the segment as well (TP1: a bridge or
    // a router has a TP1 connection on each side): 63 devices and one of them make 64.
    const withCoupling = (n: number, how: "repeater" | "coupler") => {
      const doc = {
        formatVersion: 2,
        title: "Segment",
        lines: [
          {
            address: "1.1",
            ...(how === "repeater"
              ? { extension: { address: "1.1.250", mode: "repeater" } }
              : {}),
          },
          ...(how === "coupler" ? [{ address: "1.2" }] : []),
        ],
        groupAddresses: [],
        devices: Array.from({ length: n }, (_, i) => ({
          id: `d${i}`,
          address: `1.1.${i + 1}`,
          kind: "generic",
          behavior: "passive/v1",
          objects: [],
        })),
      };
      return configWarnings(buildScenario(doc), en).map((w) => w.code);
    };
    for (const how of ["repeater", "coupler"] as const) {
      expect(withCoupling(63, how)).not.toContain("config-segment-size");
      expect(withCoupling(64, how)).toContain("config-segment-size");
    }
  });
});
