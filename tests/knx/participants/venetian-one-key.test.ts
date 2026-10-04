// A venetian blind on one push-button key: a long press moves, a short press stops or
// turns the slats by a step, opposite to the last movement (ABB US/U 4.2, one-key
// operation). The output must be set for slats, as the blind is (ABB JRA/S: blind with
// or without slat adjustment).
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../../src/core";

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const doc = (outputSlatMs?: number): Doc => ({
  formatVersion: 2,
  title: "Venetian blind on one key",
  lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }],
  groupAddresses: [
    { address: "1/0/1", name: "Up/down", dpt: "1.008" },
    { address: "1/1/1", name: "Stop/step", dpt: "1.007" },
  ],
  devices: [
    {
      id: "buttonInterface",
      address: "1.1.1",
      kind: "buttonInterface",
      behavior: "buttonInterface/v1",
      channels: [
        { id: "in1", label: "Input 1", parameters: { function: "blind" } },
      ],
      objects: [
        {
          id: "move1",
          ga: "1/0/1",
          dpt: "1.008",
          port: "move",
          channel: "in1",
          flags: { W: true, T: true },
        },
        {
          id: "stopStep1",
          ga: "1/1/1",
          dpt: "1.007",
          port: "stopStep",
          channel: "in1",
          flags: { W: false, T: true },
        },
      ],
    },
    {
      id: "shutterActuator",
      address: "1.1.2",
      kind: "shutterActuator",
      behavior: "shutterActuator/v1",
      objects: [
        {
          id: "move",
          ga: "1/0/1",
          dpt: "1.008",
          port: "move",
          channel: "s1",
          flags: { W: true, T: false },
        },
        {
          id: "stop",
          ga: "1/1/1",
          dpt: "1.007",
          port: "stopStep",
          channel: "s1",
          flags: { W: true, T: false },
        },
      ],
      channels: [
        {
          id: "s1",
          label: "Blind",
          parameters: {
            estimatedTravelTimeMs: 20000,
            ...(outputSlatMs ? { slatTravelMs: outputSlatMs } : {}),
          },
          equipment: {
            type: "shutter",
            parameters: { actualTravelTimeMs: 20000, slatTravelMs: 2000 },
          },
        },
      ],
    },
  ],
});

describe("venetian blind on one key", () => {
  it("an output set for a roller shutter, driving a blind with slats, is reported", () => {
    const sim = createSimulator(doc());
    expect(sim.diagnostics.map((d) => d.code)).toContain("config-slats");
    expect(
      createSimulator(doc(2000)).diagnostics.map((d) => d.code),
    ).not.toContain("config-slats");
  });

  it("short presses turn the slats, opposite to the last movement", () => {
    const sim = createSimulator(doc(2000));
    const slats = () =>
      Math.round(Number(sim.equipmentState("shutterActuator", "s1")?.slatPct));
    const press = (kind: "short" | "long", ms: number) => {
      sim.press("buttonInterface", "in1", kind);
      sim.advance(ms);
    };
    sim.advance(1000);
    expect(slats()).toBe(0); // up, slats open
    press("short", 3000);
    expect(slats()).toBe(20); // closes by a step
    press("long", 30000); // down: slats closed
    expect(slats()).toBe(100);
    press("short", 3000);
    expect(slats()).toBe(80); // opens by a step
    press("short", 3000);
    expect(slats()).toBe(60);
  });
});
