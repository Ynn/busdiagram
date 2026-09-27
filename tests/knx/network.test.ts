import { describe, expect, it } from "vitest";
import { layout, segLength, segPos } from "../../src/knx/layout";
import type { Geometry } from "../../src/knx/layout";
import { TIMING, buildTopology } from "../../src/knx/network";
import { animate } from "../../src/ui/animation";
import { load } from "./helpers";

describe("logical topology", () => {
  it("canonical order: upper connection, declared devices, lower connections", () => {
    const sim = load("full-topology.json");
    const t = sim.network.topology;
    const ids = (s: string) => t.segments.get(s)!.points.map((p) => p.id);
    // KNXnet/IP routers acting as area couplers: The IP network acts as the backbone.
    expect(t.segments.has("BB")).toBe(false);
    expect(ids("IP")).toEqual(["dev:sup", "cpl:AC1:A", "cpl:AC2:A"]);
    expect(ids("ML1")).toEqual(["cpl:AC1:B", "cpl:LC1.1:A", "cpl:LC1.2:A"]);
    expect(ids("L1.1")).toEqual(["cpl:LC1.1:B", "dev:p1", "dev:c1"]);
    expect(ids("L2.1")).toEqual([
      "cpl:LC2.1:B",
      "dev:p3",
      "dev:c2",
      "cpl:EXT2.1:A",
    ]);
    expect(ids("L2.1b")).toEqual(["cpl:EXT2.1:B", "dev:shutterActuator"]);
    expect(t.couplers.find((c) => c.id === "AC1")).toMatchObject({
      kind: "router",
      address: "1.0.0",
    });
  });

  it("the layout places the points in the logical order", () => {
    for (const f of [
      "full-topology.json",
      "shutter-control.json",
      "object-flags.json",
    ]) {
      const sim = load(f);
      const g = layout(sim.scenario, sim.network.topology);
      sim.network.topology.segments.forEach((sg) => {
        const S = g.segs.get(sg.id)!;
        const u = sg.points.map((p) => segPos(S, g.points.get(p.id)!));
        const sorted = [...u].sort((a, b) => a - b);
        const rev = [...sorted].reverse();
        expect([sorted, rev], `${f} ${sg.id}`).toContainEqual(u);
      });
    }
  });
});

describe("timing is independent of the layout", () => {
  const geometries = (sim: ReturnType<typeof load>): Geometry[] => [
    layout(sim.scenario, sim.network.topology),
    layout(sim.scenario, sim.network.topology, { deviceGap: 180 }),
  ];

  it("different layout dimensions preserve timing, recipients, and state", () => {
    const sim = load("full-topology.json");
    const [g1, g2] = geometries(sim);
    expect(g2!.W).toBeGreaterThan(g1!.W);
    const tel = sim.press("p1", 1, "long")!;
    // The engine never receives geometry; the layout is computed separately.
    expect(
      tel.plan.deliveries.map((d) => [d.deviceId, d.tArriveMs, d.tDeliverMs]),
    ).toEqual(
      sim.network
        .plan("p1", "2/1/1", 0)
        .deliveries.map((d) => [d.deviceId, d.tArriveMs, d.tDeliverMs]),
    );
  });

  it("the telegram markers travel along the cables in both views", () => {
    const sim = load("full-topology.json");
    const topo = buildTopology(sim.scenario);
    const tel = sim.press("p1", 1, "long")!;
    for (const g of geometries(sim)) {
      const front = tel.plan.fronts.find((f) => f.segId === "L1.1")!;
      const S = g.segs.get("L1.1")!;
      const seen: number[] = [];
      for (let t = front.tStartMs + 20; t < front.tStartMs + 600; t += 60) {
        const { pills } = animate(
          tel.plan,
          topo,
          g,
          t,
          g.devices.get("p1")!.at,
          () => null,
        );
        const onBus = pills.filter((p) => Math.abs(p.p[1] - S.a[1]) < 0.01);
        expect(onBus.length).toBeGreaterThan(0);
        // At this y coordinate: the line cable and the line coupler connection.
        const lc = g.couplers.find((c) => c.id === "LC1.1")!;
        onBus.forEach((p) => {
          expect(p.p[0]).toBeGreaterThanOrEqual(lc.c[0] - 0.01);
          expect(p.p[0]).toBeLessThanOrEqual(Math.max(S.a[0], S.b[0]) + 0.01);
        });
        seen.push(Math.max(...onBus.map((p) => p.p[0])));
      }
      // The telegram front advances along the cable through distinct, increasing positions.
      expect(new Set(seen).size).toBeGreaterThan(3);
      expect(seen).toEqual([...seen].sort((a, b) => a - b));
      expect(segLength(S)).toBeGreaterThan(0);
    }
  });

  it("marker travels from sender to receiver; output stays off until delivery", () => {
    const sim = load("lighting-control.json");
    const g = layout(sim.scenario, sim.network.topology);
    const tel = sim.press("pushButton", 0, "press")!;
    const r = tel.plan.deliveries[0]!;
    const at = (t: number) =>
      animate(tel.plan, sim.network.topology, g, t, [0, 0], () => [
        999, 999,
      ]).pills.map((p) => p.p.join(","));
    const samples = [100, tel.plan.busMs + 100, r.tArriveMs + 250].map(at);
    expect(new Set(samples.flat()).size).toBe(samples.flat().length);
    sim.advance(r.tDeliverMs - 1);
    expect(sim.output("switchActuator", "s1")).toEqual({
      type: "switch",
      on: false,
    });
    sim.advance(1);
    expect(sim.output("switchActuator", "s1")).toEqual({
      type: "switch",
      on: true,
    });
  });
});

