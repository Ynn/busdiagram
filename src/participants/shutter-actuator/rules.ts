// Rules of the shutter actuator on its configuration.
import type { Translate } from "../../i18n";
import type { RuleDeviceInfo, RuleWarning } from "../../knx/contracts";

/** An inverted output must compensate a motor wired in reverse, and only then. */
export function wiringWarnings(d: RuleDeviceInfo, t: Translate): RuleWarning[] {
  const out: RuleWarning[] = [];
  for (const c of d.channels)
    for (const eq of c.equipmentConfigs) {
      if (eq.type !== "shutter") continue;
      const compensated = c.parameters.invertOutput === true;
      const reversed = eq.parameters.wiringReversed === true;
      if (compensated !== reversed)
        out.push({
          code: "config-wiring",
          channelId: c.id,
          message: reversed
            ? t`${d.name || d.id} · ${c.label}: the motor is wired in reverse and the actuator does not compensate it; the shutter moves opposite to the commands.`
            : t`${d.name || d.id} · ${c.label}: the actuator inverts its output, but the motor is wired normally; the shutter moves opposite to the commands.`,
        });
    }
  return out;
}
