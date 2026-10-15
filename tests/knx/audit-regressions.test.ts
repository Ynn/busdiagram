// Regressions of the October 2026 audit: received values outside their DPT's domain,
// clock edge cases, scene presets, and three participant interactions (pending slat
// order, timer warning under lock, thermostat sensor fault).
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import { decodeOrInvalid } from "../../src/knx/dpt";
import {
  ScenarioError,
  buildScenario,
  parseClockStart,
} from "../../src/knx/scenario";
import { raw, v2 } from "./helpers";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Doc = { devices: Json[]; groupAddresses: unknown[] };

const passive = (
  id: string,
  address: string,
  dpt: string,
  port: string,
  flags: { W: boolean; T: boolean; R?: boolean },
) => ({
  id,
  name: id,
  address,
  kind: "panel",
  behavior: "passive/v1",
  objects: [{ id: "o", ga: "1/1/1", dpt, port, flags }],
});

/** A sender and a receiver of another DPT of the same size, on one address. */
function crossed(sourceDpt: string, receiverDpt: string) {
  return createSimulator(
    v2(
      [
        passive("s", "1.1.1", sourceDpt, "input", { W: false, T: true }),
        passive("r", "1.1.2", receiverDpt, "display", {
          W: true,
          T: false,
          R: true,
        }),
      ],
      { lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }] },
    ),
  );
}

const addUsb = (doc: Doc) =>
  doc.devices.push({
    id: "usb",
    address: "1.1.250",
    kind: "interface",
    behavior: "usbInterface/v1",
    objects: [],
  });
const dev = (doc: Doc, id: string) =>
  doc.devices.find((d) => d.id === id) as Json;

describe("received values outside the receiver's domain (ENG-01, ENG-02)", () => {
  it.each([
    // Hour 31 (a DPT 11.001 date read as a time) and day/month 0.
    ["11.001", "10.001", 20261031, /hour 31/],
    ["10.001", "11.001", 0, /day 0/],
    // NaN and +Infinity in an IEEE 754 float, HVAC mode 255.
    ["13.010", "14.056", 0x7fc00000, /NaN/],
    ["13.010", "14.056", 0x7f800000, /Infinity/],
    ["5.010", "20.102", 255, /outside the range 0…4/],
  ])("%s → %s: value unchanged, reason logged", (src, rcv, value, reason) => {
    const sim = crossed(src, rcv);
    sim.groupWrite("s", "1/1/1", value);
    sim.advance(3000);
    expect(sim.fault).toBeNull();
    expect(sim.objectValue("r", "o")).toBeNull();
    const ignored = sim.journal.find(
      (e) => e.deviceId === "r" && e.kind === "object-write-ignored",
    );
    expect(ignored?.message).toMatch(reason);
    expect(
      sim.journal.some(
        (e) => e.deviceId === "r" && e.kind === "object-write-accepted",
      ),
    ).toBe(false);
  });

  it("keeps the previous value", () => {
    const sim = crossed("5.010", "20.102");
    sim.groupWrite("s", "1/1/1", 3);
    sim.advance(3000);
    expect(sim.objectValue("r", "o")).toBe(3);
    sim.groupWrite("s", "1/1/1", 200);
    sim.advance(3000);
    expect(sim.objectValue("r", "o")).toBe(3);
  });

  it("still accepts valid values of the same size", () => {
    const sim = crossed("11.001", "11.001");
    sim.groupWrite("s", "1/1/1", 20261014);
    sim.advance(3000);
    expect(sim.objectValue("r", "o")).toBe(20261014);
  });

  it("checks each field before the conversion", () => {
    // 23:59:59 on Sunday is the last valid time.
    expect(
      decodeOrInvalid("10.001", (7 << 21) | (23 << 16) | (59 << 8) | 59),
    ).toEqual({ invalid: false, value: 7 * 86400 + 86399 });
    expect(decodeOrInvalid("10.001", (12 << 16) | (63 << 8)).invalid).toBe(
      true,
    );
    expect(decodeOrInvalid("10.001", (12 << 16) | 60).invalid).toBe(true);
    // Reserved bits are ignored, not taken for out-of-range fields.
    expect(decodeOrInvalid("10.001", (12 << 16) | (0xc0 << 8) | 0xc0)).toEqual({
      invalid: false,
      value: 12 * 3600,
    });
    expect(decodeOrInvalid("11.001", (29 << 16) | (2 << 8) | 25).invalid).toBe(
      true,
    );
    expect(decodeOrInvalid("11.001", (29 << 16) | (2 << 8) | 24)).toEqual({
      invalid: false,
      value: 20240229,
    });
    expect(decodeOrInvalid("11.001", (1 << 16) | (13 << 8) | 26).invalid).toBe(
      true,
    );
    expect(decodeOrInvalid("11.001", (1 << 16) | (1 << 8) | 100).invalid).toBe(
      true,
    );
    // 0x7FFF in DPT 9.xxx stays invalid.
    expect(decodeOrInvalid("9.001", 0x7fff).invalid).toBe(true);
  });
});

