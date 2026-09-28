import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import { layout } from "../../src/knx/layout";
import type { Simulation } from "../../src/knx/sim";
import { estPos, flags, lampOn, load, obj, raw, realPos, v2 } from "./helpers";

const outputs = (sim: Simulation, dev: string, ch: string) =>
  sim.journal
    .filter(
      (e) =>
        e.kind === "output-changed" && e.deviceId === dev && e.channelId === ch,
    )
    .map(
      (e) =>
        `${e.timeMs}:${(e.data!.command as { direction?: string; on?: boolean }).direction ?? (e.data!.command as { on: boolean }).on}`,
    );

const statusTelegrams = (sim: Simulation, ga: string) =>
  sim.history.filter((t) => t.ga === ga);

describe("T and W flags", () => {
  it("T deactivated: local value changes, no telegram", () => {
    const sim = load("object-flags.json");
    const sent = sim.input("pushButton", "key2", "press");
    expect(sent).toEqual([]);
    expect(obj(sim, "pushButton", "key2")).toBe(1);
    expect(sim.history).toHaveLength(0);
    const ign = sim.journal.find((e) => e.kind === "transmit-ignored")!;
    expect(ign.message).toMatch(/T flag disabled/);
    sim.advance(5000);
    expect(lampOn(sim, "switchActuator", "s3")).toBe(false);
  });

  it("W deactivated: telegram arrives, object and output remain unchanged, cause is logged", () => {
    const sim = load("object-flags.json");
    const [tel] = sim.input("pushButton", "key1", "press");
    sim.advance(5000);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(true);
    expect(lampOn(sim, "switchActuator", "s2")).toBe(false);
    expect(obj(sim, "switchActuator", "c2")).toBe(0);
    const rec = tel!.receptions.find((r) => r.deviceId === "switchActuator")!;
    expect(rec.objects).toEqual([
      { objectId: "c1", result: "accepted" },
      { objectId: "c2", result: "ignored" },
    ]);
    const ignored = sim.journal.find((e) => e.kind === "object-write-ignored")!;
    expect(ignored.objectId).toBe("c2");
    expect(ignored.message).toMatch(/W flag disabled/);
    // The Key 1 indicator follows status feedback on 1/4/1.
    expect(obj(sim, "pushButton", "key1")).toBe(1);
  });
});

describe("internal links and flags", () => {
  const scenario = (statusT: boolean, s2W: boolean) =>
    v2([
      {
        id: "pushButton",
        name: "BP",
        address: "1.1.1",
        kind: "pushButton",
        behavior: "pushButton/v1",
        objects: [
          {
            id: "b",
            name: "B",
            ga: "1/1/1",
            dpt: "1.001",
            port: "input",
            flags: flags(true, true),
          },
        ],
        buttons: [{ id: "b1", press: { object: "b", value: 1 } }],
      },
      {
        id: "switchActuator",
        name: "TOR",
        address: "1.1.2",
        kind: "switchActuator",
        behavior: "switchActuator/v1",
        objects: [
          {
            id: "c1",
            name: "C1",
            ga: "1/1/1",
            dpt: "1.001",
            port: "switch",
            channel: "s1",
            flags: flags(true, false),
          },
          {
            id: "e1",
            name: "E1",
            ga: "1/4/1",
            dpt: "1.001",
            port: "status",
            channel: "s1",
            flags: flags(false, statusT),
          },
          {
            id: "c2",
            name: "C2",
            ga: "1/4/1",
            dpt: "1.001",
            port: "switch",
            channel: "s2",
            flags: flags(s2W, false),
          },
          {
            id: "c3",
            name: "C3",
            ga: "1/4/1",
            dpt: "1.001",
            port: "switch",
            channel: "s3",
            flags: flags(true, false),
          },
        ],
        channels: [
          { id: "s1", equipment: { type: "lamp" } },
          { id: "s2", equipment: { type: "lamp" } },
          { id: "s3", equipment: { type: "lamp" } },
        ],
      },
    ]);

  it("one internal delivery respects each object's W flag", () => {
    const sim = createSimulator(scenario(true, false));
    sim.input("pushButton", "b1", "press");
    sim.advance(5000);
    const st = statusTelegrams(sim, "1/4/1");
    expect(st).toHaveLength(1);
    const internal = st[0]!.receptions.filter((r) => r.internal);
    expect(internal).toHaveLength(1);
    expect(internal[0]!.objects).toEqual([
      { objectId: "c2", result: "ignored" },
      { objectId: "c3", result: "accepted" },
    ]);
    expect(lampOn(sim, "switchActuator", "s2")).toBe(false);
    expect(lampOn(sim, "switchActuator", "s3")).toBe(true);
    // Each object linked to the same group address retains its own value.
    expect([
      obj(sim, "switchActuator", "e1"),
      obj(sim, "switchActuator", "c2"),
      obj(sim, "switchActuator", "c3"),
    ]).toEqual([1, 0, 1]);
  });

  it("T disabled on status: relay and local value change, neither telegram nor internal link", () => {
    const sim = createSimulator(scenario(false, true));
    sim.input("pushButton", "b1", "press");
    sim.advance(5000);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(true);
    expect(obj(sim, "switchActuator", "e1")).toBe(1);
    expect(statusTelegrams(sim, "1/4/1")).toHaveLength(0);
    expect(lampOn(sim, "switchActuator", "s3")).toBe(false);
  });
});

