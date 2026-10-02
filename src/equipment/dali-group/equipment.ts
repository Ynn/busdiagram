// Group of DALI ballasts behind a KNX/DALI gateway.
import type { EquipmentDefinition } from "../../knx/contracts";
import type { DimmableState } from "../shared/dimmable";
import { dimAdvance, dimCommand } from "../shared/dimmable";

export interface DaliGroupState extends DimmableState {
  /** Number of faulty DALI ballasts (ECGs); their lamps stay off. */
  failed: number;
  /** Faulty ballasts, one bit per ballast in the group (bit 0 is the first). */
  failedMask: number;
}

const popcount = (n: number) => {
  let c = 0;
  for (let v = n; v; v &= v - 1) c++;
  return c;
};

/**
 * DALI Group: Several ballasts (ECG) on the DALI line, with their short addresses.
 * They follow the same level; a faulty ballast stays off and reports its fault to the gateway.
 */
export const daliGroup: EquipmentDefinition<DaliGroupState> = {
  title: "DALI group",
  description:
    "DALI ballasts in a group: each has a short address (0–63) and follows the commanded level.",
  accepts: "dim",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      ballasts: {
        title: "Number of ballasts",
        type: "integer",
        minimum: 1,
        maximum: 16,
        default: 2,
        description: "Number of ballasts (luminaires) in the group.",
      },
      firstAddress: {
        title: "First short address",
        type: "integer",
        minimum: 0,
        maximum: 63,
        default: 0,
        description:
          "Short DALI address of the first ballast; subsequent ballasts use consecutive addresses.",
      },
    },
  },
  initialState: {
    type: "object",
    additionalProperties: false,
    properties: {
      levelPct: {
        title: "Initial level",
        unit: "%",
        type: "number",
        minimum: 0,
        maximum: 100,
        default: 0,
      },
      failed: {
        title: "Faulty ballasts",
        type: "integer",
        minimum: 0,
        maximum: 16,
        default: 0,
        description:
          "Number of ballasts initially reporting a lamp or ballast fault.",
      },
    },
  },
  // Consecutive short addresses: the last one does not exceed 63.
  checkParameters(p, t) {
    const n = Number(p.ballasts ?? 2);
    const first = Number(p.firstAddress ?? 0);
    return first + n - 1 > 63
      ? [
          {
            parameter: "firstAddress",
            message: t`${n} ballasts from A${first} would reach A${first + n - 1}: DALI short addresses stop at 63`,
          },
        ]
      : [];
  },
  create: (p, init) => {
    const l = Number(init.levelPct ?? 0);
    const n = Math.min(Number(init.failed ?? 0), Number(p.ballasts ?? 2));
    return {
      levelPct: l,
      targetPct: l,
      ratePctPerMs: 0,
      failed: n,
      failedMask: (1 << n) - 1,
    };
  },
  applyCommand: (s, c) => dimCommand(s, c),
  advance: (s, dt) => dimAdvance(s, dt),
  // Simulated failure: "toggleBallast" with ballast index in the group.
  interact(s, action, p, payload) {
    const i = Number(payload);
    if (action !== "toggleBallast" || !Number.isInteger(i)) return s;
    if (i < 0 || i >= Number(p.ballasts ?? 2)) return s;
    const failedMask = s.failedMask ^ (1 << i);
    return { ...s, failedMask, failed: popcount(failedMask) };
  },
};
