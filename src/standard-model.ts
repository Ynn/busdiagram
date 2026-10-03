// Composition of the library: the model entries of the delivered participants, installed
// once by the registry, and the delivered equipment (src/equipment).
import type { ParticipantModel } from "./knx/contracts";
import { lampModel } from "./equipment/lamp/model";
import { shutterModel } from "./equipment/shutter/model";
import { dimmableLampModel } from "./equipment/dimmable-lamp/model";
import { daliGroupModel } from "./equipment/dali-group/model";
import { radiatorModel } from "./equipment/radiator/model";
import { fanModel } from "./equipment/fan/model";
import { applianceModel } from "./equipment/appliance/model";
import { heatPumpModel } from "./equipment/heat-pump/model";
import { sirenModel } from "./equipment/siren/model";
import { waterHeaterModel } from "./equipment/water-heater/model";
import { switchActuatorModel } from "./participants/switch-actuator/model";
import { shutterActuatorModel } from "./participants/shutter-actuator/model";
import { displayModel } from "./participants/display/model";
import { passiveModel } from "./participants/passive/model";
import { presenceDetectorModel } from "./participants/presence-detector/model";
import { usbInterfaceModel } from "./participants/usb-interface/model";
import { dimmerActuatorModel } from "./participants/dimmer-actuator/model";
import { daliGatewayModel } from "./participants/dali-gateway/model";
import { roomThermostatModel } from "./participants/room-thermostat/model";
import { heatingActuatorModel } from "./participants/heating-actuator/model";
import { windowContactModel } from "./participants/window-contact/model";
import { temperatureSensorModel } from "./participants/temperature-sensor/model";
import { alarmModuleModel } from "./participants/alarm-module/model";
import { logicGateModel } from "./participants/logic-gate/model";
import { weatherStationModel } from "./participants/weather-station/model";
import { airQualitySensorModel } from "./participants/air-quality-sensor/model";
import { clockMasterModel } from "./participants/clock-master/model";
import { timeSwitchModel } from "./participants/time-switch/model";
import { systemGatewayModel } from "./participants/system-gateway/model";
import { energyMeterModel } from "./participants/energy-meter/model";
import { buttonInterfaceModel } from "./participants/button-interface/model";

// The order of installation is that of the generated schema and reference.
export const STANDARD_MODEL: readonly ParticipantModel[] = [
  switchActuatorModel,
  shutterActuatorModel,
  displayModel,
  passiveModel,
  presenceDetectorModel,
  usbInterfaceModel,
  dimmerActuatorModel,
  daliGatewayModel,
  roomThermostatModel,
  heatingActuatorModel,
  windowContactModel,
  temperatureSensorModel,
  logicGateModel,
  weatherStationModel,
  airQualitySensorModel,
  clockMasterModel,
  timeSwitchModel,
  systemGatewayModel,
  energyMeterModel,
  buttonInterfaceModel,
  alarmModuleModel,
  // Equipment, in the order of the former list.
  lampModel,
  shutterModel,
  dimmableLampModel,
  daliGroupModel,
  radiatorModel,
  fanModel,
  applianceModel,
  waterHeaterModel,
  heatPumpModel,
  sirenModel,
];
