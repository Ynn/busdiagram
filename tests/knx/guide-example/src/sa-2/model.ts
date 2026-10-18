import { defineProduct } from "bus-diagram";
import type { ProductObject } from "bus-diagram";
import { sa2Firmware, OUTPUTS } from "./firmware";

export const sa2Model = defineProduct({
  id: "example/sa-2",
  behavior: "example.sa2/v1",
  kind: "switchActuator",
  manufacturer: "Example Electric",
  manufacturerId: 0xfe,
  // What the delivered device holds: its manufacturer code at 104h, which ETS checks.
  delivered: [[0x104, [0xfe]]],
  name: "SA 2",
  description: "Example Electric SA 2: switch actuator, 2 outputs.",
  programs: ["M-00FE_A-0001-10"],
  masks: [0x0012],
  // Where its parameters are: the pages of the designer set these octets.
  parameterMemory: [[0x100 + 100, 2]],
  channels: OUTPUTS.map((c) => ({ id: c, label: c.toUpperCase() })),
  output: "switch",
  // The group objects of its application (a function of the memory when they depend
  // on parameters).
  objects: (): ProductObject[] =>
    OUTPUTS.map((ch, n) => ({ number: n, channel: ch, dpt: "1.001" })),
  firmware: sa2Firmware,
});

export const sa2 = {
  ...sa2Model,
  messages: {
    fr: {
      "Example Electric SA 2: switch actuator, 2 outputs.":
        "Example Electric SA 2 : actionneur de commutation, 2 sorties.",
    },
  },
};
