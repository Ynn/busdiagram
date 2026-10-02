// Pages of parameters of the shutter actuator in the designer.
import type { ParameterLayout } from "../../knx/contracts";

export const shutterLayout: ParameterLayout = {
  channel: [
    {
      id: "drive",
      title: "Drive",
      items: [
        { groupObject: "move" },
        { groupObject: "stopStep" },
        { parameter: "estimatedTravelTimeMs" },
        { parameter: "estimatedTravelTimeUpMs" },
        { parameter: "startDelayMs" },
        { parameter: "endSupplementPct" },
        { parameter: "stepPct" },
        { parameter: "invertOutput" },
      ],
    },
    {
      id: "slats",
      title: "Slats",
      items: [
        { parameter: "slatTravelMs" },
        {
          when: { parameter: "slatTravelMs", not: [0] },
          items: [
            { parameter: "slatStepPct" },
            { groupObject: "slatCommand" },
            { groupObject: "slatStatus" },
            { initialState: "estimatedSlatPct" },
          ],
        },
      ],
    },
    {
      id: "position",
      title: "Position",
      items: [
        { groupObject: "positionCommand" },
        { groupObject: "positionStatus" },
        {
          when: { groupObject: "positionStatus" },
          items: [{ parameter: "statusDelayMs" }],
        },
        { initialState: "estimatedPositionPct" },
      ],
    },
    {
      id: "safety",
      title: "Safety",
      items: [
        { groupObject: "windAlarm" },
        {
          note: "The wind alarm raises the shutter and blocks it until the alarm ends.",
        },
      ],
    },
    {
      id: "lock",
      title: "Lock",
      items: [
        { groupObject: "lock" },
        {
          when: { groupObject: "lock" },
          items: [
            { parameter: "lockStart" },
            {
              when: { parameter: "lockStart", is: ["position"] },
              items: [{ parameter: "lockPositionPct" }],
            },
            { parameter: "afterLock" },
            { note: "The wind alarm has priority over the lock." },
          ],
        },
      ],
    },
    {
      id: "bus",
      title: "Bus voltage",
      items: [
        { parameter: "busFailure" },
        { parameter: "busRecovery" },
        {
          when: { parameter: "busRecovery", is: ["position"] },
          items: [{ parameter: "busRecoveryPositionPct" }],
        },
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
  ],
};