describe("clock (ENG-03, ENG-04)", () => {
  it("setClock rejects a value that is not a date without changing the clock", () => {
    const sim = createSimulator(raw("time-schedule.json"));
    const before = sim.clock();
    expect(sim.setClock(1e20)).toEqual([]);
    expect(sim.clock()).toEqual(before);
    expect(sim.fault).toBeNull();
  });

  it("keeps years 0000–0099 as written", () => {
    expect(
      new Date(parseClockStart("0001-01-01T00:00")!).getUTCFullYear(),
    ).toBe(1);
    expect(new Date(parseClockStart("0099-12-31T23:59")!).toISOString()).toBe(
      "0099-12-31T23:59:00.000Z",
    );
    expect(parseClockStart("2026-02-31T00:00")).toBeNull();
    expect(parseClockStart("2026-10-14T12:00")).toBe(Date.UTC(2026, 9, 14, 12));
  });
});

describe("scene presets of a dimming channel (ENG-05)", () => {
  const withPreset = (file: string, id: string, v: number) => {
    const doc = raw(file) as unknown as Doc;
    const d = dev(doc, id);
    d.channels[0].scenes = { "1": v };
    return doc;
  };

  it.each([
    ["dimming.json", "dimmerActuator"],
    ["dali-gateway.json", "gw"],
  ])("%s rejects a preset outside 0–100 %%", (file, id) => {
    expect(() => buildScenario(withPreset(file, id, 999))).toThrow(
      ScenarioError,
    );
    expect(() => buildScenario(withPreset(file, id, -1))).toThrow(
      ScenarioError,
    );
    expect(() => buildScenario(withPreset(file, id, 100))).not.toThrow();
  });
});

describe("shutter: a pending slat order is cancelled entirely (PA-01)", () => {
  function run(stopFirst: boolean | null) {
    const doc = raw("venetian-blind.json") as unknown as Doc;
    dev(doc, "blindActuator").channels[0].parameters.startDelayMs = 1000;
    addUsb(doc);
    const sim = createSimulator(doc);
    sim.advance(3000);
    if (stopFirst !== null) {
      sim.groupWrite("usb", "2/1/4", 100);
      sim.advance(300);
      if (stopFirst) {
        sim.groupWrite("usb", "2/1/2", 0);
        sim.advance(300);
      }
    }
    sim.groupWrite("usb", "2/1/3", 75);
    sim.advance(30000);
    return {
      estimated: Number(
        sim.channelState("blindActuator", "b1").estimatedPositionPct,
      ),
      actual: Number(sim.equipmentState("blindActuator", "b1")?.positionPct),
    };
  }

  it.each([
    ["position only", null],
    ["slats pending → position", false],
    ["slats pending → stop → position", true],
  ] as const)(
    "%s: the blind reaches the position it reports",
    (_, stopFirst) => {
      const r = run(stopFirst);
      expect(r.estimated).toBeCloseTo(75, 0);
      expect(Math.abs(r.actual - r.estimated)).toBeLessThan(1);
    },
  );
});

