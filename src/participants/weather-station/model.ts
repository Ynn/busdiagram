// Model entry of the weather station: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { weatherStation } from "./behavior";
import { weatherStationFr } from "./messages.fr";

export const weatherStationModel: ParticipantModel = {
  behaviors: { "weatherStation/v1": weatherStation },
  messages: { fr: weatherStationFr },
};
