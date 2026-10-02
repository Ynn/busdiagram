import { describe, expect, it } from "vitest";
import { createSimulator, registerBehavior } from "../../../src/core";
import type { BehaviorDefinition } from "../../../src/core";
import type { Simulation } from "../../../src/knx/sim";
import { lampOn, load, raw, v2 } from "../helpers";

/** Test behavior: count his ticks and write down their date. */
const tickCounter: BehaviorDefinition<{ n: number; at: number[] }> = {
  ports: { display: { dpts: "any", channel: "none" } },
  createState: () => ({ n: 0, at: [] }),
  onTick(ctx, dt) {
    ctx.state.n++;
    if (dt !== 20 || ctx.timeMs % 20 !== 0) ctx.state.at.push(ctx.timeMs);
  },
  channelState: (s) => ({ n: s.n, off: s.at.length }),
};
registerBehavior("test.tickCounter/v1", tickCounter);

const fingerprint = (sim: Simulation) => {
  const s = sim.getState();
  return {
    state: JSON.stringify(s, (_k, v) =>
      typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v,
    ),
    journal: sim.journal.map(
      (e) =>
        `${e.timeMs}|${e.kind}|${e.deviceId ?? ""}|${e.channelId ?? ""}|${e.objectId ?? ""}|${e.telegramId ?? ""}`,
    ),
  };
};

/** Comprehensive scenario: miscalibrated shutter, timer, status feedback, and digital input. */
function scripted(chunks: number[]) {
  const sim = load("shutter-calibration.json");
  const t6 = load("timers.json");
  sim.input("pushButton", "key2", "long");
  t6.press("pushButton", 0, "press");
  t6.press("pir", 0, "press");
  let total = 0;
  for (const c of chunks) {
    sim.advance(c);
    t6.advance(c);
    total += c;
    if (total === 7000) sim.input("panel", "position", "value", 30);
  }
  return [fingerprint(sim), fingerprint(t6)];
}

describe("time-step partition does not affect results", () => {
  it("large, small, and irregular time steps produce the same result", () => {
    const one = scripted([7000, 13000]);
    const many = scripted(Array.from({ length: 1000 }, () => 20));
    const irregular = scripted([1, 999, 3333, 2667, 1, 4, 995, 12000]);
    expect(many).toEqual(one);
    expect(irregular).toEqual(one);
  });

  it("exactly 1,000 onTick calls at 20 ms intervals regardless of step partition", () => {
    const data = v2([
      {
        id: "t",
        name: "T",
        address: "1.1.1",
        kind: "generic",
        behavior: "test.tickCounter/v1",
        objects: [],
        channels: [{ id: "c" }],
      },
    ]);
    for (const chunks of [
      [20000],
      Array.from({ length: 1000 }, () => 20),
      [7, 13, 19999 - 20 + 1, 0],
    ]) {
      const sim = createSimulator(data);
      chunks.forEach((c) => sim.advance(c));
      expect(sim.timeMs).toBe(20000);
      expect(sim.channelState("t", "c")).toEqual({ n: 1000, off: 0 });
    }
  });

  it("advance rejects fractional, negative, or infinite duration", () => {
    const sim = load("lighting-control.json");
    for (const bad of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() => sim.advance(bad)).toThrow(RangeError);
    expect(() => sim.advance(0)).not.toThrow();
  });

  it("a newly ordered output does not act retroactively", () => {
    const sim = load("shutter-calibrated.json");
    sim.input("pushButton", "key2", "long");
    sim.advance(1600 + 3000); // starts at 1600: 3 s actual travel, not 4.6 s
    expect(
      Number(sim.equipmentState("shutterActuator", "s1")!.positionPct),
    ).toBeCloseTo(10, 9);
  });
});

describe("pause, step by step, reset", () => {
  it("a paused simulator accepts an input now and holds its telegram until resumed", () => {
    const sim = load("lighting-control.json");
    sim.pause();
    const [tel] = sim.input("pushButton", "in1", "press");
    expect(tel!.timeMs).toBe(0);
    expect(sim.paused).toBe(true);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(false);
    // Manual advance remains possible and leaves pause active.
    sim.advance(1300);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(true);
    expect(sim.paused).toBe(true);
  });

  it("stepToNextEvent processes same-time events without advancing the clock", () => {
    const sim = load("status-feedback.json");
    sim.press("pushButton", 1, "press"); // L1–L4 group
    const stops = [];
    for (let s = sim.stepToNextEvent(); s; s = sim.stepToNextEvent())
      stops.push(s);
    const times = stops.map((s) => s.timeMs);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(stops.length).toBeGreaterThan(3);
    // A tick or no-op event is not a meaningful pause point.
    stops.forEach((s) => expect(s.events.length).toBeGreaterThan(0));
    expect(sim.stepToNextEvent()).toBeNull();
  });

  it("reset during a delay restores time zero and initial state without feedback", () => {
    const sim = load("shutter-calibration.json");
    sim.network.setExtMode("x", "segmentCoupler");
    sim.input("pushButton", "key2", "long");
    sim.advance(1400); // waiting to start
    sim.reset();
    expect(sim.timeMs).toBe(0);
    expect(sim.journal).toHaveLength(0);
    expect(sim.history).toHaveLength(0);
    sim.advance(60000);
    expect(sim.journal).toHaveLength(0);
    expect(sim.output("shutterActuator", "s1")).toEqual({
      type: "motor",
      direction: "stop",
    });
    expect(sim.network.extMode("x")).toBe("repeater");
  });

  it("the reset restores the coupler modes of the scenario", () => {
    const sim = load("full-topology.json");
    sim.network.setExtMode("2.1", "segmentCoupler");
    sim.reset();
    expect(sim.network.extMode("2.1")).toBe("repeater");
  });
});

describe("initial state", () => {
  it("the status derives from the initial state of the channel; no emission at initialization", () => {
    const data = raw("object-flags.json") as {
      devices: { channels?: { initialState?: object }[] }[];
    };
    data.devices[1]!.channels![0]!.initialState = { on: true };
    const sim = createSimulator(data);
    expect(sim.objectValue("switchActuator", "e1")).toBe(1);
    expect(sim.objectValue("switchActuator", "c1")).toBe(0); // the command retains its own value
    expect(sim.equipmentState("switchActuator", "s1")).toEqual({ on: true });
    expect(sim.history).toHaveLength(0);
    sim.advance(10000);
    expect(sim.history).toHaveLength(0);
  });

  it("estimated and actual initial positions may differ", () => {
    const data = raw("shutter-calibration.json") as {
      devices: {
        channels?: {
          initialState: object;
          equipment: { initialState: object };
        }[];
      }[];
    };
    data.devices[1]!.channels![0]!.initialState = { estimatedPositionPct: 40 };
    data.devices[1]!.channels![0]!.equipment.initialState = { positionPct: 10 };
    const sim = createSimulator(data);
    expect(sim.channelState("shutterActuator", "s1").estimatedPositionPct).toBe(
      40,
    );
    expect(sim.equipmentState("shutterActuator", "s1")!.positionPct).toBe(10);
    expect(sim.objectValue("shutterActuator", "status")).toBeCloseTo(40, 0);
  });
});
