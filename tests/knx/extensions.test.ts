import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  captureRegistry,
  createSimulator,
  registerBehavior,
  registerEquipment,
} from "../../src/core";
import type { BehaviorDefinition } from "../../src/core";
import "../../site/samples/extensions/delayed-switch.ts";
import { flags, lampOn, load, readJson, v2 } from "./helpers";

const example = () =>
  readJson(
    resolve(
      import.meta.dirname,
      "../../site/samples/extensions/delayed-switch.json",
    ),
  );

describe("delayed-switch extension without engine changes", () => {
  it("switch on after 2 s; 0 cancels; a new 1 starts again", () => {
    const sim = createSimulator(example());
    sim.input("pushButton", "key1", "press"); // received at 1300 → scheduled ignition at 3300
    sim.advance(3299);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(false);
    sim.advance(1);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(true);

    sim.input("pushButton", "key2", "press"); // immediate extinction at reception
    sim.advance(1300);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(false);

    sim.input("pushButton", "key1", "press"); // reception +1300, deadline +3300
    sim.advance(1000);
    sim.input("pushButton", "key2", "press"); // 0 received at +2300: due date cancelled
    sim.advance(10000);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(false);

    sim.input("pushButton", "key1", "press"); // reception +1300
    sim.advance(1500);
    sim.input("pushButton", "key1", "press"); // receipt +2800 : replaces the deadline → +4800
    sim.advance(3299 - 1500);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(false);
    sim.advance(4800 - 3299 - 1);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(false);
    sim.advance(1);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(true);
  });

  it("two instances keep separate state", () => {
    const a = createSimulator(example());
    const b = createSimulator(example());
    a.input("pushButton", "key1", "press");
    a.advance(5000);
    b.advance(5000);
    expect(lampOn(a, "switchActuator", "s1")).toBe(true);
    expect(lampOn(b, "switchActuator", "s1")).toBe(false);
    expect(b.journal.filter((e) => e.kind !== "diagnostic")).toHaveLength(0);
  });

  it("the alternative view only changes the design: same lamp model", () => {
    const sim = createSimulator(example());
    const s2 = sim.scenario.devicesById.get("switchActuator")!.channels[1]!;
    expect(s2.equipmentConfig).toMatchObject({
      type: "lamp",
      view: "ledStrip",
    });
    sim.input("pushButton", "key1", "press");
    sim.advance(5000);
    expect(sim.equipmentState("switchActuator", "s2")).toEqual({ on: true });
  });
});

describe("registries", () => {
  it("duplicate identifiers are rejected", () => {
    expect(() =>
      registerBehavior("switchActuator/v1", {
        ports: {},
        createState: () => ({}),
      }),
    ).toThrow(/already registered/);
    expect(() =>
      registerEquipment("lamp", {
        accepts: "switch",
        create: () => ({}),
        applyCommand: (s) => s,
      }),
    ).toThrow(/already registered/);
  });

  it("a simulation captures registry definitions when created", () => {
    const reg = captureRegistry();
    const data = v2([
      {
        id: "x",
        name: "X",
        address: "1.1.1",
        kind: "generic",
        behavior: "test.late/v1",
        objects: [],
      },
    ]);
    expect(() => createSimulator(data, { registry: reg })).toThrow(
      /unknown behavior/,
    );
    registerBehavior("test.late/v1", { ports: {}, createState: () => ({}) });
    expect(() => createSimulator(data, { registry: reg })).toThrow(
      /unknown behavior/,
    );
    expect(() => createSimulator(data)).not.toThrow();
  });
});

