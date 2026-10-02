// Conformity of the metering functions (switch actuator with metering, energy meter) and of
// the slat step of a venetian blind, with values other than the defaults: what a product
// manual promises for each parameter.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../../src/core";
import { obj, raw } from "../helpers";

type Dev = {
  id: string;
  parameters?: Record<string, unknown>;
  channels?: { id: string; parameters?: Record<string, unknown> }[];
};
/** An example with the parameters of one device (or of one of its channels) changed. */
function variant(
  file: string,
  device: string,
  params: Record<string, unknown>,
  channel?: string,
) {
  const doc = raw(file) as { devices: Dev[] };
  const d = doc.devices.find((x) => x.id === device)!;
  if (channel) {
    const c = d.channels!.find((x) => x.id === channel)!;
    c.parameters = { ...c.parameters, ...params };
  } else d.parameters = { ...d.parameters, ...params };
  return createSimulator(doc);
}

describe("switch actuator with metering", () => {
  it("powerSendDeltaW: a smaller change waits for the cyclic sending", () => {
    const sim = variant("energy-metering.json", "energyActuator", {
      powerSendDeltaW: 1000,
      meterIntervalMs: 60000,
    });
    sim.advance(2000);
    sim.input("pushButton", "key3", "press"); // lamp, 200 W
    sim.advance(3000);
    expect(sim.channelState("energyActuator", "c3").on).toBe(true);
    expect(obj(sim, "energyActuator", "p3")).toBe(0);
    sim.advance(60000);
    expect(obj(sim, "energyActuator", "p3")).toBeCloseTo(200, 0);
  });

  it("energyTimeScale: energy counted that many times faster than real time", () => {
    const sim = variant("energy-metering.json", "energyActuator", {
      energyTimeScale: 3600,
      meterIntervalMs: 5000,
    });
    sim.input("pushButton", "key1", "press"); // oven, 2500 W
    sim.advance(1000);
    const start = sim.timeMs;
    sim.advance(20000);
    // One simulated second is one hour: 2500 Wh per second of running.
    const e = Number(obj(sim, "energyActuator", "e1"));
    const seconds = (sim.timeMs - start) / 1000;
    expect(e).toBeGreaterThan(2500 * (seconds - 6));
    expect(e).toBeLessThan(2500 * (seconds + 2));
  });

  it("powerLimitHysteresisW: the alarm ends only below the limit minus the hysteresis", () => {
    const sim = variant("energy-metering.json", "energyActuator", {
      powerLimitHysteresisW: 2000,
    });
    sim.input("pushButton", "key2", "press"); // water heater, 1500 W
    sim.advance(2000);
    sim.input("pushButton", "key1", "press"); // oven, 2500 W: 4000 W > 3500 W
    sim.advance(8000);
    // The heater is shed: 2500 W remain, above 3500 − 2000 W, so the alarm stays.
    expect(sim.channelState("energyActuator", "c2").shed).toBe(true);
    expect(obj(sim, "energyActuator", "limit")).toBe(1);
  });

  it("sheddingTimeMs: a shed output is switched on again after that time", () => {
    const sim = variant("energy-metering.json", "energyActuator", {
      sheddingTimeMs: 5000,
    });
    sim.input("pushButton", "key2", "press");
    sim.advance(2000);
    sim.input("pushButton", "key1", "press");
    sim.advance(2000);
    expect(sim.channelState("energyActuator", "c2").shed).toBe(true);
    sim.input("pushButton", "key1", "press"); // oven off: back below the limit
    sim.advance(7000);
    expect(sim.channelState("energyActuator", "c2").on).toBe(true);
  });
});

describe("energy meter", () => {
  it("powerSendDeltaW and energyTimeScale apply to the measured circuits", () => {
    const sim = variant("boiler-room.json", "meter", {
      powerSendDeltaW: 500,
      energyTimeScale: 3600,
      meterIntervalMs: 10000,
    });
    sim.advance(1000);
    const sent = sim.history.filter((t) => t.objectId === "whPower").length;
    sim.input("meter", "wh", "value", 300); // below the 500 W step
    sim.advance(1000);
    expect(sim.history.filter((t) => t.objectId === "whPower").length).toBe(
      sent,
    );
    sim.input("meter", "wh", "value", 2000); // above
    sim.advance(1000);
    expect(sim.history.filter((t) => t.objectId === "whPower").length).toBe(
      sent + 1,
    );
    const e0 = Number(obj(sim, "meter", "hpEnergy"));
    sim.advance(10000);
    // 1800 W for about 10 s, each second an hour: about 18 kWh more, sent in kWh
    // (DPT 13.013) as the object requests.
    const gained = Number(obj(sim, "meter", "hpEnergy")) - e0;
    expect(gained).toBeGreaterThan(12);
    expect(gained).toBeLessThan(24);
  });
});

describe("venetian blind", () => {
  it("slatStepPct: a step at rest turns the slats by that angle", () => {
    const step = (pct?: number) => {
      const sim = variant(
        "venetian-blind.json",
        "blindActuator",
        pct === undefined ? {} : { slatStepPct: pct },
        "b1",
      );
      sim.input("pushButton", "key2", "short"); // step down at rest
      sim.advance(4000);
      return Number(sim.equipmentState("blindActuator", "b1")!.slatPct);
    };
    expect(step()).toBe(20);
    expect(step(50)).toBe(50);
  });
});
