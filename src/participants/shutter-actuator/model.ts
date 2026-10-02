// Model entry of the shutter actuator: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { shutterActuator } from "./behavior";
import { shutterActuatorFr } from "./messages.fr";

export const shutterActuatorModel: ParticipantModel = {
  behaviors: { "shutterActuator/v1": shutterActuator },
  messages: { fr: shutterActuatorFr },
};
