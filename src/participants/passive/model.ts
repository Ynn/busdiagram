// Model entry of the device without logic: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { passive } from "./behavior";
import { passiveFr } from "./messages.fr";

export const passiveModel: ParticipantModel = {
  behaviors: { "passive/v1": passive },
  messages: { fr: passiveFr },
};
