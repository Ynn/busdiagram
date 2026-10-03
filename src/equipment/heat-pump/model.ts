// Model entry of the heat pump: its physical model and the size of its views.
import type { ParticipantModel } from "../../knx/contracts";
import { heatPump } from "./equipment";
import { heatPumpFr } from "./messages.fr";
import { heatPumpSize } from "./size";

export const heatPumpModel: ParticipantModel = {
  equipment: { heatPump },
  messages: { fr: heatPumpFr },
  viewSizes: { heatPump: heatPumpSize },
};
