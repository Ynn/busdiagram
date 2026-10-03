// Model entry of the fan coil: its physical model and the size of its views.
import type { ParticipantModel } from "../../knx/contracts";
import { fanCoil } from "./equipment";
import { fanCoilFr } from "./messages.fr";
import { fanCoilSize } from "./size";

export const fanCoilModel: ParticipantModel = {
  equipment: { fanCoil },
  messages: { fr: fanCoilFr },
  viewSizes: { fanCoil: fanCoilSize },
};
