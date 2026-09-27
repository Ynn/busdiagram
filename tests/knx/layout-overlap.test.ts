// Diagram geometry: cards, key plates, and loads never overlap, and loads stay above the bus.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PLATE_W, layout } from "../../src/knx/layout";
import type { Scenario } from "../../src/knx/scenario";
import { buildScenario } from "../../src/knx/scenario";
import { toV2 } from "../../src/knx/export";
import { activeScenarios, raw, readJson, scenariosDir } from "./helpers";

interface Box {
  id: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

function boxes(s: Scenario) {
  const g = layout(s);
  const out: Box[] = [];
  const above: { id: string; bottom: number; bus: number }[] = [];
  for (const d of s.devices) {
    const b = g.devices.get(d.id)!;
    out.push({
      id: `${d.id} card`,
      x0: b.x,
      x1: b.x + b.w,
      y0: b.top,
      y1: b.top + b.h,
    });
    if (b.plate)
      out.push({
        id: `${d.id} keys`,
        x0: b.plate.x,
        x1: b.plate.x + PLATE_W,
        y0: b.plate.top,
        y1: b.plate.top + b.plate.h,
      });
    for (const l of b.loads) {
      out.push({
        id: `${d.id} load ${l.channel}`,
        x0: l.x,
        x1: l.x + l.w,
        y0: l.top,
        y1: l.top + l.h,
      });
      above.push({
        id: `${d.id} load ${l.channel}`,
        bottom: l.top + l.h,
        bus: b.at[1],
      });
    }
  }
  for (const c of g.couplers)
    out.push({
      id: `coupler ${c.id}`,
      x0: c.c[0] - c.w / 2,
      x1: c.c[0] + c.w / 2,
      y0: c.c[1] - c.h / 2,
      y1: c.c[1] + c.h / 2,
    });
  return { out, above };
}

function expectNoOverlap(s: Scenario) {
  const { out, above } = boxes(s);
  const hits: string[] = [];
  out.forEach((a, i) =>
    out.slice(i + 1).forEach((b) => {
      if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1)
        hits.push(`${a.id} overlaps ${b.id}`);
    }),
  );
  above.forEach((l) => {
    if (l.bottom > l.bus) hits.push(`${l.id} crosses the bus`);
  });
  expect(hits).toEqual([]);
}

describe("diagram layout without overlaps", () => {
  it.each(activeScenarios())("%s", (f) =>
    expectNoOverlap(buildScenario(readJson(resolve(scenariosDir, f)))),
  );

  it("a shutter actuator with four outputs stacks its shutters", () => {
    const doc = toV2(
      buildScenario(raw("shutter-calibrated.json")),
    ) as unknown as {
      groupAddresses: { address: string; name: string; dpt: string }[];
      devices: {
        id: string;
        objects: Record<string, unknown>[];
        channels?: Record<string, unknown>[];
      }[];
    };
    const act = doc.devices.find((d) => d.id === "shutterActuator")!;
    const first = act.channels![0]!;
    for (let i = 2; i <= 4; i++) {
      act.channels!.push({
        ...structuredClone(first),
        id: `s${i}`,
        label: `Shutter S${i}`,
      });
      doc.groupAddresses.push(
        { address: `2/1/${10 + i}`, name: `Movement ${i}`, dpt: "1.008" },
        { address: `2/2/${10 + i}`, name: `Stop ${i}`, dpt: "1.007" },
      );
      act.objects.push(
        {
          id: `move${i}`,
          name: `Movement ${i}`,
          ga: `2/1/${10 + i}`,
          dpt: "1.008",
          port: "move",
          channel: `s${i}`,
          flags: { W: true, T: false },
        },
        {
          id: `stop${i}`,
          name: `Stop ${i}`,
          ga: `2/2/${10 + i}`,
          dpt: "1.007",
          port: "stopStep",
          channel: `s${i}`,
          flags: { W: true, T: false },
        },
      );
    }
    const s = buildScenario(doc);
    expectNoOverlap(s);
    expect(layout(s).devices.get("shutterActuator")!.loads).toHaveLength(4);
  });
});
