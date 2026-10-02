// Model entry of the USB interface: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { usbInterface } from "./behavior";
import { usbInterfaceFr } from "./messages.fr";

export const usbInterfaceModel: ParticipantModel = {
  behaviors: { "usbInterface/v1": usbInterface },
  messages: { fr: usbInterfaceFr },
};
