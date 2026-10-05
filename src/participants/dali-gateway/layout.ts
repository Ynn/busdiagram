// Pages of parameters of the KNX/DALI gateway in the designer.
import type { ParameterLayout } from "../../knx/contracts";

import { dimmerChannel } from "../shared/dimming-layout";

export const daliLayout: ParameterLayout = {
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
    {
      id: "gateway",
      title: "Gateway",
      items: [
        { parameter: "pollMs" },
        { heading: "Broadcast" },
        { groupObject: "broadcastSwitch" },
        { groupObject: "broadcastValue" },
        { heading: "Faults" },
        { groupObject: "generalError" },
      ],
    },
  ],
  channel: [
    // DALI groups receive no colour temperature object: only its limits remain.
    ...dimmerChannel!.map((page) =>
      page.id === "colour"
        ? {
            ...page,
            items: [
              { parameter: "minColourK" },
              { parameter: "maxColourK" },
              { initialState: "colourTemperatureK" },
            ],
          }
        : page,
    ),
    {
      id: "faults",
      title: "Faults",
      items: [
        { groupObject: "error" },
        {
          note: "A faulty ballast leaves its lamp off; the gateway reports it on this object.",
        },
      ],
    },
  ],
};
