// Model entry of the alarm module: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { alarmModule } from "./behavior";
import { alarmModuleFr } from "./messages.fr";

export const alarmModuleModel: ParticipantModel = {
  behaviors: { "alarmModule/v1": alarmModule },
  messages: { fr: alarmModuleFr },
};
