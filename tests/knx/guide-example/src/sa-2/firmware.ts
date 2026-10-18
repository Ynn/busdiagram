import { bits, objectId } from "bus-diagram";
import type { BehaviorContext, Firmware } from "bus-diagram";

export const OUTPUTS = ["a", "b"] as const;
interface State {
  on: Record<string, boolean>;
}

// The parameters of an output, in its octet (164h for A, 165h for B).
const parametersOf = (ctx: BehaviorContext<State>, n: number) => ({
  normallyClosed: bits(ctx, 0x164 + n, 0, 1) === 1,
  recovery: bits(ctx, 0x164 + n, 6, 2),
});

// The relay of an output: a normally closed contact lets the current through when the
// relay is released.
const relay = (ctx: BehaviorContext<State>, n: number) => {
  const ch = OUTPUTS[n]!;
  ctx.setOutput(ch, {
    type: "switch",
    on: ctx.state.on[ch] !== parametersOf(ctx, n).normallyClosed,
  });
};

export const sa2Firmware: Firmware<State> = {
  createState: () => ({ on: { a: false, b: false } }),
  // At the start, and after a download: the state at bus voltage recovery.
  onInit(ctx) {
    OUTPUTS.forEach((ch, n) => {
      const { recovery } = parametersOf(ctx, n);
      if (recovery === 1 || recovery === 2) ctx.state.on[ch] = recovery === 2;
      relay(ctx, n);
    });
  },
  // A telegram on the object of an output.
  onObjectWrite(ctx, e) {
    const n = OUTPUTS.findIndex((_, i) => e.objectId === objectId(i));
    if (n < 0) return;
    ctx.state.on[OUTPUTS[n]!] = e.newValue !== 0;
    relay(ctx, n);
  },
  channelState: (s, ch) => ({ on: s.on[ch] ?? false }),
};
