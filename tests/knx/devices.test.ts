// Behavior cases for switching and shutter actuators:
// Staircase timer, end of override, shutter stop/step, and end-stop travel margin.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";

type J = Record<string, unknown>;
const key = (id: string, object: string, value: number): J => ({
  id,
  press: { object, value },
});
const out = (id: string, ga: string, dpt = "1.001"): J => ({
  id,
  ga,
  dpt,
  port: "input",
  flags: { W: false, T: true },
});
const lamp = (params: J = {}) =>
  createSimulator({
    formatVersion: 2,
    lines: [{ address: "1.1" }],
    groupAddresses: [],
    devices: [
      {
        id: "pushButton",
        address: "1.1.1",
        kind: "pushButton",
        behavior: "pushButton/v1",
        objects: [
          out("on", "1/1/1"),
          out("off", "1/1/2"),
          out("f", "1/5/1", "2.001"),
        ],
        buttons: [
          key("on", "on", 1),
          key("off", "off", 0),
          key("fon", "f", 3),
          key("foff", "f", 2),
          key("fend", "f", 0),
        ],
      },
      {
        id: "a",
        address: "1.1.2",
        kind: "switchActuator",
        behavior: "switchActuator/v1",
        objects: [
          {
            id: "c",
            ga: ["1/1/1", "1/1/2"],
            dpt: "1.001",
            port: "switch",
            channel: "s1",
            flags: { W: true, T: false },
          },
          {
            id: "k",
            ga: "1/5/1",
            dpt: "2.001",
            port: "forced",
            channel: "s1",
            flags: { W: true, T: false },
          },
        ],
        channels: [
          { id: "s1", parameters: params, equipment: { type: "lamp" } },
        ],
      },
    ],
  });
const on = (sim: ReturnType<typeof lamp>) =>
  sim.channelState("a", "s1").on as boolean;
const offAt = (sim: ReturnType<typeof lamp>) =>
  sim.channelState("a", "s1").offAtMs as number;

describe("staircase timer", () => {
  it("retriggerable by default: one input value of 1 starts a full timer period", () => {
    const sim = lamp({ timerMs: 10000 });
    sim.press("pushButton", "on", "press");
    sim.advance(5000);
    const first = offAt(sim);
    sim.press("pushButton", "on", "press");
    sim.advance(3000);
    expect(offAt(sim)).toBeGreaterThan(first + 4000);
  });

  it("non-retriggerable: writing 1 during the timer has no effect", () => {
    const sim = lamp({ timerMs: 10000, timerRetrigger: "none" });
    sim.press("pushButton", "on", "press");
    sim.advance(5000);
    const first = offAt(sim);
    sim.press("pushButton", "on", "press");
    sim.advance(3000);
    expect(offAt(sim)).toBe(first);
  });

  it("additive mode: each 1 adds a period, up to five periods", () => {
    const sim = lamp({ timerMs: 10000, timerRetrigger: "add" });
    sim.press("pushButton", "on", "press");
    sim.advance(3000);
    const first = offAt(sim);
    sim.press("pushButton", "on", "press");
    sim.advance(3000);
    expect(offAt(sim)).toBe(first + 10000);
    for (let i = 0; i < 6; i++) {
      sim.press("pushButton", "on", "press");
      sim.advance(3000);
    }
    expect(offAt(sim) - sim.timeMs).toBeLessThanOrEqual(50000);
  });

  it("early stop disabled: writing 0 does not stop the timer", () => {
    const sim = lamp({ timerMs: 10000, timerOffAllowed: false });
    sim.press("pushButton", "on", "press");
    sim.advance(3000);
    sim.press("pushButton", "off", "press");
    sim.advance(3000);
    expect(on(sim)).toBe(true);
    sim.advance(10000);
    expect(on(sim)).toBe(false);
  });
});

describe("end warning", () => {
  it("the output opens a second before the end, without status feedback", () => {
    const sim = lamp({ timerMs: 10000, timerWarningMs: 3000 });
    sim.press("pushButton", "on", "press");
    sim.advance(1300 + 7000 + 200);
    expect(sim.output("a", "s1")).toMatchObject({ on: false });
    expect(on(sim)).toBe(true);
    sim.advance(1000);
    expect(sim.output("a", "s1")).toMatchObject({ on: true });
    sim.advance(3000);
    expect(on(sim)).toBe(false);
  });
});

