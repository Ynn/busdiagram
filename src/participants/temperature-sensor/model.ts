// Model entry of the temperature sensor: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { temperatureSensor } from "./behavior";
import { temperatureSensorFr } from "./messages.fr";

export const temperatureSensorModel: ParticipantModel = {
  behaviors: { "temperatureSensor/v1": temperatureSensor },
  messages: { fr: temperatureSensorFr },
};
