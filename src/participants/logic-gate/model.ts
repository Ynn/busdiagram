// Model entry of the logic module: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { logicGate } from "./behavior";
import { logicGateFr } from "./messages.fr";

export const logicGateModel: ParticipantModel = {
  behaviors: { "logicGate/v1": logicGate },
  messages: { fr: logicGateFr },
};
