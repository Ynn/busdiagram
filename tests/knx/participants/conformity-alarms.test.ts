// Alarm module and alarm reactions of the switch actuator: stored alarms with trigger and
// reset, the reset refused while the trigger is active, intrusion making the output
// blink, fire forcing it on with priority, and the return when the alarms end.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../../src/core";
import type { Simulation } from "../../../src/knx/sim";
import { v2 } from "../helpers";

const GA = {
  intrusionTrigger: "7/0/1",
  intrusionReset: "7/0/2",
  intrusionState: "7/0/3",
  fireTrigger: "7/1/1",
  fireReset: "7/1/2",
  fireState: "7/1/3",
  lamp: "1/1/1",
};
const obj = (
  id: string,
  port: string,
  ga: string,
  dpt: string,
  W: boolean,
  channel?: string,
) => ({
  id,
  ga: [ga],
  dpt,
  port,
  ...(channel ? { channel } : {}),
  flags: { W, T: !W },
});

/** An alarm module, an actuator whose lamp receives its alarms, and a USB interface. */
function installation(params: Record<string, unknown> = {}) {
  return createSimulator(
    v2(
      [
        {
          id: "alarms",
          name: "Alarm module",
          address: "1.1.1",
          kind: "alarmModule",
          behavior: "alarmModule/v1",
          channels: [{ id: "z1", label: "Zone 1" }],
          objects: [
            obj(
              "it",
              "intrusionTrigger",
              GA.intrusionTrigger,
              "1.005",
              true,
              "z1",
            ),
            obj("ir", "intrusionReset", GA.intrusionReset, "1.015", true, "z1"),
            obj(
              "is",
              "intrusionState",
              GA.intrusionState,
              "1.005",
              false,
              "z1",
            ),
            obj("ft", "fireTrigger", GA.fireTrigger, "1.005", true, "z1"),
            obj("fr", "fireReset", GA.fireReset, "1.015", true, "z1"),
            obj("fs", "fireState", GA.fireState, "1.005", false, "z1"),
          ],
        },
        {
          id: "actuator",
          name: "Switch actuator",
          address: "1.1.2",
          kind: "switchActuator",
          behavior: "switchActuator/v1",
          channels: [
            {
              id: "a",
              label: "Hall",
              parameters: params,
              equipment: { type: "lamp" },
            },
          ],
          objects: [
            obj("sw", "switch", GA.lamp, "1.001", true, "a"),
            obj("ia", "intrusionAlarm", GA.intrusionState, "1.005", true, "a"),
            obj("fa", "fireAlarm", GA.fireState, "1.005", true, "a"),
          ],
        },
        {
          id: "tool",
          name: "USB interface",
          address: "1.1.250",
          kind: "interface",
          behavior: "usbInterface/v1",
          objects: [],
        },
      ],
      {
        lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }],
        groupAddresses: Object.entries(GA).map(([name, address]) => ({
          address,
          name,
          dpt: name.endsWith("Reset")
            ? "1.015"
            : name === "lamp"
              ? "1.001"
              : "1.005",
        })),
      },
    ),
  );
}
const write = (sim: Simulation, ga: string, v: number, ms = 3000) => {
  sim.groupWrite("tool", ga, v);
  sim.advance(ms);
};
const state = (sim: Simulation, kind: "is" | "fs") =>
  sim.objectValue("alarms", kind);
const lamp = (sim: Simulation) => sim.equipmentState("actuator", "a")!.on;

describe("alarm module", () => {
  it("an alarm stays stored after its trigger returns to 0, until it is reset", () => {
    const sim = installation();
    write(sim, GA.intrusionTrigger, 1);
    write(sim, GA.intrusionTrigger, 0);
    expect(state(sim, "is")).toBe(1);
    write(sim, GA.intrusionReset, 1);
    expect(state(sim, "is")).toBe(0);
  });

  it("a reset is refused while the trigger is still active", () => {
    const sim = installation();
    write(sim, GA.fireTrigger, 1);
    write(sim, GA.fireReset, 1);
    expect(state(sim, "fs")).toBe(1);
    expect(sim.journal.some((e) => /reset refused/.test(e.message ?? ""))).toBe(
      true,
    );
    write(sim, GA.fireTrigger, 0);
    write(sim, GA.fireReset, 1);
    expect(state(sim, "fs")).toBe(0);
  });

  it("the alarms are kept through a bus voltage failure", () => {
    const sim = installation();
    write(sim, GA.intrusionTrigger, 1);
    sim.setBusVoltage("L1.1", false);
    sim.advance(1000);
    sim.setBusVoltage("L1.1", true);
    sim.advance(2000);
    expect(state(sim, "is")).toBe(1);
  });
});

describe("switch actuator: alarms", () => {
  it("intrusion: the output blinks and commands are ignored", () => {
    const sim = installation({ blinkMs: 1000 });
    write(sim, GA.intrusionTrigger, 1, 3000);
    const seen = new Set<boolean>();
    for (let i = 0; i < 10; i++) {
      sim.advance(500);
      seen.add(lamp(sim) as boolean);
    }
    expect([...seen].sort()).toEqual([false, true]);
    write(sim, GA.lamp, 0, 2000);
    // Still blinking: the command is stored without effect.
    const again = new Set<boolean>();
    for (let i = 0; i < 6; i++) {
      sim.advance(500);
      again.add(lamp(sim) as boolean);
    }
    expect(again.size).toBe(2);
  });

  it("fire during intrusion: the output is on and steady; fire has priority", () => {
    const sim = installation({ blinkMs: 1000 });
    write(sim, GA.intrusionTrigger, 1, 3000);
    write(sim, GA.fireTrigger, 1, 3000);
    for (let i = 0; i < 6; i++) {
      sim.advance(500);
      expect(lamp(sim)).toBe(true);
    }
  });

  it("the dominant alarm ends while the other remains: the other takes over", () => {
    const sim = installation({ blinkMs: 1000 });
    write(sim, GA.intrusionTrigger, 1, 3000);
    write(sim, GA.fireTrigger, 1, 3000);
    write(sim, GA.fireTrigger, 0);
    write(sim, GA.fireReset, 1, 3000);
    const seen = new Set<boolean>();
    for (let i = 0; i < 8; i++) {
      sim.advance(500);
      seen.add(lamp(sim) as boolean);
    }
    expect(seen.size).toBe(2);
  });

  it("afterAlarm lastCommand: the command received during the alarm applies at its end", () => {
    const sim = installation({ blinkMs: 1000 });
    write(sim, GA.lamp, 1);
    write(sim, GA.intrusionTrigger, 1, 3000);
    write(sim, GA.lamp, 0);
    write(sim, GA.intrusionTrigger, 0);
    write(sim, GA.intrusionReset, 1, 3000);
    expect(lamp(sim)).toBe(false);
  });

  it("afterAlarm previous: back to the state before the alarm", () => {
    const sim = installation({ afterAlarm: "previous" });
    write(sim, GA.lamp, 1);
    write(sim, GA.fireTrigger, 1, 3000);
    write(sim, GA.lamp, 0);
    write(sim, GA.fireTrigger, 0);
    write(sim, GA.fireReset, 1, 3000);
    expect(lamp(sim)).toBe(true);
  });
});
