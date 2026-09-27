import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createSimulator } from "../../src/core";
import type { Simulation } from "../../src/knx/sim";

export const scenariosDir = resolve(import.meta.dirname, "../../scenarios");

/** Six historical scenarios (format v1), compatibility fixes. */
export const LEGACY = [
  "lighting-control.json",
  "status-feedback.json",
  "shutter-control.json",
  "scenes.json",
  "timers.json",
  "full-topology.json",
];

export const activeScenarios = () =>
  readdirSync(scenariosDir).filter((f) => f.endsWith(".json"));

export const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(path, "utf8"));
export const raw = (name: string) =>
  readJson(resolve(scenariosDir, name)) as Record<string, unknown>;
export const load = (name: string) => createSimulator(raw(name));

export const obj = (sim: Simulation, d: string, o: string) =>
  sim.objectValue(d, o);
export const on = (sim: Simulation, d: string, c: string) => {
  const out = sim.output(d, c);
  return out?.type === "switch" ? out.on : null;
};
export const lampOn = (sim: Simulation, d: string, c: string) =>
  sim.equipmentState(d, c)?.on === true;
export const realPos = (sim: Simulation, d: string, c: string) =>
  Number(sim.equipmentState(d, c)?.positionPct);
export const estPos = (sim: Simulation, d: string, c: string) =>
  Number(sim.channelState(d, c).estimatedPositionPct);

/** Minimal v2 setup: a push button and switching actuator, customizable. */
export function v2(devices: unknown[], extra: Record<string, unknown> = {}) {
  return {
    formatVersion: 2,
    title: "test",
    lines: [{ address: "1.1" }],
    groupAddresses: [],
    devices,
    ...extra,
  };
}

export const flags = (W: boolean, T: boolean) => ({ W, T });
