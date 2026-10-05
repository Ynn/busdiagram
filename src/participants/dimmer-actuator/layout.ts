// Pages of parameters of the dimmer actuator in the designer.
import type { ParameterLayout } from "../../knx/contracts";

import { dimmerChannel } from "../shared/dimming-layout";

export const dimmerLayout: ParameterLayout = {
  device: [
    {
      id: "scenes",
      title: "Scenes",
      items: [
        { groupObject: "scene" },
        {
          note: "The central scene object serves every output: one association to the scene address, and each output takes the state of its own assignment. An output can also have its own scene object, on its Scenes page.",
        },
      ],
    },
  ],
  channel: dimmerChannel,
};
