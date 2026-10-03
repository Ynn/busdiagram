// Shutter actuator: lock object and behavior on bus voltage failure and recovery, as the
// shutter actuators of the catalogue offer them (reactions at the start and end of the
// lock, wind alarm with priority; stop or end position on failure, movement on recovery).
import { describe, expect, it } from "vitest";
import type { Simulation } from "../../../src/knx/sim";
import type { Doc } from "./conformity-kit";
import { device, example, setParams, write } from "./conformity-kit";

const S = "shutterActuator";
const CH = "shutter1";
function shutter(params: Record<string, unknown>) {
  return example("shutter-control.json", (doc: Doc) => {
    setParams(doc, S, params, CH);
    device(doc, S).objects.push(
      {
        id: "lock",
        name: "Lock",
        ga: "2/7/1",
        dpt: "1.001",
        port: "lock",
        channel: CH,
        flags: { W: true, T: false },
      },
      {
        id: "target",
        name: "Position",
        ga: "2/7/3",
        dpt: "5.001",
        port: "positionCommand",
        channel: CH,
        flags: { W: true, T: false },
      },
      ...(
        [
          ["wind", "2/7/2", "1.005", "windAlarm"],
          ["rain", "2/7/4", "1.005", "rainAlarm"],
          ["frost", "2/7/5", "1.005", "frostAlarm"],
          ["force", "2/7/6", "2.001", "forced"],
          ["recall12", "2/7/7", "1.001", "recallPosition12"],
          ["store12", "2/7/8", "1.001", "storePosition12"],
        ] as const
      ).map(([id, ga, dpt, port]) => ({
        id,
        name: id,
        ga,
        dpt,
        port,
        channel: CH,
        flags: { W: true, T: false },
      })),
      ...(
        [
          ["top", "2/7/10", "upperLimit"],
          ["bottom", "2/7/11", "lowerLimit"],
        ] as const
      ).map(([id, ga, port]) => ({
        id,
        name: id,
        ga,
        dpt: "1.002",
        port,
        channel: CH,
        flags: { W: false, T: true },
      })),
    );
  });
}
const position = (sim: Simulation) =>
  Number(sim.equipmentState(S, CH)!.positionPct);
const estimate = (sim: Simulation) =>
  Number(sim.channelState(S, CH).estimatedPositionPct);

describe("shutter actuator: lock", () => {
  it("lockStart and afterLock restore: down while locked, back afterwards", () => {
    const sim = shutter({
      lockStart: "position",
      lockPositionPct: 60,
      afterLock: "restore",
    });
    write(sim, "2/1/2", 1, 4000); // move down for a while
    write(sim, "2/2/1", 0, 3000); // stop, then wait for it to arrive
    const before = estimate(sim);
    write(sim, "2/7/1", 1, 12000);
    expect(estimate(sim)).toBeCloseTo(60, 0);
    // Commands are ignored while locked.
    write(sim, "2/1/2", 0, 12000);
    expect(estimate(sim)).toBeCloseTo(60, 0);
    write(sim, "2/7/1", 0, 12000);
    expect(estimate(sim)).toBeCloseTo(before, 0);
  });

  it("the wind alarm has priority over the lock", () => {
    const sim = shutter({ lockStart: "down", afterLock: "down" });
    write(sim, "2/7/2", 1, 12000);
    expect(position(sim)).toBe(0);
    write(sim, "2/7/1", 1, 12000);
    expect(position(sim)).toBe(0);
    write(sim, "2/7/1", 0, 12000);
    expect(position(sim)).toBe(0);
  });
});

