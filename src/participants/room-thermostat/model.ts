// Model entry of the room thermostat: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { roomThermostat } from "./behavior";
import { roomThermostatFr } from "./messages.fr";

export const roomThermostatModel: ParticipantModel = {
  behaviors: { "roomThermostat/v1": roomThermostat },
  messages: { fr: roomThermostatFr },
};