describe("bounded history and event cascades", () => {
  it("more than 200 telegrams: history is limited without losing delivery in progress", () => {
    const sim = load("lighting-control.json");
    for (let i = 0; i < 250; i++) {
      sim.press("pushButton", i % 2 ? 1 : 0, "press");
      sim.advance(1);
    }
    expect(sim.history).toHaveLength(200);
    expect(sim.inFlight().length).toBeGreaterThan(200);
    expect(sim.history[0]!.id).toBe(51);
    sim.advance(5000);
    expect(sim.inFlight()).toHaveLength(0);
    const deliveries = sim.journal.filter(
      (e) => e.kind === "telegram-received" && e.deviceId === "switchActuator",
    );
    expect(deliveries).toHaveLength(250);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(false); // last support: Key 2 (stop)
  });

  const faulty = (id: string, def: BehaviorDefinition<unknown>) => {
    registerBehavior(id, def);
    return createSimulator(
      v2([
        {
          id: "pushButton",
          name: "BP",
          address: "1.1.1",
          kind: "pushButton",
          behavior: "pushButton/v1",
          objects: [
            {
              id: "b",
              name: "B",
              ga: "1/1/1",
              dpt: "1.001",
              port: "input",
              flags: flags(false, true),
            },
          ],
          buttons: [{ id: "b1", press: { object: "b", value: 1 } }],
        },
        {
          id: "x",
          name: "X",
          address: "1.1.2",
          kind: "generic",
          behavior: id,
          objects: [
            {
              id: "i",
              name: "I",
              ga: "1/1/1",
              dpt: "1.001",
              port: "display",
              flags: flags(true, false),
            },
          ],
        },
      ]),
    );
  };

  it("an invalid event cascade stops with a local diagnostic", () => {
    const sim = faulty("test.loop/v1", {
      ports: { display: { dpts: "any" } },
      createState: () => ({ n: 0 }),
      onObjectWrite: (ctx) => ctx.schedule("again", 0),
      onTimer: (ctx) => ctx.schedule("again", 0),
    });
    sim.input("pushButton", "b1", "press");
    expect(() => sim.advance(5000)).not.toThrow();
    expect(sim.fault?.code).toBe("cascade");
    expect(sim.paused).toBe(true);
    expect(sim.timeMs).toBe(1300);
    // The chain of causes goes back to the original gesture.
    const firstTimer = sim.journal.find((e) => e.kind === "timer-fired")!;
    const accepted = sim.journal.find((e) => e.id === firstTimer.causeId)!;
    expect(accepted.kind).toBe("object-write-accepted");
  });

  it("an extension exception pauses only this simulation and reports a diagnostic", () => {
    const sim = faulty("test.throw/v1", {
      ports: { display: { dpts: "any" } },
      createState: () => ({}),
      onObjectWrite: () => {
        throw new Error("boum");
      },
    });
    const other = load("lighting-control.json");
    sim.input("pushButton", "b1", "press");
    sim.advance(5000);
    expect(sim.fault).toMatchObject({
      code: "extension-error",
      deviceId: "x",
      extension: "test.throw/v1",
    });
    expect(sim.fault!.message).toMatch(/boum/);
    other.press("pushButton", 0, "press");
    other.advance(5000);
    expect(lampOn(other, "switchActuator", "s1")).toBe(true);
  });
});

describe("validated and immutable extension definitions", () => {
  it("out-of-range default, unsupported keyword, and unknown DPT are rejected explicitly", () => {
    const base = { ports: {}, createState: () => ({}) };
    expect(() =>
      registerBehavior("test.badDefault/v1", {
        ...base,
        parameters: {
          type: "object",
          properties: { n: { type: "integer", minimum: 0, default: -10 } },
        },
      }),
    ).toThrow(/parameters\.properties\.n\.default: value -10 out of bounds/);
    expect(() =>
      registerBehavior("test.nested/v1", {
        ...base,
        parameters: {
          type: "object",
          properties: { list: { type: "array" as never } },
        },
      }),
    ).toThrow(/type: integer, number, boolean, string, null/);
    expect(() =>
      registerBehavior("test.dpt/v1", {
        ...base,
        ports: { x: { dpts: ["14.068"] } },
      }),
    ).toThrow(/ports\.x\.dpts/);
  });

  it("mutating a definition after registration has no effect", () => {
    const def = {
      ports: { display: { dpts: "any" as const } },
      parameters: {
        type: "object" as const,
        properties: { n: { type: "integer" as const, minimum: 0, default: 1 } },
      },
      createState: () => ({}),
    };
    registerBehavior("test.mutable/v1", def);
    const reg = captureRegistry();
    def.parameters.properties.n.minimum = 99;
    const stored = reg.behaviors.get("test.mutable/v1")!;
    expect(stored.parameters!.properties.n!.minimum).toBe(0);
    expect(Object.isFrozen(stored.parameters!.properties.n)).toBe(true);
  });
});
