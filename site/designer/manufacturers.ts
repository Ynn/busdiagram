// Product databases of the manufacturers' products, brought by the imported packages of
// devices (see packages.ts): the designer shows their ETS pages and computes the memory
// of a download from them.
import type { ApplicationProgram } from "../../src/knxprod/application";
import { programOf } from "../../src/knxprod/database";
import { shareableScenario as shareScenario } from "../../src/knxprod/share";
import { databaseOf } from "./packages";

/** Application program of a manufacturer's product, by its behavior. */
export function programOfProduct(
  behavior: string,
): ApplicationProgram | undefined {
  const db = databaseOf(behavior);
  return db ? programOf(db) : undefined;
}

/** The scenario to share, by the databases of the imported packages (see share.ts). */
export const shareableScenario = (data: unknown) =>
  shareScenario(data, databaseOf);
