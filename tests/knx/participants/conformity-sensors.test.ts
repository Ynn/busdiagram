// Conformity of the sensors and the logic module with values other than the defaults:
// thresholds with hysteresis (set at the threshold, reset below threshold − hysteresis),
// fan stages of an air quality sensor, and the enable object of a logic module.
import { describe, expect, it } from "vitest";
import type { Simulation } from "../../../src/knx/sim";
import { device, example, setParams, write } from "./conformity-kit";

const enter = (sim: Simulation, dev: string, input: string, v: number) => {
  sim.input(dev, input, "value", v);
  sim.advance(2000);
};

describe("weather station", () => {
  it("windThreshold, windHysteresis: alarm set at 10 m/s, reset below 7 m/s", () => {
    const sim = example("weather-protection.json", (doc) =>
      setParams(doc, "weatherStation", {
        windThreshold: 10,
        windHysteresis: 3,
      }),
    );
    const alarm = () => sim.objectValue("weatherStation", "windAlarm");
    enter(sim, "weatherStation", "wind", 9);
    expect(alarm()).toBe(0);
    enter(sim, "weatherStation", "wind", 10);
    expect(alarm()).toBe(1);
    enter(sim, "weatherStation", "wind", 8);
    expect(alarm()).toBe(1);
    enter(sim, "weatherStation", "wind", 7);
    expect(alarm()).toBe(0);
  });

  it("brightnessThreshold, brightnessHysteresis: sun output with its own band", () => {
    const sim = example("weather-protection.json", (doc) =>
      setParams(doc, "weatherStation", {
        brightnessThreshold: 20000,
        brightnessHysteresis: 5000,
      }),
    );
    const sun = () => sim.objectValue("weatherStation", "sun");
    // The brightness input of the example has a step of 5000 lx.
    enter(sim, "weatherStation", "brightness", 25000);
    expect(sun()).toBe(1);
    enter(sim, "weatherStation", "brightness", 20000);
    expect(sun()).toBe(1);
    enter(sim, "weatherStation", "brightness", 10000);
    expect(sun()).toBe(0);
  });
});

describe("air quality sensor", () => {
  const sensor = (params: Record<string, unknown>) =>
    example("air-quality.json", (doc) => setParams(doc, "airSensor", params));
  const v = (sim: Simulation, id: string) => sim.objectValue("airSensor", id);

  it("humidityAlarmPct, humidityAlarmHysteresisPct", () => {
    const sim = sensor({
      humidityAlarmPct: 60,
      humidityAlarmHysteresisPct: 10,
    });
    enter(sim, "airSensor", "hum", 60);
    expect(v(sim, "humAlarm")).toBe(1);
    enter(sim, "airSensor", "hum", 55);
    expect(v(sim, "humAlarm")).toBe(1);
    enter(sim, "airSensor", "hum", 50);
    expect(v(sim, "humAlarm")).toBe(0);
  });

  it("co2AlarmHysteresisPpm", () => {
    const sim = sensor({ co2AlarmHysteresisPpm: 300 });
    enter(sim, "airSensor", "co2", 1500);
    expect(v(sim, "co2Alarm")).toBe(1);
    enter(sim, "airSensor", "co2", 1300);
    expect(v(sim, "co2Alarm")).toBe(1);
    enter(sim, "airSensor", "co2", 1200);
    expect(v(sim, "co2Alarm")).toBe(0);
  });

  it("stepHysteresisPpm and the values of the stages", () => {
    const sim = sensor({
      stepHysteresisPpm: 100,
      step1Pct: 25,
      step2Pct: 50,
      step3Pct: 90,
    });
    // 5.001 carries 25 % as 64/255: compare to the nearest percent.
    const vent = () => Math.round(Number(v(sim, "vent")));
    enter(sim, "airSensor", "co2", 850); // below 800 + 100
    expect(vent()).toBe(0);
    // DPT 9.008 carries 900 ppm as 899.84 ppm, below 800 + 100.
    enter(sim, "airSensor", "co2", 900);
    expect(vent()).toBe(0);
    enter(sim, "airSensor", "co2", 950);
    expect(vent()).toBe(25);
    enter(sim, "airSensor", "co2", 1100);
    expect(vent()).toBe(50);
    // 1300 ppm travels as 1299.2 ppm (DPT 9.008): 1400 is clearly above 1200 + 100.
    enter(sim, "airSensor", "co2", 1400);
    expect(vent()).toBe(90);
    enter(sim, "airSensor", "co2", 1150); // above 1200 − 100: stage 3 kept
    expect(vent()).toBe(90);
    enter(sim, "airSensor", "co2", 1000);
    expect(vent()).toBe(50);
  });
});

describe("logic module", () => {
  const logic = (params: Record<string, unknown>, enable = false) =>
    example("weather-protection.json", (doc) => {
      setParams(doc, "logicModule", params);
      if (enable)
        device(doc, "logicModule").objects.push({
          id: "en",
          name: "Enable",
          ga: "2/6/9",
          dpt: "1.003",
          port: "enable",
          flags: { W: true, T: false },
        });
    });
  const sent = (sim: Simulation) =>
    sim.history.filter((t) => t.sourceDeviceId === "logicModule").length;

  it("sendOnChangeOnly false: an unchanged result is sent again", () => {
    const once = logic({});
    write(once, "2/6/3", 1);
    const a = sent(once);
    write(once, "2/6/3", 1);
    expect(sent(once)).toBe(a);
    const again = logic({ sendOnChangeOnly: false });
    write(again, "2/6/3", 1);
    const b = sent(again);
    write(again, "2/6/3", 1);
    expect(sent(again)).toBe(b + 1);
  });

  it("enable: 0 blocks the output, 1 sends the current result", () => {
    const sim = logic({ operation: "or" }, true);
    write(sim, "2/6/9", 0);
    const blocked = sent(sim);
    write(sim, "2/6/3", 1);
    expect(sent(sim)).toBe(blocked);
    write(sim, "2/6/9", 1);
    expect(sent(sim)).toBe(blocked + 1);
    expect(sim.objectValue("logicModule", "out")).toBe(1);
  });
});
