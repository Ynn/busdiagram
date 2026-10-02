// Model entry of the appliance: its physical model and the size of its views.
import type { ParticipantModel } from "../../knx/contracts";
import { appliance } from "./equipment";
import { applianceFr } from "./messages.fr";
import { applianceSize } from "./size";

export const applianceModel: ParticipantModel = {
  equipment: { appliance },
  messages: { fr: applianceFr },
  viewSizes: { appliance: applianceSize },
};
