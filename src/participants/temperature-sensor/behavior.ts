// Temperature sensor: sends the temperature of its room.
import type { BehaviorDefinition } from "../../knx/contracts";
import { num } from "../shared/values";

interface SensorState {
  lastC: number | null;
  lastAt: number;
  elapsedMs: number;
}

export const temperatureSensor: BehaviorDefinition<SensorState> = {
  description:
    "Room temperature sensor: sends its room's temperature on change and cyclically.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      sendDeltaK: {
        title: "Send on change",
        type: "number",
        minimum: 0.1,
        maximum: 5,
        default: 0.2,
        description: "Temperature change (K) that triggers a transmission.",
      },
      cyclicMs: {
        title: "Cyclic sending",
        unit: "ms",
        type: "integer",
        minimum: 0,
        default: 0,
        description: "Periodic retransmission (0 disables it).",
      },
    },
  },
  ports: {
    temperature: {
      defaultFlags: { R: true },
      description: "Room temperature (9.001).",
      dpts: ["9.001"],
      channel: "none",
      title: "Temperature",
      direction: "out",
    },
  },
  createState: () => ({ lastC: null, lastAt: 0, elapsedMs: 0 }),
  onInit(ctx) {
    const t = ctx.readRoom()?.temperatureC;
    if (t === undefined) return;
    ctx.state.lastC = t;
    ctx.device.objects
      .filter((o) => o.port === "temperature")
      .forEach((o) => ctx.setObject(o.id, t));
  },
  onTick(ctx, dtMs) {
    const st = ctx.state;
    st.elapsedMs += dtMs;
    if (st.elapsedMs < 500) return;
    st.elapsedMs = 0;
    const t = ctx.readRoom()?.temperatureC;
    if (t === undefined) return;
    const p = ctx.device.parameters;
    const cyclic = num(p.cyclicMs, 0);
    if (
      st.lastC !== null &&
      Math.abs(t - st.lastC) < num(p.sendDeltaK, 0.2) - 1e-9 &&
      !(cyclic > 0 && ctx.timeMs - st.lastAt >= cyclic)
    )
      return;
    st.lastC = t;
    st.lastAt = ctx.timeMs;
    ctx.device.objects
      .filter((o) => o.port === "temperature")
      .forEach((o) => {
        ctx.setObject(o.id, t);
        ctx.transmit(o.id);
      });
  },
};
