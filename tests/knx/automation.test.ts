// Weather station thresholds, shutter wind alarm, logic module, and dimming actuator.
import { describe, expect, it } from "vitest";
import { evaluate } from "../../src/participants/logic-gate/behavior";
import { ventilationStep } from "../../src/participants/air-quality-sensor/behavior";
import { createSimulator } from "../../src/core";
import { checkValue, decode, encode } from "../../src/knx/dpt";
import {
  currentEntry,
  nextSwitch,
  parseProgram,
} from "../../src/participants/time-switch/behavior";
import { buildFrame } from "../../src/knx/format";
import { load, obj, raw } from "./helpers";

const settle = 6000;

describe("logicGate/v1", () => {
  it("evaluates AND, OR, XOR, and NOT", () => {
    expect(evaluate("and", [1, 1])).toBe(1);
    expect(evaluate("and", [1, 0])).toBe(0);
    expect(evaluate("and", [])).toBe(0);
    expect(evaluate("or", [0, 1])).toBe(1);
    expect(evaluate("xor", [1, 1, 1])).toBe(1);
    expect(evaluate("xor", [1, 1])).toBe(0);
    expect(evaluate("not", [0])).toBe(1);
  });

  it("forwards sun protection to the shutter only in automatic mode", () => {
    const sim = load("weather-protection.json");
    sim.input("weatherStation", "brightness", "value", 50000);
    sim.advance(settle);
    expect(obj(sim, "weatherStation", "sun")).toBe(1);
    // Automatic mode is off: the logic result stays 0 and the shutter stays up.
    expect(obj(sim, "logicModule", "out")).not.toBe(1);
    sim.input("pushButton", "key3", "press");
    sim.advance(settle);
    expect(obj(sim, "logicModule", "out")).toBe(1);
    expect(sim.channelState("shutterActuator", "s1").direction).toBe("down");
  });
});

describe("weatherStation/v1 and shutter wind alarm", () => {
  it("sets the alarm at the threshold and resets it below threshold − hysteresis", () => {
    const sim = load("weather-protection.json");
    sim.input("weatherStation", "wind", "value", 12);
    sim.advance(settle);
    expect(obj(sim, "weatherStation", "windAlarm")).toBe(1);
    sim.input("weatherStation", "wind", "value", 9);
    sim.advance(settle);
    expect(obj(sim, "weatherStation", "windAlarm")).toBe(1);
    sim.input("weatherStation", "wind", "value", 7);
    sim.advance(settle);
    expect(obj(sim, "weatherStation", "windAlarm")).toBe(0);
  });

  it("raises and locks the shutter during the alarm, then releases it in place", () => {
    const sim = load("weather-protection.json");
    sim.input("pushButton", "key2", "long");
    sim.advance(settle);
    expect(sim.channelState("shutterActuator", "s1").direction).toBe("down");
    sim.input("weatherStation", "wind", "value", 15);
    sim.advance(settle);
    const locked = sim.channelState("shutterActuator", "s1");
    expect(locked.windLock).toBe(true);
    expect(locked.direction).toBe("up");
    sim.advance(20000);
    // Commands are ignored while the alarm is active.
    sim.input("pushButton", "key2", "long");
    sim.advance(settle);
    expect(sim.channelState("shutterActuator", "s1").estimatedPositionPct).toBe(
      0,
    );
    sim.input("weatherStation", "wind", "value", 2);
    sim.advance(settle);
    const released = sim.channelState("shutterActuator", "s1");
    expect(released.windLock).toBe(false);
    expect(released.phase).toBe("idle");
    sim.input("pushButton", "key2", "long");
    sim.advance(settle);
    expect(sim.channelState("shutterActuator", "s1").direction).toBe("down");
  });

  it("encodes lux and wind speed as two-byte floats", () => {
    const sim = load("weather-protection.json");
    const [wind] = sim.input("weatherStation", "wind", "value", 12.5);
    expect(wind!.dpt).toBe("9.005");
    expect(wind!.value).toBeCloseTo(12.5, 1);
    const [lux] = sim.input("weatherStation", "brightness", "value", 45000);
    expect(lux!.dpt).toBe("9.004");
    expect(lux!.value).toBeCloseTo(45000, -2);
  });
});

