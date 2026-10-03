// Boundaries and combinations: values at a threshold with no hysteresis, an external
// temperature that never comes or that is entered, a clock set during a timed override,
// several objects on one port, and weekly program entries that cannot be applied.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../../src/core";
import { configWarnings } from "../../../src/knx/consistency";
import { en } from "../../../src/i18n";
import type { Simulation } from "../../../src/knx/sim";
import { ScenarioError, parseClockStart } from "../../../src/knx/scenario";
import { raw } from "../helpers";
import type { Doc } from "./conformity-kit";
import { device, example, setParams, write } from "./conformity-kit";

const enter = (sim: Simulation, dev: string, input: string, v: number) => {
  sim.input(dev, input, "value", v);
  sim.advance(2000);
};
const values = (sim: Simulation, ga: string, from: string) =>
  sim.history
    .filter((t) => t.ga === ga && t.sourceDeviceId === from)
    .map((t) => t.value);

describe("threshold reached with no hysteresis", () => {
  it("wind alarm: a constant value at the threshold keeps the alarm set", () => {
    const sim = example("weather-protection.json", (doc) =>
      setParams(doc, "weatherStation", {
        windThreshold: 10,
        windHysteresis: 0,
      }),
    );
    for (let i = 0; i < 4; i++) enter(sim, "weatherStation", "wind", 10);
    expect(values(sim, "2/6/1", "weatherStation")).toEqual([1]);
  });

  it("CO₂ alarm: a constant value at the threshold keeps the alarm set", () => {
    // 1600 ppm is exact in DPT 9: no rounding hides the boundary.
    const sim = example("air-quality.json", (doc) =>
      setParams(doc, "airSensor", {
        co2AlarmPpm: 1600,
        co2AlarmHysteresisPpm: 0,
      }),
    );
    for (let i = 0; i < 4; i++) enter(sim, "airSensor", "co2", 1600);
    expect(values(sim, "4/2/2", "airSensor")).toEqual([1]);
  });

  it("power limit: a constant load at the limit keeps the alarm set", () => {
    const sim = example("energy-metering.json", (doc) =>
      setParams(doc, "energyActuator", {
        powerLimitW: 2500,
        powerLimitHysteresisW: 0,
        meterIntervalMs: 1000,
      }),
    );
    write(sim, "5/0/1", 1, 10000); // oven: 2500 W
    expect(values(sim, "5/4/1", "energyActuator")).toEqual([1]);
  });
});

describe("room thermostat: external temperature", () => {
  const T = "livingThermostat";
  const thermostat = () =>
    example("room-heating.json", (doc: Doc) => {
      setParams(doc, T, {
        externalTempTimeoutMs: 3000,
        sensorFaultValuePct: 60,
      });
      const d = device(doc, T);
      delete d.room;
      d.objects.push(
        {
          id: "ext",
          name: "ext",
          ga: "3/4/9",
          dpt: "9.001",
          port: "externalTemp",
          flags: { W: true, T: false },
        },
        {
          id: "fault",
          name: "fault",
          ga: "3/4/10",
          dpt: "1.005",
          port: "sensorFault",
          flags: { W: false, T: true },
        },
      );
      d.inputs = [{ id: "extIn", type: "number", label: "Ext", object: "ext" }];
    });

  it("never received: after its monitoring time, fault and fault value", () => {
    const sim = thermostat();
    sim.advance(10000);
    expect(sim.objectValue(T, "fault")).toBe(1);
    expect(Math.round(Number(sim.objectValue(T, "val")))).toBe(60);
  });

  it("entered on the device: renews the measurement like a telegram", () => {
    const sim = thermostat();
    enter(sim, T, "extIn", 18);
    expect(sim.objectValue(T, "fault")).toBe(0);
    sim.advance(5000);
    // Not renewed: stale, and no room sensor: fault.
    expect(sim.objectValue(T, "fault")).toBe(1);
    enter(sim, T, "extIn", 19);
    expect(sim.objectValue(T, "fault")).toBe(0);
    expect(sim.deviceState(T).measuredC).toBe(19);
  });
});

