// Model entry of the gateway to another system: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { systemGateway } from "./behavior";
import { systemGatewayFr } from "./messages.fr";

export const systemGatewayModel: ParticipantModel = {
  behaviors: { "systemGateway/v1": systemGateway },
  messages: { fr: systemGatewayFr },
};
