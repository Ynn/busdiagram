// Heating and cooling: automatic or object change-over of the thermostat, valve functions
// of the heating actuator (KNX Standard 07_10_03, ValveMode heating, cooling, change-over),
// and the fan coil, whose change-over coil carries the water given by the valve.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../../src/core";
import { fanCoil as fanCoil_ } from "../../../src/equipment/fan-coil/equipment";
import { load, raw } from "../helpers";

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const dev = (doc: Doc, id: string) =>
  doc.devices.find((d: Doc) => d.id === id) as Doc;
const temp = (sim: ReturnType<typeof load>, room: string) =>
  sim.getState().rooms[room]!.temperatureC;
const last = (sim: ReturnType<typeof load>, ga: string) =>
  sim.history.filter((t) => t.ga === ga).at(-1)?.value;
const codes = (sim: ReturnType<typeof createSimulator>) =>
  sim.diagnostics.map((d) => d.code).filter((c) => c.startsWith("config-"));
const fanCoil = (sim: ReturnType<typeof load>, ch: string) =>
  sim.equipmentState("valveActuator", ch) as Record<string, unknown>;

describe("automatic change-over of the thermostat", () => {
  it("cools above the cooling setpoint, then heats below the heating setpoint", () => {
    const sim = load("heating-cooling.json");
    sim.advance(600_000);
    expect(sim.deviceState("officeThermostat")).toMatchObject({
      heating: false,
      setpointC: 24,
    });
    expect(temp(sim, "office")).toBeGreaterThan(23.6);
    expect(temp(sim, "office")).toBeLessThan(24.4);
    // Status 1.100: 0 = cooling; the cooling value runs, the heating value is 0.
    expect(last(sim, "3/4/3")).toBe(0);
    expect(Number(last(sim, "3/0/2"))).toBeGreaterThan(0);
    // Never sent: it has stayed 0 since the start.
    expect(last(sim, "3/0/1") ?? 0).toBe(0);
    expect(fanCoil(sim, "h1")).toMatchObject({ medium: "cooling" });
    // Winter: the room falls through the dead zone, then the thermostat heats.
    sim.roomAction("office", "outside", 5);
    sim.advance(900_000);
    expect(sim.deviceState("officeThermostat")).toMatchObject({
      heating: true,
      setpointC: 21,
    });
    expect(last(sim, "3/4/3")).toBe(1);
    expect(last(sim, "3/0/2")).toBe(0);
    expect(Number(last(sim, "3/0/1"))).toBeGreaterThan(0);
    expect(fanCoil(sim, "h1")).toMatchObject({ medium: "heating" });
    expect(temp(sim, "office")).toBeGreaterThan(20.6);
    expect(temp(sim, "office")).toBeLessThan(21.4);
  });

  it("requests neither heating nor cooling in the dead zone", () => {
    const doc = raw("heating-cooling.json") as Doc;
    doc.rooms[0].temperatureC = 22.5;
    doc.rooms[0].outsideTemperatureC = 22.5;
    const sim = createSimulator(doc);
    sim.advance(120_000);
    expect(sim.deviceState("officeThermostat")).toMatchObject({
      heating: true,
      valuePct: 0,
    });
    expect(fanCoil(sim, "h1")).toMatchObject({ openPct: 0 });
    expect(temp(sim, "office")).toBeCloseTo(22.5, 5);
  });

  it("after cooling, the demand falls to 0 in the dead zone and the 0 is sent", () => {
    const doc = raw("heating-cooling.json") as Doc;
    const t = dev(doc, "officeThermostat");
    t.parameters = { ...t.parameters, proportionalBandK: 4 };
    t.objects.push({
      id: "ext",
      name: "External temperature",
      ga: "3/7/0",
      dpt: "9.001",
      port: "externalTemp",
      flags: { W: true, T: false },
    });
    const sim = createSimulator(doc);
    sim.advance(3000);
    sim.groupWrite("usbInterface", "3/7/0", 25);
    sim.advance(60_000);
    expect(sim.deviceState("officeThermostat")).toMatchObject({
      heating: false,
    });
    // Just below the cooling setpoint, PI control still requests a little.
    sim.groupWrite("usbInterface", "3/7/0", 23.9);
    sim.advance(3000);
    expect(
      Number(sim.deviceState("officeThermostat").valuePct),
    ).toBeGreaterThan(0);
    // Further into the dead zone: 0, sent so that the valve closes.
    sim.groupWrite("usbInterface", "3/7/0", 22.5);
    sim.advance(10_000);
    expect(sim.deviceState("officeThermostat")).toMatchObject({
      heating: false,
      valuePct: 0,
    });
    expect(last(sim, "3/0/2")).toBe(0);
    expect(last(sim, "3/0/1") ?? 0).toBe(0);
  });

  it("ignores the heating / cooling object", () => {
    const doc = raw("heating-cooling.json") as Doc;
    dev(doc, "officeThermostat").objects.push({
      id: "hc",
      name: "Heating / cooling",
      ga: "3/1/0",
      dpt: "1.100",
      port: "heatCool",
      flags: { W: true, T: false },
    });
    const sim = createSimulator(doc);
    sim.advance(60_000);
    sim.groupWrite("usbInterface", "3/1/0", 1);
    sim.advance(5000);
    expect(sim.deviceState("officeThermostat")).toMatchObject({
      heating: false,
    });
  });
});

