// Pages of parameters of the alarm module in the designer.
import type { ParameterLayout } from "../../knx/contracts";

export const alarmModuleLayout: ParameterLayout = {
  channel: [
    {
      id: "intrusion",
      title: "Intrusion",
      items: [
        { groupObject: "intrusionTrigger" },
        { groupObject: "intrusionReset" },
        { groupObject: "intrusionState" },
      ],
    },
    {
      id: "fire",
      title: "Fire",
      items: [
        { groupObject: "fireTrigger" },
        { groupObject: "fireReset" },
        { groupObject: "fireState" },
        {
          note: "An alarm stays stored when its trigger returns to 0; a reset is accepted only once the trigger is 0.",
        },
      ],
    },
  ],
};
