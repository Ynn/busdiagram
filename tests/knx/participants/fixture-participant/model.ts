// Model entry of the test beacon.
import type { ParticipantModel } from "../../../../src/knx/contracts";
import { beacon } from "./behavior";
import { beaconDe } from "./messages.de";
import { beaconFr } from "./messages.fr";

export const beaconModel: ParticipantModel = {
  behaviors: { "test.beacon/v1": beacon },
  messages: { fr: beaconFr, de: beaconDe },
};
