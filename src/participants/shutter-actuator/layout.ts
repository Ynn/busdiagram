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
        { groupObject: "upperLimit" },
        { groupObject: "lowerLimit" },
        { initialState: "estimatedPositionPct" },
      ],
    },
    {
      id: "presets",
      title: "Stored positions",
      items: [
        { groupObject: "recallPosition12" },
        { groupObject: "recallPosition34" },
        { parameter: "preset1Pct" },
        { parameter: "preset2Pct" },
        { parameter: "preset3Pct" },
        { parameter: "preset4Pct" },
        { groupObject: "storePosition12" },
        { groupObject: "storePosition34" },
        { parameter: "presetStoring" },
      ],
    },
    {
      id: "safety",
      title: "Weather alarms",
      items: [
        { groupObject: "windAlarm" },
        {
          when: { groupObject: "windAlarm" },
          items: [{ parameter: "windReaction" }],
        },
        { groupObject: "rainAlarm" },
        {
          when: { groupObject: "rainAlarm" },
          items: [{ parameter: "rainReaction" }],
        },
        { groupObject: "frostAlarm" },
        {
          when: { groupObject: "frostAlarm" },
          items: [{ parameter: "frostReaction" }],
        },
        { parameter: "alarmPriority" },
        { parameter: "safetyPriority" },
        { parameter: "alarmMonitoringMs" },
        { parameter: "afterAlarm" },
        {
          note: "While a weather alarm, the lock, or forcing holds the output, commands are ignored; their order is set by the priority of the safety functions.",
        },
      ],
    },
    {
      id: "lock",
      title: "Forcing and lock",
      items: [
        { heading: "Forcing" },
        { groupObject: "forced" },
        {
          when: { groupObject: "forced" },
          items: [{ parameter: "afterForcing" }],
        },
        { heading: "Lock" },
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
