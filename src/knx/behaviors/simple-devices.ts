// Simple devices: a display, a device without logic (or visualization panel), and a
// presence detector. Values typed in the diagram are written to their object and sent.
import type {
  BehaviorContext,
  BehaviorDefinition,
  InputEvent,
} from "../contracts";

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

export const display: BehaviorDefinition<Record<string, never>> = {
  description:
    "Display / supervisor: receives and shows values, with no output or retransmission.",
  ports: {
    display: {
      dpts: "any",
      channel: "none",
      title: "Display",
      direction: "in",
    },
  },
  createState: () => ({}),
};

/**
 * Device without logic: it keeps the values of its objects. Values typed in the diagram
 * (`inputs`) are written to their object and sent, as from a visualization panel.
 */
export const passive: BehaviorDefinition<Record<string, never>> = {
  description:
    "Device without logic: it keeps the values of its objects, and sends the values typed in the diagram, as a visualization panel.",
  acceptsInputs: true,
  acceptsKeys: false,
  onInput: sendTypedValue,
  ports: {
    input: {
      dpts: "any",
      channel: "none",
      title: "Transmission",
      direction: "out",
    },
    display: {
      dpts: "any",
      channel: "none",
      title: "Display",
      direction: "in",
    },
  },
  createState: () => ({}),
};

interface PresenceState {
  active: boolean;
  /** Last brightness entered (lx), or null before any entry. */
  lux: number | null;
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
    if (!action) return;
    const p = ctx.device.parameters;
    const hold = Number(p.holdMs ?? 10000);
    if (ctx.state.active) {
      if (p.retrigger === false) {
        ctx.note(ctx.t`Detection: hold time not restarted`);
        return;
      }
      ctx.schedule("off", hold, action.object);
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
    ctx.schedule("off", hold, action.object);
    ctx.state.active = true;
    ctx.setObject(action.object, 1);
    ctx.transmit(action.object);
  },
  onTimer(ctx, key, payload) {
    if (key !== "off" || typeof payload !== "string") return;
    ctx.state.active = false;
    if (ctx.device.parameters.sendOnEnd === false) return;
    ctx.setObject(payload, 0);
    ctx.transmit(payload);
  },
};
