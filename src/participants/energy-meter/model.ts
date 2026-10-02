// Model entry of the energy meter: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { energyMeter } from "./behavior";
import { energyMeterFr } from "./messages.fr";

export const energyMeterModel: ParticipantModel = {
  behaviors: { "energyMeter/v1": energyMeter },
  messages: { fr: energyMeterFr },
};
