// Pages of parameters of the room thermostat in the designer.
import type { ParameterLayout } from "../../knx/contracts";

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
        { groupObject: "forcedMode" },
        { heading: "Mode objects (1 bit)" },
        { groupObject: "comfortMode" },
        { groupObject: "nightMode" },
        { groupObject: "protectionMode" },
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
        { groupObject: "controlValue" },
        { groupObject: "controlSwitch" },
        { heading: "Heating and cooling" },
        { parameter: "changeover" },
        {
          when: { parameter: "changeover", is: ["object"] },
          items: [{ groupObject: "heatCool" }],
        },
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
