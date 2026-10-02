// Rules of the window contact on its configuration.
import type { Translate } from "../../i18n";
import type { RuleDeviceInfo, RuleWarning } from "../../knx/contracts";

/** The interpretation of the input must match the contact type. */
export function contactWarnings(
  d: RuleDeviceInfo,
  t: Translate,
): RuleWarning[] {
  const nc = d.parameters.contactType === "normallyClosed";
  const invert = d.parameters.invert === true;
  if (nc === invert) return [];
  return [
    {
      code: "config-contact",
      message: nc
        ? t`${d.name || d.id}: the contact is normally closed, but the input is not inverted; open and closed are reported the wrong way round.`
        : t`${d.name || d.id}: the input is inverted, but the contact is normally open; open and closed are reported the wrong way round.`,
    },
  ];
}
