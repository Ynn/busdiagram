// Rules of the shutter actuator on its configuration.
import type { Translate } from "../../i18n";
import type { RuleDeviceInfo, RuleWarning } from "../../knx/contracts";

/** An inverted output must compensate a motor wired in reverse, and only then. */
export function wiringWarnings(d: RuleDeviceInfo, t: Translate): RuleWarning[] {
  const out: RuleWarning[] = [];
  for (const c of d.channels)
    for (const eq of c.equipmentConfigs) {
      if (eq.type !== "shutter") continue;
      // The actuator must know the slats of the blind it drives: a short press at rest turns
      // slats only on an output set for a venetian blind (with slat adjustment).
      const outputSlats = Number(c.parameters.slatTravelMs ?? 0) > 0;
      const blindSlats = Number(eq.parameters.slatTravelMs ?? 0) > 0;
      if (outputSlats !== blindSlats)
        out.push({
          code: "config-slats",
          channelId: c.id,
          message: blindSlats
            ? t`${d.name || d.id} · ${c.label}: the blind has slats, but the output is set for a roller shutter (slat rotation time 0); stop/step at rest does not turn the slats.`
            : t`${d.name || d.id} · ${c.label}: the output is set for slats, but the connected shutter has none (slat rotation time 0).`,
        });
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
