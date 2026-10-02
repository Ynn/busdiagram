// Meaning of a port, as its behavior declares it: defaults of flags R and U, initial value.
import type { BehaviorDefinition, BehaviorPort } from "./contracts";
import { isSupportedDpt } from "./dpt";

/** Port declared by a behavior, if any (an own property: « toString » is not a port). */
export const portOf = (
  behavior: Pick<BehaviorDefinition<unknown>, "ports"> | undefined,
  port: string,
): BehaviorPort | undefined =>
  behavior && Object.hasOwn(behavior.ports, port)
    ? behavior.ports[port]
    : undefined;

/** Flag R of an object when the scenario does not write it. */
export const defaultRead = (
  behavior: Pick<BehaviorDefinition<unknown>, "ports"> | undefined,
  port: string,
) => portOf(behavior, port)?.defaultFlags?.R === true;

/** Flag U of an object when the scenario does not write it. */
export const defaultUpdate = (
  behavior: Pick<BehaviorDefinition<unknown>, "ports"> | undefined,
  port: string,
) => portOf(behavior, port)?.defaultFlags?.U === true;

/**
 * Initial value of an object when the scenario does not give one: unknown for a port
 * declared so, for a measure (DPT 9.xxx) until its first value, and for a DPT that is
 * shown but not simulated; 0 otherwise.
 */
export const defaultInitial = (port: BehaviorPort | undefined, dpt: string) =>
  port?.initialUnknown || dpt.startsWith("9.") || !isSupportedDpt(dpt)
    ? null
    : 0;
