// Model entry of the fan: its physical model and the size of its views.
import type { ParticipantModel } from "../../knx/contracts";
import { fan } from "./equipment";
import { fanFr } from "./messages.fr";
import { fanSize } from "./size";

export const fanModel: ParticipantModel = {
  equipment: { fan },
  messages: { fr: fanFr },
  viewSizes: { fan: fanSize },
};
