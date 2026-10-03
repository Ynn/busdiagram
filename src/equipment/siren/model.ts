// Model entry of the alarm sounder: its physical model and the size of its views.
import type { ParticipantModel } from "../../knx/contracts";
import { siren } from "./equipment";
import { sirenFr } from "./messages.fr";
import { sirenSize } from "./size";

export const sirenModel: ParticipantModel = {
  equipment: { siren },
  messages: { fr: sirenFr },
  viewSizes: { siren: sirenSize },
};
