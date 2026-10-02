// Model entry of the clock master: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { clockMaster } from "./behavior";
import { clockMasterFr } from "./messages.fr";

export const clockMasterModel: ParticipantModel = {
  behaviors: { "clockMaster/v1": clockMaster },
  messages: { fr: clockMasterFr },
};
