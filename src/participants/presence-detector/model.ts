// Model entry of the presence detector: what the library installs.
import type { ParticipantModel } from "../../knx/contracts";
import { presenceDetector } from "./behavior";
import { presenceDetectorFr } from "./messages.fr";

export const presenceDetectorModel: ParticipantModel = {
  behaviors: { "presenceDetector/v1": presenceDetector },
  messages: { fr: presenceDetectorFr },
};