describe("dimmerActuator/v1 example", () => {
  it("switches, sets an absolute level, and reports it", () => {
    const sim = load("dimming.json");
    sim.input("panel", "level", "value", 60);
    sim.advance(settle + 4000);
    expect(obj(sim, "dimmerActuator", "status")).toBe(1);
    expect(obj(sim, "panel", "levelStatus")).toBeCloseTo(60, 0);
  });
});

describe("airQualitySensor/v1", () => {
  it("steps up and down with a hysteresis band", () => {
    const t = [800, 1000, 1200];
    expect(ventilationStep(840, 0, t, 50)).toBe(0);
    expect(ventilationStep(850, 0, t, 50)).toBe(1);
    expect(ventilationStep(1300, 0, t, 50)).toBe(3);
    expect(ventilationStep(1160, 3, t, 50)).toBe(3);
    expect(ventilationStep(1140, 3, t, 50)).toBe(2);
    expect(ventilationStep(500, 3, t, 50)).toBe(0);
  });

  it("sends the ventilation value to the fan and sets the CO₂ alarm", () => {
    const sim = load("air-quality.json");
    const [tel] = sim.input("airSensor", "co2", "value", 1100);
    expect(tel!.dpt).toBe("9.008");
    sim.advance(settle);
    expect(obj(sim, "airSensor", "vent")).toBeCloseTo(66, 0);
    sim.advance(3000);
    expect(
      Number(sim.equipmentState("fanActuator", "f1")!.levelPct),
    ).toBeCloseTo(66, 0);
    expect(obj(sim, "indicator", "alarm")).not.toBe(1);
    sim.input("airSensor", "co2", "value", 1600);
    sim.advance(settle);
    expect(obj(sim, "indicator", "alarm")).toBe(1);
    const [hum] = sim.input("airSensor", "hum", "value", 55.5);
    expect(hum!.dpt).toBe("9.007");
    expect(hum!.value).toBeCloseTo(55.5, 1);
  });

  it("keeps a step for its minimum time", () => {
    const doc = raw("air-quality.json") as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    doc.devices[0].parameters.minStepTimeMs = 10000;
    const sim = createSimulator(doc);
    sim.input("airSensor", "co2", "value", 900);
    sim.advance(1000);
    sim.input("airSensor", "co2", "value", 1300);
    sim.advance(1000);
    expect(sim.deviceState("airSensor").step).toBe(1);
    sim.advance(10000);
    expect(sim.deviceState("airSensor").step).toBe(3);
  });
});

describe("tunable white (DPT 7.600)", () => {
  it("applies, limits, and reports the colour temperature", () => {
    const sim = load("tunable-white.json");
    sim.advance(1000);
    expect(sim.equipmentState("dimmer", "d1")!.colourTemperatureK).toBe(4000);
    const [tel] = sim.input("pushButton", "warm", "press");
    expect(tel!.dpt).toBe("7.600");
    expect(tel!.raw).toBe(2700);
    sim.advance(settle);
    expect(sim.equipmentState("dimmer", "d1")!.colourTemperatureK).toBe(2700);
    expect(obj(sim, "dimmer", "colourStatus")).toBe(2700);
    sim.input("panel", "colour", "value", 7000);
    sim.advance(settle);
    expect(sim.equipmentState("dimmer", "d1")!.colourTemperatureK).toBe(6500);
    expect(obj(sim, "dimmer", "colourStatus")).toBe(6500);
    // The level is unchanged by a colour change.
    expect(Number(sim.equipmentState("dimmer", "d1")!.levelPct)).toBeCloseTo(
      80,
      0,
    );
  });
});

