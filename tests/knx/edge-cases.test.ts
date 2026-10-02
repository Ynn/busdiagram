// Engine and validation limit cases.
import { describe, expect, it } from "vitest";
import {
  ScenarioError,
  buildScenario,
  createSimulator,
  registerBehavior,
  registerEquipment,
  toV2,
} from "../../src/core";
import type { ParamSchema } from "../../src/core";
import { decode } from "../../src/knx/dpt";
import { raw } from "./helpers";

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

let seq = 0;
/** Behavior without ports; use a unique ID per test because the registry is global. */
function behaviorWith(parameters: ParamSchema) {
  const id = `edge.p${++seq}/v1`;
  registerBehavior(id, { ports: {}, createState: () => ({}), parameters });
  return id;
}
const oneDevice = (behavior: string, parameters?: unknown): Doc => ({
  formatVersion: 2,
  title: "Example",
  lines: [{ address: "1.1" }],
  devices: [
    {
      id: "e",
      address: "1.1.1",
      kind: "generic",
      behavior,
      objects: [],
      ...(parameters === undefined ? {} : { parameters }),
    },
  ],
});
const roundTrip = (doc: Doc) => {
  const once = toV2(buildScenario(doc)) as Doc;
  const s = buildScenario(once);
  expect(toV2(s)).toEqual(once);
  return once;
};

describe("export v2 and required parameters", () => {
  it("a required parameter equal to its default remains written; an optional equal to the default is omitted", () => {
    const id = behaviorWith({
      type: "object",
      properties: {
        n: { type: "integer", default: 5 },
        m: { type: "integer", default: 1 },
        z: { type: ["integer", "null"], default: 2 },
      },
      required: ["n"],
    });
    const out = roundTrip(oneDevice(id, { n: 5, m: 1, z: null }));
    expect(out.devices[0].parameters).toEqual({ n: 5, z: null });
    // A value differs from the default; another required field has no default.
    const id2 = behaviorWith({
      type: "object",
      properties: {
        k: { type: "integer" },
        m: { type: "integer", default: 1 },
      },
      required: ["k"],
    });
    expect(
      roundTrip(oneDevice(id2, { k: 3, m: 4 })).devices[0].parameters,
    ).toEqual({
      k: 3,
      m: 4,
    });
  });

  it("channel and equipment: same rule", () => {
    registerEquipment(`edge.eq${++seq}`, {
      accepts: "switch",
      parameters: {
        type: "object",
        properties: { p: { type: "integer", default: 7 } },
        required: ["p"],
      },
      create: () => ({}),
      applyCommand: (s) => s,
    });
    const doc = raw("object-flags.json") as Doc;
    const switchActuator = doc.devices.find(
      (d: Doc) => d.behavior === "switchActuator/v1",
    );
    switchActuator.channels[0].equipment = {
      type: `edge.eq${seq}`,
      parameters: { p: 7 },
    };
    const out = roundTrip(doc);
    const ch = out.devices.find((d: Doc) => d.id === switchActuator.id)
      .channels[0];
    expect(ch.equipment.parameters).toEqual({ p: 7 });
  });
});

describe("repeated dimming commands and lamp state", () => {
  const dali = () => {
    const doc = raw("dali-gateway.json") as Doc;
    doc.devices.find((d: Doc) => d.id === "gw").channels[0].parameters = {
      dimTimeMs: 4000,
      valueFadeMs: 4000,
    };
    return createSimulator(doc);
  };
  it("repeating a value during a fade, then stopping, preserves the physical level", () => {
    const sim = dali();
    sim.groupWrite("usbInterface", "1/3/1", 100);
    sim.advance(2000);
    sim.groupWrite("usbInterface", "1/3/1", 100);
    sim.advance(3500);
    const level = () => Number(sim.equipmentState("gw", "g1")!.levelPct);
    expect(level()).toBe(100);
    sim.groupWrite("usbInterface", "1/2/1", 0); // stop dimming
    sim.advance(1300);
    expect(level()).toBe(100);
    expect(sim.channelState("gw", "g1").levelPct).toBe(100);
  });

  it("stopping a repeated fade leaves actuator and lamp at the same level", () => {
    const sim = dali();
    sim.groupWrite("usbInterface", "1/3/1", 100);
    sim.advance(1500);
    sim.groupWrite("usbInterface", "1/3/1", 100);
    sim.advance(1000);
    sim.groupWrite("usbInterface", "1/2/1", 0);
    sim.advance(3000);
    const lamp = Number(sim.equipmentState("gw", "g1")!.levelPct);
    const actuator = Number(sim.channelState("gw", "g1").levelPct);
    expect(lamp).toBeGreaterThan(40);
    expect(lamp).toBeLessThan(100);
    expect(Math.abs(lamp - actuator)).toBeLessThan(0.5);
  });
});

