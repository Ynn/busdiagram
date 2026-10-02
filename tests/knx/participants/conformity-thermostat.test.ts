// Conformity of the room thermostat with values other than the defaults, as a room
// controller manual describes them: setpoints of each mode, protection, cooling with a dead
// zone, setpoint limits and shift, proportional band, PWM, sending of the temperature, and
// the outputs of the active mode.
import { describe, expect, it } from "vitest";
import type { Simulation } from "../../../src/knx/sim";
import type { Doc } from "./conformity-kit";
import { device, example, setParams, write } from "./conformity-kit";

const T = "livingThermostat";
/** The living-room thermostat of the heating example, with parameters and extra objects. */
function thermostat(
  params: Record<string, unknown>,
  extra: [id: string, port: string, ga: string, dpt: string, W: boolean][] = [],
  edit: (doc: Doc) => void = () => {},
) {
  return example("room-heating.json", (doc) => {
    setParams(doc, T, params);
    for (const [id, port, ga, dpt, W] of extra)
      device(doc, T).objects.push({
        id,
        name: id,
        ga,
        dpt,
        port,
        flags: { W, T: !W },
      });
    edit(doc);
  });
}
const value = (sim: Simulation, id: string) => sim.objectValue(T, id);

describe("room thermostat: setpoints", () => {
  it("standbyShiftK, economyShiftK: setpoints lowered in heating", () => {
    const sim = thermostat({ standbyShiftK: 3, economyShiftK: 5 });
    expect(value(sim, "sp")).toBe(21);
    write(sim, "3/2/0", 2); // standby
    expect(value(sim, "sp")).toBe(18);
    write(sim, "3/2/0", 3); // economy
    expect(value(sim, "sp")).toBe(16);
  });

  it("frostProtectionC: setpoint of the protection mode in heating", () => {
    const sim = thermostat({ frostProtectionC: 10 });
    write(sim, "3/2/0", 4);
    expect(value(sim, "sp")).toBe(10);
  });

  it("cooling: base plus deadZoneK, raised by the shifts; heatProtectionC in protection", () => {
    const sim = thermostat(
      { deadZoneK: 2, standbyShiftK: 3, heatProtectionC: 30 },
      [
        ["hc", "heatCool", "3/5/0", "1.100", true],
        ["hcs", "heatCoolStatus", "3/5/1", "1.100", false],
      ],
    );
    write(sim, "3/5/0", 0); // cooling
    expect(value(sim, "hcs")).toBe(0);
    expect(value(sim, "sp")).toBe(23);
    write(sim, "3/2/0", 2);
    expect(value(sim, "sp")).toBe(26);
    write(sim, "3/2/0", 4);
    expect(value(sim, "sp")).toBe(30);
  });

  it("minSetpointC, maxSetpointC: a base setpoint is kept within the limits", () => {
    const sim = thermostat({ minSetpointC: 16, maxSetpointC: 24 });
    write(sim, "3/1/1", 30);
    expect(value(sim, "sp")).toBe(24);
    write(sim, "3/1/1", 10);
    expect(value(sim, "sp")).toBe(16);
  });

  it("setpointShift: shifts the comfort setpoint, within the limits", () => {
    const sim = thermostat({ minSetpointC: 18 }, [
      ["shift", "setpointShift", "3/1/2", "9.002", true],
    ]);
    write(sim, "3/1/2", 2);
    expect(value(sim, "sp")).toBe(23);
    write(sim, "3/1/2", -10);
    expect(value(sim, "sp")).toBe(18);
  });
});

describe("room thermostat: control", () => {
  it("proportionalBandK: the value is 100 % / band per kelvin of deviation", () => {
    const run = (band: number) => {
      const sim = thermostat({ proportionalBandK: band, integralTimeMs: 0 });
      sim.advance(2000);
      return Number(value(sim, "val"));
    };
    // About 3 K below the setpoint (18 °C for 21 °C).
    expect(run(6)).toBeGreaterThan(40);
    expect(run(6)).toBeLessThan(55);
    expect(run(2)).toBe(100);
  });

  it("pwmCycleMs: the one-bit output is on for the value's share of each cycle", () => {
    const sim = thermostat(
      { proportionalBandK: 6, integralTimeMs: 0, pwmCycleMs: 10000 },
      [["pwm", "heatingSwitch", "3/0/9", "1.001", false]],
    );
    let on = 0;
    for (let i = 0; i < 200; i++) {
      sim.advance(100);
      if (value(sim, "pwm") === 1) on++;
    }
    expect(on / 200).toBeGreaterThan(0.35);
    expect(on / 200).toBeLessThan(0.6);
  });

  it("temperatureSendDeltaK, temperatureCyclicMs: sent on change or cyclically", () => {
    const sim = thermostat({
      temperatureSendDeltaK: 5,
      temperatureCyclicMs: 10000,
    });
    const before = sim.history.filter((t) => t.ga === "3/4/1").length;
    sim.advance(31000);
    const sent = sim.history.filter((t) => t.ga === "3/4/1").length - before;
    expect(sent).toBeGreaterThanOrEqual(3);
    expect(sent).toBeLessThanOrEqual(4);
  });

  it("in cooling, the cooling outputs carry the demand and the heating ones 0", () => {
    const sim = thermostat(
      { deadZoneK: 2 },
      [
        ["hc", "heatCool", "3/5/0", "1.100", true],
        ["cv", "coolingValue", "3/0/3", "5.001", false],
      ],
      (doc) => {
        (doc.rooms as { id: string; temperatureC: number }[]).find(
          (r) => r.id === "livingRoom",
        )!.temperatureC = 28;
      },
    );
    write(sim, "3/5/0", 0);
    sim.advance(3000);
    expect(Number(value(sim, "cv"))).toBeGreaterThan(0);
    expect(value(sim, "val")).toBe(0);
  });
});