describe("32-bit and unsigned 16-bit codecs", () => {
  it("round-trips 7.600, 13.010, and 14.056", () => {
    expect(decode("7.600", encode("7.600", 6500))).toBe(6500);
    expect(decode("13.010", encode("13.010", -1234567))).toBe(-1234567);
    expect(encode("13.010", -1) >>> 0).toBe(0xffffffff);
    expect(decode("14.056", encode("14.056", 1250.5))).toBeCloseTo(1250.5, 3);
    expect(encode("14.056", 1)).toBe(0x3f800000);
  });
  it("builds a 4-byte payload in the TP1 frame", () => {
    const f = buildFrame("1.1.1", "5/1/1", 1, "14.056");
    const data = f.find((x) => x.bytes.length === 6)!.bytes;
    expect(data).toEqual([0x00, 0x80, 0x3f, 0x80, 0x00, 0x00]);
    expect(f[3]!.bytes[0]! & 0x0f).toBe(5);
  });
});

describe("energy metering and load shedding", () => {
  it("reports power per output and in total, and counts energy", () => {
    const sim = load("energy-metering.json");
    sim.input("pushButton", "key1", "press");
    sim.advance(settle);
    expect(obj(sim, "energyActuator", "p1")).toBeCloseTo(2500, 0);
    expect(obj(sim, "energyActuator", "total")).toBeCloseTo(2500, 0);
    sim.advance(60000);
    // About 66 simulated seconds × 60 ≈ 1.1 hours at 2500 W, sent at the last cyclic update.
    expect(Number(obj(sim, "energyActuator", "e1"))).toBeGreaterThan(2300);
    expect(Number(obj(sim, "energyActuator", "e1"))).toBeLessThan(2800);
    const frame = sim.history.find(
      (t) => t.dpt === "14.056" && t.value === 2500,
    )!;
    expect(frame.raw >>> 0).toBe(0x451c4000);
  });

  it("sheds the marked output above the limit and tries again later", () => {
    const sim = load("energy-metering.json");
    sim.input("pushButton", "key2", "press");
    sim.advance(settle);
    expect(sim.channelState("energyActuator", "c2").on).toBe(true);
    sim.input("pushButton", "key1", "press");
    sim.advance(settle);
    expect(obj(sim, "energyDisplay", "limit")).toBe(0);
    expect(sim.channelState("energyActuator", "c2").shed).toBe(true);
    expect(sim.channelState("energyActuator", "c2").on).toBe(false);
    expect(sim.channelState("energyActuator", "c1").on).toBe(true);
    // The oven is switched off: after the shedding time the heater returns.
    sim.input("pushButton", "key1", "press");
    sim.advance(25000);
    expect(sim.channelState("energyActuator", "c2").shed).toBe(false);
    expect(sim.channelState("energyActuator", "c2").on).toBe(true);
  });
});

