// Model entry of the window contact: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { windowContact } from "./behavior";
import { windowContactFr } from "./messages.fr";

export const windowContactModel: ParticipantModel = {
  behaviors: { "windowContact/v1": windowContact },
  messages: { fr: windowContactFr },
};