describe("timer", () => {
  const scenario = v2([
    {
      id: "pushButton",
      name: "BP",
      address: "1.1.1",
      kind: "pushButton",
      behavior: "pushButton/v1",
      objects: [
        {
          id: "m",
          name: "Switch",
          ga: "1/1/1",
          dpt: "1.001",
          port: "input",
          flags: flags(false, true),
        },
        {
          id: "a",
          name: "Stop",
          ga: "1/1/1",
          dpt: "1.001",
          port: "input",
          flags: flags(false, true),
        },
      ],
      buttons: [
        { id: "on", press: { object: "m", value: 1 } },
        { id: "off", press: { object: "a", value: 0 } },
      ],
    },
    {
      id: "switchActuator",
      name: "TOR",
      address: "1.1.2",
      kind: "switchActuator",
      behavior: "switchActuator/v1",
      objects: [
        {
          id: "c",
          name: "C",
          ga: "1/1/1",
          dpt: "1.001",
          port: "switch",
          channel: "s1",
          flags: flags(true, false),
        },
        {
          id: "e",
          name: "E",
          ga: "1/4/1",
          dpt: "1.001",
          port: "status",
          channel: "s1",
          flags: flags(false, true),
        },
      ],
      channels: [
        {
          id: "s1",
          parameters: { timerMs: 10000 },
          equipment: { type: "lamp" },
        },
      ],
    },
  ]);

  it("a repeat extends the deadline; status feedback is sent only when the output changes", () => {
    const sim = createSimulator(scenario);
    sim.input("pushButton", "on", "press"); // received at 1300
    sim.advance(5000);
    sim.input("pushButton", "on", "press"); // received at 6300
    sim.advance(16299 - 5000);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(true);
    sim.advance(1);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(false);
    expect(
      statusTelegrams(sim, "1/4/1").map((t) => [t.timeMs, t.value]),
    ).toEqual([[1600, 1]]);
    sim.advance(1000);
    expect(
      statusTelegrams(sim, "1/4/1").map((t) => [t.timeMs, t.value]),
    ).toEqual([
      [1600, 1],
      [16600, 0],
    ]);
  });

  it("an early OFF switches off immediately and cancels the previous deadline", () => {
    const sim = createSimulator(scenario);
    sim.input("pushButton", "on", "press");
    sim.advance(3000);
    sim.input("pushButton", "off", "press"); // received at 4300
    sim.advance(1300);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(false);
    sim.input("pushButton", "on", "press"); // received at 5600; new deadline at 15600
    sim.advance(15599 - 4300);
    expect(sim.timeMs).toBe(15599);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(true);
    sim.advance(1);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(false);
    expect(sim.channelState("switchActuator", "s1").offAtMs).toBeNull();
  });
});

