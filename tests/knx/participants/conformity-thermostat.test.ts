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

describe("room thermostat: sensor fault", () => {
  const external = () =>
    thermostat(
      { externalTempTimeoutMs: 10000, sensorFaultValuePct: 40 },
      [
        ["ext", "externalTemp", "3/4/9", "9.001", true],
        ["fault", "sensorFault", "3/4/10", "1.005", false],
      ],
      (doc) => {
        // Without a room, the external temperature is the only source.
        delete device(doc, T).room;
      },
    );

  it("an external temperature that stops arriving raises the fault and its control value", () => {
    const sim = external();
    write(sim, "3/4/9", 18);
    expect(value(sim, "fault")).toBe(0);
    expect(Number(value(sim, "val"))).toBeGreaterThan(40);
    sim.advance(12000);
    expect(value(sim, "fault")).toBe(1);
    expect(Math.round(Number(value(sim, "val")))).toBe(40);
    write(sim, "3/4/9", 19);
    expect(value(sim, "fault")).toBe(0);
  });

  it("waiting for the first external temperature is not a fault", () => {
    const sim = external();
    sim.advance(5000);
    expect(value(sim, "fault")).toBe(0);
  });
});

describe("room thermostat: presence button", () => {
  it("each 1 extends the comfort mode for comfortExtensionMs", () => {
    const sim = thermostat({
      presenceType: "button",
      comfortExtensionMs: 60000,
    });
    write(sim, "3/2/0", 3); // economy
    expect(value(sim, "ms")).toBe(3);
    write(sim, "3/2/1", 1);
    expect(value(sim, "ms")).toBe(1);
    write(sim, "3/2/1", 0); // a 0 changes nothing for a button
    expect(value(sim, "ms")).toBe(1);
    sim.advance(60000);
    expect(value(sim, "ms")).toBe(3);
  });
});

describe("room thermostat: mode objects", () => {
  // Default setpoints of the example: comfort 21, standby 19, economy 17, protection 7.
  const bits = (edit: (doc: Doc) => void = () => {}) =>
    thermostat(
      {},
      [
        ["mc", "comfortMode", "3/6/1", "1.001", true],
        ["mn", "nightMode", "3/6/2", "1.001", true],
        ["mp", "protectionMode", "3/6/3", "1.001", true],
        ["fm", "forcedMode", "3/6/4", "20.102", true],
      ],
      edit,
    );

  it("1-bit objects: protection over comfort over night; standby when all are 0", () => {
    const sim = bits();
    write(sim, "3/6/1", 1);
    expect(value(sim, "ms")).toBe(1);
    write(sim, "3/6/2", 1); // comfort and night: comfort
    expect(value(sim, "ms")).toBe(1);
    write(sim, "3/6/1", 0); // night alone
    expect(value(sim, "ms")).toBe(3);
    expect(value(sim, "sp")).toBe(17);
    write(sim, "3/6/2", 0); // all 0: standby
    expect(value(sim, "ms")).toBe(2);
    expect(value(sim, "sp")).toBe(19);
    write(sim, "3/6/1", 1);
    write(sim, "3/6/3", 1); // protection and comfort: protection
    expect(value(sim, "ms")).toBe(4);
    expect(value(sim, "sp")).toBe(7);
  });

  it("the objects received last decide: the 1-byte preselection or the 1-bit objects", () => {
    const sim = bits();
    write(sim, "3/6/2", 1); // night by 1 bit
    expect(value(sim, "ms")).toBe(3);
    write(sim, "3/2/0", 2); // standby by 1 byte
    expect(value(sim, "ms")).toBe(2);
    write(sim, "3/6/1", 1); // comfort by 1 bit; night still 1
    expect(value(sim, "ms")).toBe(1);
  });

  it("at start, a 1-bit object at 1 selects the mode; otherwise the 1-byte preselection", () => {
    const start = (values: Record<string, number>) =>
      bits((doc) => {
        for (const o of device(doc, T).objects as Record<string, unknown>[])
          if (typeof o.id === "string" && o.id in values)
            o.value = values[o.id];
      });
    let sim = start({ mn: 1 });
    expect(value(sim, "ms")).toBe(3);
    expect(value(sim, "sp")).toBe(17);
    sim = start({ mp: 1, mc: 1 }); // protection over comfort
    expect(value(sim, "ms")).toBe(4);
    sim = start({ mn: 0 }); // all 0 at start: the preselection, comfort
    expect(value(sim, "ms")).toBe(1);
    sim = start({ mn: 1 });
    write(sim, "3/6/2", 0); // released: standby on the 1-bit objects
    expect(value(sim, "ms")).toBe(2);
    sim.reset();
    expect(value(sim, "ms")).toBe(3); // the start values again
    sim = start({ mn: 1, ms0: 0 });
    write(sim, "3/2/0", 1); // a 1-byte telegram then decides
    expect(value(sim, "ms")).toBe(1);
  });

  it("forced mode: over everything, the window included; 0 (auto) ends it", () => {
    const sim = bits();
    write(sim, "3/6/4", 3); // economy forced
    expect(value(sim, "ms")).toBe(3);
    write(sim, "3/2/1", 1); // presence would give comfort
    expect(value(sim, "ms")).toBe(3);
    sim.roomAction("livingRoom", "window", 1); // the window contact sends 1
    sim.advance(3000);
    expect(value(sim, "ms")).toBe(3);
    write(sim, "3/6/4", 0); // auto: the window applies again
    expect(value(sim, "ms")).toBe(4);
    sim.roomAction("livingRoom", "window", 0);
    sim.advance(3000);
    expect(value(sim, "ms")).toBe(1); // presence
  });
});

describe("room thermostat: two thermostats with one base setpoint", () => {
  it("the base setpoint object, shared on one address, carries the base, not the current setpoint", () => {
    const sim = thermostat({}, [], (doc) => {
      // The living-room base object also transmits (W and T, as on room controllers);
      // the bedroom thermostat listens to the same address.
      device(doc, T).objects.find((o) => o.id === "base")!.flags = {
        W: true,
        T: true,
      };
      device(doc, "bedroomThermostat").objects.push({
        id: "base",
        name: "Base setpoint",
        ga: "3/1/1",
        dpt: "9.001",
        port: "baseSetpoint",
        flags: { W: true, T: false },
      });
    });
    // Central economy mode for both rooms, then a new base entered in the living room.
    write(sim, "3/2/0", 3);
    sim.input(T, "setpoint", "value", 22);
    sim.advance(3000);
    // Each thermostat applies its own economy setback to the shared base.
    expect(value(sim, "sp")).toBe(18);
    expect(sim.deviceState("bedroomThermostat")).toMatchObject({
      baseC: 22,
      setpointC: 18,
    });
  });
});
