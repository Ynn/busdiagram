import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { cardHeight, layout } from "../../src/knx/layout";
import { buildTopology } from "../../src/knx/network";
import { buildScenario } from "../../src/knx/scenario";
import {
  LEGACY,
  activeScenarios,
  estPos,
  lampOn,
  load,
  obj,
  on,
  raw,
  readJson,
  realPos,
  scenariosDir,
} from "./helpers";

describe("scenarios provided", () => {
  it.each(activeScenarios())(
    "%s is valid and has no overlapping device cards",
    (f) => {
      const s = buildScenario(readJson(resolve(scenariosDir, f)));
      const g = layout(s);
      const boxes = s.devices.map((d) => {
        const b = g.devices.get(d.id)!;
        return {
          id: d.id,
          x0: b.plate?.x ?? b.x,
          x1: b.x + b.w + (b.loads.length ? 118 : 0),
          y0: b.top,
          y1: b.top + cardHeight(d),
        };
      });
      boxes.forEach((a, i) =>
        boxes.slice(i + 1).forEach((b) => {
          const overlap =
            a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
          expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
        }),
      );
    },
  );
});

describe("compatibility of the six unchanged v1 scenarios", () => {
  it.each(LEGACY)(
    "%s: same devices, gestures, and associations; one address per device",
    (f) => {
      const json = raw(f) as {
        devices: {
          address?: string;
          objects: { ga: string | string[] }[];
          buttons?: unknown[];
          channels?: unknown[];
        }[];
      };
      const s = buildScenario(json);
      expect(s.formatVersion).toBe(1);
      expect(s.devices).toHaveLength(json.devices.length);
      json.devices.forEach((d, i) => {
        const m = s.devices[i]!;
        expect(m.address).toBe(d.address ?? "");
        expect(m.buttons).toHaveLength(d.buttons?.length ?? 0);
        expect(m.channels).toHaveLength(d.channels?.length ?? 0);
        expect(m.objects.map((o) => o.gas)).toEqual(
          d.objects.map((o) =>
            Array.isArray(o.ga) ? o.ga : o.ga ? [o.ga] : [],
          ),
        );
      });
      const ias = s.devices.map((d) => d.address).filter(Boolean);
      expect(new Set(ias).size).toBe(ias.length);
      // The topology contains exactly one point per device.
      const topo = buildTopology(s);
      expect(topo.deviceSegment.size).toBe(s.devices.length);
    },
  );

  it("v1 key identifiers are deterministic and index call is retained", () => {
    const sim = load("lighting-control.json");
    const d = sim.scenario.devicesById.get("pushButton")!;
    expect(d.buttons.map((b) => b.id)).toEqual([
      "button-0",
      "button-1",
      "button-2",
      "button-3",
    ]);
    expect(sim.press("pushButton", 2, "press")?.ga).toBe("1/1/2");
  });

  it("v1: travel and timer are converted to milliseconds, roles to ports", () => {
    const s = buildScenario(raw("timers.json"));
    const switchActuator = s.devicesById.get("switchActuator")!;
    expect(switchActuator.behavior).toBe("switchActuator/v1");
    expect(switchActuator.channels[0]!.parameters).toEqual({
      timerMs: 10000,
      timerRetrigger: "restart",
      timerWarningMs: 0,
      timerOffAllowed: true,
      loadShedding: false,
      relayMode: "normallyOpen",
      statusDelayMs: 300,
      onDelayMs: 0,
      offDelayMs: 0,
      lockStart: "unchanged",
      afterLock: "lastCommand",
      logicOperation: "and",
      sceneLearning: true,
      busFailure: "unchanged",
      busRecovery: "previous",
      afterForcing: "lastCommand",
    });
    expect(switchActuator.channels[1]!.parameters.timerMs).toBeNull();
    const shutterActuator = buildScenario(
      raw("shutter-control.json"),
    ).devicesById.get("shutterActuator")!;
    expect(shutterActuator.channels[0]!.parameters.estimatedTravelTimeMs).toBe(
      10000,
    );
    expect(
      shutterActuator.channels[0]!.equipmentConfigs[0]?.parameters
        .actualTravelTimeMs,
    ).toBe(10000);
    expect(shutterActuator.objects.map((o) => o.port)).toEqual([
      "move",
      "stopStep",
      "positionStatus",
    ]);
    // "position" remains feedback: T is enabled, never a setpoint.
    expect(shutterActuator.objects[2]!.flags).toMatchObject({
      W: true,
      T: true,
      R: true,
    });
    expect(shutterActuator.objects[0]!.flags).toMatchObject({
      W: true,
      T: false,
      R: false,
    });
  });
});

