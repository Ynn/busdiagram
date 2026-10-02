// Model entry of the DALI group: its physical model and the size of its views.
import type { ParticipantModel } from "../../knx/contracts";
import { daliGroup } from "./equipment";
import { daliGroupFr } from "./messages.fr";
import { daliGroupSize } from "./size";

export const daliGroupModel: ParticipantModel = {
  equipment: { daliGroup },
  messages: { fr: daliGroupFr },
  viewSizes: { daliGroup: daliGroupSize },
};
