import type { MessagesSnapshot } from "../i18n";
import {
  hostTranslator,
  registerMessages,
  restoreMessages,
  saveMessages,
} from "../i18n";
// Behavior and equipment registers. Each simulation captures a copy
// definitions at its creation: a subsequent registration does not change it.
import type {
  BehaviorDefinition,
  EquipmentDefinition,
  EquipmentSize,
  JsonObject,
  ParticipantModel,
} from "./contracts";
import { checkBehavior, checkEquipment } from "./definition-check";
import { STANDARD_MODEL } from "../standard-model";

// The definitions are heterogeneous: the type of state is specific to each.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyBehavior = BehaviorDefinition<any>;
type AnyEquipment = EquipmentDefinition<any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface Registry {
  readonly behaviors: ReadonlyMap<string, AnyBehavior>;
  readonly equipment: ReadonlyMap<string, AnyEquipment>;
  /** Sizes of the views of the delivered equipment, by view. */
  readonly viewSizes: ReadonlyMap<string, EquipmentSize>;
}

const behaviors = new Map<string, AnyBehavior>();
const equipment = new Map<string, AnyEquipment>();
const viewSizes = new Map<string, EquipmentSize>();

const ID = /^[A-Za-z][\w.-]*(\/v\d+)?$/;

function checkId(
  kind: "behavior" | "equipment",
  id: string,
  map: ReadonlyMap<string, unknown>,
) {
  const t = hostTranslator();
  if (typeof id !== "string" || !ID.test(id))
    throw new TypeError(
      kind === "behavior"
        ? t`Behavior: invalid identifier “${String(id)}”`
        : t`Equipment: invalid identifier “${String(id)}”`,
    );
  if (map.has(id))
    throw new Error(
      kind === "behavior"
        ? t`Behavior “${id}” already registered`
        : t`Equipment “${id}” already registered`,
    );
}

export function registerBehavior<S>(
  id: string,
  definition: BehaviorDefinition<S>,
): void {
  checkId("behavior", id, behaviors);
  // Validated then copied and frozen: to modify the object passed then has no effect.
  behaviors.set(id, checkBehavior(id, definition) as AnyBehavior);
}

export function registerEquipment<S extends JsonObject>(
  id: string,
  definition: EquipmentDefinition<S>,
): void {
  checkId("equipment", id, equipment);
  equipment.set(id, checkEquipment(id, definition) as unknown as AnyEquipment);
}

export function captureRegistry(): Registry {
  return {
    behaviors: new Map(behaviors),
    equipment: new Map(equipment),
    viewSizes: new Map(viewSizes),
  };
}

/** Copy records, to cancel records of an extension script refused. */
export interface RegistrySnapshot {
  readonly behaviors: ReadonlyMap<string, AnyBehavior>;
  readonly equipment: ReadonlyMap<string, AnyEquipment>;
  readonly viewSizes: ReadonlyMap<string, EquipmentSize>;
  readonly messages: MessagesSnapshot;
}

export function saveRegistry(): RegistrySnapshot {
  return {
    behaviors: new Map(behaviors),
    equipment: new Map(equipment),
    viewSizes: new Map(viewSizes),
    messages: saveMessages(),
  };
}

export function restoreRegistry(s: RegistrySnapshot): void {
  behaviors.clear();
  s.behaviors.forEach((v, k) => behaviors.set(k, v));
  equipment.clear();
  s.equipment.forEach((v, k) => equipment.set(k, v));
  viewSizes.clear();
  s.viewSizes.forEach((v, k) => viewSizes.set(k, v));
  restoreMessages(s.messages);
}

export const behaviorIds = () => [...behaviors.keys()];
export const equipmentIds = () => [...equipment.keys()];

/** Register the behaviors, equipment, messages, and view sizes of a participant. */
export function registerParticipant(p: ParticipantModel) {
  Object.entries(p.behaviors ?? {}).forEach(([id, d]) =>
    registerBehavior(id, d),
  );
  Object.entries(p.equipment ?? {}).forEach(([id, d]) =>
    registerEquipment(id, d),
  );
  Object.entries(p.messages ?? {}).forEach(([lang, m]) =>
    registerMessages(lang, m),
  );
  Object.entries(p.viewSizes ?? {}).forEach(([view, size]) =>
    viewSizes.set(view, Object.freeze({ ...size })),
  );
}

STANDARD_MODEL.forEach(registerParticipant);

// Definitions delivered with the simulator (as opposed to extensions).
const STANDARD_BEHAVIORS = new Set(behaviors.keys());
const STANDARD_EQUIPMENT = new Set(equipment.keys());
export const isStandardBehavior = (id: string) => STANDARD_BEHAVIORS.has(id);
export const isStandardEquipment = (id: string) => STANDARD_EQUIPMENT.has(id);