describe("end of priority override", () => {
  for (const [after, expected] of [
    ["lastCommand", false],
    ["on", true],
    ["off", false],
    ["unchanged", true],
    ["toggle", false],
  ] as const)
    it(`${after}: output ${expected ? "closed" : "open"} after the override`, () => {
      const sim = lamp({ afterForcing: after });
      sim.press("pushButton", "fon", "press");
      sim.advance(3000);
      expect(on(sim)).toBe(true);
      sim.press("pushButton", "fend", "press");
      sim.advance(3000);
      expect(on(sim)).toBe(expected);
    });
});

const shutter = (params: J) =>
  createSimulator({
    formatVersion: 2,
    lines: [{ address: "1.1" }],
    groupAddresses: [],
    devices: [
      {
        id: "pushButton",
        address: "1.1.1",
        kind: "pushButton",
        behavior: "pushButton/v1",
        objects: [out("m", "2/1/1", "1.008"), out("s", "2/2/1", "1.007")],
        buttons: [key("up", "m", 0), key("down", "m", 1), key("step", "s", 1)],
      },
      {
        id: "shutterActuator",
        address: "1.1.2",
        kind: "shutterActuator",
        behavior: "shutterActuator/v1",
        objects: [
          {
            id: "m",
            ga: "2/1/1",
            dpt: "1.008",
            port: "move",
            channel: "c",
            flags: { W: true, T: false },
          },
          {
            id: "s",
            ga: "2/2/1",
            dpt: "1.007",
            port: "stopStep",
            channel: "c",
            flags: { W: true, T: false },
          },
        ],
        channels: [
          {
            id: "c",
            parameters: { estimatedTravelTimeMs: 20000, ...params },
            equipment: {
              type: "shutter",
              parameters: { actualTravelTimeMs: 25000 },
            },
          },
        ],
      },
    ],
  });
const real = (sim: ReturnType<typeof shutter>) =>
  Number(sim.equipmentState("shutterActuator", "c")!.positionPct);

describe("shutter actuator", () => {
  it("stop/step with zero step size leaves a stationary shutter unmoved", () => {
    const sim = shutter({ stepPct: 0 });
    sim.press("pushButton", "step", "press");
    sim.advance(5000);
    expect(real(sim)).toBe(0);
  });

  it("extra travel time lets the shutter reach its actual end stop", () => {
    const without = shutter({});
    const withSup = shutter({ endSupplementPct: 30 });
    for (const sim of [without, withSup]) {
      sim.press("pushButton", "down", "press");
      sim.advance(40000);
    }
    // Actual travel takes longer than configured: without extra travel, the shutter stops at 80%.
    expect(real(without)).toBeCloseTo(80, 0);
    expect(real(withSup)).toBe(100);
    // The estimate is already at 100%, but the command still runs with the extra travel time.
    withSup.press("pushButton", "down", "press");
    withSup.advance(3000);
    expect(withSup.channelState("shutterActuator", "c").phase).toBe("moving");
  });
});

describe("presence detector", () => {
  const pir = (extra: J = {}) =>
    createSimulator({
      formatVersion: 2,
      lines: [{ address: "1.1" }],
      groupAddresses: [],
      devices: [
        {
          id: "pir",
          address: "1.1.1",
          kind: "sensor",
          behavior: "presenceDetector/v1",
          parameters: { holdMs: 10000, ...extra },
          objects: [
            {
              id: "p",
              ga: "1/1/9",
              dpt: "1.001",
              port: "input",
              flags: { W: false, T: true },
            },
          ],
          buttons: [
            {
              id: "motion",
              icon: "presence",
              press: { object: "p", value: 1 },
            },
          ],
        },
      ],
    });

  it("options: time delay not restarted, no 0 at the end", () => {
    const sim = pir({ retrigger: false, sendOnEnd: false });
    sim.press("pir", "motion", "press");
    sim.advance(6000);
    sim.press("pir", "motion", "press");
    sim.advance(6000);
    expect(sim.history.map((t) => t.value)).toEqual([1]);
    sim.press("pir", "motion", "press");
    sim.advance(1000);
    expect(sim.history.map((t) => t.value)).toEqual([1, 1]);
  });

  it("send 1 on first detection, nothing on repeated detection, then 0 after the restarted delay", () => {
    const sim = pir();
    sim.press("pir", "motion", "press");
    sim.advance(6000);
    sim.press("pir", "motion", "press");
    sim.advance(6000);
    expect(sim.history.map((t) => t.value)).toEqual([1]);
    sim.advance(6000);
    expect(sim.history.map((t) => t.value)).toEqual([1, 0]);
  });
});

