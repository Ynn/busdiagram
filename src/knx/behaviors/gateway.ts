// systemGateway/v1: boundary between KNX and another building system (Modbus, BACnet,
// M-Bus…), for example a heat pump or a hot-water tank controlled outside KNX. Only the KNX
// side is modeled: values from the other system are entered on the device and sent on
// KNX; KNX commands are received and reported as forwarded. The other protocol is not
// simulated.
import type { BehaviorDefinition } from "../contracts";
import { formatValue } from "../dpt";
import { pushButton } from "./push-button";

interface GatewayState {
  system: string;
}

const systemOf = (parameters: Record<string, unknown>) =>
  typeof parameters.system === "string" && parameters.system.trim()
    ? parameters.system.trim()
    : "Modbus";

export const systemGateway: BehaviorDefinition<GatewayState> = {
  description:
    "Gateway to another building system (Modbus, BACnet…): values from that system are entered and sent on KNX; KNX commands are received and forwarded to it, without simulating the other protocol.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      system: {
        title: "Other system",
        type: "string",
        default: "Modbus",
        description:
          "Name of the system on the other side of the gateway, shown on the device card and in the event log, such as Modbus, BACnet, or M-Bus.",
      },
    },
  },
  ports: {
    value: {
      dpts: "any",
      channel: "none",
      title: "Value from the other system",
      direction: "out",
      description:
        "value read in the other system (temperature, state, meter…), sent on KNX when entered",
    },
    command: {
      dpts: "any",
      channel: "none",
      title: "Command to the other system",
      direction: "in",
      description:
        "value received from KNX and forwarded to the other system (mode, setpoint, boost…)",
    },
  },
  acceptsInputs: true,
  createState: (device) => ({ system: systemOf(device.parameters) }),
  // Entered values and keys behave as on a push-button: write the object, then send it.
  onInput: pushButton.onInput as BehaviorDefinition<GatewayState>["onInput"],
  onObjectWrite(ctx, e) {
    const o = ctx.device.objects.find((x) => x.id === e.objectId);
    if (o?.port !== "command") return;
    ctx.note(
      ctx.t`${o.name || o.id} → ${ctx.state.system}: ${formatValue(o.dpt, e.newValue, ctx.t)} (forwarded, not simulated)`,
    );
  },
  deviceState: (state) => ({ system: state.system }),
};
