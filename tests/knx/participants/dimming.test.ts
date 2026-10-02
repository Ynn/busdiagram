// KNX dimming and DALI gateway behavior: relative and absolute dimming,
// broadcast control, group status, and ballast fault reporting.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../../src/core";
import { buildScenario, ScenarioError } from "../../../src/knx/scenario";
import { dimStepPct, formatValue } from "../../../src/knx/dpt";
import { daliArcLevel } from "../../../src/participants/shared/dimming";
import { load, raw } from "../helpers";

const level = (sim: ReturnType<typeof load>, ch: string) =>
  Number(sim.equipmentState("gw", ch)!.levelPct);

describe("DPT 3.007 and DALI curve", () => {
  it("dimming step: 1 = 100%, 7 = 1.6%, 0 = stop, bit 3 = increase", () => {
    expect([1, 2, 3, 7].map(dimStepPct)).toEqual([100, 50, 25, 1.5625]);
    expect(dimStepPct(8)).toBe(0);
    expect(formatValue("3.007", 9)).toBe("Increase by 100 %");
    expect(formatValue("3.007", 3)).toBe("Decrease by 25 %");
    expect(formatValue("3.007", 0)).toBe("Stop dimming");
  });

  it("logarithmic DALI arc value: 100 % = 254, 10 % = 170, 1 % = 85, 0 = off", () => {
    expect([100, 10, 1, 0].map(daliArcLevel)).toEqual([254, 170, 85, 0]);
  });
});

