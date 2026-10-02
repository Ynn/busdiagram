// Model entry of the radiator: its physical model and the size of its views.
import type { ParticipantModel } from "../../knx/contracts";
import { radiator } from "./equipment";
import { radiatorFr } from "./messages.fr";
import { radiatorSize } from "./size";

export const radiatorModel: ParticipantModel = {
  equipment: { radiator },
  messages: { fr: radiatorFr },
  viewSizes: { radiator: radiatorSize },
};
