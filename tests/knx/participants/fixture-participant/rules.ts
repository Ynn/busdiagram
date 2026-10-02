// Rules of the test beacon.
import type { Translate } from "../../../../src/i18n";
import type {
  RuleDeviceInfo,
  RuleWarning,
} from "../../../../src/knx/contracts";

export function beaconWarnings(d: RuleDeviceInfo, t: Translate): RuleWarning[] {
  return d.parameters.loud === true
    ? [{ code: "beacon-loud", message: t`${d.name}: the beacon is loud` }]
    : [];
}