describe("shutter actuator: bus voltage", () => {
  it("busFailure down: the motor runs to the bottom while the bus is off", () => {
    const sim = shutter({ busFailure: "down" });
    sim.setBusVoltage("L1.1", false);
    sim.advance(12000);
    expect(position(sim)).toBe(100);
    sim.setBusVoltage("L1.1", true);
    sim.advance(3000);
    expect(estimate(sim)).toBe(100);
    expect(sim.equipmentState(S, CH)!.drive ?? "stop").toBe("stop");
  });

  it("busFailure down then a short failure: the estimate follows the real movement", () => {
    const sim = shutter({ busFailure: "down" });
    sim.setBusVoltage("L1.1", false);
    sim.advance(1000);
    sim.setBusVoltage("L1.1", true);
    sim.advance(3000);
    // About one second of a 10 s travel: near 10 %, not the end stop.
    expect(position(sim)).toBeGreaterThan(5);
    expect(position(sim)).toBeLessThan(20);
    expect(estimate(sim)).toBeCloseTo(position(sim), 0);
    expect(Number(sim.objectValue(S, "pos"))).toBeCloseTo(position(sim), 0);
    // An absolute command afterwards reaches its position.
    write(sim, "2/7/3", 50, 12000);
    expect(position(sim)).toBeCloseTo(50, 0);
  });

  it("busFailure up, short: the estimate stays consistent, and a position command is exact", () => {
    const sim = shutter({ busFailure: "up" });
    write(sim, "2/1/2", 1, 13000); // to the bottom
    expect(position(sim)).toBe(100);
    sim.setBusVoltage("L1.1", false);
    sim.advance(2000);
    sim.setBusVoltage("L1.1", true);
    sim.advance(3000);
    expect(position(sim)).toBeGreaterThan(70);
    expect(position(sim)).toBeLessThan(90);
    expect(estimate(sim)).toBeCloseTo(position(sim), 0);
  });

  it("busRecovery position: moves there when the voltage returns, and sends it", () => {
    const sim = shutter({
      busRecovery: "position",
      busRecoveryPositionPct: 50,
    });
    sim.setBusVoltage("L1.1", false);
    sim.advance(1000);
    sim.setBusVoltage("L1.1", true);
    sim.advance(12000);
    expect(estimate(sim)).toBeCloseTo(50, 0);
    expect(Number(sim.objectValue(S, "pos"))).toBeCloseTo(50, 0);
  });

  it("by default, the motor stops on failure and nothing moves on recovery", () => {
    const sim = shutter({});
    write(sim, "2/1/2", 1, 3000);
    sim.setBusVoltage("L1.1", false);
    const stopped = position(sim);
    sim.advance(5000);
    expect(position(sim)).toBe(stopped);
    sim.setBusVoltage("L1.1", true);
    sim.advance(5000);
    expect(position(sim)).toBe(stopped);
  });
});

describe("shutter actuator: weather alarms", () => {
  const safety = (sim: Simulation) => sim.channelState(S, CH).safety;

  it("rain, then wind, then frost: the dominant alarm holds the output", () => {
    // Order frost > wind > rain; frost leaves the shutter where it is.
    const sim = shutter({
      alarmPriority: "frost,wind,rain",
      rainReaction: "down",
      windReaction: "up",
    });
    write(sim, "2/7/4", 1, 12000);
    expect(safety(sim)).toBe("rain");
    expect(position(sim)).toBe(100);
    write(sim, "2/7/2", 1, 12000);
    expect(safety(sim)).toBe("wind");
    expect(position(sim)).toBe(0);
    write(sim, "2/7/5", 1, 3000);
    expect(safety(sim)).toBe("frost");
    expect(position(sim)).toBe(0);
    // Commands are ignored.
    write(sim, "2/1/2", 1, 5000);
    expect(position(sim)).toBe(0);
  });

  it("alarmPriority: another order gives another dominant alarm on the same events", () => {
    const sim = shutter({
      alarmPriority: "rain,wind,frost",
      rainReaction: "down",
    });
    write(sim, "2/7/2", 1, 3000);
    write(sim, "2/7/4", 1, 12000);
    expect(safety(sim)).toBe("rain");
    expect(position(sim)).toBe(100);
  });

  it("the dominant alarm ends while another remains: the other one takes over", () => {
    const sim = shutter({ rainReaction: "down", windReaction: "up" });
    write(sim, "2/7/4", 1, 3000);
    write(sim, "2/7/2", 1, 12000);
    expect(position(sim)).toBe(0);
    write(sim, "2/7/2", 0, 12000);
    expect(safety(sim)).toBe("rain");
    expect(position(sim)).toBe(100);
  });

  it("afterAlarm restore: back to the position before the first alarm", () => {
    const sim = shutter({ afterAlarm: "restore" });
    write(sim, "2/7/3", 50, 12000);
    write(sim, "2/7/2", 1, 12000);
    expect(position(sim)).toBe(0);
    write(sim, "2/7/2", 0, 12000);
    expect(safety(sim)).toBeNull();
    expect(estimate(sim)).toBeCloseTo(50, 0);
  });

  it("alarmMonitoringMs: without a telegram in time, the alarm is assumed", () => {
    const sim = shutter({
      alarmMonitoringMs: 20000,
      alarmPriority: "frost,wind,rain",
      frostReaction: "up",
    });
    write(sim, "2/7/3", 50, 7000);
    expect(position(sim)).toBeGreaterThan(40);
    // The weather sensor reports its three alarms: none is active.
    for (const ga of ["2/7/2", "2/7/4", "2/7/5"]) write(sim, ga, 0, 500);
    sim.advance(10000);
    expect(safety(sim)).toBeNull();
    sim.advance(25000);
    // No telegram since: every alarm is assumed, frost dominates.
    expect(safety(sim)).toBe("frost");
    expect(position(sim)).toBe(0);
  });
});

