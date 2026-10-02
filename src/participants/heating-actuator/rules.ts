// Rules of the heating actuator on its configuration.
import type { Translate } from "../../i18n";
import type { RuleDeviceInfo, RuleWarning } from "../../knx/contracts";

/** The valve type expected by an output must be that of the valve installed. */
export function valveWarnings(d: RuleDeviceInfo, t: Translate): RuleWarning[] {
  const out: RuleWarning[] = [];
  for (const c of d.channels)
    for (const eq of c.equipmentConfigs) {
      if (eq.type !== "radiator") continue;
      const actuatorNo = c.parameters.valveType === "normallyOpen";
      const valveNo = eq.parameters.normallyOpen === true;
      if (actuatorNo !== valveNo)
        out.push({
          code: "config-valve",
          channelId: c.id,
          message: actuatorNo
            ? t`${d.name || d.id} · ${c.label}: the actuator expects a normally open valve, but the valve is normally closed; the valve opens when no heat is requested.`
            : t`${d.name || d.id} · ${c.label}: the actuator expects a normally closed valve, but the valve is normally open; the valve opens when no heat is requested.`,
        });
    }
  return out;
}
