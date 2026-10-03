// After a bus voltage failure: what each participant takes up again when the voltage returns.
// The timers of a device stop with the voltage; periodic tasks, pending deadlines, and the
// actions of a cause still holding an output must start again, without losing state that
// the device keeps (stored alarms, commands, meter index).
import { describe, expect, it } from "vitest";
import type { Simulation } from "../../../src/knx/sim";
import { device, example, setParams, write } from "./conformity-kit";

/** Cut the voltage of line 1.1 for `ms`, then restore it. */
function outage(sim: Simulation, ms: number, segment = "L1.1") {
  sim.setBusVoltage(segment, false);
  sim.advance(ms);
  sim.setBusVoltage(segment, true);
}
const sent = (sim: Simulation, ga: string, from: string, sinceMs: number) =>
  sim.history.filter(
    (t) => t.ga === ga && t.sourceDeviceId === from && t.timeMs >= sinceMs,
  ).length;

describe("bus voltage return", () => {
  it("heating actuator: PWM starts again from the stored control value", () => {
    const sim = example("room-heating.json", (doc) =>
      setParams(doc, "heatingActuator", { cycleMs: 10000 }, "h1"),
    );
    write(sim, "3/0/1", 30);
    outage(sim, 5000);
    const states = new Set<boolean>();
    for (let i = 0; i < 40; i++) {
      sim.advance(500);
      states.add(!!sim.channelState("heatingActuator", "h1").energized);
    }
    expect(states).toEqual(new Set([true, false]));
  });

  it("energy meter: values sent again, then cyclically", () => {
    const sim = example("boiler-room.json", (doc) =>
      setParams(doc, "meter", { meterIntervalMs: 1000 }),
    );
    outage(sim, 3000);
    const from = sim.timeMs;
    sim.advance(10000);
    expect(sent(sim, "9/1/1", "meter", from)).toBeGreaterThan(3);
  });

  it("clock master: time sent again, then every clock minute", () => {
    const sim = example("time-schedule.json");
    outage(sim, 2000);
    const from = sim.timeMs;
    // 60 clock minutes per simulated minute: about four broadcasts in 4 s.
    sim.advance(5000);
    expect(sent(sim, "6/0/1", "clock", from)).toBeGreaterThan(2);
  });

  it("time switch: a switching point passed during the failure is applied", () => {
    // The clock starts at 21:57 and runs 60 times faster: 22:05 comes after 8 s.
    const sim = example("time-schedule.json", (doc) =>
      setParams(doc, "timeSwitch", {
        program: "Daily 00:00 = 0; Daily 22:05 = 1",
      }),
    );
    expect(sim.objectValue("timeSwitch", "out")).toBe(0);
    outage(sim, 8000); // from about 22:00 to 22:08
    sim.advance(3000);
    expect(sim.objectValue("timeSwitch", "out")).toBe(1);
  });

  it("weather station: cyclic sending of the alarms starts again", () => {
    const sim = example("weather-protection.json", (doc) =>
      setParams(doc, "weatherStation", { alarmCyclicMs: 1000 }),
    );
    outage(sim, 2000);
    const from = sim.timeMs;
    sim.advance(5000);
    expect(sent(sim, "2/6/1", "weatherStation", from)).toBeGreaterThan(2);
  });

  it("presence detector: a presence still active ends after a hold time", () => {
    const sim = example("time-schedule.json");
    sim.input("presence", "motion", "press");
    sim.advance(2000);
    expect(sim.objectValue("presence", "p")).toBe(1);
    outage(sim, 2000);
    sim.advance(12000); // hold time: 8 s
    expect(sim.objectValue("presence", "p")).toBe(0);
  });

  it("room thermostat: a comfort extension still running ends", () => {
    const sim = example("room-heating.json", (doc) => {
      setParams(doc, "livingThermostat", {
        presenceType: "button",
        comfortExtensionMs: 60000,
      });
    });
    write(sim, "3/2/0", 3); // economy
    write(sim, "3/2/1", 1); // presence button
    expect(sim.objectValue("livingThermostat", "ms")).toBe(1);
    outage(sim, 2000);
    sim.advance(65000);
    expect(sim.objectValue("livingThermostat", "ms")).toBe(3);
  });

  it("switch actuator: an intrusion alarm kept through the failure blinks again", () => {
    const sim = example("alarms.json");
    sim.input("pushButton", "in1", "down");
    sim.advance(4000);
    outage(sim, 2000);
    sim.advance(3000);
    const seen = new Set<boolean>();
    for (let i = 0; i < 12; i++) {
      sim.advance(250);
      seen.add(!!sim.equipmentState("actuator", "a")?.on);
    }
    expect(seen).toEqual(new Set([true, false]));
  });

  it("shutter actuator: a wind alarm kept through the failure moves the shutter up again", () => {
    const sim = example("weather-protection.json", (doc) => {
      const c = device(doc, "shutterActuator").channels![0]!;
      c.initialState = { estimatedPositionPct: 100 };
      (c.equipment as { initialState?: unknown }).initialState = {
        positionPct: 100,
      };
    });
    write(sim, "2/6/1", 1, 4000);
    outage(sim, 2000);
    sim.advance(30000);
    expect(sim.equipmentState("shutterActuator", "s1")!.positionPct).toBe(0);
    expect(sim.channelState("shutterActuator", "s1").safety).toBe("wind");
  });
});
