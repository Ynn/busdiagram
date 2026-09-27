// HVAC behavior cases: thermostat modes, priority, PI and two-point control,
// PWM heating actuators, valve direction, monitoring, and fallback operation.

import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import { load, raw } from "./helpers";

const temp = (sim: ReturnType<typeof load>, room: string) =>
  sim.getState().rooms[room]!.temperatureC;
const last = (sim: ReturnType<typeof load>, ga: string) =>
  sim.history.filter((t) => t.ga === ga).at(-1)?.value;

describe("room and PI control in steady state", () => {
  it("reaches the comfort setpoint and stays within a few tenths of a degree", () => {
    const sim = load("room-heating.json");
    expect(temp(sim, "livingRoom")).toBe(18);
    sim.advance(400_000);
    const seen: number[] = [];
    for (let i = 0; i < 60; i++) {
      sim.advance(5000);
      seen.push(temp(sim, "livingRoom"));
    }
    expect(Math.min(...seen)).toBeGreaterThan(20.7);
    expect(Math.max(...seen)).toBeLessThan(21.3);
    // Temperature (9.001) and control size (5.001) run on the bus.
    expect(last(sim, "3/4/1")).toBeGreaterThan(20);
    expect(sim.history.some((t) => t.ga === "3/0/1")).toBe(true);
  });

  it("without heating, the room tends to the outside temperature", () => {
    const j = raw("room-heating.json") as { devices: { id: string }[] };
    j.devices = j.devices.filter(
      (d) => d.id !== "heatingActuator" && d.id !== "switchActuator",
    );
    const sim = createSimulator(j);
    sim.advance(300_000); // time constant: 63% of the path
    expect(temp(sim, "livingRoom")).toBeCloseTo(5 + 13 * Math.exp(-1), 1);
  });

  it("open window: contact 1.019 → frost protection (7 °C), valve closed ; closed → comfort", () => {
    const sim = load("room-heating.json");
    sim.advance(120_000);
    const tels = sim.roomAction("livingRoom", "window", 1);
    expect(tels.map((t) => `${t.ga}=${t.value}`)).toEqual(["3/3/1=1"]);
    sim.advance(5000);
    expect(sim.deviceState("livingThermostat")).toMatchObject({
      mode: 4,
      setpointC: 7,
    });
    expect(last(sim, "3/4/3")).toBe(4);
    expect(last(sim, "3/0/1")).toBe(0);
    const warm = temp(sim, "livingRoom");
    sim.advance(30_000);
    // Losses multiplied by eight: the room cools quickly.
    expect(temp(sim, "livingRoom")).toBeLessThan(warm - 1.5);
    sim.roomAction("livingRoom", "window", 0);
    sim.advance(5000);
    expect(sim.deviceState("livingThermostat")).toMatchObject({
      mode: 1,
      setpointC: 21,
    });
    expect(Number(last(sim, "3/0/1"))).toBeGreaterThan(50);
  });

  it("Central mode 20.102 (USB interface tool): economy lowers both rooms; presence restores comfort mode", () => {
    const sim = load("room-heating.json");
    sim.groupWrite("usbInterface", "3/2/0", 3);
    sim.advance(3000);
    expect(sim.deviceState("livingThermostat")).toMatchObject({
      mode: 3,
      setpointC: 17,
    });
    expect(sim.deviceState("bedroomThermostat")).toMatchObject({
      mode: 3,
      setpointC: 15,
    });
    sim.press("livingThermostat", "presence", "press");
    sim.advance(3000);
    expect(sim.deviceState("livingThermostat")).toMatchObject({
      mode: 1,
      setpointC: 21,
    });
    expect(last(sim, "3/2/1")).toBe(1);
    // An open window takes priority over occupancy.
    sim.roomAction("livingRoom", "window", 1);
    sim.advance(3000);
    expect(sim.deviceState("livingThermostat")).toMatchObject({ mode: 4 });
  });

  it("local command updates the thermostat setpoint and sends 9.001 status", () => {
    const sim = load("room-heating.json");
    sim.input("livingThermostat", "setpoint", "value", 22.5);
    sim.advance(2000);
    expect(sim.deviceState("livingThermostat")).toMatchObject({
      setpointC: 22.5,
    });
    expect(last(sim, "3/4/2")).toBe(22.5);
  });
});

describe("two-point control in a room", () => {
  it("one-bit on/off control of a switching actuator around the setpoint", () => {
    const sim = load("room-heating.json");
    sim.advance(300_000);
    const seen: number[] = [];
    for (let i = 0; i < 60; i++) {
      sim.advance(5000);
      seen.push(temp(sim, "bedroom"));
    }
    expect(Math.min(...seen)).toBeGreaterThan(18);
    expect(Math.max(...seen)).toBeLessThan(19.6);
    const sw = sim.history.filter((t) => t.ga === "3/0/2").map((t) => t.value);
    expect(sw).toEqual(expect.arrayContaining([0, 1]));
  });
});

