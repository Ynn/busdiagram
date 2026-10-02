// Model entry of the display: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { display } from "./behavior";
import { displayFr } from "./messages.fr";

export const displayModel: ParticipantModel = {
  behaviors: { "display/v1": display },
  messages: { fr: displayFr },
};
