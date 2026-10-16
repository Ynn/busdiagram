// Product databases of the manufacturers' products, brought by the imported packages of
// devices (see packages.ts): the designer shows their ETS pages and computes the memory
// of a download from them.
import type { ApplicationProgram } from "../../src/knxprod/application";
import { programOf, shareableMemory } from "../../src/knxprod/database";
import { memoryJson, parseMemory } from "../../src/knx/installation";
import { databaseOf } from "./packages";

/** Application program of a manufacturer's product, by its behavior. */
export function programOfProduct(
  behavior: string,
): ApplicationProgram | undefined {
  const db = databaseOf(behavior);
  return db ? programOf(db) : undefined;
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * The scenario to share (page, code to paste, player link): the memory of its products,
 * in the project and in the installation, without the application code that ETS wrote
 * from the manufacturer's catalog (see shareableMemory). What the devices run from is
 * kept: the scenario loads and runs as it is.
 */
export function shareableScenario(data: unknown): unknown {
  if (!isRec(data) || !Array.isArray(data.devices)) return data;
  const behaviors = new Map<string, string>();
  const strip = (behavior: unknown, memory: unknown) => {
    const db = typeof behavior === "string" ? databaseOf(behavior) : undefined;
    const mem = db && parseMemory(memory);
    return mem ? memoryJson(shareableMemory(db, mem)) : memory;
  };
  const devices = data.devices.map((d: unknown) => {
    if (!isRec(d)) return d;
    if (typeof d.id === "string" && typeof d.behavior === "string")
      behaviors.set(d.id, d.behavior);
    return isRec(d.ets) && d.ets.memory !== undefined
      ? { ...d, ets: { ...d.ets, memory: strip(d.behavior, d.ets.memory) } }
      : d;
  });
  const inst = data.installation;
  const installation =
    isRec(inst) && Array.isArray(inst.devices)
      ? {
          ...inst,
          devices: inst.devices.map((e: unknown) =>
            isRec(e) && e.memory !== undefined && typeof e.device === "string"
              ? { ...e, memory: strip(behaviors.get(e.device), e.memory) }
              : e,
          ),
        }
      : inst;
  return {
    ...data,
    devices,
    ...(installation !== undefined ? { installation } : {}),
  };
}
