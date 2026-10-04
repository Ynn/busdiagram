// Presence detector: master/slave operation of the catalogue's detectors. A slave detector
// of the same room sends 1 on each detection; the master counts it as its own detection.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../../src/core";
import { v2 } from "../helpers";
import { device, example, setParams, write } from "./conformity-kit";

const P = "pir";
const master = (params: Record<string, unknown> = {}) =>
  example("timers.json", (doc) => {
    setParams(doc, P, { holdMs: 10000, sendOnEnd: true, ...params });
    device(doc, P).inputs = [
      {
        id: "lux",
        type: "number",
        label: "Lux",
        object: "lux",
        min: 0,
        max: 2000,
        step: 10,
      },
    ];
    device(doc, P).objects.push(
      {
        id: "lux",
        name: "Brightness",
        ga: "1/5/8",
        dpt: "9.004",
        port: "brightness",
        flags: { W: false, T: true },
      },
      {
        id: "slave",
        name: "Slave detection",
        ga: "1/5/9",
        dpt: "1.001",
        port: "slaveTrigger",
        flags: { W: true, T: false },
      },
    );
  });

describe("presence detector: master and slave", () => {
  it("a slave detection switches on, and later ones restart the hold time", () => {
    const sim = master();
    write(sim, "1/5/9", 1);
    expect(sim.objectValue(P, "p")).toBe(1);
    sim.advance(6000);
    write(sim, "1/5/9", 1); // restarts the 10 s hold time
    sim.advance(6000);
    expect(sim.objectValue(P, "p")).toBe(1);
    sim.advance(6000);
    expect(sim.objectValue(P, "p")).toBe(0);
  });

  it("a 0 from the slave is not a detection", () => {
    const sim = master();
    write(sim, "1/5/9", 0);
    expect(sim.objectValue(P, "p")).toBe(0);
  });

  it("the brightness threshold applies to slave detections too", () => {
    const sim = master({ brightnessThresholdLux: 300 });
    sim.input(P, "lux", "value", 500);
    sim.advance(1000);
    write(sim, "1/5/9", 1);
    expect(sim.objectValue(P, "p")).toBe(0);
  });
});

describe("presence detector: two detectors, master and slave", () => {
  const detector = (
    id: string,
    address: string,
    parameters: Record<string, unknown>,
    objects: Record<string, unknown>[],
  ) => ({
    id,
    name: id,
    address,
    kind: "presenceDetector",
    behavior: "presenceDetector/v1",
    parameters,
    objects,
    buttons: [
      {
        id: "move",
        label: "Movement",
        icon: "presence",
        press: { object: "p", value: 1 },
      },
    ],
  });
  const room = () =>
    createSimulator(
      v2(
        [
          detector("master", "1.1.1", { holdMs: 10000 }, [
            {
              id: "p",
              ga: "1/1/2",
              dpt: "1.001",
              port: "input",
              flags: { W: false, T: true },
            },
            {
              id: "s",
              ga: "1/1/1",
              dpt: "1.001",
              port: "slaveTrigger",
              flags: { W: true, T: false },
            },
          ]),
          detector("slave", "1.1.2", { slave: true, holdMs: 4000 }, [
            {
              id: "p",
              ga: "1/1/1",
              dpt: "1.001",
              port: "input",
              flags: { W: false, T: true },
            },
          ]),
        ],
        {
          groupAddresses: [
            { address: "1/1/1", dpt: "1.001" },
            { address: "1/1/2", dpt: "1.001" },
          ],
        },
      ),
    );

  it("the slave repeats 1 during its own hold time; the master holds after the last 1", () => {
    const sim = room();
    sim.advance(1000);
    sim.input("slave", "move", "press"); // 1 s: hold of the slave until 5 s
    sim.advance(6000);
    sim.input("slave", "move", "press"); // 7 s: hold of the slave until 11 s
    sim.advance(11_000); // 18 s
    // Last 1 sent at 10 s, received about 1.3 s later: the master holds 10 s more.
    expect(sim.objectValue("master", "p")).toBe(1);
    sim.advance(5000); // 23 s
    expect(sim.objectValue("master", "p")).toBe(0);
    // The slave sends 1 at each first detection and every 3 s during its hold time,
    // and never 0.
    const fromSlave = sim.history.filter((t) => t.sourceDeviceId === "slave");
    expect(fromSlave.map((t) => t.value)).toEqual([1, 1, 1, 1]);
    expect(fromSlave.map((t) => Math.round(t.timeMs / 1000))).toEqual([
      1, 4, 7, 10,
    ]);
  });

  it("a detection during the hold time of the slave restarts it without a new telegram", () => {
    const sim = room();
    sim.input("slave", "move", "press");
    sim.advance(2000);
    sim.input("slave", "move", "press"); // hold until 6 s
    sim.advance(10_000);
    const times = sim.history
      .filter((t) => t.sourceDeviceId === "slave")
      .map((t) => Math.round(t.timeMs / 1000));
    expect(times).toEqual([0, 3]);
  });

  it("without repetition, the slave sends 1 at each detection", () => {
    // A slave alone, with slaveCyclicMs 0.
    const doc = v2(
      [
        detector(
          "slave",
          "1.1.2",
          { slave: true, holdMs: 4000, slaveCyclicMs: 0 },
          [
            {
              id: "p",
              ga: "1/1/1",
              dpt: "1.001",
              port: "input",
              flags: { W: false, T: true },
            },
          ],
        ),
      ],
      { groupAddresses: [{ address: "1/1/1", dpt: "1.001" }] },
    );
    const s = createSimulator(doc);
    s.input("slave", "move", "press");
    s.advance(2000);
    s.input("slave", "move", "press");
    s.advance(8000);
    expect(
      s.history
        .filter((t) => t.sourceDeviceId === "slave")
        .map((t) => Math.round(t.timeMs / 1000)),
    ).toEqual([0, 2]);
  });

  it("after a bus voltage failure, a slave still in its hold time repeats again", () => {
    const sim = room();
    sim.input("slave", "move", "press");
    sim.advance(2000);
    sim.setBusVoltage("L1.1", false);
    sim.advance(1000);
    sim.setBusVoltage("L1.1", true); // 3 s: the hold time runs again
    sim.advance(5000);
    const times = sim.history
      .filter((t) => t.sourceDeviceId === "slave")
      .map((t) => Math.round(t.timeMs / 1000));
    expect(times).toEqual([0, 3, 6]);
  });

  it("a locked slave stops repeating", () => {
    const sim = createSimulator(
      v2(
        [
          detector("slave", "1.1.2", { slave: true, holdMs: 20_000 }, [
            {
              id: "p",
              ga: "1/1/1",
              dpt: "1.001",
              port: "input",
              flags: { W: false, T: true },
            },
            {
              id: "lock",
              ga: "1/1/3",
              dpt: "1.001",
              port: "lock",
              flags: { W: true, T: false },
            },
          ]),
          {
            id: "tool",
            name: "tool",
            address: "1.1.255",
            kind: "interface",
            behavior: "usbInterface/v1",
            objects: [],
          },
        ],
        {
          groupAddresses: [
            { address: "1/1/1", dpt: "1.001" },
            { address: "1/1/3", dpt: "1.001" },
          ],
        },
      ),
    );
    sim.input("slave", "move", "press");
    sim.advance(4000);
    sim.groupWrite("tool", "1/1/3", 1);
    sim.advance(10_000);
    const sent = sim.history.filter((t) => t.sourceDeviceId === "slave");
    expect(sent.map((t) => Math.round(t.timeMs / 1000))).toEqual([0, 3]);
  });
});

