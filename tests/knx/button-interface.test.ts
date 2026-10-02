import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import { load } from "./helpers";

const flags = (W: boolean, T: boolean) => ({ W, T });

/** A push-button interface with one input, and a dimmer listening to it. */
function bench(parameters: Record<string, unknown>, objects: unknown[]) {
  return createSimulator({
    formatVersion: 2,
    title: "Push-button interface",
    lines: [{ address: "1.1", powerSupply: { currentMa: 320 } }],
    groupAddresses: [
      { address: "1/1/1", name: "Switch", dpt: "1.001" },
      { address: "1/1/2", name: "Dim", dpt: "3.007" },
      { address: "1/1/3", name: "Move", dpt: "1.008" },
      { address: "1/1/4", name: "Stop", dpt: "1.007" },
      { address: "1/1/5", name: "Scene", dpt: "18.001" },
      { address: "1/1/6", name: "Lock", dpt: "1.001" },
      { address: "1/1/7", name: "Value", dpt: "5.001" },
    ],
    devices: [
      {
        id: "bi",
        address: "1.1.1",
        kind: "buttonInterface",
        behavior: "buttonInterface/v1",
        channels: [{ id: "in1", label: "Input 1", parameters }],
        objects,
      },
      {
        id: "usb",
        address: "1.1.2",
        kind: "generic",
        behavior: "usbInterface/v1",
        objects: [],
      },
    ],
  });
}

const obj = (id: string, port: string, ga: string, dpt: string, W = false) => ({
  id,
  port,
  channel: "in1",
  ga,
  dpt,
  flags: flags(W, true),
});

function sent(sim: ReturnType<typeof bench>) {
  const out: [string, number][] = [];
  sim.onTelegram(
    (t) => t.service === "GroupValueWrite" && out.push([t.ga, t.value]),
  );
  return out;
}

