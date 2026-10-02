// Pages of parameters of the standard behaviors in the designer, organized by function as
// the parameter dialogs of actuators: each function on its own page, the group objects
// enabled where their function is set, the dependent settings shown only when they apply.
import type { ParameterLayout } from "../contracts";

export const switchLayout: ParameterLayout = {
  device: [
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
          items: [{ parameter: "afterForcing" }],
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
        {
          when: { groupObject: "scene" },
          items: [{ parameter: "sceneLearning" }, { scenes: true }],
        },
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

const dimmerChannel: ParameterLayout["channel"] = [
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

export const dimmerLayout: ParameterLayout = { channel: dimmerChannel };

export const daliLayout: ParameterLayout = {
  device: [
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

export const heatingLayout: ParameterLayout = {
  channel: [
    {
      id: "valve",
      title: "Valve",
      items: [
        { groupObject: "value" },
        { groupObject: "switch" },
        { groupObject: "valueStatus" },
        { parameter: "valveType" },
        { parameter: "cycleMs" },
      ],
    },
    {
      id: "safety",
      title: "Safety",
      items: [
        { groupObject: "fault" },
        { parameter: "monitoringMs" },
        { parameter: "emergencyPct" },
      ],
    },
  ],
};

export const thermostatLayout: ParameterLayout = {
  device: [
    {
      id: "setpoints",
      title: "Setpoints",
      items: [
        { parameter: "comfortC" },
        { parameter: "standbyShiftK" },
        { parameter: "economyShiftK" },
        { parameter: "frostProtectionC" },
        { parameter: "heatProtectionC" },
        { parameter: "deadZoneK" },
        { parameter: "minSetpointC" },
        { parameter: "maxSetpointC" },
        { heading: "Group objects" },
        { groupObject: "baseSetpoint" },
        { groupObject: "setpointShift" },
        { groupObject: "setpointStatus" },
        { groupObject: "hvacMode" },
        { groupObject: "hvacModeStatus" },
      ],
    },
    {
      id: "control",
      title: "Control",
      items: [
        { parameter: "controlType" },
        {
          when: { parameter: "controlType", is: ["pi"] },
          items: [
            { parameter: "proportionalBandK" },
            { parameter: "integralTimeMs" },
            { parameter: "pwmCycleMs" },
          ],
        },
        {
          when: { parameter: "controlType", is: ["twoPoint"] },
          items: [{ parameter: "hysteresisK" }],
        },
        { parameter: "controlPeriodMs" },
        { parameter: "valueSendDeltaPct" },
        { parameter: "valueCyclicMs" },
        { heading: "Group objects" },
        { groupObject: "heatingValue" },
        { groupObject: "heatingSwitch" },
        { groupObject: "coolingValue" },
        { groupObject: "coolingSwitch" },
        { groupObject: "heatCool" },
        { groupObject: "heatCoolStatus" },
      ],
    },
    {
      id: "temperature",
      title: "Temperature",
      items: [
        { groupObject: "actualTemp" },
        { parameter: "temperatureSendDeltaK" },
        { parameter: "temperatureCyclicMs" },
        { groupObject: "externalTemp" },
        {
          when: { groupObject: "externalTemp" },
          items: [{ parameter: "externalTempTimeoutMs" }],
        },
      ],
    },
    {
      id: "presence",
      title: "Presence and window",
      items: [{ groupObject: "presence" }, { groupObject: "window" }],
    },
  ],
};

/** Push-button interface: one input per channel; the function decides the rest. */
export const buttonInterfaceLayout: ParameterLayout = {
  channel: [
    {
      id: "function",
      title: "Function",
      items: [
        { parameter: "function" },
        {
          note: "The group objects of the function are created with it; link them in the Group objects tab.",
        },
        {
          when: { parameter: "function", is: ["switch"] },
          items: [
            { parameter: "switchLongPress" },
            {
              when: { parameter: "switchLongPress", not: [true] },
              items: [{ parameter: "onPress" }, { parameter: "onRelease" }],
            },
            {
              when: { parameter: "switchLongPress", is: [true] },
              items: [
                { parameter: "onShort" },
                { parameter: "onLong" },
                { parameter: "longPressMs" },
              ],
            },
          ],
        },
        {
          when: { parameter: "function", is: ["dim"] },
          items: [
            { parameter: "dimMode" },
            { parameter: "dimStep" },
            { parameter: "longPressMs" },
          ],
        },
        {
          when: { parameter: "function", is: ["blind"] },
          items: [
            { parameter: "blindMode" },
            { parameter: "stopOnRelease" },
            { parameter: "longPressMs" },
          ],
        },
        {
          when: { parameter: "function", is: ["value"] },
          items: [
            { parameter: "shortValue" },
            { parameter: "longValue" },
            {
              when: { parameter: "longValue", not: [null] },
              items: [{ parameter: "longPressMs" }],
            },
          ],
        },
        {
          when: { parameter: "function", is: ["scene"] },
          items: [
            { parameter: "sceneNumber" },
            { parameter: "sceneStore" },
            {
              when: { parameter: "sceneStore", is: [true] },
              items: [
                { parameter: "longPressMs" },
                {
                  note: "Storing needs a scene control object (DPT 18.001); a scene number object (17.001) only recalls.",
                },
              ],
            },
          ],
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
            {
              when: { parameter: "function", is: ["switch", "dim"] },
              items: [{ parameter: "lockStart" }, { parameter: "lockEnd" }],
            },
            {
              when: { parameter: "function", is: ["blind"] },
              items: [
                { parameter: "blindLockStart" },
                { parameter: "blindLockEnd" },
              ],
            },
            { note: "While the input is locked, its presses are ignored." },
          ],
        },
      ],
    },
    {
      id: "led",
      title: "LED",
      items: [
        { parameter: "ledShown" },
        {
          when: { parameter: "ledShown", is: [true] },
          items: [
            { groupObject: "led" },
            { parameter: "ledInverted" },
            {
              note: "Without an LED object, the LED of a switching or dimming input shows its switching object.",
            },
          ],
        },
      ],
    },
    {
      id: "operation",
      title: "Bus voltage and cyclic sending",
      items: [
        { heading: "Bus voltage recovery" },
        {
          when: { parameter: "function", is: ["switch", "dim"] },
          items: [{ parameter: "busRecovery" }],
        },
        {
          when: { parameter: "function", is: ["blind"] },
          items: [{ parameter: "blindBusRecovery" }],
        },
        {
          when: { parameter: "function", is: ["switch", "dim", "blind"] },
          items: [{ parameter: "busRecoveryDelayMs" }],
        },
        {
          when: { parameter: "function", is: ["value", "scene"] },
          items: [{ note: "No reaction for this function." }],
        },
        { heading: "Cyclic sending" },
        {
          when: { parameter: "function", is: ["switch"] },
          items: [
            { parameter: "cyclicMs" },
            {
              when: { parameter: "cyclicMs", not: [null] },
              items: [{ parameter: "cyclicWhen" }],
            },
          ],
        },
        {
          when: { parameter: "function", not: ["switch"] },
          items: [
            { note: "Cyclic sending applies to the switching function." },
          ],
        },
      ],
    },
  ],
};
