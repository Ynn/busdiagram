// Model entry of the hot water cylinder: its physical model and the size of its views.
import type { ParticipantModel } from "../../knx/contracts";
import { waterHeater } from "./equipment";
import { waterHeaterFr } from "./messages.fr";
import { waterHeaterSize } from "./size";

export const waterHeaterModel: ParticipantModel = {
  equipment: { waterHeater },
  messages: { fr: waterHeaterFr },
  viewSizes: { waterHeater: waterHeaterSize },
};
