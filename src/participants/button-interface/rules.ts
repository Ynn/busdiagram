// Rules of the push-button interface on its configuration.
import type { Translate } from "../../i18n";
import type { RuleDeviceInfo, RuleWarning } from "../../knx/contracts";
import { checkValue } from "../../knx/dpt";

/** Values sent by an input: within the range of the DPT of its value object. */
export function buttonInterfaceWarnings(
  d: RuleDeviceInfo,
  t: Translate,
): RuleWarning[] {
  const out: RuleWarning[] = [];
  for (const c of d.channels) {
    const o = d.objects.find((x) => x.port === "value" && x.channel === c.id);
    if (!o || c.parameters.function !== "value") continue;
    for (const k of ["shortValue", "longValue"]) {
      const v = c.parameters[k];
      const bad = typeof v === "number" ? checkValue(o.dpt, v, t) : null;
      if (bad)
        out.push({
          code: "config-value-range",
          message: t`${d.name || d.id}, ${c.label}: ${bad}`,
        });
    }
  }
  return out;
}