describe("switching actuator: the timer warning respects the lock (PA-02)", () => {
  it("does not open a relay locked on", () => {
    const doc = raw("priority-control.json") as unknown as Doc;
    const a = dev(doc, "switchActuator");
    a.channels.find((c: Json) => c.id === "s4").parameters = {
      timerMs: 10000,
      timerWarningMs: 3000,
      lockStart: "on",
    };
    doc.groupAddresses.push({ address: "1/6/4", name: "Lock", dpt: "1.001" });
    a.objects.push({
      id: "lock",
      port: "lock",
      channel: "s4",
      dpt: "1.001",
      ga: "1/6/4",
      flags: { W: true, T: false },
    });
    addUsb(doc);
    const sim = createSimulator(doc);
    sim.advance(3000);
    sim.groupWrite("usb", "1/1/4", 1);
    sim.advance(3000);
    sim.groupWrite("usb", "1/6/4", 1);
    for (let i = 0; i < 20; i++) {
      sim.advance(500);
      if (sim.channelState("switchActuator", "s4").locked)
        expect(sim.equipmentState("switchActuator", "s4")?.on).toBe(true);
    }
  });

  it("still warns when nothing holds the output", () => {
    const doc = raw("priority-control.json") as unknown as Doc;
    dev(doc, "switchActuator").channels.find(
      (c: Json) => c.id === "s4",
    ).parameters = {
      timerMs: 10000,
      timerWarningMs: 3000,
    };
    addUsb(doc);
    const sim = createSimulator(doc);
    sim.advance(3000);
    sim.groupWrite("usb", "1/1/4", 1);
    let blinked = false;
    for (let i = 0; i < 30; i++) {
      sim.advance(500);
      const st = sim.channelState("switchActuator", "s4");
      if (st.on && !sim.equipmentState("switchActuator", "s4")?.on)
        blinked = true;
    }
    expect(blinked).toBe(true);
  });
});

describe("thermostat: the sensor fault value is maintained (PA-03)", () => {
  it("modulates a one-bit PI output without any measurement", () => {
    const doc = raw("room-heating.json") as unknown as Doc;
    const th = dev(doc, "bedroomThermostat");
    delete th.room;
    th.parameters = {
      controlType: "pi",
      sensorFaultValuePct: 30,
      pwmCycleMs: 10000,
      controlPeriodMs: 1000,
      valueCyclicMs: 2000,
    };
    const sim = createSimulator(doc);
    const seen = new Set<unknown>();
    for (let i = 0; i < 40; i++) {
      sim.advance(500);
      seen.add(sim.objectValue("bedroomThermostat", "sw"));
    }
    expect(sim.deviceState("bedroomThermostat").valuePct).toBe(30);
    // 30 % of a 10 s cycle: on, then off, in each cycle.
    expect(seen.has(1) && seen.has(0)).toBe(true);
  });

  it("sends the fault value again on its cycle", () => {
    const doc = raw("room-heating.json") as unknown as Doc;
    const th = dev(doc, "livingThermostat");
    delete th.room;
    th.parameters = {
      controlType: "pi",
      sensorFaultValuePct: 30,
      valueCyclicMs: 2000,
    };
    const sim = createSimulator(doc);
    sim.advance(18000);
    const sent = sim.journal.filter(
      (e) =>
        e.kind === "telegram-emitted" &&
        e.deviceId === "livingThermostat" &&
        e.objectId === "val",
    );
    expect(sent.length).toBeGreaterThanOrEqual(8);
    // Reported once only.
    expect(
      sim.journal.filter(
        (e) =>
          e.kind === "note" &&
          /sensor fault, control value/.test(e.message ?? ""),
      ).length,
    ).toBe(1);
  });
});
