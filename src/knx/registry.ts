import { hostTranslator } from "../i18n";
// Behavior and equipment registers. Each simulation captures a copy
// definitions at its creation: a subsequent registration does not change it.
import type {
  BehaviorDefinition,
  EquipmentDefinition,
  JsonObject,
} from "./contracts";
import {
  daliGroup,
  dimmableLamp,
  lamp,
  appliance,
  fan,
  radiator,
  shutter,
} from "../equipment/models";
import { daliGateway, dimmerActuator } from "./behaviors/dimmer";
import { checkBehavior, checkEquipment } from "./definition-check";
import { usbInterface } from "./behaviors/interface";
import { logicGate } from "./behaviors/logic";
import { weatherStation } from "./behaviors/weather";
import { airQualitySensor } from "./behaviors/air-quality";
import { clockMaster, timeSwitch } from "./behaviors/time";
import { systemGateway } from "./behaviors/gateway";
import { energyMeter } from "./behaviors/energy-meter";
import { buttonInterface } from "./behaviors/button-interface";
import {
  heatingActuator,
  roomThermostat,
  temperatureSensor,
  windowContact,
} from "./behaviors/hvac";
import {
  display,
  passive,
  presenceDetector,
} from "./behaviors/simple-devices";
import { shutterActuator } from "./behaviors/shutter-actuator";
import { switchActuator } from "./behaviors/switch-actuator";

// The definitions are heterogeneous: the type of state is specific to each.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyBehavior = BehaviorDefinition<any>;
type AnyEquipment = EquipmentDefinition<any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface Registry {
  readonly behaviors: ReadonlyMap<string, AnyBehavior>;
  readonly equipment: ReadonlyMap<string, AnyEquipment>;
}

const behaviors = new Map<string, AnyBehavior>();
const equipment = new Map<string, AnyEquipment>();

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
  return { behaviors: new Map(behaviors), equipment: new Map(equipment) };
}

/** Copy records, to cancel records of an extension script refused. */
export interface RegistrySnapshot {
  readonly behaviors: ReadonlyMap<string, AnyBehavior>;
  readonly equipment: ReadonlyMap<string, AnyEquipment>;
}

export function saveRegistry(): RegistrySnapshot {
  return { behaviors: new Map(behaviors), equipment: new Map(equipment) };
}

export function restoreRegistry(s: RegistrySnapshot): void {
  behaviors.clear();
  s.behaviors.forEach((v, k) => behaviors.set(k, v));
  equipment.clear();
  s.equipment.forEach((v, k) => equipment.set(k, v));
}

export const behaviorIds = () => [...behaviors.keys()];
export const equipmentIds = () => [...equipment.keys()];

registerBehavior("switchActuator/v1", switchActuator);
registerBehavior("shutterActuator/v1", shutterActuator);
registerBehavior("display/v1", display);
registerBehavior("passive/v1", passive);
registerBehavior("presenceDetector/v1", presenceDetector);
registerBehavior("usbInterface/v1", usbInterface);
registerEquipment("lamp", lamp);
registerEquipment("shutter", shutter);
registerEquipment("dimmableLamp", dimmableLamp);
registerEquipment("daliGroup", daliGroup);
registerBehavior("dimmerActuator/v1", dimmerActuator);
registerBehavior("daliGateway/v1", daliGateway);
registerEquipment("radiator", radiator);
registerEquipment("fan", fan);
registerEquipment("appliance", appliance);
registerBehavior("roomThermostat/v1", roomThermostat);
registerBehavior("heatingActuator/v1", heatingActuator);
registerBehavior("windowContact/v1", windowContact);
registerBehavior("temperatureSensor/v1", temperatureSensor);
registerBehavior("logicGate/v1", logicGate);
registerBehavior("weatherStation/v1", weatherStation);
registerBehavior("airQualitySensor/v1", airQualitySensor);
registerBehavior("clockMaster/v1", clockMaster);
registerBehavior("timeSwitch/v1", timeSwitch);
registerBehavior("systemGateway/v1", systemGateway);
registerBehavior("energyMeter/v1", energyMeter);
registerBehavior("buttonInterface/v1", buttonInterface);

// Definitions delivered with the simulator (as opposed to extensions).
const STANDARD_BEHAVIORS = new Set(behaviors.keys());
const STANDARD_EQUIPMENT = new Set(equipment.keys());
export const isStandardBehavior = (id: string) => STANDARD_BEHAVIORS.has(id);
export const isStandardEquipment = (id: string) => STANDARD_EQUIPMENT.has(id);
