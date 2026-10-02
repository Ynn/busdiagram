// Rules of the USB interface on its configuration: the group addresses assigned to it.
import type { Translate } from "../../i18n";
import { isBroadcastGA, parseGA } from "../../knx/address";
import type { RuleDeviceInfo, RuleProblem } from "../../knx/contracts";

/** Entries of the groupAddresses parameter. */
const entries = (d: RuleDeviceInfo) =>
  typeof d.parameters.groupAddresses === "string"
    ? d.parameters.groupAddresses.split(/[\s,;]+/).filter(Boolean)
    : [];
const usable = (ga: string) => !!parseGA(ga) && !isBroadcastGA(ga);

/** Each assigned address must be a usable group address. */
export function usbInterfaceValidate(
  d: RuleDeviceInfo,
  t: Translate,
): RuleProblem[] {
  return entries(d)
    .filter((ga) => !usable(ga))
    .map((ga) => ({
      path: "parameters.groupAddresses",
      code: "address",
      message: parseGA(ga)
        ? t`0/0/0 is the broadcast address and cannot be used as a group address`
        : t`“${ga}” is not a valid 3-level group address (0–31/0–7/0–255)`,
    }));
}

/** The assigned addresses enter the filter tables of the couplers. */
export const usbInterfaceNormalize = (d: RuleDeviceInfo) => ({
  tableGroupAddresses: entries(d).filter(usable),
});
