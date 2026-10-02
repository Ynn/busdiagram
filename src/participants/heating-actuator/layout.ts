// Pages of parameters of the heating actuator in the designer.
import type { ParameterLayout } from "../../knx/contracts";

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
