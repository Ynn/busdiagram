// Model entry of the dimmable lamp: its physical model and the size of its views.
import type { ParticipantModel } from "../../knx/contracts";
import { dimmableLamp } from "./equipment";
import { dimmableLampFr } from "./messages.fr";
import { dimmableLampSize } from "./size";

export const dimmableLampModel: ParticipantModel = {
  equipment: { dimmableLamp },
  messages: { fr: dimmableLampFr },
  viewSizes: { dimmableLamp: dimmableLampSize },
};
