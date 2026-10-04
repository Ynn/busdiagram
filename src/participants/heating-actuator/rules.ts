// Rules of the heating actuator on its configuration.
import type { Translate } from "../../i18n";
import type { RuleDeviceInfo, RuleWarning } from "../../knx/contracts";

const VALVE_LOADS = ["radiator", "fanCoil"];

/**
 * The valve type expected by an output must be that of the valve installed; the control
 * values linked and the emitter must match the function of the output.
 */
export function valveWarnings(d: RuleDeviceInfo, t: Translate): RuleWarning[] {
  const out: RuleWarning[] = [];
  const who = (label: string) => `${d.name || d.id} · ${label}`;
  for (const c of d.channels) {
    const mode =
      c.parameters.valveMode === "cooling" ||
      c.parameters.valveMode === "changeover"
        ? c.parameters.valveMode
        : "heating";
    const ports = d.objects
      .filter((o) => o.channel === c.id && o.gas.length)
      .map((o) => o.port);
    if (
      mode === "heating" &&
      ports.some((p) => p === "coolingValue" || p === "coolingSwitch")
    )
      out.push({
        code: "config-valve-mode",
        channelId: c.id,
        message: t`${who(c.label)}: a cooling control value is linked, but the output is a heating valve and ignores it; set its function to cooling or change-over.`,
      });
    if (mode !== "changeover" && ports.includes("heatCool"))
      out.push({
        code: "config-valve-mode",
        channelId: c.id,
        message: t`${who(c.label)}: a heating/cooling object is linked, but the output is not a change-over valve and ignores it.`,
      });
    if (
      mode === "cooling" &&
      ports.some((p) => p === "value" || p === "switch")
    )
      out.push({
        code: "config-valve-mode",
        channelId: c.id,
        message: t`${who(c.label)}: a heating control value is linked, but the output is a cooling valve and ignores it; set its function to heating or change-over.`,
      });
    for (const eq of c.equipmentConfigs) {
      if (!VALVE_LOADS.includes(eq.type)) continue;
      const actuatorNo = c.parameters.valveType === "normallyOpen";
      const valveNo = eq.parameters.normallyOpen === true;
      if (actuatorNo !== valveNo)
        out.push({
          code: "config-valve",
          channelId: c.id,
          message: actuatorNo
            ? t`${who(c.label)}: the actuator expects a normally open valve, but the valve is normally closed; the valve opens when no heat is requested.`
            : t`${who(c.label)}: the actuator expects a normally closed valve, but the valve is normally open; the valve opens when no heat is requested.`,
        });
      const coil =
        eq.type === "radiator"
          ? "heating"
          : eq.parameters.coil === "heating" || eq.parameters.coil === "cooling"
            ? eq.parameters.coil
            : "changeover";
      if (coil !== "changeover" && mode !== "changeover" && coil !== mode)
        out.push({
          code: "config-emitter",
          channelId: c.id,
          message:
            coil === "heating"
              ? t`${who(c.label)}: the output is a cooling valve, but its emitter only heats; use a fan coil with a cooling or change-over coil.`
              : t`${who(c.label)}: the output is a heating valve, but its emitter only cools.`,
        });
      else if (coil !== "changeover" && mode === "changeover")
        out.push({
          code: "config-emitter",
          channelId: c.id,
          message:
            coil === "heating"
              ? t`${who(c.label)}: the output is a change-over valve, but its emitter only heats: cold water does not cool the room through it.`
              : t`${who(c.label)}: the output is a change-over valve, but its emitter only cools: hot water does not heat the room through it.`,
        });
    }
  }
  return out;
}
