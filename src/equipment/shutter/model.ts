// Model entry of the shutter: its physical model and the size of its views.
import type { ParticipantModel } from "../../knx/contracts";
import { shutter } from "./equipment";
import { shutterFr } from "./messages.fr";
import { shutterSize, venetianBlindSize } from "./size";

export const shutterModel: ParticipantModel = {
  equipment: { shutter },
  messages: { fr: shutterFr },
  viewSizes: { shutter: shutterSize, venetianBlind: venetianBlindSize },
};