describe("buttonInterface/v1", () => {
  it("draws no LED by default", () => {
    const sim = bench({}, [obj("sw", "switch", "1/1/1", "1.001", true)]);
    expect(sim.scenario.devicesById.get("bi")!.buttons[0]!.led).toBeNull();
  });

  it("draws one contact key per channel, with its LED on the switching object", () => {
    const sim = bench({ ledShown: true }, [
      obj("sw", "switch", "1/1/1", "1.001", true),
    ]);
    const b = sim.scenario.devicesById.get("bi")!.buttons;
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({
      id: "in1",
      contact: true,
      led: "sw",
      longPressMs: null,
    });
  });

  it("switching on edges: toggle on press, nothing on release", () => {
    const sim = bench({}, [obj("sw", "switch", "1/1/1", "1.001", true)]);
    const out = sent(sim);
    sim.input("bi", "in1", "down");
    sim.input("bi", "in1", "up");
    sim.input("bi", "in1", "down");
    sim.advance(3000);
    expect(out).toEqual([
      ["1/1/1", 1],
      ["1/1/1", 0],
    ]);
  });

  it("a hold edge is ignored by a function without long press", () => {
    const sim = bench({}, [obj("sw", "switch", "1/1/1", "1.001", true)]);
    const out = sent(sim);
    sim.input("bi", "in1", "down");
    sim.input("bi", "in1", "hold");
    sim.input("bi", "in1", "up");
    sim.advance(2000);
    expect(out).toEqual([["1/1/1", 1]]);
  });

  it("gives the long-press time of an input to its key", () => {
    const sim = bench({ function: "dim", longPressMs: 800 }, []);
    expect(sim.scenario.devicesById.get("bi")!.buttons[0]!.longPressMs).toBe(
      800,
    );
  });

  it("plays the gestures of a configured key as edges", () => {
    const sim = bench({ function: "dim" }, [
      obj("sw", "switch", "1/1/1", "1.001", true),
      obj("dim", "dim", "1/1/2", "3.007"),
    ]);
    const out = sent(sim);
    sim.input("bi", "in1", "short");
    sim.input("bi", "in1", "long");
    sim.input("bi", "in1", "release");
    sim.advance(3000);
    expect(out.map(([ga]) => ga)).toEqual(["1/1/1", "1/1/2", "1/1/2"]);
  });

  it("one-key dimming: short toggles, long dims in turn, release stops", () => {
    const sim = bench({ function: "dim" }, [
      obj("sw", "switch", "1/1/1", "1.001", true),
      obj("dim", "dim", "1/1/2", "3.007"),
    ]);
    const out = sent(sim);
    // Long press with the light off: brighter (8 | 1), then stop (8).
    sim.input("bi", "in1", "down");
    sim.input("bi", "in1", "hold");
    sim.advance(500);
    sim.input("bi", "in1", "up");
    sim.advance(2000);
    // The status reports the light on (written here by the USB interface): the next
    // long press dims darker (1), then stop (0).
    sim.groupWrite("usb", "1/1/1", 1);
    sim.advance(2000);
    sim.input("bi", "in1", "down");
    sim.input("bi", "in1", "hold");
    sim.advance(500);
    sim.input("bi", "in1", "up");
    // Short press toggles off.
    sim.input("bi", "in1", "down");
    sim.advance(100);
    sim.input("bi", "in1", "up");
    sim.advance(3000);
    expect(out).toEqual([
      ["1/1/2", 9],
      ["1/1/2", 8],
      ["1/1/1", 1],
      ["1/1/2", 1],
      ["1/1/2", 0],
      ["1/1/1", 0],
    ]);
  });

  it("one-key blind: long press moves, direction alternates, short press stops", () => {
    const sim = bench({ function: "blind" }, [
      obj("mv", "move", "1/1/3", "1.008", true),
      obj("st", "stopStep", "1/1/4", "1.007"),
    ]);
    const out = sent(sim);
    for (const long of [true, false, true]) {
      sim.input("bi", "in1", "down");
      if (long) sim.input("bi", "in1", "hold");
      sim.advance(500);
      sim.input("bi", "in1", "up");
      sim.advance(2000);
    }
    expect(out).toEqual([
      ["1/1/3", 1],
      ["1/1/4", 1],
      ["1/1/3", 0],
    ]);
  });

  it("stop on release: hold to move", () => {
    const sim = bench(
      { function: "blind", blindMode: "up", stopOnRelease: true },
      [
        obj("mv", "move", "1/1/3", "1.008"),
        obj("st", "stopStep", "1/1/4", "1.007"),
      ],
    );
    const out = sent(sim);
    sim.input("bi", "in1", "down");
    sim.input("bi", "in1", "hold");
    sim.advance(800);
    sim.input("bi", "in1", "up");
    sim.advance(2000);
    expect(out).toEqual([
      ["1/1/3", 0],
      ["1/1/4", 0],
    ]);
  });

  it("scene: short press recalls, long press stores (DPT 18.001)", () => {
    const sim = bench({ function: "scene", sceneNumber: 3, sceneStore: true }, [
      obj("sc", "value", "1/1/5", "18.001"),
    ]);
    const out = sent(sim);
    sim.input("bi", "in1", "down");
    sim.advance(100);
    sim.input("bi", "in1", "up");
    sim.advance(2000);
    sim.input("bi", "in1", "down");
    sim.input("bi", "in1", "hold");
    sim.advance(800);
    sim.input("bi", "in1", "up");
    sim.advance(2000);
    expect(out).toEqual([
      ["1/1/5", 2],
      ["1/1/5", 130],
    ]);
  });

  it("value without a long-press value is sent at once", () => {
    const sim = bench({ function: "value", shortValue: 40 }, [
      obj("v", "value", "1/1/7", "5.001"),
    ]);
    const out = sent(sim);
    sim.input("bi", "in1", "down");
    sim.advance(2000);
    expect(out).toHaveLength(1);
    expect(out[0]![0]).toBe("1/1/7");
    expect(out[0]![1]).toBeCloseTo(40, 0);
  });

  it("lock: presses ignored, reactions on locking and unlocking", () => {
    const sim = bench({ lockStart: "off", lockEnd: "update" }, [
      obj("sw", "switch", "1/1/1", "1.001", true),
      {
        ...obj("lk", "lock", "1/1/6", "1.001", true),
        flags: flags(true, false),
      },
    ]);
    const out = sent(sim);
    sim.groupWrite("usb", "1/1/6", 1);
    sim.advance(2000);
    sim.input("bi", "in1", "down");
    sim.input("bi", "in1", "up");
    sim.advance(2000);
    sim.groupWrite("usb", "1/1/6", 0);
    sim.advance(2000);
    expect(out).toEqual([
      ["1/1/6", 1],
      ["1/1/1", 0],
      ["1/1/6", 0],
      ["1/1/1", 0],
    ]);
  });

  it("bus voltage: no reaction while cut, recovery reaction after the delay", () => {
    const sim = bench({ busRecovery: "on", busRecoveryDelayMs: 1000 }, [
      obj("sw", "switch", "1/1/1", "1.001", true),
    ]);
    const out = sent(sim);
    sim.setBusVoltage("L1.1", false);
    expect(sim.devicePowered("bi")).toBe(false);
    expect(sim.input("bi", "in1", "down")).toEqual([]);
    sim.advance(2000);
    expect(out).toEqual([]);
    sim.setBusVoltage("L1.1", true);
    sim.advance(500);
    expect(out).toEqual([]);
    sim.advance(2000);
    expect(out).toEqual([["1/1/1", 1]]);
  });

  it("cyclic sending of the switching value", () => {
    const sim = bench({ cyclicMs: 10000, cyclicWhen: "on" }, [
      obj("sw", "switch", "1/1/1", "1.001", true),
    ]);
    const out = sent(sim);
    sim.advance(25000);
    expect(out).toEqual([]);
    sim.input("bi", "in1", "down");
    sim.input("bi", "in1", "up");
    sim.advance(25000);
    // The press, then the cycles at 30, 40 and 50 s.
    expect(out.length).toBe(4);
  });
});

