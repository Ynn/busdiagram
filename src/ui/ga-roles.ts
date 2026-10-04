// What an object does with one of its group addresses, for the address focus of the diagram.
import type { KnxObject } from "../knx/scenario";

/**
 * `sends`: the object sends on the address (C and T, and it is its sending address, the
 * first one). `written`: a write on the address updates the object (C and W).
 */
export const gaRoles = (
  o: Pick<KnxObject, "flags" | "gas">,
  ga: string,
): { sends: boolean; written: boolean } => ({
  sends: o.flags.C && o.flags.T && o.gas[0] === ga,
  written: o.flags.C && o.flags.W && o.gas.includes(ga),
});
