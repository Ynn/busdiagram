// Value typed in the diagram, shared by the devices that send what is typed.
import type { BehaviorContext, InputEvent } from "../../knx/contracts";

/** A value typed in the diagram (numeric input): written to its object, then sent. */
export function sendTypedValue(
  ctx: BehaviorContext<unknown>,
  input: InputEvent,
) {
  if (input.gesture !== "value" || input.value === undefined) return;
  const inp = ctx.device.inputs.find((x) => x.id === input.inputId);
  if (!inp) return;
  ctx.setObject(inp.object, input.value);
  ctx.transmit(inp.object);
}