describe("exception in equipment.interact", () => {
  it("diagnostic and suspended simulator, without exception propagated; another simulator continues", () => {
    const type = `edge.throwing${++seq}`;
    registerEquipment(type, {
      accepts: "switch",
      create: () => ({}),
      applyCommand: (s) => s,
      interact() {
        throw new Error("interact failure");
      },
    });
    const doc = raw("object-flags.json") as Doc;
    const switchActuator = doc.devices.find(
      (d: Doc) => d.behavior === "switchActuator/v1",
    );
    switchActuator.channels[0].equipment = { type };
    const sim = createSimulator(doc);
    const other = createSimulator(raw("object-flags.json"));
    expect(() =>
      sim.equipmentAction(
        switchActuator.id,
        switchActuator.channels[0].id,
        "click",
      ),
    ).not.toThrow();
    expect(sim.fault?.code).toBe("extension-error");
    expect(sim.fault?.message).toContain("interact failure");
    expect(other.fault).toBeNull();
    other.advance(1000);
  });
});

describe("validated and canonical USB interface entries", () => {
  it.each([NaN, Infinity, -Infinity, -1, 200])(
    "5.001: %s rejected before transmission",
    (v) => {
      const sim = createSimulator(raw("dali-gateway.json"));
      expect(() => sim.groupWrite("usbInterface", "1/3/1", v)).toThrow(
        RangeError,
      );
      expect(sim.history).toHaveLength(0);
    },
  );
  it("fraction rejected for an integer DPT; accepted value matches the transmitted value", () => {
    const sim = createSimulator(raw("dali-gateway.json"));
    expect(() => sim.groupWrite("usbInterface", "1/1/1", 0.5)).toThrow(
      RangeError,
    );
    const tel = sim.groupWrite("usbInterface", "1/3/1", 30)!;
    expect(tel.value).toBe(decode("5.001", tel.raw));
    sim.advance(3000);
    expect(sim.objectValue("gw", "g1v")).toBe(tel.value);
  });
});

describe("Names inherited from Object.prototype", () => {
  it.each(["toString", "constructor", "__proto__", "hasOwnProperty"])(
    "port %s: ScenarioError identifies the field",
    (port) => {
      const doc = {
        formatVersion: 2,
        lines: [{ address: "1.1" }],
        devices: [
          {
            id: "d",
            address: "1.1.1",
            kind: "generic",
            behavior: "display/v1",
            objects: [
              {
                id: "o",
                ga: [],
                dpt: "1.001",
                port,
                flags: { W: true, T: false },
              },
            ],
          },
        ],
      };
      try {
        buildScenario(doc);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(ScenarioError);
        expect((e as ScenarioError).details[0]!.path).toBe(
          "devices[0].objects[0].port",
        );
      }
    },
  );
  it('parameter named "toString": parameter unknown, not ignored', () => {
    const id = behaviorWith({ type: "object", properties: {} });
    expect(() => buildScenario(oneDevice(id, { toString: 1 }))).toThrow(
      /unknown parameter “toString”/,
    );
  });
});

describe("DALI short addresses", () => {
  const withGroup = (firstAddress: number, ballasts: number) => {
    const doc = raw("dali-gateway.json") as Doc;
    doc.devices.find(
      (d: Doc) => d.id === "gw",
    ).channels[0].equipment.parameters = { firstAddress, ballasts };
    return doc;
  };
  it("63/1 and 60/4 are valid; 63/4 and 60/5 identify the invalid parameter", () => {
    expect(() => buildScenario(withGroup(63, 1))).not.toThrow();
    expect(() => buildScenario(withGroup(60, 4))).not.toThrow();
    for (const [f, n] of [
      [63, 4],
      [60, 5],
    ]) {
      try {
        buildScenario(withGroup(f!, n!));
        expect.unreachable();
      } catch (e) {
        expect((e as ScenarioError).details.map((p) => p.path)).toContain(
          "devices[1].channels[0].equipment.parameters.firstAddress",
        );
      }
    }
  });
});

