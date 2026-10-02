// Pages of parameters of the dimmer actuator in the designer.
import type { ParameterLayout } from "../../knx/contracts";

import { dimmerChannel } from "../shared/dimming-layout";

export const dimmerLayout: ParameterLayout = { channel: dimmerChannel };