describe("change-over by the heating / cooling object (DPT 1.100)", () => {
  it("a thermostat in heating mode does nothing in summer until the object selects cooling", () => {
    const sim = load("heating-cooling.json");
    sim.advance(300_000);
    expect(sim.deviceState("meetingThermostat")).toMatchObject({
      heating: true,
      valuePct: 0,
    });
    expect(temp(sim, "meetingRoom")).toBeGreaterThan(27);
    sim.press("meetingThermostat", "heatCool", "press");
    expect(last(sim, "3/1/0")).toBe(0);
    sim.advance(600_000);
    expect(sim.deviceState("meetingThermostat")).toMatchObject({
      heating: false,
      setpointC: 24,
    });
    expect(last(sim, "3/4/7")).toBe(0);
    // Only the cooling coil works: the radiator valve stays closed.
    expect(sim.equipmentState("valveActuator", "h2")).toMatchObject({
      openPct: 0,
    });
    expect(temp(sim, "meetingRoom")).toBeLessThan(24.4);
  });

  it("starts in heating mode until the object receives a value", () => {
    const doc = raw("heating-cooling.json") as Doc;
    delete dev(doc, "meetingThermostat").objects.find((o: Doc) => o.id === "hc")
      .value;
    const sim = createSimulator(doc);
    expect(sim.objectValue("meetingThermostat", "hc")).toBeNull();
    sim.advance(5000);
    expect(sim.deviceState("meetingThermostat")).toMatchObject({
      heating: true,
    });
    sim.groupWrite("usbInterface", "3/1/0", 0);
    sim.advance(5000);
    expect(sim.deviceState("meetingThermostat")).toMatchObject({
      heating: false,
    });
  });
});

