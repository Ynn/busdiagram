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
  // The contact expected when actuated must be that of the wired push-button.
  for (const c of d.channels) {
    const nc = c.keyContact === "normallyClosed";
    const open = c.parameters.actuatedContact === "open";
    if (nc !== open)
      out.push({
        code: "config-contact",
        channelId: c.id,
        message: nc
          ? t`${d.name || d.id}, ${c.label}: the push-button is normally closed, but the input expects a closed contact when actuated; presses and releases are seen the wrong way round.`
          : t`${d.name || d.id}, ${c.label}: the input expects an open contact when actuated, but the push-button is normally open; presses and releases are seen the wrong way round.`,
      });
  }
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
