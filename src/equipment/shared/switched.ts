// State of a switched load, shared by the lamp and the appliance.
import type { JsonObject } from "../../knx/contracts";

export interface LampState extends JsonObject {
  on: boolean;
}
