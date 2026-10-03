// Behaviors checked against the KNX application descriptions (KNX Standard, volume 7):
// the state machine of the Dimming Actuator Basic, and the datapoints of shutter actuators.
import { describe, expect, it } from "vitest";
import type { Simulation } from "../../../src/knx/sim";
import type { Doc } from "./conformity-kit";
import { device, example, setParams, write } from "./conformity-kit";

const level = (sim: Simulation) =>
  Number(sim.channelState("dimmerActuator", "d1").levelPct);

describe("dimming actuator (Dimming Actuator Basic)", () => {
  it("an absolute value below the minimum gives the minimum, above the maximum the maximum", () => {
    const sim = example("dimming.json", (doc) =>
      setParams(
        doc,
        "dimmerActuator",
        { minLevelPct: 20, maxLevelPct: 80 },
        "d1",
      ),
    );
    write(sim, "1/3/1", 5);
    expect(level(sim)).toBeCloseTo(20, 0);
    write(sim, "1/3/1", 95);
    expect(level(sim)).toBeCloseTo(80, 0);
    write(sim, "1/3/1", 0);
    expect(level(sim)).toBe(0);
  });

  it("while dimming, a new step counts from the set value being reached", () => {
    const sim = example("dimming.json", (doc) =>
      setParams(doc, "dimmerActuator", { dimTimeMs: 20000 }, "d1"),
    );
    write(sim, "1/3/1", 50);
    // Up by 12.5 % (step code 4), then again 0.5 s later, before the first step is reached.
    write(sim, "1/2/1", 8 + 4, 500);
    write(sim, "1/2/1", 8 + 4, 6000);
    expect(level(sim)).toBeCloseTo(75, 0);
  });
});

describe("shutter actuator datapoints", () => {
  const shutter = (edit: (doc: Doc) => void) =>
    example("shutter-control.json", edit);
  const position = (sim: Simulation) =>
    Number(sim.equipmentState("shutterActuator", "shutter1")!.positionPct);

  it("forcing with DPT 2.008 (direction control): 3 forced down, 2 forced up", () => {
    const sim = shutter((doc) =>
      device(doc, "shutterActuator").objects.push({
        id: "force",
        name: "Forced",
        ga: "2/7/6",
        dpt: "2.008",
        port: "forced",
        channel: "shutter1",
        flags: { W: true, T: false },
      }),
    );
    write(sim, "2/7/6", 3, 13000);
    expect(position(sim)).toBe(100);
    write(sim, "2/7/6", 2, 13000);
    expect(position(sim)).toBe(0);
  });

  it("preset position with DPT 1.022 (scene A/B): 0 recalls position 1, 1 position 2", () => {
    const sim = shutter((doc) => {
      setParams(
        doc,
        "shutterActuator",
        { preset1Pct: 30, preset2Pct: 70 },
        "shutter1",
      );
      device(doc, "shutterActuator").objects.push({
        id: "preset",
        name: "Preset",
        ga: "2/7/7",
        dpt: "1.022",
        port: "recallPosition12",
        channel: "shutter1",
        flags: { W: true, T: false },
      });
    });
    write(sim, "2/7/7", 1, 13000);
    expect(position(sim)).toBeCloseTo(70, 0);
    write(sim, "2/7/7", 0, 13000);
    expect(position(sim)).toBeCloseTo(30, 0);
  });
});
