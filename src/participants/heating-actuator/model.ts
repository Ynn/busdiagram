// Model entry of the heating actuator: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { heatingActuator } from "./behavior";
import { heatingActuatorFr } from "./messages.fr";

export const heatingActuatorModel: ParticipantModel = {
  behaviors: { "heatingActuator/v1": heatingActuator },
  messages: { fr: heatingActuatorFr },
};
