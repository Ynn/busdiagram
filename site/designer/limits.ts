// What a manufacturer's product does not simulate (its limits, ProductLimit): the ones the
// values of the project turn on, and the parameters that turn each one on.
import type { ApplicationProgram } from "../../src/knxprod/application";
import { valueOf, visible } from "../../src/knxprod/config";
import type { ProductLimit } from "../../src/bcu/product";

/** A limit of the product, and whether the values of the project turn it on. */
export interface LimitState {
  limit: ProductLimit;
  inUse: boolean;
}

/** The value of a parameter reference as the program delivers it. */
const programDefault = (app: ApplicationProgram, ref: string) =>
  valueOf(app, {}, ref);

/** Does this parameter reference, shown with these values, turn the limit on? */
function turnsOn(
  app: ApplicationProgram,
  values: Record<string, string>,
  limit: ProductLimit,
  ref: string,
) {
  const v = valueOf(app, values, ref);
  return limit.values
    ? limit.values.includes(v)
    : v !== programDefault(app, ref);
}

/** The limits of a product with the values of the project. */
export function limitsOf(
  limits: readonly ProductLimit[] | undefined,
  app: ApplicationProgram,
  values: Record<string, string>,
): LimitState[] {
  if (!limits?.length) return [];
  const shown = visible(app, values).shown;
  return limits.map((limit) => ({
    limit,
    inUse: shown.some(
      (ref) =>
        limit.parameters?.includes(app.parameterRefs.get(ref)?.ref ?? "") &&
        turnsOn(app, values, limit, ref),
    ),
  }));
}

/** The limit a parameter reference turns on, if it is one of a limit's parameters. */
export function limitOfParameter(
  limits: readonly ProductLimit[] | undefined,
  app: ApplicationProgram,
  values: Record<string, string>,
  ref: string,
): { limit: ProductLimit; inUse: boolean } | null {
  const id = app.parameterRefs.get(ref)?.ref;
  const limit = id && limits?.find((l) => l.parameters?.includes(id));
  return limit ? { limit, inUse: turnsOn(app, values, limit, ref) } : null;
}
