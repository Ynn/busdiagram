// Pages of parameters of the test beacon.
import type { ParameterLayout } from "../../../../src/knx/contracts";

export const beaconLayout: ParameterLayout = {
  device: [{ id: "beacon", title: "Beacon", items: [{ parameter: "loud" }] }],
};
