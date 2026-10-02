// Topology conforming to KNX technical documentation:
// optional levels, coupler addresses, KNXnet/IP routers, filtering settings.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import { toV2 } from "../../src/knx/export";
import { layout, segPos } from "../../src/knx/layout";
import type { ScenarioError } from "../../src/knx/scenario";
import { buildScenario } from "../../src/knx/scenario";
import { keypad } from "./helpers";

type J = Record<string, unknown>;
const pushButton = (id: string, address: string, ga = "1/1/1"): J =>
  keypad(id, address, [{ id: "b", object: "o", ga }]);
const act = (id: string, address: string, ga = "1/1/1"): J => ({
  id,
  address,
  kind: "switchActuator",
  behavior: "switchActuator/v1",
  objects: [
    {
      id: "c",
      ga,
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
      flags: { W: false, T: true },
    },
  ],
  channels: [{ id: "s1", equipment: { type: "lamp" } }],
});
const sup = (extra: J = {}): J => ({
  id: "sup",
  kind: "supervisor",
  medium: "IP",
  behavior: "display/v1",
  objects: [
    {
      id: "l",
      ga: "1/4/1",
      dpt: "1.001",
      port: "display",
      flags: { W: true, T: false },
    },
  ],
  ...extra,
});
const doc = (lines: string[], devices: J[], topology?: J): J => ({
  formatVersion: 2,
  lines: lines.map((address) => ({ address })),
  groupAddresses: [],
  devices,
  ...(topology ? { topology } : {}),
});
const problems = (raw: J) => {
  try {
    buildScenario(raw);
    return [];
  } catch (e) {
    return (e as ScenarioError).details.map((p) => `${p.path} [${p.code}]`);
  }
};
const couplers = (raw: J) =>
  createSimulator(raw).network.topology.couplers.map(
    (c) => `${c.id}:${c.kind}:${c.address}`,
  );

describe("topology levels", () => {
  it("without topology settings: one line, a main line for two lines, and a backbone for two areas", () => {
    expect(couplers(doc(["1.1"], [pushButton("p", "1.1.1")]))).toEqual([]);
    expect(couplers(doc(["1.1", "1.2"], [pushButton("p", "1.1.1")]))).toEqual([
      "LC1.1:line:1.1.0",
      "LC1.2:line:1.2.0",
    ]);
    expect(couplers(doc(["1.1", "2.1"], [pushButton("p", "1.1.1")]))).toEqual([
      "AC1:area:1.0.0",
      "AC2:area:2.0.0",
      "LC1.1:line:1.1.0",
      "LC2.1:line:2.1.0",
    ]);
  });

  it("mainLines: main line and line coupler exist with one line and an A.0.x device", () => {
    const raw = doc(["1.1"], [pushButton("p", "1.0.5"), act("a", "1.1.1")], {
      mainLines: true,
    });
    expect(couplers(raw)).toEqual(["LC1.1:line:1.1.0"]);
    const sim = createSimulator(raw);
    expect(sim.network.topology.deviceSegment.get("p")).toBe("ML1");
    const tel = sim.press("p", 0, "press")!;
    expect(tel.plan.couplers.map((c) => `${c.couplerId}:${c.tag}`)).toEqual([
      "LC1.1:pass",
    ]);
    expect(tel.plan.deliveries.find((d) => d.deviceId === "a")!.rc).toBe(5);
  });

  it("backbone and area coupler appear even with one area and a 0.0.x device", () => {
    const raw = doc(["1.1"], [pushButton("p", "0.0.3"), act("a", "1.1.1")], {
      backbone: true,
    });
    expect(couplers(raw)).toEqual(["AC1:area:1.0.0", "LC1.1:line:1.1.0"]);
    const tel = createSimulator(raw).press("p", 0, "press")!;
    expect(tel.plan.deliveries.find((d) => d.deviceId === "a")!.rc).toBe(4);
  });

  it("A.0 and 0.0 need no line declaration; devices require their topology level", () => {
    expect(problems(doc(["1.0"], []))).toEqual(["lines[0].address [address]"]);
    expect(problems(doc(["0.1"], []))).toEqual(["lines[0].address [address]"]);
    expect(problems(doc(["1.1"], [pushButton("p", "1.0.5")]))).toEqual([
      "devices[0].address [reference]",
    ]);
    expect(problems(doc(["1.1"], [pushButton("p", "0.0.5")]))).toEqual([
      "devices[0].address [reference]",
    ]);
    // Address 0 on a line belongs to its coupler.
    expect(problems(doc(["1.1", "1.2"], [pushButton("p", "1.1.0")]))).toContain(
      "devices[0].address [address]",
    );
  });

  it("the layout places each point on its cable, in logical order", () => {
    for (const raw of [
      doc(
        ["1.1"],
        [
          pushButton("p", "1.0.5"),
          pushButton("q", "1.0.6", "1/1/2"),
          act("a", "1.1.1"),
        ],
        {
          mainLines: true,
        },
      ),
      doc(["1.1", "2.1"], [pushButton("p", "0.0.3"), act("a", "1.1.1")]),
      doc(["1.1", "1.2"], [sup(), act("a", "1.1.1")], { ip: "lineCouplers" }),
      doc(["1.1", "2.1"], [sup(), act("a", "2.1.1")], { ip: "areaCouplers" }),
    ]) {
      const sim = createSimulator(raw);
      const g = layout(sim.scenario, sim.network.topology);
      sim.network.topology.segments.forEach((sg) => {
        const S = g.segs.get(sg.id)!;
        const u = sg.points.map((p) => segPos(S, g.points.get(p.id)!));
        const sorted = [...u].sort((a, b) => a - b);
        expect([sorted, [...sorted].reverse()], sg.id).toContainEqual(u);
      });
    }
  });
});