describe("DALI gateway", () => {
  it("maps KNX scenes 1–16 to DALI command numbers 0–15", () => {
    const data = raw("dali-gateway.json");
    const gw = (data.devices as Array<Record<string, unknown>>).find(
      (device) => device.id === "gw",
    )!;
    const channels = gw.channels as Array<Record<string, unknown>>;
    channels[0]!.scenes = { "1": 50, "16": 75 };
    (gw.objects as Array<Record<string, unknown>>).push({
      id: "scene",
      name: "Office scene",
      ga: "1/6/1",
      dpt: "17.001",
      port: "scene",
      channel: "g1",
      flags: { W: true, T: false },
    });
    (data.groupAddresses as Array<Record<string, unknown>>).push({
      address: "1/6/1",
      name: "Office scene",
      dpt: "17.001",
    });
    const sim = createSimulator(data);
    sim.groupWrite("usbInterface", "1/6/1", 0);
    sim.advance(5000);
    expect(
      sim.journal.some((e) => e.message?.includes("GO TO SCENE 0 (50 %)")),
    ).toBe(true);
    sim.groupWrite("usbInterface", "1/6/1", 15);
    sim.advance(5000);
    expect(
      sim.journal.some((e) => e.message?.includes("GO TO SCENE 15 (75 %)")),
    ).toBe(true);
  });

  it("rejects DALI scene 17 and a seventeenth DALI group", () => {
    const data = raw("dali-gateway.json");
    const gw = (data.devices as Array<Record<string, unknown>>).find(
      (device) => device.id === "gw",
    )!;
    const channels = gw.channels as Array<Record<string, unknown>>;
    channels[0]!.scenes = { "17": 50 };
    channels.push(
      ...Array.from({ length: 15 }, (_, index) => ({
        id: `extra${index + 1}`,
        label: `Extra group ${index + 1}`,
      })),
    );
    try {
      buildScenario(data);
      throw new Error("scenario incorrectly accepted");
    } catch (error) {
      expect(error).toBeInstanceOf(ScenarioError);
      expect((error as ScenarioError).details.map((p) => p.path)).toEqual(
        expect.arrayContaining([
          "devices[1].channels",
          "devices[1].channels[0].scenes.17",
        ]),
      );
    }
  });
  it("rejects overlapping ballast addresses across modeled groups", () => {
    const data = raw("dali-gateway.json");
    const gw = (data.devices as Array<Record<string, unknown>>).find(
      (device) => device.id === "gw",
    )!;
    const channels = gw.channels as Array<Record<string, unknown>>;
    const equipment = channels[1]!.equipment as Record<string, unknown>;
    (equipment.parameters as Record<string, unknown>).firstAddress = 3;
    try {
      buildScenario(data);
      throw new Error("scenario incorrectly accepted");
    } catch (error) {
      expect(error).toBeInstanceOf(ScenarioError);
      expect((error as ScenarioError).details.map((p) => p.path)).toContain(
        "devices[1].channels[1].equipment.parameters.firstAddress",
      );
    }
  });

  it("short press switches on the group and emits 1.001 and 5.001 feedback", () => {
    const sim = load("dali-gateway.json");
    sim.press("pushButton", "key1", "short");
    sim.advance(5000);
    expect(level(sim, "g1")).toBe(100);
    expect(level(sim, "g2")).toBe(0);
    const st = sim.history
      .filter((t) => t.sourceDeviceId === "gw")
      .map((t) => `${t.ga}=${Math.round(t.value)}`);
    expect(st).toEqual(expect.arrayContaining(["1/4/1=1", "1/5/1=100"]));
    expect(
      sim.journal.some((e) => e.message?.includes("RECALL MAX LEVEL")),
    ).toBe(true);
  });

  it("long press dims; release stops at the reached level", () => {
    const sim = load("dali-gateway.json");
    sim.press("pushButton", "key1", "long"); // increase by 100%; full fade lasts 4 s
    sim.advance(1300 + 2000); // telegram delivery, then 2 s of dimming
    sim.input("pushButton", "key1", "release");
    sim.advance(5000);
    // 1% floor + (2 s + 1.3 s stop delivery) × 100% / 4 s ≈ 83.5%.
    const l = level(sim, "g1");
    expect(l).toBeGreaterThan(80);
    expect(l).toBeLessThan(87);
    // Value feedback reports the level where dimming stopped.
    const vs = sim.history.filter((t) => t.ga === "1/5/1").at(-1)!;
    expect(Math.abs(vs.value - l)).toBeLessThan(1);
  });

  it("absolute 5.001 value and broadcast", () => {
    const sim = load("dali-gateway.json");
    sim.input("panel", "setpoint", "value", 30);
    sim.advance(5000);
    expect(level(sim, "g1")).toBeCloseTo(30, 0);
    expect(sim.journal.some((e) => e.message?.includes("DAPC"))).toBe(true);
    sim.groupWrite("usbInterface", "1/1/0", 1);
    sim.advance(5000);
    expect([level(sim, "g1"), level(sim, "g2")]).toEqual([100, 100]);
    sim.groupWrite("usbInterface", "1/1/0", 0);
    sim.advance(5000);
    expect([level(sim, "g1"), level(sim, "g2")]).toEqual([0, 0]);
  });

  it("ballast fault is found by polling and reported for the group and gateway", () => {
    const sim = load("dali-gateway.json");
    expect(sim.equipmentAction("gw", "g2", "toggleBallast", 1)).toBe(true);
    sim.advance(5000);
    const err = sim.history.filter((t) => t.ga.startsWith("1/7/"));
    expect(err.map((t) => `${t.ga}=${t.value}`)).toEqual(
      expect.arrayContaining(["1/7/2=1", "1/7/0=1"]),
    );
    expect(sim.objectValue("gw", "g1err")).toBe(0);
    // Repair clears the fault.
    sim.equipmentAction("gw", "g2", "toggleBallast", 1);
    sim.advance(5000);
    expect(sim.objectValue("gw", "g2err")).toBe(0);
  });

  it("faulty ballast stays dark on screen while others follow the level", () => {
    const sim = load("dali-gateway.json");
    sim.equipmentAction("gw", "g1", "toggleBallast", 0);
    expect(sim.equipmentState("gw", "g1")).toMatchObject({
      failed: 1,
      failedMask: 1,
    });
  });
});
