// Timeline: traces named in the option, values sampled on the axis of simulated time.
import { describe, expect, it } from "vitest";
import {
  MAX_TRACES,
  TimelineRecorder,
  availableTraces,
  parseTraces,
  traceValue,
} from "../../src/ui/timeline";
import { createSimulator } from "../../src/core";
import { load, raw } from "./helpers";

describe("timeline traces", () => {
  it("objects, rooms, and equipment are named as in the option; unknown ones are left out", () => {
    const sim = load("room-heating.json");
    const t = parseTraces(
      "livingThermostat/temp @livingRoom heatingActuator:h1 nope/x @none livingThermostat.temp",
      sim.scenario,
    );
    expect(t.map((x) => [x.id, x.kind, x.label])).toEqual([
      ["livingThermostat/temp", "object", "Measured temperature"],
      ["@livingRoom", "room", "Living room"],
      ["heatingActuator:h1", "equipment", "H1 living room"],
    ]);
    // A percentage keeps 0–100, a temperature follows its values.
    expect(parseTraces("livingThermostat/val", sim.scenario)[0]!.range).toEqual(
      [0, 100],
    );
    expect(t[0]!.range).toBeNull();
  });

  it("at most four traces", () => {
    const sim = load("room-heating.json");
    const ids = availableTraces(sim.scenario).map((x) => x.id);
    expect(ids.length).toBeGreaterThan(MAX_TRACES);
    expect(parseTraces(ids.join(" "), sim.scenario)).toHaveLength(MAX_TRACES);
  });

  it("reads the value of each kind of trace", () => {
    const sim = load("room-heating.json");
    const [obj, room, eq] = parseTraces(
      "livingThermostat/sp @livingRoom heatingActuator:h1",
      sim.scenario,
    );
    expect(traceValue(sim, obj!)).toBe(21);
    expect(traceValue(sim, room!)).toBe(18);
    expect(traceValue(sim, eq!)).toBe(0); // valve opening
  });
});

describe("timeline recorder", () => {
  it("records a value drawn as steps only when it changes", () => {
    const sim = load("room-heating.json");
    const traces = parseTraces("livingThermostat/val", sim.scenario);
    const rec = new TimelineRecorder();
    for (let i = 0; i < 20; i++) {
      rec.sample(sim, traces);
      sim.advance(50);
    }
    const s = rec.series.get("livingThermostat/val")!;
    // 1 s sampled every 50 ms: far fewer points than samples.
    expect(s.length).toBeLessThan(10);
    expect(s.every(([t], k) => k === 0 || t > s[k - 1]![0])).toBe(true);
  });

  it("starts again when the simulation goes back to 0", () => {
    const sim = load("room-heating.json");
    const traces = parseTraces("@livingRoom", sim.scenario);
    const rec = new TimelineRecorder();
    rec.sample(sim, traces);
    sim.advance(5000);
    rec.sample(sim, traces);
    sim.reset();
    rec.sample(sim, traces);
    expect(rec.series.get("@livingRoom")).toEqual([[0, 18]]);
  });
});

describe("timeline: identifiers and equipment", () => {
  it("a device ID with a dot is traced, its objects and outputs too", () => {
    const doc = JSON.parse(
      JSON.stringify(raw("room-heating.json")).replaceAll(
        '"livingThermostat"',
        '"living.zone"',
      ),
    );
    const sim = createSimulator(doc);
    const all = availableTraces(sim.scenario, sim);
    expect(all.every((t) => t && t.id)).toBe(true);
    expect(all.map((t) => t.id)).toContain("living.zone/temp");
    const [t] = parseTraces("living.zone/temp", sim.scenario, sim);
    expect(traceValue(sim, t!)).toBe(18);
  });

  it("the menu offers only equipment with a value to draw, on/off states as steps", () => {
    const sim = load("heat-pump.json");
    const eq = availableTraces(sim.scenario, sim).filter(
      (t) => t.kind === "equipment",
    );
    expect(eq.length).toBeGreaterThan(0);
    for (const t of eq) expect(traceValue(sim, t)).not.toBeNull();
    const hp = eq.find((t) => t.id === "actuator:hp")!;
    expect([hp.field, hp.step, hp.range]).toEqual(["running", true, [0, 1]]);
    const wh = eq.find((t) => t.id === "actuator:wh")!;
    expect([wh.field, wh.step]).toEqual(["tempC", false]);
    expect(traceValue(sim, wh)).toBe(40);
  });
});

describe("timeline: events between two samples", () => {
  it("a short valve pulse keeps its height after a long advance", () => {
    const doc = raw("room-heating.json") as {
      devices: Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    doc.devices = doc.devices.filter((d) => d.id === "heatingActuator");
    const act = doc.devices[0]!;
    act.channels[0].parameters = { cycleMs: 1000 };
    act.channels[0].equipment.parameters = { openingTimeMs: 1000 };
    doc.devices.push({
      id: "usb",
      name: "USB",
      address: "1.1.250",
      kind: "interface",
      behavior: "usbInterface/v1",
      objects: [],
    });
    const sim = createSimulator(doc);
    const traces = parseTraces("heatingActuator:h1", sim.scenario, sim);
    const rec = new TimelineRecorder();
    sim.onStep(() => rec.sample(sim, traces));
    sim.groupWrite("usb", "3/0/1", 10);
    rec.sample(sim, traces);
    sim.advance(5000);
    rec.sample(sim, traces);
    const values = rec.series.get("heatingActuator:h1")!.map(([, v]) => v!);
    // 10 % of a 1 s cycle with a valve opening in 1 s: about 10 % at the end of each pulse.
    expect(Math.max(...values)).toBeGreaterThan(9);
    expect(Math.max(...values)).toBeLessThan(11);
  });

  it("each step of step mode is recorded", () => {
    const sim = load("room-heating.json");
    const traces = parseTraces("livingThermostat/val", sim.scenario, sim);
    const rec = new TimelineRecorder();
    sim.onStep(() => rec.sample(sim, traces));
    rec.sample(sim, traces);
    for (
      let i = 0;
      i < 40 && sim.objectValue("livingThermostat", "val") === 0;
      i++
    )
      sim.stepToNextEvent();
    const v = sim.objectValue("livingThermostat", "val");
    expect(v).toBeGreaterThan(0);
    expect(rec.series.get("livingThermostat/val")!.at(-1)![1]).toBe(v);
  });
});
