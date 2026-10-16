// Product databases of the manufacturers' products, brought by the imported packages of
// devices (see packages.ts): the designer shows their ETS pages and computes the memory
// of a download from them.
import type { ApplicationProgram } from "../../src/knxprod/application";
import { programOf } from "../../src/knxprod/database";
import { databaseOf } from "./packages";

/** Application program of a manufacturer's product, by its behavior. */
export function programOfProduct(
  behavior: string,
): ApplicationProgram | undefined {
  const db = databaseOf(behavior);
  return db ? programOf(db) : undefined;
}
