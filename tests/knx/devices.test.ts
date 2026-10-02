// Behavior cases for switching and shutter actuators:
// Staircase timer, end of override, shutter stop/step, and end-stop travel margin.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import { flags, keypad } from "./helpers";

type J = Record<string, unknown>;
/** A key that sends a one-bit value when pressed. */
const sw = (id: string, ga: string, value: number, dpt = "1.001") => ({
  id,
  ga,
  dpt,
  flags: flags(false, true),
  parameters: { onPress: value ? "on" : "off" },
});
/** A key that sends a value when pressed. */
const val = (id: string, ga: string, value: number, dpt: string) => ({
  id,
  ga,
  dpt,
  port: "value",
  flags: flags(false, true),
  parameters: { function: "value", shortValue: value },
});
const lamp = (params: J = {}) =>
  createSimulator({
    formatVersion: 2,
    lines: [{ address: "1.1" }],
    groupAddresses: [],
    devices: [
      keypad("pushButton", "1.1.1", [
        sw("on", "1/1/1", 1),
        sw("off", "1/1/2", 0),
        val("fon", "1/5/1", 3, "2.001"),
        val("foff", "1/5/1", 2, "2.001"),
        val("fend", "1/5/1", 0, "2.001"),
      ]),
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
      keypad("pushButton", "1.1.1", [
        sw("up", "2/1/1", 0, "1.008"),
        sw("down", "2/1/1", 1, "1.008"),
        sw("step", "2/2/1", 1, "1.007"),
      ]),
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
            {
              id: "lux",
              ga: "1/5/9",
              dpt: "9.004",
              port: "brightness",
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
          inputs: [
            {
              id: "lux",
              type: "number",
              label: "Brightness (lx)",
              object: "lux",
              min: 0,
              max: 2000,
              step: 50,
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

  it("sends the entered brightness and switches on only below its threshold", () => {
    const sim = pir({ brightnessThresholdLux: 500 });
    sim.input("pir", "lux", "value", 800);
    sim.press("pir", "motion", "press");
    sim.advance(3000);
    const sent = () =>
      sim.history.filter((t) => t.ga === "1/1/9").map((t) => t.value);
    expect(sim.history.find((t) => t.ga === "1/5/9")?.value).toBe(800);
    expect(sent()).toEqual([]);
    sim.input("pir", "lux", "value", 300);
    sim.press("pir", "motion", "press");
    sim.advance(3000);
    expect(sent()).toEqual([1]);
    // Once active, a detection extends the presence even when it is bright.
    sim.input("pir", "lux", "value", 900);
    sim.press("pir", "motion", "press");
    sim.advance(8000);
    expect(sent()).toEqual([1]);
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
  const install = (
    statusFlags: J = {},
    feedbackU?: boolean,
    interfaceGAs = "1/1/1 1/4/1",
  ) =>
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
          parameters: { groupAddresses: interfaceGAs },
          objects: [],
        },
        {
          id: "pushButton",
          address: "1.1.1",
          kind: "display",
          behavior: "passive/v1",
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

  it("an address not assigned to the interface is filtered by the line coupler", () => {
    // 1/1/1 is used only on line 1.2: it is not in the filter table of 1.1.0.
    const sim = install({}, undefined, "");
    const tel = sim.groupWrite("usbInterface", "1/1/1", 1)!;
    sim.advance(5000);
    expect(sim.channelState("a", "s1").on).toBe(false);
    expect(tel.plan.couplers.map((c) => c.tag)).toContain("block");
    expect(
      sim.network.filterTable(
        sim.network.topology.couplers.find((c) => c.address === "1.1.0")!,
      ),
    ).not.toContain("1/1/1");
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

  it("a read on a receive-only address is answered on the sending address", () => {
    // The status object sends on 1/4/1 and also listens to 1/4/9.
    const sim = createSimulator({
      formatVersion: 2,
      lines: [{ address: "1.1" }],
      devices: [
        {
          id: "usbInterface",
          address: "1.1.255",
          kind: "interface",
          behavior: "usbInterface/v1",
          objects: [],
        },
        {
          id: "a",
          address: "1.1.1",
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
              ga: ["1/4/1", "1/4/9"],
              dpt: "1.001",
              port: "status",
              channel: "s1",
              flags: { W: false, T: true, R: true },
            },
          ],
          channels: [{ id: "s1", equipment: { type: "lamp" } }],
        },
      ],
    });
    sim.groupWrite("usbInterface", "1/1/1", 1);
    sim.advance(6000);
    sim.groupRead("usbInterface", "1/4/9");
    sim.advance(6000);
    const resp = sim.history.find((t) => t.service === "GroupValueResponse")!;
    expect(resp.ga).toBe("1/4/1");
    expect(resp.value).toBe(1);
  });
});