describe("shutter actuator: forcing", () => {
  it("by default the lock has priority over forcing", () => {
    const sim = shutter({ lockStart: "up" });
    write(sim, "2/7/1", 1, 3000);
    write(sim, "2/7/6", 3, 12000);
    expect(sim.channelState(S, CH).safety).toBe("lock");
    expect(position(sim)).toBe(0);
    write(sim, "2/7/1", 0, 12000);
    expect(sim.channelState(S, CH).safety).toBe("forced");
    expect(position(sim)).toBe(100);
  });

  it("3 forces down, the end of forcing restores; a lower-priority lock waits behind", () => {
    const sim = shutter({
      afterForcing: "restore",
      lockStart: "up",
      safetyPriority: "alarms,forced,lock",
    });
    write(sim, "2/7/3", 40, 12000);
    write(sim, "2/7/6", 3, 12000);
    expect(position(sim)).toBe(100);
    expect(sim.channelState(S, CH).safety).toBe("forced");
    // The lock does not take over while forcing holds the output.
    write(sim, "2/7/1", 1, 3000);
    expect(position(sim)).toBe(100);
    write(sim, "2/7/1", 0, 3000);
    write(sim, "2/7/6", 0, 12000);
    expect(estimate(sim)).toBeCloseTo(40, 0);
  });

  it("a weather alarm has priority over forcing", () => {
    const sim = shutter({});
    write(sim, "2/7/6", 3, 12000);
    write(sim, "2/7/2", 1, 12000);
    expect(position(sim)).toBe(0);
    write(sim, "2/7/2", 0, 3000);
    // Forcing holds the output again.
    expect(sim.channelState(S, CH).safety).toBe("forced");
  });
});

describe("shutter actuator: stored positions and end positions", () => {
  it("recalls the stored positions, and stores the current one", () => {
    const sim = shutter({ preset1Pct: 30, preset2Pct: 70 });
    write(sim, "2/7/7", 1, 12000);
    expect(estimate(sim)).toBeCloseTo(70, 0);
    write(sim, "2/7/3", 45, 12000);
    write(sim, "2/7/8", 0); // store as position 1
    write(sim, "2/7/7", 1, 12000);
    write(sim, "2/7/7", 0, 12000);
    expect(estimate(sim)).toBeCloseTo(45, 0);
  });

  it("presetStoring false: the store objects change nothing", () => {
    const sim = shutter({ preset1Pct: 30, presetStoring: false });
    write(sim, "2/7/3", 45, 12000);
    write(sim, "2/7/8", 0);
    write(sim, "2/7/7", 0, 12000);
    expect(estimate(sim)).toBeCloseTo(30, 0);
  });

  it("upper and lower end positions are sent when reached", () => {
    const sim = shutter({});
    expect(sim.objectValue(S, "top")).toBe(1);
    write(sim, "2/1/2", 1, 13000);
    expect(sim.objectValue(S, "top")).toBe(0);
    expect(sim.objectValue(S, "bottom")).toBe(1);
  });
});
