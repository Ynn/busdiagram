// Loads: hot water cylinder (element with its own thermostat, losses, draw-off), heat pump
// (minimum off time of the compressor, heat delivered to its room), and alarm sounder
// (ringing time limit), each driven by a switch actuator output.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../../src/core";
import type { Simulation } from "../../../src/knx/sim";
import { v2 } from "../helpers";

/** A switch actuator with one load on output a, and a USB interface to command it. */
function withLoad(
  equipment: Record<string, unknown>,
  extra: { metered?: boolean; rooms?: unknown[] } = {},
) {
  return createSimulator(
    v2(
      [
        {
          id: "act",
          name: "Switch actuator",
          address: "1.1.1",
          kind: "switchActuator",
          behavior: "switchActuator/v1",
          channels: [{ id: "a", label: "Load", equipment }],
          objects: [
            {
              id: "sw",
              ga: ["1/1/1"],
              dpt: "1.001",
              port: "switch",
              channel: "a",
              flags: { W: true, T: false },
            },
            ...(extra.metered
              ? [
                  {
                    id: "p",
                    ga: ["1/2/1"],
                    dpt: "14.056",
                    port: "power",
                    channel: "a",
                    flags: { W: false, T: true },
                  },
                ]
              : []),
          ],
        },
        {
          id: "tool",
          name: "USB",
          address: "1.1.250",
          kind: "interface",
          behavior: "usbInterface/v1",
          objects: [],
        },
      ],
      {
        lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }],
        groupAddresses: [
          { address: "1/1/1", dpt: "1.001" },
          { address: "1/2/1", dpt: "14.056" },
        ],
        ...(extra.rooms ? { rooms: extra.rooms } : {}),
      },
    ),
  );
}
const on = (sim: Simulation, v = 1) => {
  sim.groupWrite("tool", "1/1/1", v);
  sim.advance(2000);
};
const state = (sim: Simulation) => sim.equipmentState("act", "a")!;

describe("hot water cylinder", () => {
  it("heats while supplied, up to the setpoint of its thermostat, then draws nothing", () => {
    // 3 kW on 100 l: about 26 K per hour, 4.3 K per simulated second at ×600.
    const sim = withLoad(
      {
        type: "waterHeater",
        parameters: { powerW: 3000, volumeL: 100, timeScale: 600 },
      },
      { metered: true },
    );
    on(sim);
    expect(state(sim).heating).toBe(true);
    expect(Number(state(sim).tempC)).toBeGreaterThan(45);
    sim.advance(6000);
    expect(Number(state(sim).tempC)).toBeCloseTo(60, 0);
    expect(state(sim).heating).toBe(false);
    sim.advance(6000);
    expect(sim.objectValue("act", "p")).toBe(0);
  });

  it("drawing off hot water cools it, and the element heats again below its hysteresis", () => {
    const sim = withLoad({
      type: "waterHeater",
      parameters: { volumeL: 200, drawL: 100 },
      initialState: { tempC: 60 },
    });
    on(sim);
    expect(state(sim).heating).toBe(false);
    expect(sim.equipmentAction("act", "a", "draw")).toBe(true);
    // Half the volume replaced by water at 10 °C: 35 °C.
    expect(Number(state(sim).tempC)).toBeCloseTo(35, 0);
    expect(state(sim).heating).toBe(true);
  });

  it("without supply, the element does not heat and the water cools slowly", () => {
    const sim = withLoad({
      type: "waterHeater",
      parameters: { lossKPerH: 1, timeScale: 3600 },
      initialState: { tempC: 50 },
    });
    sim.advance(5000);
    expect(state(sim).heating).toBe(false);
    expect(Number(state(sim).tempC)).toBeCloseTo(45, 0);
  });
});

describe("heat pump", () => {
  const room = [
    { id: "r1", name: "Room", temperatureC: 15, outsideTemperatureC: 5 },
  ];
  const pump = (minOffMs: number) =>
    withLoad(
      {
        type: "heatPump",
        room: "r1",
        parameters: { minOffMs, electricPowerW: 2000 },
      },
      { metered: true, rooms: room },
    );

  it("heats its room while it runs, and draws its electrical power", () => {
    const sim = pump(0);
    on(sim);
    expect(state(sim).running).toBe(true);
    sim.advance(5000);
    expect(sim.objectValue("act", "p")).toBe(2000);
    sim.advance(60000);
    expect(Number(sim.getState().rooms.r1!.temperatureC)).toBeGreaterThan(15);
  });

  it("after a stop, the compressor waits for its minimum off time before it restarts", () => {
    const sim = pump(10000);
    on(sim);
    expect(state(sim).running).toBe(true);
    on(sim, 0);
    on(sim, 1);
    expect(state(sim).running).toBe(false);
    sim.advance(9000);
    expect(state(sim).running).toBe(true);
  });
});

describe("alarm sounder", () => {
  it("sounds while powered, up to its ringing time limit; the flash stays on", () => {
    const sim = withLoad({ type: "siren", parameters: { ringLimitMs: 5000 } });
    on(sim);
    expect(state(sim).ringing).toBe(true);
    sim.advance(5000);
    expect(state(sim).ringing).toBe(false);
    expect(state(sim).powered).toBe(true);
    on(sim, 0);
    on(sim, 1);
    expect(state(sim).ringing).toBe(true);
  });
});
