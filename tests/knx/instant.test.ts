import { describe, expect, it } from "vitest";
import { buildScenario } from "../../src/knx/scenario";
import { busFrameMs, busTiming } from "../../src/knx/network";
import { layout } from "../../src/knx/layout";
import { flash } from "../../src/ui/animation";
import { resolveOptions } from "../../src/ui/options";
import { createSimulator } from "../../src/core";
import { raw } from "./helpers";

describe("instant speed: telegrams take the time of a TP1 bus", () => {
  it("a switching telegram lasts about 20 ms, a longer value a little more", () => {
    // 9 octets at 9600 bit/s with the bus idle time and the acknowledgement.
    expect(busFrameMs(0)).toBe(20);
    expect(busFrameMs(2)).toBe(23);
    expect(busFrameMs(4)).toBe(25);
    expect(busTiming(0)).toMatchObject({
      emitMs: 20,
      hopMs: 0,
      couplerOutMs: 20,
      receiveMs: 0,
    });
  });

  it("each coupler sends the telegram on once it has received it", () => {
    const sim = createSimulator(raw("full-topology.json"), { timing: "bus" });
    expect(sim.timing).toBe("bus");
    const tel = sim.press("p1", 2, "press")!;
    expect(tel.plan.timing).toBe("bus");
    expect(tel.plan.busMs).toBe(20);
    const lc = tel.plan.couplers.find((c) => c.couplerId === "LC1.1")!;
    expect([lc.tArriveMs, lc.tDecisionMs]).toEqual([20, 20]);
    const c1 = tel.plan.deliveries.find((d) => d.deviceId === "c1")!;
    expect(c1.tDeliverMs).toBe(20);
    // Every receiver has it within a few frames, whatever the couplers crossed.
    expect(tel.plan.endMs).toBeLessThanOrEqual(5 * 20);
    sim.advance(tel.plan.endMs);
    expect(tel.receptions.length).toBeGreaterThan(0);
  });

  it("the timing changes for the telegrams sent afterwards only", () => {
    const sim = createSimulator(raw("full-topology.json"));
    const slow = sim.press("p1", 2, "press")!;
    sim.setTiming("bus");
    const fast = sim.press("p1", 2, "press")!;
    expect(slow.plan.timing).toBe("teaching");
    expect(slow.plan.busMs).toBe(550);
    expect(fast.plan.busMs - fast.plan.t0Ms).toBe(20);
  });

  it("nothing travels on the diagram: the cables reached light up, then fade", () => {
    const sim = createSimulator(raw("full-topology.json"), { timing: "bus" });
    const tel = sim.press("p1", 2, "press")!;
    const topo = sim.network.topology;
    const g = layout(sim.scenario, topo);
    const now = flash(tel.plan, topo, g, tel.plan.endMs);
    expect(now.pills).toEqual([]);
    expect(now.glows.length).toBeGreaterThan(tel.plan.fronts.length - 1);
    expect(flash(tel.plan, topo, g, tel.plan.endMs + 2000).glows).toEqual([]);
  });

  it('a scenario and the element accept "instant"', () => {
    const data = raw("full-topology.json");
    expect(
      buildScenario({ ...data, options: { speed: "instant" } }).options.speed,
    ).toBe("instant");
    expect(() =>
      buildScenario({ ...data, options: { speed: "quick" } }),
    ).toThrow(/options\.speed/);
    const attr = (v: string) => (n: string) => (n === "speed" ? v : null);
    expect(resolveOptions(attr("instant"), null).speed).toBe("instant");
    expect(resolveOptions(attr("0.35"), null).speed).toBe(0.35);
    expect(resolveOptions(() => null, { speed: "instant" }).speed).toBe(
      "instant",
    );
  });
});
