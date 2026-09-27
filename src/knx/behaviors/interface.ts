// usbInterface/v1: data interface (USB or IP) through which a commissioning tool accesses the bus.
// It has no group object: the tool writes and reads any group address since
// his individual address (often Z.L.255). His telegrams follow the topology:
// the couplers filter them like the others.
import type { BehaviorDefinition } from "../contracts";

export const usbInterface: BehaviorDefinition<Record<string, never>> = {
  description:
    "USB interface: writes and reads group addresses from the USB interface panel of the diagram.",
  ports: {},
  createState: () => ({}),
};
