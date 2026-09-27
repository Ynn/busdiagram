// Configuration consistency: an actuator or input parameter that compensates a physical
// property of its load must agree with that property. A mismatch is a valid scenario
// (it can illustrate a commissioning error) and is reported as a non-blocking warning.
import type { Translate } from "../i18n";
import type { Scenario } from "./scenario";

export interface ConfigWarning {
  code: string;
  deviceId: string;
  channelId?: string;
  message: string;
}

export function configWarnings(s: Scenario, t: Translate): ConfigWarning[] {
  const out: ConfigWarning[] = [];
  for (const d of s.devices) {
    for (const c of d.channels) {
      const eq = c.equipmentConfig;
      if (!eq) continue;
      // Heating actuator output and thermoelectric valve.
      if (d.behavior === "heatingActuator/v1" && eq.type === "radiator") {
        const actuatorNo = c.parameters.valveType === "normallyOpen";
        const valveNo = eq.parameters.normallyOpen === true;
        if (actuatorNo !== valveNo)
          out.push({
            code: "config-valve",
            deviceId: d.id,
            channelId: c.id,
            message: actuatorNo
              ? t`${d.name || d.id} · ${c.label}: the actuator expects a normally open valve, but the valve is normally closed; the valve opens when no heat is requested.`
              : t`${d.name || d.id} · ${c.label}: the actuator expects a normally closed valve, but the valve is normally open; the valve opens when no heat is requested.`,
          });
      }
      // Shutter actuator output and motor wiring.
      if (d.behavior === "shutterActuator/v1" && eq.type === "shutter") {
        const compensated = c.parameters.invertOutput === true;
        const reversed = eq.parameters.wiringReversed === true;
        if (compensated !== reversed)
          out.push({
            code: "config-wiring",
            deviceId: d.id,
            channelId: c.id,
            message: reversed
              ? t`${d.name || d.id} · ${c.label}: the motor is wired in reverse and the actuator does not compensate it; the shutter moves opposite to the commands.`
              : t`${d.name || d.id} · ${c.label}: the actuator inverts its output, but the motor is wired normally; the shutter moves opposite to the commands.`,
          });
      }
    }
    // Window contact: the input interpretation must match the contact type.
    if (d.behavior === "windowContact/v1") {
      const nc = d.parameters.contactType === "normallyClosed";
      const invert = d.parameters.invert === true;
      if (nc !== invert)
        out.push({
          code: "config-contact",
          deviceId: d.id,
          message: nc
            ? t`${d.name || d.id}: the contact is normally closed, but the input is not inverted; open and closed are reported the wrong way round.`
            : t`${d.name || d.id}: the input is inverted, but the contact is normally open; open and closed are reported the wrong way round.`,
        });
    }
  }
  // Group addresses linking one-bit DPTs with opposite meanings for the same state.
  const opposite: [string, string][] = [["1.009", "1.019"]];
  const byGa = new Map<string, { deviceId: string; dpt: string }[]>();
  for (const d of s.devices)
    for (const o of d.objects)
      for (const ga of o.gas) {
        const list = byGa.get(ga) ?? [];
        list.push({ deviceId: d.id, dpt: o.dpt });
        byGa.set(ga, list);
      }
  byGa.forEach((list, ga) => {
    for (const [a, b] of opposite) {
      const first = list.find((x) => x.dpt === a);
      if (first && list.some((x) => x.dpt === b))
        out.push({
          code: "config-polarity",
          deviceId: first.deviceId,
          message: t`${ga} links DPT ${a} and DPT ${b}, whose values 0 and 1 have opposite meanings; check the receiving objects.`,
        });
    }
  });
  return out;
}
