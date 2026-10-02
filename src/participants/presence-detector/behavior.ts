// Presence detector.
import type { BehaviorContext, BehaviorDefinition } from "../../knx/contracts";

interface PresenceState {
  active: boolean;
  /** Last brightness entered (lx), or null before any entry. */
  lux: number | null;
}

type Ctx = BehaviorContext<PresenceState>;

/**
 * A detection, by the detector or by a slave detector: switch-on on the first one,
 * then the hold time restarted. `object` is the presence object that sends.
 */
function detect(ctx: Ctx, object: string) {
  const p = ctx.device.parameters;
  const hold = Number(p.holdMs ?? 10000);
  if (ctx.state.active) {
    if (p.retrigger === false) {
      ctx.note(ctx.t`Detection: hold time not restarted`);
      return;
    }
    ctx.schedule("off", hold, object);
    ctx.note(ctx.t`Detection: hold time restarted, no new telegram`);
    return;
  }
  const threshold = Number(p.brightnessThresholdLux ?? 0);
  const lux = ctx.state.lux;
  if (threshold > 0 && lux !== null && lux >= threshold) {
    ctx.note(
      ctx.t`Detection: ${lux} lx is not below the threshold of ${threshold} lx, no switch-on`,
    );
    return;
  }
  ctx.schedule("off", hold, object);
  ctx.state.active = true;
  ctx.setObject(object, 1);
  ctx.transmit(object);
}

/**
 * Presence detector: on the first detection, it emits 1; each detection restarts its
 * hold timer. When the timer expires, it emits 0 (as a stairwell timer would).
 * Light level is not simulated.
 */
export const presenceDetector: BehaviorDefinition<PresenceState> = {
  description:
    "Presence detector: sends 1 on first detection, 0 when its hold time ends (restarted by each detection).",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      holdMs: {
        title: "Hold time",
        unit: "ms",
        type: "integer",
        exclusiveMinimum: 0,
        default: 10000,
        description:
          "Time with no detected presence before sending 0 (ms); restarted on each detection.",
      },
      retrigger: {
        title: "Hold time restarted by a detection",
        expert: true,
        type: "boolean",
        default: true,
        description:
          "Each activation restarts the timer; otherwise it runs from the first activation.",
      },
      sendOnEnd: {
        title: "Send 0 at the end",
        expert: true,
        type: "boolean",
        default: true,
        description:
          "Send 0 when the timer expires; otherwise the detector sends only 1 and the actuator handles switch-off.",
      },
      brightnessThresholdLux: {
        title: "Switch-on brightness threshold",
        expert: true,
        type: "number",
        minimum: 0,
        default: 0,
        description:
          "A detection switches on only while the entered brightness is below this value (lx); an active presence is still extended. 0 disables the threshold.",
      },
    },
  },
  ports: {
    input: {
      dpts: ["1.001", "1.018"],
      channel: "none",
      title: "Presence",
      direction: "out",
      description: "output object: 1 on detection, 0 when the timer expires",
    },
    slaveTrigger: {
      dpts: ["1.001", "1.018"],
      channel: "none",
      title: "Slave detection",
      direction: "in",
      description:
        "1 sent by a slave detector of the same room: counts as a detection (master/slave operation)",
    },
    brightness: {
      dpts: ["9.004"],
      channel: "none",
      title: "Brightness",
      direction: "out",
      description:
        "measured brightness (lx), entered by the reader and sent; there is no light model",
    },
  },
  acceptsInputs: true,
  createState: () => ({ active: false, lux: null }),
  onInput(ctx, input) {
    if (input.gesture === "value") {
      // Measured brightness, entered on a numeric input.
      const inp = ctx.device.inputs.find((x) => x.id === input.inputId);
      if (!inp || input.value === undefined) return;
      const o = ctx.device.objects.find((x) => x.id === inp.object);
      if (o?.port === "brightness") ctx.state.lux = input.value;
      ctx.setObject(inp.object, input.value);
      ctx.transmit(inp.object);
      return;
    }
    const b = ctx.device.buttons.find((x) => x.id === input.inputId);
    const action = b?.press ?? b?.short ?? b?.long;
    if (action) detect(ctx, action.object);
  },
  // Master/slave: a slave detector in the same room sends 1 on each detection.
  onObjectWrite(ctx, e) {
    const o = ctx.device.objects.find((x) => x.id === e.objectId);
    if (o?.port !== "slaveTrigger" || e.newValue !== 1) return;
    const out = ctx.device.objects.find((x) => x.port === "input");
    if (!out) return;
    ctx.note(ctx.t`Detection reported by a slave detector`);
    detect(ctx, out.id);
  },
  onTimer(ctx, key, payload) {
    if (key !== "off" || typeof payload !== "string") return;
    ctx.state.active = false;
    if (ctx.device.parameters.sendOnEnd === false) return;
    ctx.setObject(payload, 0);
    ctx.transmit(payload);
  },
};
