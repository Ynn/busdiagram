// Model entry of the air quality sensor: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { airQualitySensor } from "./behavior";
import { airQualitySensorFr } from "./messages.fr";

export const airQualitySensorModel: ParticipantModel = {
  behaviors: { "airQualitySensor/v1": airQualitySensor },
  messages: { fr: airQualitySensorFr },
};
