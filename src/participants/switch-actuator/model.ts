// Model entry of the switch actuator: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { switchActuator } from "./behavior";
import { switchActuatorFr } from "./messages.fr";

export const switchActuatorModel: ParticipantModel = {
  behaviors: { "switchActuator/v1": switchActuator },
  messages: { fr: switchActuatorFr },
};
