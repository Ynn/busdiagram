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
        id: "wind",
        name: "Wind",
        ga: "2/7/2",
        dpt: "1.005",
        port: "windAlarm",
        channel: CH,
        flags: { W: true, T: false },
      },
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
