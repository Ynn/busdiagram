// What a scenario may share of the memory of its manufacturers' devices (a page, code to
// paste, a link to the designer or the player): the octets that their product database
// tells apart — system areas, header, tables, parameters — and nothing of the
// application code that ETS wrote from the manufacturer's catalog (see shareableMemory).
// The databases are those of the imported packages, which register them here; every
// host (designer, component, player) shares through this one policy.
import type { ProductDatabase } from "./database";
import { shareableMemory } from "./database";
import { memoryJson, parseMemory } from "../knx/installation";

const databases = new Map<string, ProductDatabase>();

/** Register the product database of a behavior (or forget it with null). */
export function setProductDatabase(
  behavior: string,
  db: ProductDatabase | null,
) {
  if (db) databases.set(behavior, db);
  else databases.delete(behavior);
}

/** Product database of a behavior, from an imported package. */
export const productDatabase = (behavior: string) => databases.get(behavior);

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * The scenario to share: the memory of its products, in the project and in the
 * installation, kept to what their databases tell apart; the scenario loads and runs as
 * it is. A memory that no product database tells apart (its package missing) is not
 * shared: `unshared` names its devices, and the scenario is then not to be shared.
 */
export function shareableScenario(
  data: unknown,
  databaseOf: (
    behavior: string,
  ) => ProductDatabase | undefined = productDatabase,
): { data: unknown; unshared: string[] } {
  const unshared = new Set<string>();
  if (!isRec(data) || !Array.isArray(data.devices))
    return { data, unshared: [] };
  const behaviors = new Map<string, string>();
  const strip = (device: unknown, behavior: unknown, memory: unknown) => {
    const db = typeof behavior === "string" ? databaseOf(behavior) : undefined;
    const mem = db && parseMemory(memory);
    if (mem) return memoryJson(shareableMemory(db, mem));
    unshared.add(String(device));
    return undefined;
  };
  const devices = data.devices.map((d: unknown) => {
    if (!isRec(d)) return d;
    if (typeof d.id === "string" && typeof d.behavior === "string")
      behaviors.set(d.id, d.behavior);
    return isRec(d.ets) && d.ets.memory !== undefined
      ? {
          ...d,
          ets: { ...d.ets, memory: strip(d.id, d.behavior, d.ets.memory) },
        }
      : d;
  });
  const inst = data.installation;
  const installation =
    isRec(inst) && Array.isArray(inst.devices)
      ? {
          ...inst,
          devices: inst.devices.map((e: unknown) =>
            isRec(e) && e.memory !== undefined && typeof e.device === "string"
              ? {
                  ...e,
                  memory: strip(e.device, behaviors.get(e.device), e.memory),
                }
              : e,
          ),
        }
      : inst;
  return {
    data: {
      ...data,
      devices,
      ...(installation !== undefined ? { installation } : {}),
    },
    unshared: [...unshared],
  };
}