describe("lighting control", () => {
  it("only one telegram controls four outputs", () => {
    const sim = load("lighting-control.json");
    sim.press("pushButton", 0, "press"); // Key 1 : L1 + L2
    sim.advance(5000);
    expect(
      ["s1", "s2", "s3", "s4"].map((c) => on(sim, "switchActuator", c)),
    ).toEqual([true, true, false, false]);
    sim.press("pushButton", 1, "press"); // Key 2: switch off L1 + L2
    sim.advance(5000);
    sim.press("pushButton", 2, "press"); // Key 3: L1 through L4
    sim.advance(5000);
    expect(sim.history).toHaveLength(3);
    expect(
      ["s1", "s2", "s3", "s4"].map((c) => lampOn(sim, "switchActuator", c)),
    ).toEqual([true, true, true, true]);
    // Key 4 shares 1/1/2 in the same device; its object follows through the internal link.
    expect(obj(sim, "pushButton", "key4")).toBe(1);
  });

  it("the output remains inactive until the telegram reaches the object", () => {
    const sim = load("lighting-control.json");
    const tel = sim.press("pushButton", 0, "press")!;
    const r = tel.plan.deliveries.find((x) => x.deviceId === "switchActuator")!;
    expect(r.tArriveMs).toBe(tel.plan.busMs + 250);
    expect(r.tDeliverMs).toBe(r.tArriveMs + 500);
    sim.advance(r.tDeliverMs - 1);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(false);
    sim.advance(1);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(true);
  });
});

describe("topology: couplers, routing counter, and IP", () => {
  it("a local command is filtered by the line coupler", () => {
    const sim = load("full-topology.json");
    const tel = sim.press("p1", 2, "press")!;
    expect(tel.ga).toBe("1/1/1");
    expect(tel.plan.couplers.find((e) => e.couplerId === "LC1.1")!.tag).toBe(
      "block",
    );
  });

  it("status feedback reaches the supervisor as routing counter falls from 6 to 4", () => {
    const sim = load("full-topology.json");
    sim.press("p1", 2, "press");
    sim.advance(20000);
    expect(obj(sim, "sup", "l1")).toBe(1);
    const status = sim.history.find((t) => t.ga === "1/4/1")!;
    expect(status.kind).toBe("state");
    expect(status.plan.deliveries.find((x) => x.deviceId === "sup")!.rc).toBe(
      4,
    );
    expect(status.plan.couplers.map((e) => `${e.couplerId}:${e.tag}`)).toEqual(
      expect.arrayContaining(["LC1.1:pass", "AC1:ip"]),
    );
  });

  it("repeater: copying without filtering; segment coupler: filter", () => {
    const sim = load("full-topology.json");
    let tel = sim.press("p3", 0, "press")!;
    expect(tel.plan.couplers.find((e) => e.couplerId === "EXT2.1")!.tag).toBe(
      "rep",
    );
    sim.advance(20000);
    sim.network.setExtMode("2.1", "segmentCoupler");
    tel = sim.press("p3", 0, "press")!;
    expect(tel.plan.couplers.find((e) => e.couplerId === "EXT2.1")!.tag).toBe(
      "block",
    );
  });

  it("long press: the shutter goes down and then returns its estimated position", () => {
    const sim = load("full-topology.json");
    sim.press("p1", 1, "long");
    sim.advance(30000);
    expect(estPos(sim, "shutterActuator", "shutter1")).toBe(100);
    expect(realPos(sim, "shutterActuator", "shutter1")).toBe(100);
    expect(obj(sim, "sup", "pos")).toBe(100);
    // The push button object at 1.2.10 heard the down command on 2/1/1; its next long press reverses direction.
    expect(obj(sim, "p2", "md")).toBe(1);
    expect(sim.press("p2", 0, "long")!.value).toBe(0);
  });
});

describe("status feedback and toggle switches", () => {
  it("status feedback resynchronizes a toggle object when delivered", () => {
    const sim = load("status-feedback.json");
    sim.press("pushButton", 1, "press"); // L1–L4 group → 1
    sim.advance(5000);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(true);
    expect(obj(sim, "pushButton", "key1")).toBe(0); // Key 1 n'a rien entendu
    expect(obj(sim, "pushButton", "key3")).toBe(1); // Key 3 received feedback on 1/4/1
    expect(sim.press("pushButton", 0, "press")!.value).toBe(1); // Key 1 sends 1 again without a visible effect
    sim.advance(5000);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(true);
    expect(sim.press("pushButton", 2, "press")!.value).toBe(0); // Key 3 switches off on the first press
    sim.advance(5000);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(false);
  });

  it("toggle uses its local value and waits for feedback to resynchronize", () => {
    const sim = load("status-feedback.json");
    sim.press("pushButton", 2, "press"); // Key 3 → 1
    const tStatus = () => sim.history.filter((t) => t.ga === "1/4/1");
    sim.advance(1200); // command delivered; feedback not yet delivered
    expect(obj(sim, "pushButton", "key3")).toBe(1);
    sim.advance(5000);
    expect(tStatus()).toHaveLength(1);
    // Key 3 transmits on 1/1/1; Key 1's object in the same device follows through the internal link.
    expect(obj(sim, "pushButton", "key1")).toBe(1);
    // Three Key 1 presses: 0 (off), 1 (on), 0 (off).
    const values = [0, 1, 2].map(() => {
      const v = sim.press("pushButton", 0, "press")!.value;
      sim.advance(5000);
      return v;
    });
    expect(values).toEqual([0, 1, 0]);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(false);
    // Key 3 received each feedback value and is resynchronized.
    expect(obj(sim, "pushButton", "key3")).toBe(0);
  });

  it("L1 feedback controls L2 through an internal link without echoing itself", () => {
    const sim = load("status-feedback.json");
    sim.press("pushButton", 0, "press");
    sim.advance(5000);
    expect(lampOn(sim, "switchActuator", "s2")).toBe(true);
    expect(lampOn(sim, "switchActuator", "s3")).toBe(false);
    const status = sim.history.find((t) => t.ga === "1/4/1")!;
    const internal = status.receptions.filter((r) => r.internal);
    expect(internal).toHaveLength(1);
    expect(internal[0]!.objects.map((o) => o.objectId)).toEqual(["c2"]);
    // Sender object e1 is not rewritten by its own transmission, preventing a feedback loop.
    expect(sim.history.filter((t) => t.ga === "1/4/1")).toHaveLength(1);
  });
});

