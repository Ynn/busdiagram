// Scenes with learning (DPT 18.001), as in the example: three keys for L1, L2, and the
// shutter by hand, two scene keys (short press recalls, long press stores). The switching
// actuator has one central scene object; the shutter actuator a scene object per output.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../../src/core";
import { load } from "../helpers";

describe("scene learning example", () => {
  it("a long press stores the current states; a short press recalls them", () => {
    const sim = load("scene-learning.json");
    const lamp = (ch: string) =>
      sim.equipmentState("switchActuator", ch)?.on === true;
    const shutter = () =>
      Math.round(
        Number(sim.equipmentState("shutterActuator", "sh1")?.positionPct),
      );
    const press = (key: string, kind: "short" | "long", ms = 3000) => {
      sim.press("pushButton", key, kind);
      sim.advance(ms);
    };

    // The configured scenes: 1 = lights on, shutter up; 2 = lights off, shutter down.
    press("in5", "short", 15000);
    expect([lamp("s1"), lamp("s2"), shutter()]).toEqual([false, false, 100]);
    press("in4", "short", 15000);
    expect([lamp("s1"), lamp("s2"), shutter()]).toEqual([true, true, 0]);

    // By hand: L1 off, shutter down for about 4 s of its 10 s travel, then stopped.
    press("in1", "short");
    expect(lamp("s1")).toBe(false);
    sim.press("pushButton", "in3", "long");
    sim.advance(4000);
    press("in3", "short");
    const stopped = shutter();
    expect(stopped).toBeGreaterThan(20);
    expect(stopped).toBeLessThan(60);

    // A long press on Scene 1 stores these states in every output.
    press("in4", "long");
    expect(sim.channelState("switchActuator", "s1").learnedScenes).toEqual({
      "1": 0,
    });
    expect(sim.channelState("switchActuator", "s2").learnedScenes).toEqual({
      "1": 1,
    });
    const learned = sim.channelState("shutterActuator", "sh1")
      .learnedScenes as Record<string, number>;
    expect(Math.abs(learned["1"]! - stopped)).toBeLessThanOrEqual(1);

    // Scene 2 is unchanged; scene 1 now gives the stored states.
    press("in5", "short", 15000);
    expect([lamp("s1"), lamp("s2"), shutter()]).toEqual([false, false, 100]);
    press("in4", "short", 15000);
    expect([lamp("s1"), lamp("s2")]).toEqual([false, true]);
    expect(Math.abs(shutter() - stopped)).toBeLessThanOrEqual(2);
  });

  it("one scene telegram reaches the central object of the switching actuator and the object of the shutter output", () => {
    const sim = load("scene-learning.json");
    sim.press("pushButton", "in5", "short");
    sim.advance(3000);
    const tel = sim.history.filter((t) => t.ga === "3/0/1");
    expect(tel).toHaveLength(1);
    expect(tel[0]!.value).toBe(1); // scene 2, sent as 1
    const objects = tel[0]!.receptions.flatMap((r) =>
      r.objects.map((o) => `${r.deviceId}/${o.objectId}:${o.result}`),
    );
    expect(objects).toEqual(
      expect.arrayContaining([
        "switchActuator/sc:accepted",
        "shutterActuator/sc:accepted",
      ]),
    );
  });
});

describe("a scene not assigned to an output is not learned", () => {
  // Two outputs on one central scene object: A takes part in scene 1, B does not. A
  // learning telegram stores scene 1 in A only; recalling it leaves B as it is.
  type Family = {
    behavior: string;
    kind: string;
    load: Record<string, unknown>;
    port: string;
    dpt: string;
    on: number;
    off: number;
    channelParams?: Record<string, unknown>;
    state: (sim: ReturnType<typeof createSimulator>, ch: string) => number;
    settle: number;
  };
  const families: Record<string, Family> = {
    switch: {
      behavior: "switchActuator/v1",
      kind: "switchActuator",
      load: { type: "lamp" },
      port: "switch",
      dpt: "1.001",
      on: 1,
      off: 0,
      state: (sim, ch) => (sim.equipmentState("act", ch)?.on ? 1 : 0),
      settle: 3000,
    },
    dimmer: {
      behavior: "dimmerActuator/v1",
      kind: "dimmerActuator",
      load: { type: "dimmableLamp" },
      port: "value",
      dpt: "5.001",
      on: 55,
      off: 0,
      state: (sim, ch) =>
        Math.round(Number(sim.equipmentState("act", ch)?.levelPct)),
      settle: 3000,
    },
    dali: {
      behavior: "daliGateway/v1",
      kind: "daliGateway",
      load: { type: "daliGroup", parameters: { ballasts: 1 } },
      port: "value",
      dpt: "5.001",
      on: 55,
      off: 0,
      state: (sim, ch) =>
        Math.round(Number(sim.equipmentState("act", ch)?.levelPct)),
      settle: 3000,
    },
    shutter: {
      behavior: "shutterActuator/v1",
      kind: "shutterActuator",
      load: { type: "shutter", parameters: { actualTravelTimeMs: 10000 } },
      port: "positionCommand",
      dpt: "5.001",
      on: 55,
      off: 0,
      channelParams: { estimatedTravelTimeMs: 10000 },
      state: (sim, ch) =>
        Math.round(Number(sim.equipmentState("act", ch)?.positionPct)),
      settle: 15000,
    },
  };

  const build = (f: Family) =>
    createSimulator({
      formatVersion: 2,
      title: "Scenes",
      lines: [{ address: "1.1" }],
      devices: [
        {
          id: "act",
          address: "1.1.1",
          kind: f.kind,
          behavior: f.behavior,
          channels: ["a", "b"].map((id, i) => ({
            id,
            ...(f.channelParams ? { parameters: f.channelParams } : {}),
            equipment:
              f.kind === "daliGateway"
                ? { ...f.load, parameters: { ballasts: 1, firstAddress: i } }
                : f.load,
            ...(id === "a" ? { scenes: { "1": f.off } } : {}),
          })),
          objects: [
            ...["a", "b"].map((ch, i) => ({
              id: `v${ch}`,
              ga: `1/0/${i + 1}`,
              dpt: f.dpt,
              port: f.port,
              channel: ch,
              flags: { W: true, T: false },
            })),
            {
              id: "sc",
              ga: "3/0/1",
              dpt: "18.001",
              port: "scene",
              flags: { W: true, T: false },
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

  it.each(Object.keys(families))("%s", (name) => {
    const f = families[name]!;
    const sim = build(f);
    const set = (v: number) => {
      sim.groupWrite("usb", "1/0/1", v);
      sim.groupWrite("usb", "1/0/2", v);
      sim.advance(f.settle);
    };
    set(f.on);
    expect([f.state(sim, "a"), f.state(sim, "b")]).toEqual([f.on, f.on]);
    sim.groupWrite("usb", "3/0/1", 128); // store scene 1
    sim.advance(3000);
    expect(sim.channelState("act", "a").learnedScenes).toEqual({ "1": f.on });
    expect(sim.channelState("act", "b").learnedScenes ?? {}).toEqual({});
    set(f.off);
    sim.groupWrite("usb", "3/0/1", 0); // recall scene 1
    sim.advance(f.settle);
    // A takes its learned state; B, not assigned to scene 1, stays as it is.
    expect([f.state(sim, "a"), f.state(sim, "b")]).toEqual([f.on, f.off]);
  });
});