describe("venetian blind slats", () => {
  const blind = (sim: ReturnType<typeof load>) =>
    sim.equipmentState("blindActuator", "b1")!;
  it("turns the slats before moving, in both directions", () => {
    const sim = load("venetian-blind.json");
    sim.input("pushButton", "key2", "long");
    // Command delivered, start delay, then about one second of slat rotation.
    sim.advance(2600);
    expect(Number(blind(sim).slatPct)).toBeGreaterThan(0);
    expect(Number(blind(sim).slatPct)).toBeLessThan(100);
    expect(Number(blind(sim).positionPct)).toBe(0);
    sim.advance(3000);
    expect(Number(blind(sim).slatPct)).toBe(100);
    expect(Number(blind(sim).positionPct)).toBeGreaterThan(0);
    sim.input("pushButton", "key1", "short"); // stop
    sim.advance(3000);
    const pos = Number(blind(sim).positionPct);
    sim.input("pushButton", "key1", "long"); // up: slats open first
    sim.advance(2600);
    expect(Number(blind(sim).slatPct)).toBeLessThan(100);
    expect(Number(blind(sim).positionPct)).toBeCloseTo(pos, 5);
  });

  it("the slat angle is known from the start, before any movement", () => {
    const sim = load("venetian-blind.json");
    expect(obj(sim, "blindActuator", "slatStatus")).toBe(
      Number(blind(sim).slatPct),
    );
  });

  it("a short press at rest turns the slats by one step and reports the angle", () => {
    const sim = load("venetian-blind.json");
    sim.input("pushButton", "key2", "short");
    sim.advance(settle);
    expect(Number(blind(sim).slatPct)).toBeCloseTo(20, 0);
    expect(Number(blind(sim).positionPct)).toBe(0);
    expect(obj(sim, "blindActuator", "slatStatus")).toBeCloseTo(20, 0);
  });

  it("follows a slat angle setpoint without moving the blind", () => {
    const sim = load("venetian-blind.json");
    sim.input("panel", "pos", "value", 50);
    sim.advance(20000);
    const pos = Number(blind(sim).positionPct);
    expect(pos).toBeCloseTo(50, 0);
    expect(Number(blind(sim).slatPct)).toBe(100);
    sim.input("panel", "slat", "value", 30);
    sim.advance(settle);
    expect(Number(blind(sim).slatPct)).toBeCloseTo(30, 0);
    expect(Number(blind(sim).positionPct)).toBeCloseTo(pos, 5);
    expect(
      Number(sim.channelState("blindActuator", "b1").estimatedSlatPct),
    ).toBeCloseTo(30, 0);
  });
});

describe("simulated clock and time devices", () => {
  it("encodes DPT 10.001 and 11.001", () => {
    const monday = 1 * 86400 + 22 * 3600 + 30 * 60 + 5;
    expect(encode("10.001", monday)).toBe(
      (1 << 21) | (22 << 16) | (30 << 8) | 5,
    );
    expect(decode("10.001", encode("10.001", monday))).toBe(monday);
    expect(encode("11.001", 20260928)).toBe((28 << 16) | (9 << 8) | 26);
    expect(decode("11.001", encode("11.001", 19991231))).toBe(19991231);
    expect(checkValue("11.001", 20260231)).not.toBeNull();
  });

  it("runs the clock with simulated time and its speed", () => {
    const sim = load("time-schedule.json");
    const start = sim.clock()!.nowMs;
    sim.advance(1000);
    expect(sim.clock()!.nowMs - start).toBe(60_000);
    expect(sim.getState().clock!.speed).toBe(60);
  });

  it("broadcasts time and date every clock minute", () => {
    const sim = load("time-schedule.json");
    // Sent at 1 s (21:58 on the clock); the display is the last device of the line.
    sim.advance(4000);
    expect(obj(sim, "display", "date")).toBe(20260928);
    expect(obj(sim, "display", "time")).toBe(1 * 86400 + 21 * 3600 + 58 * 60);
  });

  it("the time switch sends its programmed value at 22:00", () => {
    const sim = load("time-schedule.json");
    sim.advance(2000);
    expect(sim.channelState("switchActuator", "s1").on).toBe(true);
    sim.advance(3000); // after 22:00
    expect(sim.channelState("switchActuator", "s1").on).toBe(false);
    expect(sim.deviceState("timeSwitch").nextAtMs).toBeGreaterThan(
      sim.clock()!.nowMs,
    );
  });

  it("the time window lets presence switch the light only at night", () => {
    const sim = load("time-schedule.json");
    sim.advance(1500);
    sim.input("presence", "motion", "press");
    sim.advance(1000);
    expect(sim.channelState("switchActuator", "s2").on).toBe(false);
    sim.advance(10000); // 22:08, presence has ended
    sim.input("presence", "motion", "press");
    sim.advance(3000);
    expect(sim.channelState("switchActuator", "s2").on).toBe(true);
  });

  it("setting the clock reschedules devices and applies the current program", () => {
    const sim = load("time-schedule.json");
    sim.advance(5000);
    expect(sim.channelState("switchActuator", "s1").on).toBe(false);
    sim.setClock(Date.UTC(2026, 9, 1, 7, 30)); // Thursday 07:30
    sim.advance(3000);
    expect(sim.channelState("switchActuator", "s1").on).toBe(true);
    expect(obj(sim, "display", "date")).toBe(20261001);
  });

  it("parses weekly programs and finds the next switching point", () => {
    const { entries, errors } = parseProgram(
      "Mon-Fri 07:00 = 1; Sat,Sun 09:30 = 1; Daily 22:00 = 0; Moon 25:00 = 1",
    );
    expect(entries).toHaveLength(3);
    expect(errors).toEqual(["Moon 25:00 = 1"]);
    // Friday 23:00 → next is Saturday 09:30.
    const fri = Date.UTC(2026, 9, 2, 23, 0);
    const next = nextSwitch(entries, fri)!;
    expect(new Date(next.atMs).toISOString()).toBe("2026-10-03T09:30:00.000Z");
    expect(currentEntry(entries, fri)!.value).toBe(0);
  });

  it("rejects an invalid clock start", () => {
    const doc = raw("time-schedule.json") as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    doc.clock.start = "2026-02-30T08:00";
    expect(() => createSimulator(doc)).toThrow(/local date and time/);
  });
});

