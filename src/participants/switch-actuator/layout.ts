// Pages of parameters of the switch actuator in the designer: each function of an output
// on its own page, the group objects enabled where their function is set.
import type { ParameterLayout } from "../../knx/contracts";

export const switchLayout: ParameterLayout = {
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
      id: "metering",
      title: "Metering and load shedding",
      items: [
        { heading: "Total power" },
        { groupObject: "totalPower" },
        { parameter: "meterIntervalMs" },
        { parameter: "powerSendDeltaW" },
        { parameter: "energyTimeScale" },
        { heading: "Load shedding" },
        { parameter: "powerLimitW" },
        {
          when: { parameter: "powerLimitW", not: [0, null] },
          items: [
            { groupObject: "powerLimit" },
            { parameter: "powerLimitHysteresisW" },
            { parameter: "sheddingTimeMs" },
          ],
        },
      ],
    },
  ],
  channel: [
    {
      id: "function",
      title: "Function",
      items: [
        { groupObject: "switch" },
        { parameter: "relayMode" },
        { initialState: "on" },
        { heading: "Status" },
        { groupObject: "status" },
        {
          when: { groupObject: "status" },
          items: [{ parameter: "statusDelayMs" }],
        },
      ],
    },
    {
      id: "delays",
      title: "Delays",
      items: [
        { parameter: "onDelayMs" },
        { parameter: "offDelayMs" },
        {
          note: "Delays apply to the switching object; scenes, forcing, and the lock act at once.",
        },
      ],
    },
    {
      id: "timer",
      title: "Timer",
      items: [
        { parameter: "timerMs" },
        {
          when: { parameter: "timerMs", not: [null, 0] },
          items: [
            { parameter: "timerRetrigger" },
            { parameter: "timerWarningMs" },
            { parameter: "timerOffAllowed" },
          ],
        },
      ],
    },
    {
      id: "forcing",
      title: "Forcing and lock",
      items: [
        { heading: "Forcing" },
        { groupObject: "forced" },
        {
          when: { groupObject: "forced" },
          items: [
            { parameter: "forcedReleaseMs" },
            { parameter: "afterForcing" },
          ],
        },
        { heading: "Lock" },
        { groupObject: "lock" },
        {
          when: { groupObject: "lock" },
          items: [
            { parameter: "lockStart" },
            { parameter: "afterLock" },
            {
              note: "Forcing has priority over the lock; while either is active, commands are stored.",
            },
          ],
        },
      ],
    },
    {
      id: "alarms",
      title: "Alarms",
      items: [
        { groupObject: "fireAlarm" },
        { groupObject: "intrusionAlarm" },
        {
          when: { groupObject: "intrusionAlarm" },
          items: [{ parameter: "blinkMs" }],
        },
        { parameter: "afterAlarm" },
        {
          note: "Fire forces the output on, intrusion makes it blink; fire has priority over intrusion, and both over forcing and the lock.",
        },
      ],
    },
    {
      id: "logic",
      title: "Logic link",
      items: [
        { groupObject: "logic" },
        {
          when: { groupObject: "logic" },
          items: [{ parameter: "logicOperation" }],
        },
      ],
    },
    {
      id: "scenes",
      title: "Scenes",
      items: [
        { groupObject: "scene" },
        { parameter: "sceneLearning" },
        { scenes: true },
      ],
    },
    {
      id: "bus",
      title: "Bus voltage",
      items: [{ parameter: "busFailure" }, { parameter: "busRecovery" }],
    },
    {
      id: "metering",
      title: "Metering",
      items: [
        { groupObject: "power" },
        { groupObject: "energy" },
        { parameter: "loadShedding" },
        {
          note: "Shedding applies when the device has a total power limit (page Metering and load shedding).",
        },
      ],
    },
  ],
};
