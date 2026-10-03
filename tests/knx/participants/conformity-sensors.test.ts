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

describe("logic module: inversion and enable polarity", () => {
  // In the example, the inputs are the sun output (2/6/2) and the automatic mode (2/6/3).
  const logic = (params: Record<string, unknown>) =>
    example("weather-protection.json", (doc) => {
      setParams(doc, "logicModule", params);
      device(doc, "logicModule").objects.push({
        id: "en",
        name: "Enable",
        ga: "2/6/9",
        dpt: "1.003",
        port: "enable",
        flags: { W: true, T: false },
      });
    });
  const out = (sim: Simulation) => sim.objectValue("logicModule", "out");

  it("invertOutput: AND becomes NAND", () => {
    const sim = logic({ operation: "and", invertOutput: true });
    write(sim, "2/6/3", 1);
    expect(out(sim)).toBe(1); // sun 0, auto 1: AND 0, NAND 1
    write(sim, "2/6/2", 1);
    expect(out(sim)).toBe(0);
  });

  it("invertInput: one input inverted, the others unchanged", () => {
    const sim = logic({ operation: "and", invertInput1: true });
    write(sim, "2/6/3", 1);
    // Input 1 (sun) is 0, inverted to 1; input 2 is 1: AND gives 1.
    expect(out(sim)).toBe(1);
    write(sim, "2/6/2", 1);
    expect(out(sim)).toBe(0);
  });

  it("enablePolarity inverted: 1 blocks, 0 enables and sends the result", () => {
    const sim = logic({ operation: "or", enablePolarity: "inverted" });
    write(sim, "2/6/9", 1);
    const before = sim.history.filter(
      (t) => t.sourceDeviceId === "logicModule",
    ).length;
    write(sim, "2/6/3", 1);
    expect(
      sim.history.filter((t) => t.sourceDeviceId === "logicModule").length,
    ).toBe(before);
    write(sim, "2/6/9", 0);
    expect(out(sim)).toBe(1);
  });
});

describe("weather station: rain, frost, and cyclic alarms", () => {
  const station = (params: Record<string, unknown> = {}) =>
    example("weather-protection.json", (doc) => {
      setParams(doc, "weatherStation", params);
      const ws = device(doc, "weatherStation");
      ws.objects.push(
        {
          id: "rain",
          name: "Rain alarm",
          ga: "2/6/6",
          dpt: "1.005",
          port: "rainAlarm",
          flags: { W: false, T: true },
        },
        {
          id: "frost",
          name: "Frost alarm",
          ga: "2/6/7",
          dpt: "1.005",
          port: "frostAlarm",
          flags: { W: false, T: true },
        },
        {
          id: "temp",
          name: "Outdoor temperature",
          ga: "2/6/8",
          dpt: "9.001",
          port: "outdoorTemp",
          flags: { W: false, T: true },
        },
      );
      (ws.inputs as unknown[]).push(
        {
          id: "rainIn",
          type: "number",
          label: "Rain",
          object: "rain",
          min: 0,
          max: 1,
          step: 1,
        },
        {
          id: "tempIn",
          type: "number",
          label: "Temperature",
          object: "temp",
          min: -20,
          max: 40,
          step: 1,
        },
      );
    });
  const v = (sim: Simulation, id: string) =>
    sim.objectValue("weatherStation", id);

  it("rain: alarm after rainOnDelayMs, reset rainOffDelayMs after it stops", () => {
    const sim = station({ rainOnDelayMs: 10000, rainOffDelayMs: 30000 });
    enter(sim, "weatherStation", "rainIn", 1);
    expect(v(sim, "rain")).toBe(0);
    sim.advance(10000);
    expect(v(sim, "rain")).toBe(1);
    enter(sim, "weatherStation", "rainIn", 0);
    sim.advance(20000);
    expect(v(sim, "rain")).toBe(1);
    sim.advance(12000);
    expect(v(sim, "rain")).toBe(0);
  });

  it("a short shower is not reported", () => {
    const sim = station({ rainOnDelayMs: 10000 });
    enter(sim, "weatherStation", "rainIn", 1);
    enter(sim, "weatherStation", "rainIn", 0);
    sim.advance(15000);
    expect(v(sim, "rain")).toBe(0);
  });

  it("frost: set at or below the threshold, reset at threshold + hysteresis", () => {
    const sim = station({ frostThresholdC: 3, frostHysteresisK: 2 });
    enter(sim, "weatherStation", "tempIn", 4);
    expect(v(sim, "frost")).toBe(0);
    enter(sim, "weatherStation", "tempIn", 3);
    expect(v(sim, "frost")).toBe(1);
    enter(sim, "weatherStation", "tempIn", 4);
    expect(v(sim, "frost")).toBe(1);
    enter(sim, "weatherStation", "tempIn", 5);
    expect(v(sim, "frost")).toBe(0);
  });

  it("alarmCyclicMs: the alarms are sent again, for actuators that monitor them", () => {
    const sim = station({ alarmCyclicMs: 10000 });
    const sent = () =>
      sim.history.filter(
        (t) => t.ga === "2/6/1" && t.sourceDeviceId === "weatherStation",
      ).length;
    const before = sent();
    sim.advance(31000);
    expect(sent() - before).toBeGreaterThanOrEqual(3);
  });
});