describe("window already opened on startup", () => {
  it("the contact emits its start state: the thermostat passes into protection", () => {
    const doc = raw("room-heating.json") as Doc;
    doc.rooms[0].windowOpen = true;
    const sim = createSimulator(doc);
    sim.advance(5000);
    expect(
      sim.history.filter((t) => t.ga === "3/3/1").map((t) => t.value),
    ).toEqual([1]);
    expect(sim.deviceState("livingThermostat")).toMatchObject({
      mode: 4,
      setpointC: 7,
    });
  });
  it("startup transmission disabled intentionally leaves devices unsynchronized", () => {
    const doc = raw("room-heating.json") as Doc;
    doc.rooms[0].windowOpen = true;
    doc.devices.find((d: Doc) => d.id === "windowContact").parameters = {
      sendOnStart: false,
    };
    const sim = createSimulator(doc);
    sim.advance(5000);
    expect(sim.history.some((t) => t.ga === "3/3/1")).toBe(false);
    expect(sim.deviceState("livingThermostat")).toMatchObject({ mode: 1 });
  });
});

describe("parameters and export by range", () => {
  it("required channel parameter equal to its default is retained on export", () => {
    const id = `edge.ch${++seq}/v1`;
    registerBehavior(id, {
      ports: {},
      output: "switch",
      createState: () => ({}),
      channelParameters: {
        type: "object",
        properties: { c: { type: "integer", default: 3 } },
        required: ["c"],
      },
    });
    const doc = oneDevice(id);
    doc.devices[0].channels = [
      { id: "s1", parameters: { c: 3 }, equipment: { type: "lamp" } },
    ];
    const out = roundTrip(doc);
    expect(out.devices[0].channels[0].parameters).toEqual({ c: 3 });
  });

  it("KNX dimmer: repeat a value during a fade, then stop without a level jump", () => {
    const sim = createSimulator({
      formatVersion: 2,
      lines: [{ address: "1.1" }],
      devices: [
        {
          id: "usbInterface",
          address: "1.1.255",
          kind: "interface",
          behavior: "usbInterface/v1",
          objects: [],
        },
        {
          id: "var",
          address: "1.1.1",
          kind: "dimmerActuator",
          behavior: "dimmerActuator/v1",
          objects: [
            {
              id: "v",
              ga: "1/3/1",
              dpt: "5.001",
              port: "value",
              channel: "s1",
              flags: { W: true, T: false },
            },
            {
              id: "d",
              ga: "1/2/1",
              dpt: "3.007",
              port: "dim",
              channel: "s1",
              flags: { W: true, T: false },
            },
          ],
          channels: [
            {
              id: "s1",
              parameters: { valueFadeMs: 4000, dimTimeMs: 4000 },
              equipment: { type: "dimmableLamp" },
            },
          ],
        },
      ],
    });
    sim.groupWrite("usbInterface", "1/3/1", 100);
    sim.advance(2000);
    sim.groupWrite("usbInterface", "1/3/1", 100);
    sim.advance(3500);
    const lamp = () => Number(sim.equipmentState("var", "s1")!.levelPct);
    expect(lamp()).toBe(100);
    sim.groupWrite("usbInterface", "1/2/1", 0);
    sim.advance(1500);
    expect(lamp()).toBe(100);
    expect(sim.channelState("var", "s1").levelPct).toBe(100);
  });
});

describe("Broadcast address 0/0/0", () => {
  const doc = (ga: string, groupAddresses: unknown[] = []) => ({
    formatVersion: 2,
    lines: [{ address: "1.1" }],
    groupAddresses,
    devices: [
      {
        id: "d",
        address: "1.1.1",
        kind: "generic",
        behavior: "display/v1",
        objects: [
          {
            id: "o",
            ga,
            dpt: "1.001",
            port: "display",
            flags: { W: true, T: false },
          },
        ],
      },
    ],
  });
  const firstPath = (d: unknown) => {
    try {
      buildScenario(d);
    } catch (e) {
      expect(e).toBeInstanceOf(ScenarioError);
      return (e as ScenarioError).details[0]!.path;
    }
    return null;
  };
  it("is refused on an object and in the group address list", () => {
    expect(firstPath(doc("0/0/0"))).toBe("devices[0].objects[0].ga");
    expect(firstPath(doc("1/1/1", [{ address: "0/0/0", name: "All" }]))).toBe(
      "groupAddresses[0].address",
    );
  });
  it("0/0/1 remains a valid group address", () => {
    expect(firstPath(doc("0/0/1"))).toBeNull();
  });
});
