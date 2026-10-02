// Model entry of the time switch: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { timeSwitch } from "./behavior";
import { timeSwitchFr } from "./messages.fr";

export const timeSwitchModel: ParticipantModel = {
  behaviors: { "timeSwitch/v1": timeSwitch },
  messages: { fr: timeSwitchFr },
};