describe("full topology", () => {
  it("destinations, filtering, and routing counter follow the configured model", () => {
    const sim = load("full-topology.json");
    const local = sim.press("p1", 2, "press")!; // 1/1/1 : stays on line 1.1
    expect(local.plan.deliveries.map((d) => d.deviceId)).toEqual(["c1"]);
    const move = sim.press("p1", 1, "long")!; // 2/1/1 : toward 1.2, area 2, downstream segment, IP
    const tags = Object.fromEntries(
      move.plan.couplers.map((c) => [
        c.couplerId,
        `${c.tag}:${c.rcBefore}→${c.rcAfter}`,
      ]),
    );
    expect(tags).toMatchObject({
      "LC1.1": "pass:6→5",
      AC1: "ip:5→4", // router 1.0.0: toward the IP network
      "LC1.2": "pass:5→4",
      AC2: "ip:4→3", // router 2.0.0: from the IP network
      "LC2.1": "pass:3→2",
      "LC2.2": "block:3→3",
      "EXT2.1": "rep:2→1",
    });
    const rc = Object.fromEntries(
      move.plan.deliveries
        .filter((d) => d.objectIds.length)
        .map((d) => [d.deviceId, d.rc]),
    );
    expect(rc).toEqual({ p2: 4, shutterActuator: 1 });
    // One transmission produces one monitor row, even with multiple fronts.
    expect(sim.history.filter((t) => t.ga === "2/1/1")).toHaveLength(1);
    expect(move.plan.fronts.length).toBeGreaterThan(4);
  });

  it("a mode change affects only subsequent transmissions", () => {
    const sim = load("full-topology.json");
    const first = sim.press("p1", 1, "long")!;
    sim.network.setExtMode("2.1", "segmentCoupler");
    sim.advance(10000);
    expect(first.plan.couplers.find((c) => c.couplerId === "EXT2.1")!.tag).toBe(
      "rep",
    );
    expect(first.receptions.some((r) => r.deviceId === "shutterActuator")).toBe(
      true,
    );
    const second = sim.press("p3", 0, "press")!;
    expect(
      second.plan.couplers.find((c) => c.couplerId === "EXT2.1")!.tag,
    ).toBe("block");
  });

  it("simulated timing: 550 / 250 / 150 + 900 + 150 / 500 ms", () => {
    const sim = load("full-topology.json");
    const tel = sim.press("p1", 2, "press")!;
    const lc = tel.plan.couplers.find((c) => c.couplerId === "LC1.1")!;
    expect(tel.plan.busMs).toBe(TIMING.emitMs);
    expect(lc.tArriveMs).toBe(550 + 250);
    expect(lc.tDecisionMs - lc.tArriveMs).toBe(150 + 900);
    const c1 = tel.plan.deliveries.find((d) => d.deviceId === "c1")!;
    expect([c1.tArriveMs, c1.tDeliverMs]).toEqual([800, 1300]);
  });
});

describe("one event per telegram with chained causes", () => {
  it("command and automatic feedback: one call per telegram with correct IDs and causes", () => {
    const sim = load("status-feedback.json");
    const seen: number[] = [];
    sim.onTelegram((t) => seen.push(t.id));
    sim.press("pushButton", 2, "press");
    sim.advance(10000);
    expect(seen).toEqual(sim.history.map((t) => t.id));
    expect(seen).toEqual([1, 2, 3]); // command, L1 feedback, L2 feedback triggered by L1
    const [cmd, st1] = sim.history;
    const input = sim.journal.find((e) => e.id === cmd!.causeId)!;
    expect(input.kind).toBe("input");
    const timer = sim.journal.find((e) => e.id === st1!.causeId)!;
    expect(timer.kind).toBe("timer-fired");
    const accepted = sim.journal.find((e) => e.id === timer.causeId)!;
    expect(accepted).toMatchObject({
      kind: "object-write-accepted",
      telegramId: cmd!.id,
      objectId: "c1",
    });
    // A device never receives the same telegram twice.
    sim.history.forEach((t) => {
      const devs = t.receptions.map((r) => `${r.deviceId}:${r.internal}`);
      expect(new Set(devs).size).toBe(devs.length);
    });
  });
});