describe("ports that accept several units of one quantity", () => {
  type Scenario = {
    groupAddresses?: { address: string; dpt?: string }[];
    devices: { objects: { ga: string | string[]; dpt?: string }[] }[];
  };
  // Change the DPT of a group address and of every object associated with it.
  const retype = (data: Scenario, ga: string, dpt: string) => {
    for (const g of data.groupAddresses ?? [])
      if (g.address === ga) g.dpt = dpt;
    for (const d of data.devices)
      for (const o of d.objects) if ([o.ga].flat().includes(ga)) o.dpt = dpt;
    return data;
  };

  it("wind in km/h (9.028) is compared with thresholds in m/s", () => {
    const data = retype(
      raw("weather-protection.json") as Scenario,
      "2/6/4",
      "9.028",
    );
    const sim = createSimulator(data);
    sim.input("weatherStation", "wind", "value", 32); // 8.9 m/s: below 10 m/s
    sim.advance(settle);
    expect(obj(sim, "weatherStation", "windAlarm")).not.toBe(1);
    sim.input("weatherStation", "wind", "value", 40); // 11.1 m/s
    sim.advance(settle);
    expect(obj(sim, "weatherStation", "windAlarm")).toBe(1);
  });

  it("power in kW (9.024) and energy in kWh (13.013) are converted from W and Wh", () => {
    const data = raw("energy-metering.json") as Scenario;
    retype(data, "5/2/1", "9.024");
    retype(data, "5/4/0", "9.024");
    retype(data, "5/3/1", "13.013");
    const sim = createSimulator(data);
    sim.input("pushButton", "key1", "press");
    sim.advance(settle);
    expect(obj(sim, "energyActuator", "p1")).toBeCloseTo(2.5, 2);
    expect(obj(sim, "energyDisplay", "total")).toBeCloseTo(2.5, 2);
    sim.advance(60000);
    const kwh = Number(obj(sim, "energyActuator", "e1"));
    expect(kwh).toBeGreaterThanOrEqual(2);
    expect(kwh).toBeLessThanOrEqual(3);
    expect(Number.isInteger(kwh)).toBe(true);
  });

  it("relative humidity can be sent as one byte (5.001)", () => {
    const data = retype(raw("air-quality.json") as Scenario, "4/1/2", "5.001");
    const sim = createSimulator(data);
    sim.input("airSensor", "hum", "value", 75);
    sim.advance(settle);
    const tel = sim.history.find((t) => t.ga === "4/1/2")!;
    expect(tel.dpt).toBe("5.001");
    expect(tel.raw).toBe(encode("5.001", 75));
    expect(obj(sim, "airSensor", "humAlarm")).toBe(1);
  });
});

