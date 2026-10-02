// Model entry of the push-button interface: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { buttonInterface } from "./behavior";
import { buttonInterfaceFr } from "./messages.fr";

export const buttonInterfaceModel: ParticipantModel = {
  behaviors: { "buttonInterface/v1": buttonInterface },
  messages: { fr: buttonInterfaceFr },
};
