// Pages of a dimming channel, shared by the dimmer actuator and the DALI gateway.
import type { ParameterLayout } from "../../knx/contracts";

export const dimmerChannel: ParameterLayout["channel"] = [
  {
    id: "function",
    title: "Function",
    items: [
      { groupObject: "switch" },
      { groupObject: "dim" },
      { groupObject: "value" },
      { parameter: "onLevel" },
      {
        when: { parameter: "onLevel", is: ["fixed"] },
        items: [{ parameter: "onLevelPct" }],
      },
      { parameter: "dimTimeMs" },
      { initialState: "levelPct" },
    ],
  },
  {
    id: "status",
    title: "Status",
    items: [
      { groupObject: "status" },
      { groupObject: "valueStatus" },
      { parameter: "statusDelayMs" },
    ],
  },
  {
    id: "limits",
    title: "Limits and transitions",
    items: [
      { parameter: "minLevelPct" },
      { parameter: "maxLevelPct" },
      { parameter: "switchFadeMs" },
      { parameter: "valueFadeMs" },
      { heading: "Switching by dimming or by value" },
      { parameter: "dimSwitchesOn" },
      { parameter: "dimSwitchesOff" },
      { parameter: "valueSwitchesOn" },
      { parameter: "valueSwitchesOff" },
    ],
  },
  {
    id: "colour",
    title: "Colour temperature",
    items: [
      { groupObject: "colourTemperature" },
      { groupObject: "colourTemperatureStatus" },
      {
        when: { groupObject: "colourTemperature" },
        items: [
          { parameter: "minColourK" },
          { parameter: "maxColourK" },
          { initialState: "colourTemperatureK" },
        ],
      },
    ],
  },
  {
    id: "bus",
    title: "Bus voltage",
    items: [
      { parameter: "busFailure" },
      {
        when: { parameter: "busFailure", is: ["level"] },
        items: [{ parameter: "busFailureLevelPct" }],
      },
      { parameter: "busRecovery" },
    ],
  },
  {
    id: "scenes",
    title: "Scenes",
    items: [
      { groupObject: "scene" },
      {
        when: { groupObject: "scene" },
        items: [{ parameter: "sceneLearning" }, { scenes: true }],
      },
    ],
  },
];