describe("dimming actuator: switching by brightness value", () => {
  type Scenario = {
    devices: {
      id: string;
      channels?: { parameters?: Record<string, unknown> }[];
    }[];
  };
  const dimming = (parameters: Record<string, unknown>) => {
    const data = raw("dimming.json") as Scenario;
    const ch = data.devices.find((d) => d.id === "dimmerActuator")!
      .channels![0]!;
    ch.parameters = { ...ch.parameters, ...parameters };
    return createSimulator(data);
  };
  const level = (sim: ReturnType<typeof createSimulator>) =>
    Number(sim.channelState("dimmerActuator", "d1").levelPct);

  it("by default a value switches on and 0 switches off", () => {
    const sim = dimming({});
    sim.input("panel", "level", "value", 60);
    sim.advance(settle);
    expect(level(sim)).toBeCloseTo(60.4, 0);
    sim.input("panel", "level", "value", 0);
    sim.advance(settle);
    expect(level(sim)).toBe(0);
  });

  it("valueSwitchesOn: false ignores a value while the channel is off", () => {
    const sim = dimming({ valueSwitchesOn: false });
    sim.input("panel", "level", "value", 60);
    sim.advance(settle);
    expect(level(sim)).toBe(0);
    sim.input("pushButton", "key1", "short"); // switch on
    sim.advance(settle);
    sim.input("panel", "level", "value", 60);
    sim.advance(settle);
    expect(level(sim)).toBeCloseTo(60.4, 0);
  });

  it("valueSwitchesOff: false dims to the minimum level instead of switching off", () => {
    const sim = dimming({ valueSwitchesOff: false, minLevelPct: 20 });
    sim.input("panel", "level", "value", 60);
    sim.advance(settle);
    sim.input("panel", "level", "value", 0);
    sim.advance(settle);
    expect(level(sim)).toBe(20);
  });
});

describe("energyMeter/v1", () => {
  it("shows its initial index, then integrates the measured power", () => {
    const sim = load("boiler-room.json");
    expect(obj(sim, "meter", "hpPower")).toBeCloseTo(1.8, 2);
    expect(obj(sim, "meter", "hpEnergy")).toBe(4210);
    // 1800 W for 60 s counted 60 times faster: 1800 W × 1 h = 1800 Wh.
    sim.advance(60000);
    const wh = Number(sim.channelState("meter", "hp").energyWh);
    expect(wh - 4210000).toBeCloseTo(1800, -1);
  });

  it("takes an entered power in the unit of its object", () => {
    const sim = load("boiler-room.json");
    sim.input("meter", "hp", "value", 3.5); // kW
    sim.input("meter", "wh", "value", 2000); // W
    sim.advance(settle);
    expect(sim.channelState("meter", "hp").powerW).toBe(3500);
    expect(sim.channelState("meter", "wh").powerW).toBe(2000);
    expect(obj(sim, "display", "hpPower")).toBeCloseTo(3.5, 1);
    expect(obj(sim, "display", "whPower")).toBe(2000);
  });
});

describe("systemGateway/v1", () => {
  it("sends entered values on KNX and reports forwarded commands", () => {
    const sim = load("boiler-room.json");
    sim.input("gateway", "tank", "value", 55);
    sim.input("keys", "economy", "press");
    sim.advance(settle);
    expect(obj(sim, "display", "tank")).toBe(55);
    expect(obj(sim, "gateway", "mode")).toBe(3);
    expect(
      sim.journal.some(
        (e) => e.kind === "note" && /→ Modbus: Economy/.test(e.message ?? ""),
      ),
    ).toBe(true);
    expect(sim.deviceState("gateway").system).toBe("Modbus");
  });
});