describe("shutter actuator estimate versus actual travel", () => {
  it("20 s configured and 30 s actual travel: 50% estimated, about one third actual", () => {
    const sim = load("shutter-calibration.json");
    const [tel] = sim.input("pushButton", "position", "value", 50);
    expect(tel!.raw).toBe(0x80);
    sim.advance(1599);
    expect(sim.output("shutterActuator", "s1")).toEqual({
      type: "motor",
      direction: "stop",
    });
    sim.advance(1); // delivery at 1300 + 300 delay: motor starts
    expect(sim.output("shutterActuator", "s1")).toEqual({
      type: "motor",
      direction: "down",
    });
    const start = sim.timeMs;
    sim.advance(20000);
    const stop = sim.journal
      .filter(
        (e) => e.kind === "output-changed" && e.deviceId === "shutterActuator",
      )
      .at(-1)!;
    expect(stop.timeMs - start).toBe(Math.round((50.196078 / 100) * 20000));
    expect(estPos(sim, "shutterActuator", "s1")).toBeCloseTo(50.196, 2);
    expect(
      Math.abs(realPos(sim, "shutterActuator", "s1") - 33.464),
    ).toBeLessThan(0.05);
    // Position feedback publishes the estimate, never the actual position.
    expect(obj(sim, "pushButton", "feedback")).toBeCloseTo(50.196, 2);
  });

  it("30 s / 30 s: both positions match", () => {
    const sim = load("shutter-calibrated.json");
    sim.input("pushButton", "position", "value", 50);
    sim.advance(20000);
    expect(estPos(sim, "shutterActuator", "s1")).toBeCloseTo(50.196, 2);
    expect(
      Math.abs(realPos(sim, "shutterActuator", "s1") - 50.196),
    ).toBeLessThan(0.05);
  });

  it("Key 3 sends a 50% setpoint (0x80)", () => {
    const sim = load("shutter-calibration.json");
    expect(sim.input("pushButton", "key3", "press")[0]!.raw).toBe(0x80);
  });
});

describe("new commands replace old ones without driving both directions", () => {
  it("stop before the motor starts: no movement or feedback", () => {
    const sim = load("shutter-calibration.json");
    sim.input("pushButton", "key2", "long"); // down command delivered at 1300, start scheduled for 1600
    sim.advance(100);
    sim.input("pushButton", "key1", "short"); // stop command delivered at 1400
    sim.advance(30000);
    expect(outputs(sim, "shutterActuator", "s1")).toEqual([]);
    expect(statusTelegrams(sim, "2/1/4")).toHaveLength(0);
    expect(realPos(sim, "shutterActuator", "s1")).toBe(0);
  });

  it("stop while moving: immediate stop, consistent estimate, and feedback", () => {
    const sim = load("shutter-calibration.json");
    sim.input("pushButton", "key2", "long");
    sim.advance(5000);
    sim.input("pushButton", "key1", "short"); // received at 6300
    sim.advance(10000);
    expect(outputs(sim, "shutterActuator", "s1")).toEqual([
      "1600:down",
      "6300:stop",
    ]);
    expect(estPos(sim, "shutterActuator", "s1")).toBeCloseTo(23.5, 6);
    expect(realPos(sim, "shutterActuator", "s1")).toBeCloseTo(
      (4700 / 30000) * 100,
      6,
    );
    const st = statusTelegrams(sim, "2/1/4");
    expect(st.map((t) => [t.timeMs, t.raw])).toEqual([[6600, 60]]);
  });

  it("direction reversal: stop, wait, restart; send only final position feedback", () => {
    const sim = load("shutter-calibration.json");
    sim.input("pushButton", "key2", "long");
    sim.advance(5000);
    sim.input("pushButton", "key1", "long"); // up command delivered at 6300
    sim.advance(20000);
    expect(outputs(sim, "shutterActuator", "s1")).toEqual([
      "1600:down",
      "6300:stop",
      "6600:up",
      "11300:stop",
    ]);
    expect(estPos(sim, "shutterActuator", "s1")).toBe(0);
    expect(
      statusTelegrams(sim, "2/1/4").map((t) => [t.timeMs, t.value]),
    ).toEqual([[11600, 0]]);
  });

  it("new setpoint during movement restarts the estimate from the current position", () => {
    const sim = load("shutter-calibration.json");
    sim.input("pushButton", "key2", "long");
    sim.advance(3000);
    sim.input("pushButton", "position", "value", 50); // received at 4300: estimate 13.5%
    sim.advance(20000);
    expect(outputs(sim, "shutterActuator", "s1")).toEqual([
      "1600:down",
      "4300:stop",
      "4600:down",
      `${4600 + 7339}:stop`,
    ]);
    expect(estPos(sim, "shutterActuator", "s1")).toBeCloseTo(50.196, 2);
    expect(statusTelegrams(sim, "2/1/4")).toHaveLength(1);
  });

  it("scene during movement replaces the previous command", () => {
    const sim = load("scenes.json");
    sim.press("pushButton", 1, "press"); // scene 2: shutter closed, received at 1550, starts at 1850
    sim.advance(3000);
    sim.press("pushButton", 0, "press"); // scene 1: shutter open, received at 4550
    sim.advance(20000);
    expect(outputs(sim, "shutterActuator", "shutter1")).toEqual([
      "1850:down",
      "4550:stop",
      "4850:up",
      "7550:stop",
    ]);
    expect(estPos(sim, "shutterActuator", "shutter1")).toBe(0);
    expect(realPos(sim, "shutterActuator", "shutter1")).toBeCloseTo(0, 6);
  });
});

