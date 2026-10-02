// Model entry of the dimmer actuator: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { dimmerActuator } from "./behavior";
import { dimmerActuatorFr } from "./messages.fr";

export const dimmerActuatorModel: ParticipantModel = {
  behaviors: { "dimmerActuator/v1": dimmerActuator },
  messages: { fr: dimmerActuatorFr },
};
