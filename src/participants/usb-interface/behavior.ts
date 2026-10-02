// usbInterface/v1: data interface (USB or IP) through which a commissioning tool accesses the bus.
// It has no group object: the tool writes and reads any group address from its individual
// address (often A.L.255). Its telegrams follow the topology: couplers filter them like the
// others. Group addresses assigned to the interface in the project (parameter groupAddresses)
// enter the coupler filter tables, as for a bus interface modeled in a project.
import type { BehaviorDefinition } from "../../knx/contracts";
import { usbInterfaceNormalize, usbInterfaceValidate } from "./rules";

export const usbInterface: BehaviorDefinition<Record<string, never>> = {
  presentation: () => ({ busInterface: true }),
  description:
    "USB interface: writes and reads group addresses from the USB interface panel of the diagram.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      groupAddresses: {
        title: "Group addresses assigned to the interface",
        type: "string",
        default: "",
        description:
          "Group addresses assigned to this interface in the project, separated by spaces or commas. Coupler filter tables include them, so telegrams on these addresses cross couplers to and from the interface. Without them, a coupler filters an address that is not used on the interface side.",
      },
    },
  },
  ports: {},
  validate: usbInterfaceValidate,
  normalize: usbInterfaceNormalize,
  createState: () => ({}),
};
