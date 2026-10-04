// Pages of parameters of the heating actuator in the designer.
import type { ParameterLayout } from "../../knx/contracts";

export const heatingLayout: ParameterLayout = {
  channel: [
    {
      id: "valve",
      title: "Valve",
      items: [
        { parameter: "valveMode" },
        {
          when: { parameter: "valveMode", not: ["cooling"] },
          items: [{ groupObject: "value" }, { groupObject: "switch" }],
        },
        {
          when: { parameter: "valveMode", not: ["heating"] },
          items: [
            { groupObject: "coolingValue" },
            { groupObject: "coolingSwitch" },
          ],
        },
        {
          when: { parameter: "valveMode", is: ["changeover"] },
          items: [
            {
              note: "Link the heating and the cooling control values of the room controller: the valve follows the one that is not zero, and the water it lets through is hot or cold accordingly.",
            },
            { groupObject: "heatCool" },
            {
              note: "With the heating/cooling object, the water comes from it, and the last control value received applies: link a common control value of the room controller to the heating control value.",
            },
          ],
        },
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
