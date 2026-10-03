// Rules of the time switch on its configuration: the program must be readable, and its
// values must suit the DPT of the output objects.
import type { Translate } from "../../i18n";
import type { RuleDeviceInfo, RuleWarning } from "../../knx/contracts";
import { checkValue } from "../../knx/dpt";
import { type ProgramEntry, parseProgram } from "./program";

/** Problem of a program value with the DPT of an output object, or null. */
export function valueProblem(
  d: Pick<RuleDeviceInfo, "objects">,
  value: number,
  t?: Translate,
): string | null {
  for (const o of d.objects)
    if (o.port === "output") {
      const bad = checkValue(o.dpt, value, t);
      if (bad) return bad;
    }
  return null;
}

/** The entries that the time switch applies: readable, with a value valid for its outputs. */
export const usableEntries = (
  d: Pick<RuleDeviceInfo, "objects">,
  entries: ProgramEntry[],
) => entries.filter((e) => valueProblem(d, e.value) === null);

export function programWarnings(
  d: RuleDeviceInfo,
  t: Translate,
): RuleWarning[] {
  const { entries, errors } = parseProgram(String(d.parameters.program ?? ""));
  const name = d.name || d.id;
  const out: RuleWarning[] = errors.map((item) => ({
    code: "config-program",
    message: t`${name}: program entry “${item}” cannot be read; it is ignored.`,
  }));
  for (const e of entries) {
    const bad = valueProblem(d, e.value, t);
    if (bad)
      out.push({
        code: "config-program",
        message: t`${name}: program value ${e.value}: ${bad}; the entry is ignored.`,
      });
  }
  return out;
}