describe("USB interface tool: writing and reading through the USB interface", () => {
  const install = (statusFlags: J = {}, feedbackU?: boolean) =>
    createSimulator({
      formatVersion: 2,
      lines: [{ address: "1.1" }, { address: "1.2" }],
      groupAddresses: [
        { address: "1/1/1", dpt: "1.001" },
        { address: "1/4/1", dpt: "1.001" },
      ],
      devices: [
        {
          id: "usbInterface",
          address: "1.1.255",
          kind: "interface",
          behavior: "usbInterface/v1",
          objects: [],
        },
        {
          id: "pushButton",
          address: "1.1.1",
          kind: "pushButton",
          behavior: "pushButton/v1",
          objects: [
            {
              id: "led",
              ga: "1/4/1",
              dpt: "1.001",
              port: "display",
              flags: {
                W: true,
                T: false,
                ...(feedbackU === undefined ? {} : { U: feedbackU }),
              },
            },
          ],
        },
        {
          id: "a",
          address: "1.2.1",
          kind: "switchActuator",
          behavior: "switchActuator/v1",
          objects: [
            {
              id: "c",
              ga: "1/1/1",
              dpt: "1.001",
              port: "switch",
              channel: "s1",
              flags: { W: true, T: false },
            },
            {
              id: "e",
              ga: "1/4/1",
              dpt: "1.001",
              port: "status",
              channel: "s1",
              flags: { W: false, T: true, ...statusFlags },
            },
          ],
          channels: [{ id: "s1", equipment: { type: "lamp" } }],
        },
      ],
    });

  it("write from 1.1.255 across the line coupler", () => {
    const sim = install();
    const tel = sim.groupWrite("usbInterface", "1/1/1", 1)!;
    expect(tel).toMatchObject({
      service: "GroupValueWrite",
      sourceAddress: "1.1.255",
    });
    sim.advance(5000);
    expect(sim.channelState("a", "s1").on).toBe(true);
    expect(tel.plan.couplers.map((c) => c.tag)).toContain("pass");
  });

  it("read: the status object (default flag R) answers; U updates the indicator light", () => {
    const sim = install();
    sim.groupWrite("usbInterface", "1/1/1", 1);
    sim.advance(6000);
    sim.groupRead("usbInterface", "1/4/1");
    sim.advance(6000);
    const services = sim.history.map((t) => `${t.service}:${t.sourceDeviceId}`);
    expect(services).toContain("GroupValueRead:usbInterface");
    expect(services).toContain("GroupValueResponse:a");
    const resp = sim.history.find((t) => t.service === "GroupValueResponse")!;
    expect(resp.value).toBe(1);
    expect(sim.objectValue("pushButton", "led")).toBe(1);
  });

  it("flag R deactivated: no response; flag U deactivated: response ignored", () => {
    const noR = install({ R: false });
    noR.groupRead("usbInterface", "1/4/1");
    noR.advance(6000);
    expect(noR.history.some((t) => t.service === "GroupValueResponse")).toBe(
      false,
    );

    const noU = install({}, false);
    noU.groupRead("usbInterface", "1/4/1");
    noU.advance(6000);
    expect(noU.history.some((t) => t.service === "GroupValueResponse")).toBe(
      true,
    );
    expect(noU.objectValue("pushButton", "led")).toBe(null);
  });
});