describe("time switch: clock set during a timed override", () => {
  const sim = () =>
    example("time-schedule.json", (doc) => {
      setParams(doc, "timeSwitch", {
        program: "Daily 00:00 = 0",
        overrideDurationMin: 15,
      });
      (doc.clock as { speed: number }).speed = 1;
      device(doc, "timeSwitch").objects.push({
        id: "ovr",
        name: "ovr",
        ga: "6/1/9",
        dpt: "1.001",
        port: "overrideTimed",
        flags: { W: true, T: false },
      });
    });

  it("a jump within the override keeps it, and its end comes at its clock time", () => {
    const s = sim();
    write(s, "6/1/9", 1);
    expect(s.objectValue("timeSwitch", "out")).toBe(1);
    s.setClock(parseClockStart("2026-09-28T22:05:00")!);
    s.advance(1000);
    expect(s.objectValue("timeSwitch", "out")).toBe(1);
    expect(s.deviceState("timeSwitch").overridden).toBe(true);
    // The override ends about 21:57 + 15 min = 22:12: 7 clock minutes later.
    s.advance(7.5 * 60_000);
    expect(s.objectValue("timeSwitch", "out")).toBe(0);
  });

  it("a jump past the end of the override applies the program", () => {
    const s = sim();
    write(s, "6/1/9", 1);
    s.setClock(parseClockStart("2026-09-28T23:00:00")!);
    s.advance(1000);
    expect(s.objectValue("timeSwitch", "out")).toBe(0);
    expect(s.deviceState("timeSwitch").overridden).toBe(false);
  });
});

describe("several objects on one port", () => {
  it("a second object on a port that reads one value is refused", () => {
    const doc = raw("weather-protection.json") as Doc;
    device(doc, "weatherStation").objects.push({
      id: "wind2",
      ga: "2/6/9",
      dpt: "9.005",
      port: "wind",
      flags: { W: false, T: true },
    });
    expect(() => createSimulator(doc)).toThrow(ScenarioError);
  });

  it("every object of an output port sends the value", () => {
    const sim = example("time-schedule.json", (doc) => {
      setParams(doc, "logic", { activeFrom: "", activeTo: "" });
      device(doc, "logic").objects.push({
        id: "out2",
        name: "out2",
        ga: "6/2/9",
        dpt: "1.001",
        port: "logicOut",
        flags: { W: false, T: true },
      });
    });
    sim.input("presence", "motion", "press");
    sim.advance(4000);
    expect(sim.objectValue("logic", "out")).toBe(1);
    expect(sim.objectValue("logic", "out2")).toBe(1);
  });
});

describe("weekly program entries that cannot be applied", () => {
  const warnings = (program: string) => {
    const doc = raw("time-schedule.json") as Doc;
    setParams(doc, "timeSwitch", { program });
    const sim = createSimulator(doc);
    return configWarnings(sim.scenario, en).filter(
      (w) => w.code === "config-program",
    );
  };

  it("a malformed day range is reported and ignored", () => {
    expect(warnings("Mon-Fri-Sun 07:00 = 1")).toHaveLength(1);
    expect(warnings("Mon-Fri 07:00 = 1")).toHaveLength(0);
  });

  it("a value outside the DPT of the output is reported and not sent", () => {
    expect(warnings("Daily 00:00 = 2")).toHaveLength(1);
    const doc = raw("time-schedule.json") as Doc;
    setParams(doc, "timeSwitch", { program: "Daily 00:00 = 2" });
    const sim = createSimulator(doc);
    sim.advance(3000);
    expect(
      sim.history.some(
        (t) => t.ga === "6/1/1" && t.sourceDeviceId === "timeSwitch",
      ),
    ).toBe(false);
  });
});
