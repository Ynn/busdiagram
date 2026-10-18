// A device restarted with another application (a download by ETS): the simulation goes
// on with it, and the other devices keep their state and deadlines.
import { describe, expect, it } from "vitest";
import { buildScenario } from "../../src/knx/scenario";
import { Simulation } from "../../src/knx/sim";
import { captureRegistry } from "../../src/knx/registry";
import {
  changedDevices,
  downloadedDevices,
} from "../../src/knx/changed-devices";
import { raw } from "./helpers";

type Doc = { devices: { id: string; name?: string }[] };

function running() {
  const data = raw("timers.json") as Doc;
  const sim = new Simulation(buildScenario(data));
  // Staircase function of channel 1: off 10 s after it switched on (the telegram takes
  // about 2 s with the teaching timing).
  sim.groupWrite("pushButton", "1/1/1", 1);
  sim.advance(4000);
  return { data, sim };
}
const on = (sim: Simulation) =>
  (sim.output("switchActuator", "s1") as { on?: boolean } | null)?.on ?? false;

describe("devices restarted with another application", () => {
  it("leave the time and the deadlines of the others as they were", () => {
    const { data, sim } = running();
    expect(on(sim)).toBe(true);
    const next = structuredClone(data);
    next.devices.find((d) => d.id === "pir")!.name = "Presence (downloaded)";
    expect(changedDevices(data, next)).toEqual(["pir"]);
    expect(sim.replaceDevices(buildScenario(next), ["pir"])).toBe(true);
    expect(sim.timeMs).toBe(4000);
    expect(sim.scenario.devicesById.get("pir")!.name).toBe(
      "Presence (downloaded)",
    );
    sim.advance(7000);
    expect(on(sim)).toBe(true);
    // The staircase time of the actuator, started before, ends 10 s after it switched on.
    sim.advance(4000);
    expect(on(sim)).toBe(false);
  });

  it("start again themselves: their deadlines end with their former application", () => {
    const { data, sim } = running();
    const next = structuredClone(data);
    next.devices.find((d) => d.id === "switchActuator")!.name = "Actuator";
    expect(sim.replaceDevices(buildScenario(next), ["switchActuator"])).toBe(
      true,
    );
    // Switched on again by the new application at 4 s: its staircase time runs from
    // then; the one of the former application (ending about 13.5 s) is gone.
    sim.groupWrite("pushButton", "1/1/1", 1);
    sim.advance(10500);
    expect(sim.timeMs).toBe(14500);
    expect(on(sim)).toBe(true);
    sim.advance(3000);
    expect(on(sim)).toBe(false);
  });

  it("are the devices ETS downloaded only: another memory, not an edit", () => {
    const before = {
      devices: [{ id: "a" }, { id: "b" }],
      installation: { devices: [{ device: "a", memory: "00" }] },
    };
    const download = {
      devices: [{ id: "a", parameters: { x: 1 } }, { id: "b" }],
      installation: { devices: [{ device: "a", memory: "01" }] },
    };
    expect(downloadedDevices(before, download)).toEqual(["a"]);
    const edit = { ...before, devices: [{ id: "a" }, { id: "b", name: "B" }] };
    expect(changedDevices(before, edit)).toEqual(["b"]);
    expect(downloadedDevices(before, edit)).toBeNull();
  });

  it("is refused for a scenario that differs otherwise", () => {
    const { data, sim } = running();
    const fewer = { ...data, devices: data.devices.slice(1) };
    expect(changedDevices(data, fewer)).toBeNull();
    expect(sim.replaceDevices(buildScenario(fewer), [])).toBe(false);
    expect(changedDevices(data, { ...data, title: "other" })).toBeNull();
    expect(sim.scenario.devices.length).toBe(data.devices.length);
  });

  it("refuses, changing nothing, what its devices are not: a room, an address of another", () => {
    const { data, sim } = running();
    type Raw = {
      rooms?: { temperatureC?: number }[];
      devices: { id: string; objects?: unknown[] }[];
    };
    const raw = data as unknown as Raw;
    if (raw.rooms?.[0]) {
      const warmer = structuredClone(raw);
      warmer.rooms![0]!.temperatureC =
        (warmer.rooms![0]!.temperatureC ?? 20) + 3;
      expect(sim.replaceDevices(buildScenario(warmer), [])).toBe(false);
    }
    // An address given to object c4 of the actuator, the presence detector declared.
    const more = structuredClone(raw) as unknown as {
      devices: { id: string; objects: { id: string; ga?: string }[] }[];
    };
    more.devices
      .find((d) => d.id === "switchActuator")!
      .objects.find((o) => o.id === "c4")!.ga = "1/1/9";
    expect(
      sim.replaceDevices(buildScenario(more as unknown as Doc), ["pir"]),
    ).toBe(false);
    const c4 = () =>
      sim.scenario.devicesById
        .get("switchActuator")!
        .objects.find((o) => o.id === "c4")!.gas;
    expect(c4()).toEqual([]);
    expect(() => sim.getState()).not.toThrow();
    // Declared, the change is followed.
    expect(
      sim.replaceDevices(buildScenario(more as unknown as Doc), [
        "switchActuator",
      ]),
    ).toBe(true);
    expect(c4()).toEqual(["1/1/9"]);
    expect(() => sim.getState()).not.toThrow();
  });

  it("make the state of each device once, and change nothing when it cannot be made", () => {
    const data = raw("timers.json") as {
      devices: { id: string; name?: string; behavior: string }[];
    };
    const registry = captureRegistry();
    const pir = data.devices.find((d) => d.id === "pir")!;
    const real = registry.behaviors.get(pir.behavior)!;
    let made = 0;
    let fail = false;
    const behaviors = new Map(registry.behaviors);
    behaviors.set(pir.behavior, {
      ...real,
      createState: (d) => {
        made++;
        if (fail) throw new Error("no state");
        return real.createState(d);
      },
    });
    const sim = new Simulation(buildScenario(data), {
      registry: { ...registry, behaviors },
    });
    sim.groupWrite("pushButton", "1/1/1", 1);
    sim.advance(4000);
    made = 0;
    const next = structuredClone(data);
    next.devices.find((d) => d.id === "pir")!.name = "Presence (downloaded)";
    expect(sim.replaceDevices(buildScenario(next), ["pir"])).toBe(true);
    expect(made).toBe(1);
    // Its state cannot be made: refused, the scenario, the devices and the time stay.
    const before = sim.getState();
    const again = structuredClone(next);
    again.devices.find((d) => d.id === "pir")!.name = "Presence (again)";
    fail = true;
    expect(sim.replaceDevices(buildScenario(again), ["pir"])).toBe(false);
    expect(sim.scenario.devicesById.get("pir")!.name).toBe(
      "Presence (downloaded)",
    );
    expect(sim.getState()).toEqual(before);
    fail = false;
    sim.advance(7000);
    expect(on(sim)).toBe(true);
    sim.advance(4000);
    expect(on(sim)).toBe(false);
  });
});
