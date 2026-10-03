// Composition of the designer: the designer entries of the delivered participants, in the
// order of the catalog, then the templates of the topology.
import { buttonInterfaceDesigner } from "../../src/participants/button-interface/designer";
import { roomThermostatDesigner } from "../../src/participants/room-thermostat/designer";
import { switchActuatorDesigner } from "../../src/participants/switch-actuator/designer";
import { dimmerActuatorDesigner } from "../../src/participants/dimmer-actuator/designer";
import { daliGatewayDesigner } from "../../src/participants/dali-gateway/designer";
import { shutterActuatorDesigner } from "../../src/participants/shutter-actuator/designer";
import { heatingActuatorDesigner } from "../../src/participants/heating-actuator/designer";
import { presenceDetectorDesigner } from "../../src/participants/presence-detector/designer";
import { windowContactDesigner } from "../../src/participants/window-contact/designer";
import { temperatureSensorDesigner } from "../../src/participants/temperature-sensor/designer";
import { airQualitySensorDesigner } from "../../src/participants/air-quality-sensor/designer";
import { weatherStationDesigner } from "../../src/participants/weather-station/designer";
import { alarmModuleDesigner } from "../../src/participants/alarm-module/designer";
import { logicGateDesigner } from "../../src/participants/logic-gate/designer";
import { clockMasterDesigner } from "../../src/participants/clock-master/designer";
import { timeSwitchDesigner } from "../../src/participants/time-switch/designer";
import { energyMeterDesigner } from "../../src/participants/energy-meter/designer";
import { displayDesigner } from "../../src/participants/display/designer";
import { usbInterfaceDesigner } from "../../src/participants/usb-interface/designer";
import { systemGatewayDesigner } from "../../src/participants/system-gateway/designer";
import { passiveDesigner } from "../../src/participants/passive/designer";
import { registerMessages } from "../../src/i18n";
import type { DesignerContribution, Snippet } from "./snippet-kit";
import { TOPOLOGY_TEMPLATES } from "./snippets";

export const DESIGNER: readonly DesignerContribution[] = [
  buttonInterfaceDesigner,
  roomThermostatDesigner,
  switchActuatorDesigner,
  dimmerActuatorDesigner,
  daliGatewayDesigner,
  shutterActuatorDesigner,
  heatingActuatorDesigner,
  presenceDetectorDesigner,
  windowContactDesigner,
  temperatureSensorDesigner,
  airQualitySensorDesigner,
  weatherStationDesigner,
  logicGateDesigner,
  alarmModuleDesigner,
  clockMasterDesigner,
  timeSwitchDesigner,
  energyMeterDesigner,
  displayDesigner,
  usbInterfaceDesigner,
  systemGatewayDesigner,
  passiveDesigner,
];

// Texts of the contributions, registered once with the designer.
for (const c of DESIGNER)
  for (const [lang, messages] of Object.entries(c.messages ?? {}))
    registerMessages(lang, messages);

/** Every template: those of the participants, then those of the topology. */
export const TEMPLATES: readonly Snippet[] = [
  ...DESIGNER.flatMap((c) => c.templates),
  ...TOPOLOGY_TEMPLATES,
];

/** Contribution of a behavior, if its participant has one. */
export const designerOf = (behavior: string) =>
  DESIGNER.find((c) => c.behavior === behavior);