describe("no implicit calibration", () => {
  it("estimated at end stop but actual shutter halfway: repeating target does not recalibrate", () => {
    const sim = load("shutter-calibration.json");
    sim.input("pushButton", "key2", "long");
    sim.advance(30000);
    expect(estPos(sim, "shutterActuator", "s1")).toBe(100);
    expect(realPos(sim, "shutterActuator", "s1")).toBeCloseTo(66.667, 2);
    const before = outputs(sim, "shutterActuator", "s1").length;
    sim.input("pushButton", "key2", "long");
    sim.advance(30000);
    expect(outputs(sim, "shutterActuator", "s1")).toHaveLength(before);
    expect(realPos(sim, "shutterActuator", "s1")).toBeCloseTo(66.667, 2);
  });

  it("faster actual shutter: position stays within 100% and the motor receives a stop", () => {
    const data = raw("shutter-calibration.json") as {
      devices: {
        channels?: {
          parameters: Record<string, number>;
          equipment: { parameters: Record<string, number> };
        }[];
      }[];
    };
    data.devices[1]!.channels![0]!.parameters.estimatedTravelTimeMs = 30000;
    data.devices[1]!.channels![0]!.equipment.parameters.actualTravelTimeMs = 20000;
    const sim = createSimulator(data);
    sim.input("pushButton", "key2", "long");
    sim.advance(25000);
    const eq = sim.equipmentState("shutterActuator", "s1")!;
    expect(eq).toMatchObject({
      positionPct: 100,
      drive: "down",
      moving: false,
      limit: "bottom",
    });
    expect(estPos(sim, "shutterActuator", "s1")).toBeCloseTo(
      (23400 / 30000) * 100,
      6,
    );
    sim.advance(10000);
    expect(estPos(sim, "shutterActuator", "s1")).toBe(100);
    expect(realPos(sim, "shutterActuator", "s1")).toBe(100);
  });

  it("stop/step at rest does not move a shutter without slats by default", () => {
    const sim = load("shutter-calibration.json");
    sim.input("pushButton", "position", "value", 50);
    sim.advance(20000);
    const before = outputs(sim, "shutterActuator", "s1").length;
    sim.input("pushButton", "key1", "short");
    sim.advance(5000);
    expect(outputs(sim, "shutterActuator", "s1")).toHaveLength(before);
    expect(estPos(sim, "shutterActuator", "s1")).toBeCloseTo(50.196, 2);
  });

  it("with stepPct, stop/step from rest moves by that amount within bounds", () => {
    const data = raw("shutter-calibration.json") as {
      devices: {
        id: string;
        channels?: { parameters?: Record<string, unknown> }[];
      }[];
    };
    const ch = data.devices.find((d) => d.id === "shutterActuator")!
      .channels![0]!;
    ch.parameters = { ...ch.parameters, stepPct: 5 };
    const sim = createSimulator(data);
    sim.input("pushButton", "key1", "short"); // step up from 0: clamped, no movement
    sim.advance(5000);
    expect(outputs(sim, "shutterActuator", "s1")).toEqual([]);
    sim.input("pushButton", "position", "value", 50);
    sim.advance(20000);
    sim.input("pushButton", "key1", "short");
    sim.advance(5000);
    expect(estPos(sim, "shutterActuator", "s1")).toBeCloseTo(50.196 - 5, 2);
    const last = outputs(sim, "shutterActuator", "s1").slice(-2);
    const [t0, t1] = last.map((x) => Number(x.split(":")[0]));
    expect(t1! - t0!).toBe(1000);
  });
});

