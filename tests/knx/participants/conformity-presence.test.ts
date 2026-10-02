// Presence detector: master/slave operation of the catalogue's detectors. A slave detector
// of the same room sends 1 on each detection; the master counts it as its own detection.
import { describe, expect, it } from "vitest";
import { device, example, setParams, write } from "./conformity-kit";

const P = "pir";
const master = (params: Record<string, unknown> = {}) =>
  example("timers.json", (doc) => {
    setParams(doc, P, { holdMs: 10000, sendOnEnd: true, ...params });
    device(doc, P).inputs = [
      {
        id: "lux",
        type: "number",
        label: "Lux",
        object: "lux",
        min: 0,
        max: 2000,
        step: 10,
      },
    ];
    device(doc, P).objects.push(
      {
        id: "lux",
        name: "Brightness",
        ga: "1/5/8",
        dpt: "9.004",
        port: "brightness",
        flags: { W: false, T: true },
      },
      {
        id: "slave",
        name: "Slave detection",
        ga: "1/5/9",
        dpt: "1.001",
        port: "slaveTrigger",
        flags: { W: true, T: false },
      },
    );
  });

describe("presence detector: master and slave", () => {
  it("a slave detection switches on, and later ones restart the hold time", () => {
    const sim = master();
    write(sim, "1/5/9", 1);
    expect(sim.objectValue(P, "p")).toBe(1);
    sim.advance(6000);
    write(sim, "1/5/9", 1); // restarts the 10 s hold time
    sim.advance(6000);
    expect(sim.objectValue(P, "p")).toBe(1);
    sim.advance(6000);
    expect(sim.objectValue(P, "p")).toBe(0);
  });

  it("a 0 from the slave is not a detection", () => {
    const sim = master();
    write(sim, "1/5/9", 0);
    expect(sim.objectValue(P, "p")).toBe(0);
  });

  it("the brightness threshold applies to slave detections too", () => {
    const sim = master({ brightnessThresholdLux: 300 });
    sim.input(P, "lux", "value", 500);
    sim.advance(1000);
    write(sim, "1/5/9", 1);
    expect(sim.objectValue(P, "p")).toBe(0);
  });
});