describe("heating actuator", () => {
  const actuator = (params: Record<string, unknown> = {}, valve = {}) =>
    createSimulator({
      formatVersion: 2,
      title: "HMT",
      lines: [{ address: "1.1" }],
      rooms: [{ id: "r", temperatureC: 20 }],
      devices: [
        {
          id: "usbInterface",
          address: "1.1.255",
          kind: "interface",
          behavior: "usbInterface/v1",
          objects: [],
        },
        {
          id: "a",
          address: "1.1.1",
          kind: "heatingActuator",
          behavior: "heatingActuator/v1",
          objects: [
            {
              id: "v",
              ga: "3/0/1",
              dpt: "5.001",
              port: "value",
              channel: "h1",
              flags: { W: true, T: false },
            },
            {
              id: "f",
              ga: "3/5/1",
              dpt: "1.005",
              port: "fault",
              channel: "h1",
              flags: { W: false, T: true },
            },
          ],
          channels: [
            {
              id: "h1",
              parameters: { cycleMs: 20_000, ...params },
              equipment: { type: "radiator", room: "r", parameters: valve },
            },
          ],
        },
      ],
    });
  const energized = (sim: ReturnType<typeof actuator>) =>
    sim.channelState("a", "h1").energized;

  it("PWM: 30 % → 6 s powered by 20 s; a new value is taken up in the cycle", () => {
    const sim = actuator();
    sim.groupWrite("usbInterface", "3/0/1", 30);
    // The cycle begins when the telegram is delivered.
    while (!energized(sim)) sim.advance(10);
    const t0 = sim.timeMs;
    sim.advance(5900);
    expect(energized(sim)).toBe(true);
    sim.advance(200);
    expect(energized(sim)).toBe(false);
    // 60% arrives after the 30% on phase: powered again until 12 s into the cycle.
    sim.groupWrite("usbInterface", "3/0/1", 60);
    while (sim.channelState("a", "h1").valuePct !== 60) sim.advance(10);
    expect(sim.timeMs - t0).toBeLessThan(11_900);
    expect(energized(sim)).toBe(true);
    sim.advance(t0 + 11_900 - sim.timeMs);
    expect(energized(sim)).toBe(true);
    sim.advance(200);
    expect(energized(sim)).toBe(false);
    // Cycle suivant.
    sim.advance(t0 + 20_100 - sim.timeMs);
    expect(energized(sim)).toBe(true);
  });

  it("thermoelectric valve: progressive opening, proportional input", () => {
    const sim = actuator();
    sim.groupWrite("usbInterface", "3/0/1", 100);
    sim.advance(1000 + 4000);
    const open = Number(sim.equipmentState("a", "h1")!.openPct);
    expect(open).toBeGreaterThan(40);
    expect(open).toBeLessThan(60);
    sim.advance(10_000);
    expect(sim.equipmentState("a", "h1")!.openPct).toBe(100);
  });

  it("wrong valve action direction: a normally open valve receives no heat demand", () => {
    const wrong = actuator({}, { normallyOpen: true });
    wrong.advance(20_000);
    expect(wrong.equipmentState("a", "h1")!.openPct).toBe(100);
    const right = actuator(
      { valveType: "normallyOpen" },
      { normallyOpen: true },
    );
    right.advance(20_000);
    expect(right.equipmentState("a", "h1")!.openPct).toBe(0);
    expect(energized(right)).toBe(true);
  });

  it("monitoring timeout applies emergency output and sends fault DPT 1.005", () => {
    const sim = actuator({ monitoringMs: 60_000, emergencyPct: 40 });
    sim.groupWrite("usbInterface", "3/0/1", 10);
    sim.advance(30_000);
    expect(sim.channelState("a", "h1").emergency).toBe(false);
    sim.advance(40_000);
    expect(sim.channelState("a", "h1")).toMatchObject({
      emergency: true,
      valuePct: 40,
    });
    expect(last(sim, "3/5/1")).toBe(1);
    sim.groupWrite("usbInterface", "3/0/1", 20);
    sim.advance(2000);
    expect(sim.channelState("a", "h1").emergency).toBe(false);
    expect(last(sim, "3/5/1")).toBe(0);
  });
});

describe("room validation", () => {
  const base = (extra: Record<string, unknown>) => ({
    formatVersion: 2,
    title: "x",
    lines: [{ address: "1.1" }],
    rooms: [{ id: "r" }],
    devices: [
      {
        id: "t",
        address: "1.1.1",
        kind: "thermostat",
        behavior: "roomThermostat/v1",
        objects: [],
        ...extra,
      },
    ],
  });
  it("reject unknown room and radiator without a room", () => {
    expect(() => createSimulator(base({ room: "salon" }))).toThrow(
      /unknown room “salon”/,
    );
    expect(() =>
      createSimulator({
        ...base({}),
        devices: [
          {
            id: "a",
            address: "1.1.1",
            kind: "heatingActuator",
            behavior: "heatingActuator/v1",
            objects: [],
            channels: [{ id: "h1", equipment: { type: "radiator" } }],
          },
        ],
      }),
    ).toThrow(/heated or cooled room/);
  });
  it("a thermostat without an external room or temperature reports it in the event log", () => {
    const sim = createSimulator(base({}));
    sim.advance(2000);
    expect(sim.journal.some((e) => e.message?.includes("no temperature"))).toBe(
      true,
    );
  });
});