describe("presence detector: lock", () => {
  const locked = (params: Record<string, unknown> = {}) =>
    example("timers.json", (doc) => {
      setParams(doc, P, { holdMs: 10000, sendOnEnd: true, ...params });
      device(doc, P).objects.push({
        id: "lock",
        name: "Lock",
        ga: "1/5/7",
        dpt: "1.001",
        port: "lock",
        flags: { W: true, T: false },
      });
    });

  it("a locked detector ignores its detections", () => {
    const sim = locked();
    write(sim, "1/5/7", 1);
    sim.input(P, "passage", "press");
    sim.advance(2000);
    expect(sim.objectValue(P, "p")).toBe(0);
    write(sim, "1/5/7", 0);
    sim.input(P, "passage", "press");
    sim.advance(2000);
    expect(sim.objectValue(P, "p")).toBe(1);
  });

  it("lockStart off: the hold time ends at once with 0", () => {
    const sim = locked({ lockStart: "off" });
    sim.input(P, "passage", "press");
    sim.advance(2000);
    expect(sim.objectValue(P, "p")).toBe(1);
    write(sim, "1/5/7", 1);
    expect(sim.objectValue(P, "p")).toBe(0);
  });

  it("without lockStart, the hold time runs out as usual", () => {
    const sim = locked();
    sim.input(P, "passage", "press");
    sim.advance(2000);
    write(sim, "1/5/7", 1);
    expect(sim.objectValue(P, "p")).toBe(1);
    sim.advance(8000);
    expect(sim.objectValue(P, "p")).toBe(0);
  });

  it("lockStart on, lockEnd off: on while locked, off at the end", () => {
    const sim = locked({ lockStart: "on", lockEnd: "off" });
    write(sim, "1/5/7", 1);
    expect(sim.objectValue(P, "p")).toBe(1);
    sim.advance(15000); // longer than the hold time: still on
    expect(sim.objectValue(P, "p")).toBe(1);
    write(sim, "1/5/7", 0);
    expect(sim.objectValue(P, "p")).toBe(0);
  });

  it("lockEnd on: 1 at the end of the lock, then the hold time", () => {
    const sim = locked({ lockEnd: "on" });
    write(sim, "1/5/7", 1);
    write(sim, "1/5/7", 0);
    expect(sim.objectValue(P, "p")).toBe(1);
    sim.advance(10000);
    expect(sim.objectValue(P, "p")).toBe(0);
  });
});
