// Several loads on one output: they are wired in parallel and receive the same commands.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import { buildScenario } from "../../src/knx/scenario";
import type { ScenarioError } from "../../src/knx/scenario";
import { toV2 } from "../../src/knx/export";
import { layout } from "../../src/knx/layout";

const scenario = (equipment: unknown) => ({
  formatVersion: 2,
  title: "Loads",
  lines: [{ address: "1.1" }],
  groupAddresses: [
    { address: "1/1/1", name: "Switch", dpt: "1.001" },
    { address: "1/2/1", name: "Power", dpt: "14.056" },
  ],
  devices: [
    {
      id: "pb",
      address: "1.1.1",
      kind: "pushButton",
      behavior: "pushButton/v1",
      objects: [
        {
          id: "k1",
          ga: "1/1/1",
          dpt: "1.001",
          port: "input",
          flags: { W: true, T: true },
        },
      ],
      buttons: [{ id: "key1", press: { object: "k1", value: "toggle" } }],
    },
    {
      id: "act",
      address: "1.1.2",
      kind: "switchActuator",
      behavior: "switchActuator/v1",
      channels: [{ id: "c1", label: "L1", equipment }],
      objects: [
        {
          id: "sw",
          ga: "1/1/1",
          dpt: "1.001",
          port: "switch",
          channel: "c1",
          flags: { W: true, T: false },
        },
        {
          id: "p",
          ga: "1/2/1",
          dpt: "14.056",
          port: "power",
          channel: "c1",
          flags: { W: false, T: true },
        },
      ],
    },
  ],
});

const three = [
  { type: "lamp", name: "Ceiling", parameters: { powerW: 75 } },
  { type: "lamp", name: "Wall", parameters: { powerW: 40 } },
  { type: "appliance", parameters: { powerW: 1000 } },
];

describe("several loads on one output", () => {
  it("are all switched by the output, and their power adds up", () => {
    const sim = createSimulator(scenario(three));
    const c = sim.scenario.devicesById.get("act")!.channels[0]!;
    expect(c.loads).toEqual(["lamp", "lamp", "appliance"]);
    expect(c.equipment).toBe("lamp");
    sim.press("pb", 0, "press");
    sim.advance(2000);
    for (const i of [0, 1, 2])
      expect(sim.equipmentState("act", "c1", i)).toMatchObject({ on: true });
    expect(sim.channelState("act", "c1").powerW).toBe(1115);
    // Snapshot keys: the first load keeps the key of the output.
    expect(Object.keys(sim.getState().equipment)).toEqual([
      "act/c1",
      "act/c1#2",
      "act/c1#3",
    ]);
  });

  it("one load can still be written as an object; export keeps each form", () => {
    const one = buildScenario(scenario({ type: "lamp" }));
    expect(one.devices[1]!.channels[0]!.equipmentConfigs).toHaveLength(1);
    const v2one = toV2(one) as {
      devices: { channels?: { equipment: unknown }[] }[];
    };
    expect(v2one.devices[1]!.channels![0]!.equipment).toEqual({ type: "lamp" });
    const v2three = toV2(buildScenario(scenario(three))) as typeof v2one;
    expect(v2three.devices[1]!.channels![0]!.equipment).toEqual(three);
    const none = buildScenario(scenario([]));
    expect(none.devices[1]!.channels[0]!.loads).toEqual([]);
  });

  it("each load is drawn, in order", () => {
    const s = buildScenario(scenario(three));
    const loads = layout(s).devices.get("act")!.loads;
    expect(loads.map((l) => [l.channel, l.index])).toEqual([
      ["c1", 0],
      ["c1", 1],
      ["c1", 2],
    ]);
    // Stacked without overlap.
    const sorted = [...loads].sort((a, b) => a.top - b.top);
    sorted
      .slice(1)
      .forEach((l, i) =>
        expect(l.top).toBeGreaterThanOrEqual(sorted[i]!.top + sorted[i]!.h),
      );
  });

  it("errors point at the load in the list; a shutter output takes one motor", () => {
    let error: ScenarioError | undefined;
    try {
      buildScenario(scenario([{ type: "lamp" }, { type: "shutter" }]));
    } catch (e) {
      error = e as ScenarioError;
    }
    expect(error?.details.map((p) => p.path)).toContain(
      "devices[1].channels[0].equipment[1].type",
    );
  });

  it("the faults of every DALI load of a group are reported", () => {
    const sim = createSimulator({
      formatVersion: 2,
      title: "DALI",
      lines: [{ address: "1.1" }],
      groupAddresses: [{ address: "1/1/1", name: "Fault", dpt: "1.005" }],
      devices: [
        {
          id: "gw",
          address: "1.1.1",
          kind: "generic",
          behavior: "daliGateway/v1",
          channels: [
            {
              id: "g1",
              equipment: [
                {
                  type: "daliGroup",
                  parameters: { ballasts: 2, firstAddress: 0 },
                },
                {
                  type: "daliGroup",
                  parameters: { ballasts: 2, firstAddress: 2 },
                  initialState: { failed: 1 },
                },
              ],
            },
          ],
          objects: [
            {
              id: "e",
              ga: "1/1/1",
              dpt: "1.005",
              port: "error",
              channel: "g1",
              flags: { W: false, T: true, R: true },
            },
          ],
        },
      ],
    });
    sim.advance(3000);
    // The fault is on the second load of the group.
    expect(sim.objectValue("gw", "e")).toBe(1);
    expect(sim.channelState("gw", "g1").failures).toBe(1);
  });
});