describe("KNXnet/IP routers", () => {
  it("areaCouplers: one A.0.0 router per area, with IP as the backbone", () => {
    const raw = doc(["1.1", "2.1"], [sup(), act("a", "1.1.1")], {
      ip: "areaCouplers",
    });
    expect(couplers(raw)).toEqual([
      "AC1:router:1.0.0",
      "AC2:router:2.0.0",
      "LC1.1:line:1.1.0",
      "LC2.1:line:2.1.0",
    ]);
    expect(createSimulator(raw).network.topology.segments.has("BB")).toBe(
      false,
    );
  });

  it("lineCouplers: one A.L.0 router per line, without TP main lines or backbone", () => {
    const raw = doc(["1.1", "1.2"], [sup(), act("a", "1.1.1")], {
      ip: "lineCouplers",
    });
    expect(couplers(raw)).toEqual(["LC1.1:router:1.1.0", "LC1.2:router:1.2.0"]);
    expect(
      problems(doc(["1.1"], [], { ip: "lineCouplers", mainLines: true })),
    ).toEqual(["topology.ip [conflict]"]);
  });

  it("legacy ipRouter setting is accepted only at a coupler address", () => {
    const one = { ...doc(["1.1"], [sup()]), ipRouter: { address: "1.1.0" } };
    expect(couplers(one)).toEqual(["LC1.1:router:1.1.0"]);
    const bad = { ...doc(["1.1"], [sup()]), ipRouter: { address: "1.1.250" } };
    expect(problems(bad)).toEqual(["ipRouter.address [address]"]);
    const zones = {
      ...doc(["1.1", "2.1"], [sup()]),
      ipRouter: { address: "1.0.0" },
    };
    expect(problems(zones)).toEqual(["ipRouter.address [address]"]);
  });

  it("an IP device requires an IP network", () => {
    expect(problems(doc(["1.1"], [sup()]))).toEqual([
      "devices[0].medium [reference]",
    ]);
  });
});

describe("coupler parameters and visualization", () => {
  const install = (topology: J, supExtra: J = {}) =>
    createSimulator(
      doc(
        ["1.1", "1.2"],
        [pushButton("p", "1.1.1"), act("a", "1.1.2"), sup(supExtra)],
        {
          ip: "lineCouplers",
          ...topology,
        },
      ),
    );
  const toIp = (sim: ReturnType<typeof install>) => {
    sim.press("p", 0, "press");
    sim.advance(20000);
    const st = sim.history.find((t) => t.ga === "1/4/1")!;
    return st.plan.couplers.find((c) => c.couplerId === "LC1.1")!.tag;
  };

  it("normal filtering sends status feedback to the declared supervisor", () => {
    expect(toIp(install({}))).toBe("ip");
  });

  it("without an project dummy device, the router blocks unknown group addresses", () => {
    const sim = install({}, { inFilterTables: false });
    expect(toIp(sim)).toBe("block");
    expect(sim.network.filterTable(sim.network.coupler("LC1.1")!)).toEqual([]);
  });

  it("route setting forwards all traffic without an project dummy device", () => {
    const sim = install(
      { couplers: [{ address: "1.1.0", up: "route" }] },
      { inFilterTables: false },
    );
    expect(toIp(sim)).toBe("ip");
  });

  it("block parameter: nothing goes in this direction", () => {
    const sim = install({ couplers: [{ address: "1.1.0", up: "block" }] });
    expect(toIp(sim)).toBe("block");
  });

  it("invalid coupler setting identifies its field", () => {
    expect(
      problems(
        doc(["1.1"], [], { couplers: [{ address: "1.1.0", down: "all" }] }),
      ),
    ).toEqual(["topology.couplers[0].address [reference]"]);
    expect(
      problems(
        doc(["1.1", "1.2"], [], {
          couplers: [{ address: "1.1.0", down: "all" }],
        }),
      ),
    ).toEqual(["topology.couplers[0].down [enum]"]);
  });

  it("toV2 preserves topology and project declaration", () => {
    const raw = doc(
      ["1.1", "2.1"],
      [pushButton("p", "0.0.3"), sup({ inFilterTables: false })],
      {
        backbone: true,
        ip: "areaCouplers",
        areas: [{ address: 2, name: "Building B" }],
        couplers: [{ address: "2.0.0", down: "route" }],
      },
    );
    // backbone + areaCouplers: IP serves as the backbone; device 0.0.x does not belong there.
    expect(problems(raw)).toEqual(["devices[0].address [reference]"]);
    const ok = { ...raw, devices: [sup({ inFilterTables: false })] };
    const back = toV2(buildScenario(ok)) as unknown as J;
    expect(back.topology).toEqual({
      backbone: true,
      ip: "areaCouplers",
      areas: [{ address: 2, name: "Building B" }],
      couplers: [{ address: "2.0.0", down: "route" }],
    });
    expect((back.devices as J[])[0]!.inFilterTables).toBe(false);
  });
});
