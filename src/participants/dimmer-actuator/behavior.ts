// KNX dimmer actuator: switching, relative dimming, value, scenes and status feedback.
import type { BehaviorDefinition } from "../../knx/contracts";
import type { DimmerState } from "../shared/dimming";
import { base } from "../shared/dimming";
import { dimmerLayout } from "./layout";

export const dimmerActuator: BehaviorDefinition<DimmerState> = {
  parameterLayout: dimmerLayout,
  ...base(
    "Dimmer: switching, relative (3.007) and absolute (5.001) dimming, tunable white (7.600), status feedback.",
    {
      colourTemperature: {
        dpts: ["7.600"],
        channel: "required",
        title: "Colour temperature",
        direction: "in",
        description:
          "colour temperature setpoint (K) of a tunable white channel",
      },
      colourTemperatureStatus: {
        dpts: ["7.600"],
        channel: "required",
        title: "Colour temperature status",
        direction: "out",
        description: "applied colour temperature (K)",
      },
    },
  ),
};