describe("shutters, scenes and timers", () => {
  it("shutter control: Key 4 sends down the shutter and lights L1 with a single telegram", () => {
    const sim = load("shutter-control.json");
    sim.press("pushButton", 3, "press");
    sim.advance(20000);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(true);
    expect(realPos(sim, "shutterActuator", "shutter1")).toBe(100);
    expect(obj(sim, "sup", "pos")).toBe(100);
  });

  it("scenes apply to each channel", () => {
    const sim = load("scenes.json");
    sim.press("pushButton", 1, "press");
    sim.advance(20000);
    expect(realPos(sim, "shutterActuator", "shutter1")).toBe(100);
    sim.press("pushButton", 0, "press");
    sim.advance(20000);
    expect(on(sim, "switchActuator", "s1")).toBe(true);
    expect(on(sim, "switchActuator", "s3")).toBe(false);
    expect(realPos(sim, "shutterActuator", "shutter1")).toBe(0);
  });

  it("the timer switches off locally and sends status feedback", () => {
    const sim = load("timers.json");
    sim.press("pushButton", 0, "press");
    sim.advance(5000);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(true);
    sim.advance(10000);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(false);
    expect(
      sim.history.filter((t) => t.ga === "1/4/1").map((t) => t.value),
    ).toEqual([1, 0]);
  });

  it("timers switch off at the exact deadline even with a large time step", () => {
    const sim = load("timers.json");
    sim.press("pushButton", 0, "press");
    sim.advance(20000);
    expect(lampOn(sim, "switchActuator", "s1")).toBe(false);
    const off = sim.journal.find(
      (e) =>
        e.kind === "output-changed" &&
        e.channelId === "s1" &&
        e.message === "relay open",
    )!;
    // Delivered at 1800 ms (550 + 3 × 250 + 500); switches off at 1800 + 10,000.
    expect(off.timeMs).toBe(11800);
  });
});

describe("step by step", () => {
  it("stops on the explanatory events, in order", () => {
    const sim = load("full-topology.json");
    sim.press("p1", 2, "press");
    const kinds: string[] = [];
    for (let i = 0; i < 4; i++) {
      const stop = sim.stepToNextEvent()!;
      kinds.push(
        stop.events
          .map((e) => `${e.kind}:${e.couplerId ?? e.deviceId}`)
          .join("+"),
      );
    }
    // The nearby switch receives first (1300 ms) and prepares feedback (1600 ms),
    // then the line coupler completes filtering at 1850 ms.
    expect(kinds[0]).toMatch(/^object-write-accepted:c1\+output-changed:c1/);
    expect(kinds[1]).toBe("timer-fired:c1+telegram-emitted:c1");
    expect(kinds[2]).toBe("coupler-decision:LC1.1");
  });
});

describe("group reads (KNX Application Layer)", () => {
  it("a device sends one response, from its first object with R, on its sending address", async () => {
    const { createSimulator } = await import("../../src/core");
    const sim = createSimulator({
      formatVersion: 2,
      title: "Read",
      lines: [{ address: "1.1" }],
      groupAddresses: [
        { address: "1/1/1", name: "Status", dpt: "1.001" },
        { address: "1/1/2", name: "Other", dpt: "1.001" },
      ],
      devices: [
        {
          id: "p",
          address: "1.1.1",
          kind: "generic",
          behavior: "passive/v1",
          objects: [
            {
              id: "a",
              ga: ["1/1/2", "1/1/1"],
              dpt: "1.001",
              port: "display",
              value: 1,
              flags: { R: true, W: true, T: false },
            },
            {
              id: "b",
              ga: "1/1/1",
              dpt: "1.001",
              port: "display",
              value: 0,
              flags: { R: true, W: true, T: false },
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
    const responses: { ga: string; value: unknown }[] = [];
    sim.onTelegram(
      (t) =>
        t.service === "GroupValueResponse" &&
        responses.push({ ga: t.ga, value: t.value }),
    );
    sim.groupRead("usb", "1/1/1");
    sim.advance(5000);
    // "a" comes first in the table: it answers on its sending address 1/1/2; "b" stays silent.
    expect(responses).toEqual([{ ga: "1/1/2", value: 1 }]);
  });
});
