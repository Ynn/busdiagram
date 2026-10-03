// Conformity of the dimmer actuator and the KNX/DALI gateway with values other than the
// defaults: switch-on level, fades, maximum level, relative dimming that switches on or
// off, colour temperature range, ballast polling, and broadcast value.
import { describe, expect, it } from "vitest";
import type { Simulation } from "../../../src/knx/sim";
import { device, example, setParams, write } from "./conformity-kit";

/** Level of the load (it follows the fades), or the target of the channel without load. */
const level = (sim: Simulation, dev = "dimmerActuator", ch = "d1") =>
  Number(
    sim.equipmentState(dev, ch)?.levelPct ?? sim.channelState(dev, ch).levelPct,
  );
const dimmer = (params: Record<string, unknown>) =>
  example("dimming.json", (doc) =>
    setParams(doc, "dimmerActuator", params, "d1"),
  );
// Relative dimming (3.007): bit 3 is the direction (1 = up), bits 0–2 the step.
const UP_FULL = 0b1001;
const DOWN_FULL = 0b0001;

describe("dimmer actuator", () => {
  it("onLevel fixed: switches on at onLevelPct", () => {
    const sim = dimmer({ onLevel: "fixed", onLevelPct: 40 });
    write(sim, "1/1/1", 1);
    expect(level(sim)).toBe(40);
  });

  it("onLevel last: switches on at the level it had when switched off", () => {
    const sim = dimmer({ onLevel: "last" });
    write(sim, "1/3/1", 30);
    write(sim, "1/1/1", 0);
    expect(level(sim)).toBe(0);
    write(sim, "1/1/1", 1);
    // 5.001 carries 30 % as 77/255.
    expect(level(sim)).toBeCloseTo(30, 0);
  });

  it("maxLevelPct: neither a value nor switching on exceeds the maximum", () => {
    const sim = dimmer({ maxLevelPct: 60, onLevel: "fixed", onLevelPct: 100 });
    write(sim, "1/3/1", 100);
    expect(level(sim)).toBe(60);
    write(sim, "1/1/1", 0);
    write(sim, "1/1/1", 1);
    expect(level(sim)).toBe(60);
  });

  it("switchFadeMs: switching on and off fades over that time", () => {
    const sim = dimmer({
      switchFadeMs: 2000,
      onLevel: "fixed",
      onLevelPct: 100,
    });
    write(sim, "1/1/1", 1, 0);
    const samples: [number, number][] = [];
    for (let i = 0; i < 50; i++) {
      sim.advance(100);
      samples.push([sim.timeMs, level(sim)]);
    }
    const start = samples.find(([, l]) => l > 0)!;
    const end = samples.find(([, l]) => l === 100)!;
    expect(samples.some(([, l]) => l > 0 && l < 100)).toBe(true);
    expect(end[0] - start[0]).toBeGreaterThan(1600);
    expect(end[0] - start[0]).toBeLessThan(2300);
  });

  it("dimSwitchesOn false: dimming up does not switch an off channel on", () => {
    const off = dimmer({ dimSwitchesOn: false });
    write(off, "1/2/1", UP_FULL, 6000);
    expect(level(off)).toBe(0);
    const on = dimmer({});
    write(on, "1/2/1", UP_FULL, 6000);
    expect(level(on)).toBeGreaterThan(0);
  });

  it("dimSwitchesOff: dimming down stops at the minimum, or switches off", () => {
    const keep = dimmer({ minLevelPct: 10 });
    write(keep, "1/3/1", 50);
    write(keep, "1/2/1", DOWN_FULL, 6000);
    expect(level(keep)).toBe(10);
    const off = dimmer({ minLevelPct: 10, dimSwitchesOff: true });
    write(off, "1/3/1", 50);
    write(off, "1/2/1", DOWN_FULL, 6000);
    expect(level(off)).toBe(0);
  });

  it("minColourK and maxColourK limit the colour temperature", () => {
    const sim = example("tunable-white.json", (doc) =>
      setParams(doc, "dimmer", { minColourK: 3000, maxColourK: 5000 }, "d1"),
    );
    write(sim, "1/1/1", 1);
    write(sim, "1/6/1", 2700);
    expect(sim.objectValue("dimmer", "colourStatus")).toBe(3000);
    write(sim, "1/6/1", 6500);
    expect(sim.objectValue("dimmer", "colourStatus")).toBe(5000);
  });
});

describe("KNX/DALI gateway", () => {
  it("pollMs: a ballast fault is found at the next poll", () => {
    const sim = example("dali-gateway.json", (doc) =>
      setParams(doc, "gw", { pollMs: 10000 }),
    );
    sim.advance(7500); // just after the poll at 10 s
    sim.equipmentAction("gw", "g2", "toggleBallast", 1);
    sim.advance(3000);
    expect(sim.objectValue("gw", "g2err")).toBe(0);
    sim.advance(8000);
    expect(sim.objectValue("gw", "g2err")).toBe(1);
  });

  it("polls the ballasts again after a bus voltage failure", () => {
    const sim = example("dali-gateway.json");
    sim.setBusVoltage("L1.1", false);
    sim.advance(1000);
    sim.setBusVoltage("L1.1", true);
    sim.advance(3000);
    sim.equipmentAction("gw", "g2", "toggleBallast", 1);
    sim.advance(5000);
    expect(sim.objectValue("gw", "g2err")).toBe(1);
  });

  it("broadcastValue: sets every group to the value", () => {
    const sim = example("dali-gateway.json", (doc) => {
      device(doc, "gw").objects.push({
        id: "bv",
        name: "Broadcast value",
        ga: "1/3/0",
        dpt: "5.001",
        port: "broadcastValue",
        flags: { W: true, T: false },
      });
    });
    write(sim, "1/3/0", 50, 3000);
    expect(level(sim, "gw", "g1")).toBeCloseTo(50, 0);
    expect(level(sim, "gw", "g2")).toBeCloseTo(50, 0);
  });
});

describe("dimmer actuator: bus voltage", () => {
  it("busFailure level, busRecovery previous: fixed level during the failure, then back", () => {
    const sim = dimmer({ busFailure: "level", busFailureLevelPct: 30 });
    write(sim, "1/3/1", 80);
    sim.setBusVoltage("L1.1", false);
    sim.advance(1000);
    expect(level(sim)).toBe(30);
    sim.setBusVoltage("L1.1", true);
    sim.advance(3000);
    expect(level(sim)).toBeCloseTo(80, 0);
    // The status is sent again after the restart.
    expect(
      Math.round(Number(sim.objectValue("dimmerActuator", "valueStatus"))),
    ).toBe(80);
  });

  it("busFailure off, busRecovery on: dark during the failure, switch-on level after", () => {
    const sim = dimmer({
      busFailure: "off",
      busRecovery: "on",
      onLevel: "fixed",
      onLevelPct: 60,
    });
    write(sim, "1/3/1", 20);
    sim.setBusVoltage("L1.1", false);
    sim.advance(1000);
    expect(level(sim)).toBe(0);
    sim.setBusVoltage("L1.1", true);
    sim.advance(3000);
    expect(level(sim)).toBe(60);
  });

  it("by default, the level is unchanged during the failure and after it", () => {
    const sim = dimmer({});
    write(sim, "1/3/1", 40);
    sim.setBusVoltage("L1.1", false);
    sim.advance(1000);
    expect(level(sim)).toBeCloseTo(40, 0);
    sim.setBusVoltage("L1.1", true);
    sim.advance(3000);
    expect(level(sim)).toBeCloseTo(40, 0);
  });
});