describe("examples of the push-button interface and the bus voltage", () => {
  const lampOn = (sim: ReturnType<typeof load>, dev: string, ch: string) =>
    (sim.output(dev, ch) as { on?: boolean } | null)?.on === true;

  it("push-button-interface: scene stored by a long press, recalled by a short one", () => {
    const sim = load("push-button-interface.json");
    expect(sim.getState().diagnostics).toEqual([]);
    sim.input("buttonInterface", "in1", "down");
    sim.input("buttonInterface", "in1", "up");
    sim.advance(3000);
    expect(lampOn(sim, "switchActuator", "a")).toBe(true);
    // Long press on input 4 stores scene 1 with L1 on; then switch L1 off and recall it.
    sim.input("buttonInterface", "in4", "down");
    sim.input("buttonInterface", "in4", "hold");
    sim.advance(800);
    sim.input("buttonInterface", "in4", "up");
    sim.advance(3000);
    sim.input("buttonInterface", "in1", "down");
    sim.input("buttonInterface", "in1", "up");
    sim.advance(3000);
    expect(lampOn(sim, "switchActuator", "a")).toBe(false);
    sim.input("buttonInterface", "in4", "down");
    sim.advance(100);
    sim.input("buttonInterface", "in4", "up");
    sim.advance(3000);
    expect(lampOn(sim, "switchActuator", "a")).toBe(true);
  });

  it("bus-voltage: failure switches L1 off, recovery restores it", () => {
    const sim = load("bus-voltage.json");
    expect(sim.getState().diagnostics).toEqual([]);
    sim.input("buttonInterface", "in1", "down");
    sim.input("buttonInterface", "in1", "up");
    sim.advance(5000);
    expect(lampOn(sim, "switchActuator", "a")).toBe(true);
    sim.setBusVoltage("L1.2", false);
    expect(lampOn(sim, "switchActuator", "a")).toBe(false);
    sim.setBusVoltage("L1.2", true);
    sim.advance(5000);
    expect(lampOn(sim, "switchActuator", "a")).toBe(true);
    // Lock from input 2: L1 off and locked.
    sim.input("buttonInterface", "in2", "down");
    sim.input("buttonInterface", "in2", "up");
    sim.advance(5000);
    expect(lampOn(sim, "switchActuator", "a")).toBe(false);
    expect(sim.channelState("switchActuator", "a").locked).toBe(true);
  });
});
