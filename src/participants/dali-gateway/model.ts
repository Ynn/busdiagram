// Model entry of the KNX/DALI gateway: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { daliGateway } from "./behavior";
import { daliGatewayFr } from "./messages.fr";

export const daliGatewayModel: ParticipantModel = {
  behaviors: { "daliGateway/v1": daliGateway },
  messages: { fr: daliGatewayFr },
};
