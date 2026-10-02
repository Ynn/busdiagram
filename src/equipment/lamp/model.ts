// Model entry of the lamp: its physical model and the size of its views.
import type { ParticipantModel } from "../../knx/contracts";
import { lamp } from "./equipment";
import { lampFr } from "./messages.fr";
import { lampSize } from "./size";

export const lampModel: ParticipantModel = {
  equipment: { lamp },
  messages: { fr: lampFr },
  viewSizes: { lamp: lampSize },
};
