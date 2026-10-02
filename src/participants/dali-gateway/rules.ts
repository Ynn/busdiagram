// Rules of the KNX/DALI gateway on its configuration.
import type { Translate } from "../../i18n";
import type { RuleDeviceInfo, RuleProblem } from "../../knx/contracts";

/**
 * Limits of the DALI model: 16 groups, scenes 1–16, and groups that do not share a
 * ballast (a shared short address is not simulated as two unrelated loads).
 */
export function daliRules(d: RuleDeviceInfo, t: Translate): RuleProblem[] {
  const out: RuleProblem[] = [];
  if (d.channels.length > 16)
    out.push({
      path: "channels",
      code: "range",
      message: t`DALI gateway supports at most 16 groups`,
    });
  d.channels.forEach((channel, index) => {
    for (const n of channel.scenes.keys())
      if (n > 16)
        out.push({
          path: `channels[${index}].scenes.${n}`,
          code: "range",
          message: t`DALI scene number 1–16 expected`,
        });
  });
  const owners = new Map<number, string>();
  d.channels.forEach((channel, index) => {
    channel.equipmentConfigs.forEach((equipment, li) => {
      if (equipment.type !== "daliGroup") return;
      const first = Number(equipment.parameters.firstAddress ?? 0);
      const count = Number(equipment.parameters.ballasts ?? 2);
      if (
        !Number.isInteger(first) ||
        !Number.isInteger(count) ||
        first < 0 ||
        count < 1 ||
        first + count > 64
      )
        return;
      for (let address = first; address < first + count; address++) {
        const previous = owners.get(address);
        if (previous)
          out.push({
            path: `channels[${index}].equipment${channel.equipmentConfigs.length > 1 ? `[${li}]` : ""}.parameters.firstAddress`,
            code: "duplicate",
            message: t`DALI short address A${address} is already assigned to channel ${previous}; overlapping groups are outside this model`,
          });
        else owners.set(address, channel.id);
      }
    });
  });
  return out;
}
