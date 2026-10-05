import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";

const flags = (W: boolean, T: boolean) => ({ W, T });

/** A switch actuator with one lamp output, written by a USB interface. */
function bench(
  parameters: Record<string, unknown>,
  extra: unknown[] = [],
  scenes?: Record<string, number>,
) {
  return createSimulator({
    formatVersion: 2,
    title: "Switch actuator",
    lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }],
    groupAddresses: [
      { address: "1/1/1", name: "Switch", dpt: "1.001" },
      { address: "1/1/2", name: "Status", dpt: "1.001" },
      { address: "1/1/3", name: "Lock", dpt: "1.001" },
      { address: "1/1/4", name: "Logic", dpt: "1.001" },
      { address: "1/1/5", name: "Scene", dpt: "18.001" },
      { address: "1/1/6", name: "Forcing", dpt: "2.001" },
    ],
    devices: [
      {
        id: "act",
        address: "1.1.1",
        kind: "switchActuator",
        behavior: "switchActuator/v1",
        channels: [
          {
            id: "a",
            label: "A",
            parameters,
            equipment: { type: "lamp" },
            ...(scenes ? { scenes } : {}),
          },
        ],
        objects: [
          {
            id: "sw",
            port: "switch",
            channel: "a",
            ga: "1/1/1",
            dpt: "1.001",
            flags: flags(true, false),
          },
          {
            id: "st",
            port: "status",
            channel: "a",
            ga: "1/1/2",
            dpt: "1.001",
            flags: flags(false, true),
          },
          ...extra,
        ],
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

const input = (id: string, port: string, ga: string, dpt: string) => ({
  id,
  port,
  channel: "a",
  ga,
  dpt,
  flags: flags(true, false),
});

const on = (sim: ReturnType<typeof bench>) =>
  (sim.output("act", "a") as { on?: boolean } | null)?.on === true;

describe("switchActuator/v1: functions of the catalogue actuators", () => {
  it("switch-on and switch-off delays; the opposite command cancels a delay", () => {
    const sim = bench({ onDelayMs: 3000, offDelayMs: 2000 });
    sim.groupWrite("usb", "1/1/1", 1);
    sim.advance(3000);
    expect(on(sim)).toBe(false);
    sim.advance(1500);
    expect(on(sim)).toBe(true);
    sim.groupWrite("usb", "1/1/1", 0);
    sim.advance(1500);
    sim.groupWrite("usb", "1/1/1", 1);
    sim.advance(5000);
    // The 1 cancelled the switch-off delay and started its own; the light stays on.
    expect(on(sim)).toBe(true);
  });

  it("lock: imposed state, commands stored, state after the lock", () => {
    const sim = bench({ lockStart: "off", afterLock: "lastCommand" }, [
      input("lk", "lock", "1/1/3", "1.001"),
    ]);
    sim.groupWrite("usb", "1/1/1", 1);
    sim.advance(2000);
    expect(on(sim)).toBe(true);
    sim.groupWrite("usb", "1/1/3", 1);
    sim.advance(2000);
    expect(on(sim)).toBe(false);
    sim.groupWrite("usb", "1/1/1", 1);
    sim.advance(2000);
    expect(on(sim)).toBe(false);
    expect(sim.channelState("act", "a").locked).toBe(true);
    sim.groupWrite("usb", "1/1/3", 0);
    sim.advance(2000);
    expect(on(sim)).toBe(true);
  });

  it("forcing has priority over the lock", () => {
    const sim = bench({ lockStart: "off" }, [
      input("lk", "lock", "1/1/3", "1.001"),
      input("fo", "forced", "1/1/6", "2.001"),
    ]);
    sim.groupWrite("usb", "1/1/3", 1);
    sim.groupWrite("usb", "1/1/6", 3);
    sim.advance(3000);
    expect(on(sim)).toBe(true);
    // End of forcing while locked: the lock's state applies.
    sim.groupWrite("usb", "1/1/6", 0);
    sim.advance(2000);
    expect(on(sim)).toBe(false);
  });

  it("logic link AND: the command acts only while the logic object is 1", () => {
    const sim = bench({ logicOperation: "and" }, [
      input("lg", "logic", "1/1/4", "1.001"),
    ]);
    sim.groupWrite("usb", "1/1/1", 1);
    sim.advance(2000);
    // No logic value yet: the command acts alone.
    expect(on(sim)).toBe(true);
    sim.groupWrite("usb", "1/1/4", 0);
    sim.advance(2000);
    expect(on(sim)).toBe(false);
    sim.groupWrite("usb", "1/1/4", 1);
    sim.advance(2000);
    expect(on(sim)).toBe(true);
  });

  it("scene control 18.001: the learn bit stores the current state", () => {
    const sim = bench({}, [{ ...input("sc", "scene", "1/1/5", "18.001") }], {
      "2": 0,
    });
    sim.groupWrite("usb", "1/1/1", 1);
    sim.advance(2000);
    sim.groupWrite("usb", "1/1/5", 128 | 1);
    sim.advance(2000);
    expect(sim.channelState("act", "a").learnedScenes).toEqual({ "2": 1 });
    sim.groupWrite("usb", "1/1/1", 0);
    sim.advance(2000);
    sim.groupWrite("usb", "1/1/5", 1);
    sim.advance(2000);
    expect(on(sim)).toBe(true);
  });

  it("scene storing can be disabled", () => {
    const sim = bench(
      { sceneLearning: false },
      [{ ...input("sc", "scene", "1/1/5", "18.001") }],
      { "2": 0 },
    );
    sim.groupWrite("usb", "1/1/1", 1);
    sim.advance(2000);
    sim.groupWrite("usb", "1/1/5", 129);
    sim.advance(2000);
    sim.groupWrite("usb", "1/1/5", 1);
    sim.advance(2000);
    expect(on(sim)).toBe(false);
  });

  it("bus voltage failure and recovery: states set, status sent after recovery", () => {
    const sim = bench({ busFailure: "off", busRecovery: "previous" });
    const status: number[] = [];
    sim.onTelegram((t) => t.ga === "1/1/2" && status.push(t.value));
    sim.groupWrite("usb", "1/1/1", 1);
    sim.advance(3000);
    expect(status).toEqual([1]);
    sim.setBusVoltage("L1.1", false);
    expect(on(sim)).toBe(false);
    // While the voltage is cut, the actuator receives nothing.
    expect(sim.groupWrite("usb", "1/1/1", 0)).toBeNull();
    sim.advance(3000);
    sim.setBusVoltage("L1.1", true);
    sim.advance(3000);
    expect(on(sim)).toBe(true);
    expect(status).toEqual([1, 1]);
  });

  it("a telegram is not forwarded to a line without bus voltage", () => {
    const sim = createSimulator({
      formatVersion: 2,
      title: "Two lines",
      lines: [{ address: "1.1" }, { address: "1.2" }],
      groupAddresses: [{ address: "1/1/1", name: "Switch", dpt: "1.001" }],
      devices: [
        {
          id: "usb",
          address: "1.1.1",
          kind: "generic",
          behavior: "usbInterface/v1",
          parameters: { groupAddresses: "1/1/1" },
          objects: [],
        },
        {
          id: "act",
          address: "1.2.1",
          kind: "switchActuator",
          behavior: "switchActuator/v1",
          channels: [{ id: "a", equipment: { type: "lamp" } }],
          objects: [
            {
              id: "sw",
              port: "switch",
              channel: "a",
              ga: "1/1/1",
              dpt: "1.001",
              flags: flags(true, false),
            },
          ],
        },
      ],
    });
    sim.setBusVoltage("L1.2", false);
    const t = sim.groupWrite("usb", "1/1/1", 1)!;
    sim.advance(5000);
    expect(t.plan.couplers.some((c) => c.noVoltage && !c.pass)).toBe(true);
    expect(sim.output("act", "a")).not.toMatchObject({ on: true });
    expect(sim.getState().unpoweredSegments).toEqual(["L1.2"]);
  });
});

describe("shutterActuator/v1 on bus voltage failure", () => {
  it("stops the motor", () => {
    const sim = createSimulator({
      formatVersion: 2,
      title: "Shutter",
      lines: [{ address: "1.1" }],
      groupAddresses: [{ address: "1/2/1", name: "Move", dpt: "1.008" }],
      devices: [
        {
          id: "sh",
          address: "1.1.1",
          kind: "shutterActuator",
          behavior: "shutterActuator/v1",
          channels: [
            {
              id: "a",
              parameters: { estimatedTravelTimeMs: 20000 },
              equipment: {
                type: "shutter",
                parameters: { actualTravelTimeMs: 20000 },
              },
            },
          ],
          objects: [
            {
              id: "mv",
              port: "move",
              channel: "a",
              ga: "1/2/1",
              dpt: "1.008",
              flags: flags(true, false),
            },
          ],
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
    sim.groupWrite("usb", "1/2/1", 1);
    sim.advance(3000);
    expect(sim.output("sh", "a")).toMatchObject({ direction: "down" });
    sim.setBusVoltage("L1.1", false);
    expect(sim.output("sh", "a")).toMatchObject({ direction: "stop" });
  });
});

describe("scene storing (DPT 18.001) in the dimmer and the shutter actuator", () => {
  const scenario = (device: Record<string, unknown>, dpt: string) =>
    createSimulator({
      formatVersion: 2,
      title: "Scene storing",
      lines: [{ address: "1.1" }],
      groupAddresses: [
        { address: "1/5/1", name: "Scene", dpt: "18.001" },
        { address: "1/5/2", name: "Value", dpt },
      ],
      devices: [
        { address: "1.1.1", ...device },
        {
          id: "usb",
          address: "1.1.2",
          kind: "generic",
          behavior: "usbInterface/v1",
          objects: [],
        },
      ],
    });

  it("the dimmer stores its level and recalls it", () => {
    const sim = scenario(
      {
        id: "dim",
        kind: "dimmerActuator",
        behavior: "dimmerActuator/v1",
        channels: [
          {
            id: "a",
            equipment: { type: "dimmableLamp" },
            scenes: { "4": 100 },
          },
        ],
        objects: [
          {
            id: "sc",
            port: "scene",
            channel: "a",
            ga: "1/5/1",
            dpt: "18.001",
            flags: flags(true, false),
          },
          {
            id: "v",
            port: "value",
            channel: "a",
            ga: "1/5/2",
            dpt: "5.001",
            flags: flags(true, false),
          },
        ],
      },
      "5.001",
    );
    sim.groupWrite("usb", "1/5/2", 40);
    sim.advance(2000);
    sim.groupWrite("usb", "1/5/1", 128 | 3);
    sim.advance(2000);
    sim.groupWrite("usb", "1/5/2", 0);
    sim.advance(2000);
    sim.groupWrite("usb", "1/5/1", 3);
    sim.advance(2000);
    expect(sim.channelState("dim", "a").learnedScenes).toEqual({ "4": 40 });
    expect(sim.channelState("dim", "a").levelPct).toBe(40);
  });

  it("a scene recall stays within the minimum and maximum levels; a scene at 0 switches off", () => {
    // KNX Lighting Actuators §3.6.13–3.6.14 (lowest and highest possible set value); a
    // dimming actuator applies them to scene recalls, and 0 always switches off.
    const channel = (id: string) => ({
      id,
      parameters: { minLevelPct: 20, maxLevelPct: 60 },
      equipment: { type: "dimmableLamp" },
      scenes: { "1": 100, "2": 5, "3": 0, "4": 45 },
    });
    const sim = scenario(
      {
        id: "dim",
        kind: "dimmerActuator",
        behavior: "dimmerActuator/v1",
        channels: [channel("a"), channel("b")],
        objects: [
          {
            id: "sc",
            port: "scene",
            ga: "1/5/1",
            dpt: "18.001",
            flags: flags(true, false),
          },
          {
            id: "v",
            port: "value",
            channel: "a",
            ga: "1/5/2",
            dpt: "5.001",
            flags: flags(true, false),
          },
        ],
      },
      "5.001",
    );
    const level = (ch: string) => sim.equipmentState("dim", ch)?.levelPct;
    const recall = (scene: number) => {
      sim.groupWrite("usb", "1/5/1", scene - 1);
      sim.advance(3000);
      return [level("a"), level("b")];
    };
    expect(recall(1)).toEqual([60, 60]); // maximum
    expect(recall(2)).toEqual([20, 20]); // minimum
    expect(recall(4)).toEqual([45, 45]); // within the limits
    expect(recall(3)).toEqual([0, 0]); // 0 switches off
    // A learned scene is limited the same way when recalled.
    sim.groupWrite("usb", "1/5/2", 55);
    sim.advance(3000);
    sim.groupWrite("usb", "1/5/1", 128 | 0);
    sim.advance(3000);
    // The scene object serves both outputs: B, off, learns 0, which switches it off.
    expect(sim.channelState("dim", "a").learnedScenes).toEqual({ "1": 55 });
    expect(sim.channelState("dim", "b").learnedScenes).toEqual({ "1": 0 });
    expect(recall(1)).toEqual([55, 0]);
  });

  it("the shutter actuator stores its position", () => {
    const sim = scenario(
      {
        id: "sh",
        kind: "shutterActuator",
        behavior: "shutterActuator/v1",
        channels: [
          {
            id: "a",
            parameters: { estimatedTravelTimeMs: 10000 },
            equipment: {
              type: "shutter",
              parameters: { actualTravelTimeMs: 10000 },
            },
            // Scene 1 is assigned: only an assigned scene is stored.
            scenes: { "1": 0 },
          },
        ],
        objects: [
          {
            id: "sc",
            port: "scene",
            channel: "a",
            ga: "1/5/1",
            dpt: "18.001",
            flags: flags(true, false),
          },
          {
            id: "p",
            port: "positionCommand",
            channel: "a",
            ga: "1/5/2",
            dpt: "5.001",
            flags: flags(true, false),
          },
        ],
      },
      "5.001",
    );
    sim.groupWrite("usb", "1/5/2", 60);
    sim.advance(15000);
    sim.groupWrite("usb", "1/5/1", 128);
    sim.advance(2000);
    expect(sim.channelState("sh", "a").learnedScenes).toEqual({ "1": 60 });
  });
});

describe("switchActuator/v1: release time of forcing", () => {
  const forcing = (parameters: Record<string, unknown>) =>
    bench({ forcedReleaseMs: 5000, ...parameters }, [
      input("fo", "forced", "1/1/6", "2.001"),
      input("lk", "lock", "1/1/3", "1.001"),
    ]);
  const released = (sim: ReturnType<typeof bench>) =>
    sim.journal.some(
      (e) => e.kind === "note" && /release time/.test(e.message ?? ""),
    );

  it("released while locked: the output takes the state the lock imposes", () => {
    const sim = forcing({ lockStart: "on" });
    sim.groupWrite("usb", "1/1/6", 2); // forced off
    sim.advance(2000);
    sim.groupWrite("usb", "1/1/3", 1); // locked, forcing keeps priority
    sim.advance(2000);
    expect(on(sim)).toBe(false);
    sim.advance(3000); // release about 5 s after the forcing telegram
    expect(released(sim)).toBe(true);
    expect(sim.channelState("act", "a")).toMatchObject({ forced: null });
    expect(on(sim)).toBe(true);
  });

  it("an explicit release cancels the release time", () => {
    const sim = forcing({});
    sim.groupWrite("usb", "1/1/6", 3);
    sim.advance(2000);
    sim.groupWrite("usb", "1/1/6", 0);
    sim.advance(10_000);
    expect(sim.channelState("act", "a")).toMatchObject({ forced: null });
    expect(released(sim)).toBe(false);
  });

  it("after a bus voltage failure, the forcing holds and the release time runs again in full", () => {
    const sim = forcing({});
    sim.groupWrite("usb", "1/1/6", 3); // forced on
    sim.advance(2000);
    sim.setBusVoltage("L1.1", false);
    sim.advance(4000);
    sim.setBusVoltage("L1.1", true);
    sim.advance(4000); // 4 s after recovery, 10 s after the forcing
    expect(sim.channelState("act", "a")).toMatchObject({ forced: "on" });
    expect(on(sim)).toBe(true);
    sim.advance(2000);
    expect(sim.channelState("act", "a")).toMatchObject({ forced: null });
  });
});
