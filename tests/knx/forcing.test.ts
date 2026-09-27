import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import { buildFrame } from "../../src/knx/format";
import type { ScenarioError } from "../../src/knx/scenario";
import { buildScenario } from "../../src/knx/scenario";
import { lampOn, load, obj, raw } from "./helpers";

type Data = {
  devices: {
    objects: Record<string, unknown>[];
    buttons?: Record<string, unknown>[];
    channels?: { parameters?: Record<string, unknown> }[];
  }[];
};
const variant = (afterForcing: string) => {
  const d = raw("priority-control.json") as unknown as Data;
  d.devices[1]!.channels![3]!.parameters = { afterForcing };
  return createSimulator(d);
};
const status = (sim: ReturnType<typeof load>) =>
  sim.history.filter((t) => t.ga === "1/4/4").map((t) => [t.timeMs, t.value]);

describe("Priority override (DPT 2.001 and timers)", () => {
  it("forced off stores a switch command and applies it when the override ends", () => {
    const sim = load("priority-control.json");
    sim.input("pushButton", "key4", "press"); // received at 1300: L4 lit
    sim.advance(5000);
    expect(lampOn(sim, "switchActuator", "s4")).toBe(true);
    expect(obj(sim, "pushButton", "key4")).toBe(1);

    sim.input("pushButton", "key3", "short"); // 2 = forced stop, received at 6300
    sim.advance(3000);
    expect(lampOn(sim, "switchActuator", "s4")).toBe(false);
    expect(sim.channelState("switchActuator", "s4")).toMatchObject({
      forced: "off",
    });
    expect(obj(sim, "pushButton", "key4")).toBe(0); // resynchronized by status return

    const [tel] = sim.input("pushButton", "key4", "press"); // Switch: Sends 1, received to 9300
    expect(tel!.value).toBe(1);
    sim.advance(3000);
    expect(lampOn(sim, "switchActuator", "s4")).toBe(false);
    expect(sim.channelState("switchActuator", "s4")).toMatchObject({
      forced: "off",
      commanded: true,
    });
    expect(
      sim.journal.some(
        (e) => e.kind === "note" && /forced/.test(e.message ?? ""),
      ),
    ).toBe(true);

    sim.input("pushButton", "key3", "long"); // 0 = end of priority override, received at 12300
    sim.advance(5000);
    expect(lampOn(sim, "switchActuator", "s4")).toBe(true);
    expect(status(sim)).toEqual([
      [1600, 1],
      [6600, 0],
      [12600, 1],
    ]);
  });

  it("end of priority override: last command, forward state, or forced state retained", () => {
    const run = (after: string) => {
      const sim = variant(after);
      sim.input("pushButton", "key4", "press"); // working before forcing
      sim.advance(5000);
      sim.input("pushButton", "key3", "short");
      sim.advance(5000);
      sim.input("pushButton", "key4", "press"); // stop during forcing (seeing resynchronized to 0 → sends 1 ?)
      sim.advance(5000);
      sim.input("pushButton", "key3", "long");
      sim.advance(5000);
      return lampOn(sim, "switchActuator", "s4");
    };
    // The Key 4 light is 0 during the forcing: the remote switch sends 1 (on).
    expect(run("lastCommand")).toBe(true);
    expect(run("previous")).toBe(true);
    expect(run("unchanged")).toBe(false);
  });

  it("forced on (value 3) prevents the timer from switching off", () => {
    const d = raw("priority-control.json") as unknown as Data;
    d.devices[0]!.buttons![0]!.short = { object: "key3", value: 3 };
    d.devices[1]!.channels![3]!.parameters = { timerMs: 2000 };
    const sim = createSimulator(d);
    sim.input("pushButton", "key4", "press"); // on command with a 2 s timer
    sim.input("pushButton", "key3", "short"); // Forced march
    sim.advance(10000);
    expect(lampOn(sim, "switchActuator", "s4")).toBe(true);
    expect(sim.channelState("switchActuator", "s4")).toMatchObject({
      forced: "on",
      commanded: false,
    });
    sim.input("pushButton", "key3", "long");
    sim.advance(5000);
    expect(lampOn(sim, "switchActuator", "s4")).toBe(false);
  });

  it("telegram: two bits in the APCI", () => {
    expect(buildFrame("1.1.1", "1/5/4", 2, "2.001")[4]!.bytes).toEqual([
      0x00, 0x82,
    ]);
    expect(buildFrame("1.1.1", "1/5/4", 3, "2.001")[3]!.bytes).toEqual([0xe1]);
  });

  it("validation: port DPT and value range", () => {
    const d = raw("priority-control.json") as unknown as Data;
    d.devices[1]!.objects[1]!.dpt = "1.001";
    d.devices[0]!.buttons![0]!.short = { object: "key3", value: 4 };
    try {
      buildScenario(d);
      expect.unreachable();
    } catch (e) {
      const paths = (e as ScenarioError).details.map(
        (p) => `${p.path} [${p.code}]`,
      );
      expect(paths).toEqual(
        expect.arrayContaining([
          "devices[1].objects[1].dpt [dpt]",
          "devices[0].buttons[0].short.value [range]",
        ]),
      );
    }
  });
});