describe("valve functions of the heating actuator", () => {
  // The actuator alone, written from the USB interface.
  const alone = () => {
    const doc = raw("heating-cooling.json") as Doc;
    doc.devices = doc.devices.filter((d: Doc) => !/Thermostat$/.test(d.id));
    return createSimulator(doc);
  };

  it("a change-over valve follows the control value that is not zero, whatever the order", () => {
    const sim = alone();
    sim.groupWrite("usbInterface", "3/0/2", 60);
    sim.groupWrite("usbInterface", "3/0/1", 0);
    sim.advance(3000);
    expect(sim.channelState("valveActuator", "h1")).toMatchObject({
      valuePct: 60,
      medium: "cooling",
    });
    // The controller changes over: its new value first, then 0 on the other one.
    sim.groupWrite("usbInterface", "3/0/1", 40);
    sim.groupWrite("usbInterface", "3/0/2", 0);
    sim.advance(3000);
    expect(sim.channelState("valveActuator", "h1")).toMatchObject({
      valuePct: 40,
      medium: "heating",
    });
    expect(last(sim, "3/4/4")).toBe(40);
    sim.groupWrite("usbInterface", "3/0/1", 0);
    sim.advance(3000);
    expect(sim.channelState("valveActuator", "h1")).toMatchObject({
      valuePct: 0,
    });
  });

  it("the water of the valve reaches a change-over fan coil", () => {
    const sim = alone();
    sim.groupWrite("usbInterface", "3/0/2", 100);
    sim.advance(10_000);
    expect(sim.output("valveActuator", "h1")).toEqual({
      type: "switch",
      on: true,
      medium: "cooling",
    });
    expect(fanCoil(sim, "h1")).toMatchObject({
      openPct: 100,
      medium: "cooling",
    });
    const t = temp(sim, "office");
    sim.advance(60_000);
    expect(temp(sim, "office")).toBeLessThan(t);
  });

  it("a heating output ignores the cooling value, and a cooling output the heating value", () => {
    const doc = raw("heating-cooling.json") as Doc;
    doc.devices = doc.devices.filter((d: Doc) => !/Thermostat$/.test(d.id));
    const a = dev(doc, "valveActuator");
    a.objects.push(
      {
        id: "c2",
        name: "H2 cooling control value",
        ga: "3/0/2",
        dpt: "5.001",
        port: "coolingValue",
        channel: "h2",
        flags: { W: true, T: false },
      },
      {
        id: "h3",
        name: "H3 heating control value",
        ga: "3/0/1",
        dpt: "5.001",
        port: "value",
        channel: "h3",
        flags: { W: true, T: false },
      },
    );
    const sim = createSimulator(doc);
    expect(codes(sim).filter((c) => c === "config-valve-mode")).toHaveLength(2);
    sim.groupWrite("usbInterface", "3/0/2", 80);
    sim.groupWrite("usbInterface", "3/0/1", 80);
    sim.advance(3000);
    expect(sim.channelState("valveActuator", "h2")).toMatchObject({
      valuePct: 0,
    });
    expect(sim.channelState("valveActuator", "h3")).toMatchObject({
      valuePct: 0,
    });
  });
});

describe("fan coil", () => {
  it("draws the power of its fan while water flows; its coil heats or cools", () => {
    const p = { coil: "changeover", powerK: 20, fanPowerW: 40 };
    let s = fanCoil_.create(p, {});
    expect(fanCoil_.powerW!(s, p)).toBe(0);
    s = fanCoil_.applyCommand(
      s,
      { type: "switch", on: true, medium: "cooling" },
      p,
    );
    s = fanCoil_.advance!(s, 4000, p);
    expect(s.openPct).toBe(50);
    expect(fanCoil_.powerW!(s, p)).toBe(40);
    expect(fanCoil_.heatOutput!(s, p)).toBe(-10);
    // Change-over: the same coil, now with hot water.
    s = fanCoil_.applyCommand(
      s,
      { type: "switch", on: true, medium: "heating" },
      p,
    );
    expect(fanCoil_.heatOutput!(s, p)).toBe(10);
    // A coil of a 4-pipe unit keeps its own water.
    expect(fanCoil_.heatOutput!(s, { ...p, coil: "cooling" })).toBe(-10);
  });

  it("an emitter that does not match the valve function is reported", () => {
    const doc = raw("heating-cooling.json") as Doc;
    expect(codes(createSimulator(doc))).toEqual([]);
    // A radiator on the cooling output, a cooling coil on the change-over output.
    const a = dev(doc, "valveActuator");
    a.channels[2].equipment = { type: "radiator", room: "meetingRoom" };
    a.channels[0].equipment.parameters = { coil: "cooling" };
    expect(
      codes(createSimulator(doc)).filter((c) => c === "config-emitter"),
    ).toHaveLength(2);
  });

  it("the engine refuses an unknown medium", () => {
    const doc = raw("heating-cooling.json") as Doc;
    const sim = createSimulator(doc);
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sim as any).setOutput(
        sim.scenario.devices.find((d: Doc) => d.id === "valveActuator"),
        sim.scenario.devices
          .find((d: Doc) => d.id === "valveActuator")!
          .channels.find((c: Doc) => c.id === "h1"),
        { type: "switch", on: true, medium: "steam" },
      ),
    ).toThrow(/invalid output command/);
  });
});
