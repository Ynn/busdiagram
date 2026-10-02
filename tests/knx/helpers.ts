import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createSimulator } from "../../src/core";
import type { Simulation } from "../../src/knx/sim";

export const scenariosDir = resolve(import.meta.dirname, "../../scenarios");

/** Six historical scenarios in format v1, kept as fixtures for compatibility tests. */
export const LEGACY = [
  "lighting-control.json",
  "status-feedback.json",
  "shutter-control.json",
  "scenes.json",
  "timers.json",
  "full-topology.json",
];
export const legacy = (name: string) =>
  readJson(resolve(import.meta.dirname, "fixtures/v1", name)) as Record<
    string,
    unknown
  >;

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

export interface KeySpec {
  /** Input (and key) identifier. */
  id: string;
  /** Object identifier; the input identifier by default. */
  object?: string;
  ga: string | string[];
  dpt?: string;
  /** Port of the object: "switch" by default. */
  port?: string;
  flags?: { W: boolean; T: boolean };
  /** Parameters of the input: a toggling switch by default. */
  parameters?: Record<string, unknown>;
}

/** Push-button interface with one input per key, each with one object. */
export function keypad(
  id: string,
  address: string,
  keys: KeySpec[],
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    name: "Push-button interface",
    address,
    kind: "buttonInterface",
    behavior: "buttonInterface/v1",
    channels: keys.map((k) => ({
      id: k.id,
      label: k.id,
      parameters: { function: "switch", ...k.parameters },
    })),
    objects: keys.map((k) => ({
      id: k.object ?? k.id,
      name: k.id,
      ga: k.ga,
      dpt: k.dpt ?? "1.001",
      port: k.port ?? "switch",
      channel: k.id,
      flags: k.flags ?? flags(true, true),
    })),
    ...extra,
  };
}