describe("scenes and six-channel actuator", () => {
  it("absent scene: ignored and explained", () => {
    const data = raw("scenes.json") as {
      devices: { buttons?: { press: { value: number } }[] }[];
    };
    data.devices[0]!.buttons![1]!.press.value = 5; // scene 6: no preset
    const sim = createSimulator(data);
    sim.press("pushButton", 1, "press");
    sim.advance(20000);
    expect(
      sim.journal.filter(
        (e) => e.kind === "note" && /scene 6/i.test(e.message ?? ""),
      ),
    ).toHaveLength(5);
    expect(sim.journal.filter((e) => e.kind === "output-changed")).toHaveLength(
      0,
    );
  });

  it("one device with six channels; unused channels have no invented load", () => {
    const sim = load("object-flags.json");
    const d = sim.scenario.devicesById.get("switchActuator")!;
    expect(d.channels).toHaveLength(6);
    expect(
      sim.scenario.devices.filter((x) => x.address === "1.1.2"),
    ).toHaveLength(1);
    expect(
      d.channels.filter((c) => c.equipment === null).map((c) => c.id),
    ).toEqual(["s4", "s5", "s6"]);
    expect(
      layout(sim.scenario)
        .devices.get("switchActuator")!
        .loads.map((l) => l.channel),
    ).toEqual(["s1", "s2", "s3"]);
    const state = sim.getState();
    expect(
      Object.keys(state.channels).filter((k) =>
        k.startsWith("switchActuator/"),
      ),
    ).toHaveLength(6);
    expect(
      Object.keys(state.equipment).filter((k) =>
        k.startsWith("switchActuator/"),
      ),
    ).toHaveLength(3);
    expect(state.channels["switchActuator/s5"]!.output).toEqual({
      type: "switch",
      on: false,
    });
  });
});

describe("observable state", () => {
  it("serializable snapshot, without internal reference; null for unknown value", () => {
    const sim = load("shutter-control.json");
    const snap = sim.getState();
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
    expect(snap.objects["sup/pos"]!.value).toBeNull();
    snap.objects["pushButton/key4"]!.value = 42;
    expect(sim.objectValue("pushButton", "key4")).toBe(0);
  });

  it("reading a snapshot updates the estimate without triggering behavior", () => {
    const sim = load("shutter-calibration.json");
    sim.input("pushButton", "key2", "long");
    sim.advance(11600); // 10 s of movement
    const n = sim.journal.length;
    expect(
      sim.getState().channels["shutterActuator/s1"]!.state.estimatedPositionPct,
    ).toBeCloseTo(50, 6);
    expect(sim.journal).toHaveLength(n);
  });
});
