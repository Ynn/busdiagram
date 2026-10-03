// Presence detector.
import type { BehaviorContext, BehaviorDefinition } from "../../knx/contracts";

interface PresenceState {
  active: boolean;
  /** Lock object at 1: detections are ignored. */
  locked: boolean;
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
  if (ctx.state.locked) {
    ctx.note(ctx.t`Detection ignored: detector locked`);
    return;
  }
  // A slave reports every detection to its master, which keeps the hold time.
  if (p.slave === true) {
    ctx.note(ctx.t`Detection sent to the master detector`);
    ctx.setObject(object, 1);
    ctx.transmit(object);
    return;
  }
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
      lockStart: {
        title: "When locked",
        type: "string",
        enum: ["none", "off", "on"],
        enumTitles: ["No telegram", "Off", "On"],
        default: "none",
        description:
          "Telegram when the lock object receives 1: none (the hold time runs out as usual), 0 at once, or 1 kept while locked. While locked, detections are ignored.",
      },
      lockEnd: {
        title: "When unlocked",
        type: "string",
        enum: ["none", "off", "on"],
        enumTitles: ["No telegram", "Off", "On"],
        default: "none",
        description:
          "Telegram when the lock object receives 0: none, 0, or 1 followed by the hold time.",
      },
      slave: {
        title: "Slave detector",
        type: "boolean",
        default: false,
        description:
          "Sends 1 on each detection, for the slaveTrigger object of a master detector of the same room; the master keeps the hold time, the brightness threshold, and the final 0.",
      },
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
    lock: {
      dpts: ["1.001"],
      channel: "none",
      title: "Lock",
      direction: "in",
      description:
        "1 locks the detector: its detections (and those of its slaves) are ignored; 0 unlocks it",
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
  createState: () => ({ active: false, locked: false, lux: null }),
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
    if (o?.port === "lock") {
      const on = e.newValue === 1;
      if (on === ctx.state.locked) return;
      ctx.state.locked = on;
      ctx.note(on ? ctx.t`Detector locked` : ctx.t`Detector unlocked`);
      const out = ctx.device.objects.find((x) => x.port === "input");
      if (!out) return;
      const p = ctx.device.parameters;
      const reaction = on ? p.lockStart : p.lockEnd;
      const sendValue = (v: 0 | 1) => {
        ctx.state.active = v === 1;
        ctx.setObject(out.id, v);
        ctx.transmit(out.id);
      };
      if (on) {
        // Off: the hold time ends now with 0; on: the light stays on while locked.
        if (reaction === "off") {
          ctx.cancel("off");
          sendValue(0);
        } else if (reaction === "on") {
          ctx.cancel("off");
          sendValue(1);
        }
        return;
      }
      if (reaction === "off") {
        ctx.cancel("off");
        sendValue(0);
      } else if (reaction === "on") {
        sendValue(1);
        ctx.schedule("off", Number(p.holdMs ?? 10000), out.id);
      } else if (ctx.state.active)
        // Still on after the lock: the hold time runs again.
        ctx.schedule("off", Number(p.holdMs ?? 10000), out.id);
      return;
    }
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
