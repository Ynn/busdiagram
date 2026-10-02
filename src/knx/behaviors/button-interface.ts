// buttonInterface/v1: push-button interface (binary inputs), as the interfaces fitted
// behind conventional push-buttons. Each channel is a contact input with one function;
// the device receives the contact edges, and "hold" when the key is held past the
// long-press time of the input.
import { buttonInterfaceLayout } from "./layouts";
import { SUPPORTED_DPTS } from "../dpt";
import type {
  BehaviorContext,
  BehaviorDefinition,
  ChannelInfo,
  JsonObject,
  ObjectInfo,
} from "../contracts";

type Fn = "switch" | "dim" | "blind" | "value" | "scene";

interface InputState {
  /** Contact closed: the key is pressed. */
  pressed: boolean;
  /** The long-press time has passed during this press. */
  long: boolean;
  locked: boolean;
  /** Direction of the next one-key dimming (true: brighter). */
  brighter: boolean;
  /** Direction of the dimming in progress, released by a stop. */
  dimming: boolean | null;
  /** Direction of the last blind movement (true: down). */
  lowered: boolean;
}

export interface ButtonInterfaceState {
  inputs: Record<string, InputState>;
}

type Ctx = BehaviorContext<ButtonInterfaceState>;

/** One-bit DPTs: the switching object can send any of them (lock, presence, up/down…). */
const ONE_BIT = SUPPORTED_DPTS.filter((d) => d.startsWith("1."));

const params = (ctx: Ctx, ch: string) =>
  ctx.device.channels.find((c) => c.id === ch)?.parameters ?? {};
const fnOf = (p: Readonly<JsonObject>) => (p.function ?? "switch") as Fn;
const objectOf = (objects: readonly ObjectInfo[], ch: string, port: string) =>
  objects.find((o) => o.port === port && o.channel === ch);

/** Does the function wait for the long-press time before acting? */
function waitsForLong(p: Readonly<JsonObject>) {
  switch (fnOf(p)) {
    case "switch":
      return p.switchLongPress === true;
    case "value":
      return p.longValue !== null && p.longValue !== undefined;
    case "scene":
      return p.sceneStore === true;
    default:
      return true;
  }
}

function send(ctx: Ctx, ch: string, port: string, value: number) {
  const o = objectOf(ctx.device.objects, ch, port);
  if (!o) {
    ctx.note(ctx.t`${ch}: group object “${port}” not enabled, nothing sent`);
    return;
  }
  ctx.setObject(o.id, value);
  ctx.transmit(o.id);
}

/** Current value of the switching object, as the device knows it (0 when unknown). */
function switchValue(ctx: Ctx, ch: string) {
  const o = objectOf(ctx.device.objects, ch, "switch");
  return o ? (ctx.getObject(o.id) ?? 0) : 0;
}

function switchAction(ctx: Ctx, ch: string, a: unknown) {
  if (a === "on" || a === "off") send(ctx, ch, "switch", a === "on" ? 1 : 0);
  else if (a === "toggle")
    send(ctx, ch, "switch", switchValue(ctx, ch) ? 0 : 1);
}

function blindMove(ctx: Ctx, ch: string, down: boolean) {
  ctx.state.inputs[ch]!.lowered = down;
  send(ctx, ch, "move", down ? 1 : 0);
}

function sceneValue(ctx: Ctx, ch: string, store: boolean): number | null {
  const n = Math.min(64, Math.max(1, Number(params(ctx, ch).sceneNumber ?? 1)));
  const o = objectOf(ctx.device.objects, ch, "value");
  if (store && o?.dpt !== "18.001") {
    ctx.note(
      ctx.t`${ch}: storing a scene needs a scene control object (DPT 18.001), nothing sent`,
    );
    return null;
  }
  return (store ? 0x80 : 0) | (n - 1);
}

/** Contact closed. */
function press(ctx: Ctx, ch: string) {
  const p = params(ctx, ch);
  const st = ctx.state.inputs[ch]!;
  st.pressed = true;
  st.long = false;
  switch (fnOf(p)) {
    case "switch":
      if (p.switchLongPress !== true)
        switchAction(ctx, ch, p.onPress ?? "toggle");
      break;
    case "value":
      if (!waitsForLong(p)) send(ctx, ch, "value", Number(p.shortValue ?? 0));
      break;
    case "scene":
      if (!waitsForLong(p)) {
        const v = sceneValue(ctx, ch, false);
        if (v !== null) send(ctx, ch, "value", v);
      }
      break;
  }
}

/** The key is still pressed after the long-press time. */
function longPress(ctx: Ctx, ch: string) {
  const p = params(ctx, ch);
  const st = ctx.state.inputs[ch]!;
  if (!st.pressed || st.long || !waitsForLong(p)) return;
  st.long = true;
  switch (fnOf(p)) {
    case "switch":
      switchAction(ctx, ch, p.onLong ?? "none");
      break;
    case "dim": {
      const mode = p.dimMode ?? "single";
      // One key: brighter when the light is off, otherwise the other way than last time.
      const up =
        mode === "brighter"
          ? true
          : mode === "darker"
            ? false
            : !switchValue(ctx, ch) || st.brighter;
      if (mode === "single") st.brighter = !up;
      st.dimming = up;
      send(ctx, ch, "dim", (up ? 8 : 0) | Number(p.dimStep ?? 1));
      break;
    }
    case "blind": {
      const mode = p.blindMode ?? "single";
      blindMove(ctx, ch, mode === "down" || (mode === "single" && !st.lowered));
      break;
    }
    case "value":
      send(ctx, ch, "value", Number(p.longValue));
      break;
    case "scene": {
      const v = sceneValue(ctx, ch, true);
      if (v !== null) send(ctx, ch, "value", v);
      break;
    }
  }
}

/** Contact opened. */
function release(ctx: Ctx, ch: string) {
  const p = params(ctx, ch);
  const st = ctx.state.inputs[ch]!;
  if (!st.pressed) return;
  st.pressed = false;
  const short = !st.long;
  st.long = false;
  switch (fnOf(p)) {
    case "switch":
      if (p.switchLongPress === true) {
        if (short) switchAction(ctx, ch, p.onShort ?? "toggle");
      } else switchAction(ctx, ch, p.onRelease ?? "none");
      break;
    case "dim": {
      const mode = p.dimMode ?? "single";
      if (!short) {
        // Stop telegram: same direction, step code 0.
        if (st.dimming !== null) send(ctx, ch, "dim", st.dimming ? 8 : 0);
        st.dimming = null;
      } else if (mode === "single")
        send(ctx, ch, "switch", switchValue(ctx, ch) ? 0 : 1);
      else send(ctx, ch, "switch", mode === "brighter" ? 1 : 0);
      break;
    }
    case "blind": {
      const mode = p.blindMode ?? "single";
      const down = mode === "single" ? st.lowered : mode === "down";
      if (short || p.stopOnRelease === true)
        send(ctx, ch, "stopStep", down ? 1 : 0);
      break;
    }
    case "value":
      if (short && waitsForLong(p))
        send(ctx, ch, "value", Number(p.shortValue ?? 0));
      break;
    case "scene":
      if (short && waitsForLong(p)) {
        const v = sceneValue(ctx, ch, false);
        if (v !== null) send(ctx, ch, "value", v);
      }
      break;
  }
}

/** Reaction of a channel: switching on or off, a blind movement, or the current state. */
function react(ctx: Ctx, ch: string, reaction: unknown) {
  switch (reaction) {
    case "on":
    case "off":
      send(ctx, ch, "switch", reaction === "on" ? 1 : 0);
      break;
    case "up":
    case "down":
      blindMove(ctx, ch, reaction === "down");
      break;
    case "update": {
      const o = objectOf(ctx.device.objects, ch, "switch");
      if (o && ctx.getObject(o.id) !== null) ctx.transmit(o.id);
      break;
    }
  }
}

const isBlind = (p: Readonly<JsonObject>) => fnOf(p) === "blind";

function lock(ctx: Ctx, ch: string, locked: boolean) {
  const st = ctx.state.inputs[ch]!;
  if (st.locked === locked) return;
  st.locked = locked;
  const p = params(ctx, ch);
  if (locked) {
    // A press in progress ends without effect.
    st.pressed = false;
    st.long = false;
    ctx.note(ctx.t`${ch}: input locked`);
  } else ctx.note(ctx.t`${ch}: input unlocked`);
  if (locked) react(ctx, ch, isBlind(p) ? p.blindLockStart : p.lockStart);
  else react(ctx, ch, isBlind(p) ? p.blindLockEnd : p.lockEnd);
}

function scheduleCyclic(ctx: Ctx, ch: string) {
  const p = params(ctx, ch);
  if (fnOf(p) === "switch" && typeof p.cyclicMs === "number" && p.cyclicMs > 0)
    ctx.schedule(`${ch}:cyclic`, p.cyclicMs);
}

const ACTIONS = ["on", "off", "toggle", "none"];
const ACTION_TITLES = ["On", "Off", "Toggle", "No action"];

function keyIcon(p: Readonly<JsonObject>): string {
  switch (fnOf(p)) {
    case "switch": {
      const a =
        p.switchLongPress === true
          ? (p.onShort ?? "toggle")
          : (p.onPress ?? "toggle");
      return a === "on" || a === "off" ? a : "toggle";
    }
    case "dim":
      return p.dimMode === "brighter"
        ? "dimUp"
        : p.dimMode === "darker"
          ? "dimDown"
          : "updown";
    case "blind":
      return p.blindMode === "up"
        ? "up"
        : p.blindMode === "down"
          ? "down"
          : "updown";
    case "scene":
      return "scene";
    default:
      return "on";
  }
}

export const buttonInterface: BehaviorDefinition<ButtonInterfaceState> = {
  description:
    "Push-button interface: each channel is a contact input with a function (switching, dimming, blind, value, scene), with short and long presses; lock, bus voltage recovery and cyclic sending.",
  parameterLayout: buttonInterfaceLayout,
  // The objects of an input follow its function.
  channelObjects: {
    parameter: "function",
    values: {
      switch: [{ port: "switch", dpt: "1.001" }],
      dim: [
        { port: "switch", dpt: "1.001" },
        { port: "dim", dpt: "3.007" },
      ],
      blind: [
        { port: "move", dpt: "1.008" },
        { port: "stopStep", dpt: "1.007" },
      ],
      value: [{ port: "value", dpt: "5.001" }],
      scene: [{ port: "value", dpt: "18.001" }],
    },
  },
  contactInputs: true,
  channelParameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      function: {
        title: "Function",
        type: "string",
        enum: ["switch", "dim", "blind", "value", "scene"],
        enumTitles: ["Switching", "Dimming", "Blind", "Value", "Scene"],
        default: "switch",
        description:
          "What the input controls; the group objects and settings depend on it.",
      },
      longPressMs: {
        title: "Long press from",
        unit: "ms",
        type: "integer",
        minimum: 100,
        maximum: 10000,
        default: 500,
        description: "A press held at least this long is a long press.",
      },
      switchLongPress: {
        title: "Short and long presses",
        type: "boolean",
        default: false,
        description:
          "Tell short and long presses apart, with an action for each; otherwise one action when the key is pressed and one when it is released.",
      },
      onPress: {
        title: "On press",
        type: "string",
        enum: ACTIONS,
        enumTitles: ACTION_TITLES,
        default: "toggle",
        description: "Switching telegram when the contact closes.",
      },
      onRelease: {
        title: "On release",
        type: "string",
        enum: ACTIONS,
        enumTitles: ACTION_TITLES,
        default: "none",
        description: "Switching telegram when the contact opens.",
      },
      onShort: {
        title: "Short press",
        type: "string",
        enum: ACTIONS,
        enumTitles: ACTION_TITLES,
        default: "toggle",
        description:
          "Switching telegram after a short press, when the key is released.",
      },
      onLong: {
        title: "Long press",
        type: "string",
        enum: ACTIONS,
        enumTitles: ACTION_TITLES,
        default: "none",
        description: "Switching telegram when the long-press time is reached.",
      },
      dimMode: {
        title: "Operation (dimming)",
        type: "string",
        enum: ["single", "brighter", "darker"],
        enumTitles: [
          "One key: on/off, brighter and darker in turn",
          "Two keys: this key switches on and brightens",
          "Two keys: this key switches off and darkens",
        ],
        default: "single",
        description:
          "One key switches with a short press and dims with a long press, brighter when the light is off and otherwise the other way than last time; two keys share the work, one brighter and one darker. Releasing the key stops dimming.",
      },
      dimStep: {
        title: "Dimming step",
        type: "integer",
        enum: [1, 2, 3, 4, 5, 6, 7],
        enumTitles: ["100 %", "50 %", "25 %", "12.5 %", "6 %", "3 %", "1.5 %"],
        default: 1,
        description:
          "Step code of the relative dimming telegram (DPT 3.007); 100 % dims until the key is released.",
      },
      blindMode: {
        title: "Operation (blind)",
        type: "string",
        enum: ["single", "up", "down"],
        enumTitles: [
          "One key: up and down in turn",
          "Two keys: this key raises",
          "Two keys: this key lowers",
        ],
        default: "single",
        description:
          "A long press moves the blind and a short press stops it or steps; with one key the direction changes at each movement, and follows the up/down object when it receives a telegram.",
      },
      stopOnRelease: {
        title: "Stop on release",
        type: "boolean",
        default: false,
        description:
          "Releasing the key after a long press stops the blind (hold to move); otherwise the blind runs to its end position unless a short press stops it.",
      },
      shortValue: {
        title: "Value on short press",
        type: "number",
        default: 0,
        description:
          "Value sent by a short press (by any press when there is no long-press value), in the unit of the object's DPT.",
      },
      longValue: {
        title: "Value on long press",
        type: ["number", "null"],
        nullTitle: "no long press",
        default: null,
        description:
          "Value sent by a long press; null sends the short-press value at once.",
      },
      sceneNumber: {
        title: "Scene number",
        type: "integer",
        minimum: 1,
        maximum: 64,
        default: 1,
        description: "Scene recalled by a short press.",
      },
      sceneStore: {
        title: "Store by long press",
        type: "boolean",
        default: false,
        description:
          "A long press asks the actuators to store their current state as the scene (DPT 18.001, learn bit); a short press recalls it.",
      },
      lockStart: {
        title: "When locked",
        type: "string",
        enum: ["none", "on", "off"],
        enumTitles: ["No reaction", "On", "Off"],
        default: "none",
        description: "Switching telegram sent when the lock object receives 1.",
      },
      lockEnd: {
        title: "When unlocked",
        type: "string",
        enum: ["none", "update", "on", "off"],
        enumTitles: ["No reaction", "Send the current value", "On", "Off"],
        default: "none",
        description: "Switching telegram sent when the lock object receives 0.",
      },
      blindLockStart: {
        title: "When locked (blind)",
        type: "string",
        enum: ["none", "up", "down"],
        enumTitles: ["No reaction", "Up", "Down"],
        default: "none",
        description: "Movement sent when the lock object receives 1.",
      },
      blindLockEnd: {
        title: "When unlocked (blind)",
        type: "string",
        enum: ["none", "up", "down"],
        enumTitles: ["No reaction", "Up", "Down"],
        default: "none",
        description: "Movement sent when the lock object receives 0.",
      },
      busRecovery: {
        title: "On bus voltage recovery",
        type: "string",
        enum: ["none", "update", "on", "off"],
        enumTitles: ["No reaction", "Send the current value", "On", "Off"],
        default: "none",
        description:
          "Switching telegram sent when the bus voltage returns after a failure.",
      },
      blindBusRecovery: {
        title: "On bus voltage recovery (blind)",
        type: "string",
        enum: ["none", "up", "down"],
        enumTitles: ["No reaction", "Up", "Down"],
        default: "none",
        description:
          "Movement sent when the bus voltage returns after a failure.",
      },
      busRecoveryDelayMs: {
        title: "Recovery delay",
        unit: "ms",
        type: "integer",
        minimum: 0,
        default: 0,
        description:
          "Delay before the bus recovery reaction, so that the devices of a line do not all send at once.",
      },
      cyclicMs: {
        title: "Cyclic sending",
        unit: "ms",
        type: ["integer", "null"],
        nullTitle: "no cyclic sending",
        exclusiveMinimum: 0,
        default: null,
        description:
          "Send the switching object again at this interval, for example for a device that monitors it.",
      },
      cyclicWhen: {
        title: "Cyclic sending of",
        type: "string",
        enum: ["always", "on", "off"],
        enumTitles: ["Both values", "Only 1 (on)", "Only 0 (off)"],
        default: "always",
        description: "Which value of the switching object is sent cyclically.",
      },
      ledShown: {
        title: "LED on the key",
        type: "boolean",
        default: false,
        description:
          "The key has an LED: it shows the LED object when it is enabled, otherwise the switching object of a switching or dimming input.",
      },
      ledInverted: {
        title: "LED lit for 0",
        type: "boolean",
        default: false,
        description:
          "The LED is lit while its object is 0 and off while it is 1.",
      },
    },
  },
  ports: {
    switch: {
      dpts: ONE_BIT,
      channel: "required",
      title: "Switching",
      direction: "both",
      description:
        "switching telegrams; with W set, the object follows the status of the load so that toggling and one-key dimming start from the real state",
    },
    dim: {
      dpts: ["3.007"],
      channel: "required",
      title: "Relative dimming",
      direction: "out",
    },
    move: {
      dpts: ["1.008"],
      channel: "required",
      title: "Up/down",
      direction: "both",
      description:
        "blind movement; with W set, a one-key input takes the direction of the last movement received",
    },
    stopStep: {
      dpts: ["1.007"],
      channel: "required",
      title: "Stop/step",
      direction: "out",
    },
    value: {
      dpts: [
        "2.001",
        "5.001",
        "5.004",
        "5.010",
        "7.600",
        "9.001",
        "17.001",
        "18.001",
        "20.102",
      ],
      channel: "required",
      title: "Value or scene",
      direction: "out",
      description:
        "value sent by the Value function, or scene number (17.001) or scene control with storing (18.001) for the Scene function",
    },
    lock: {
      dpts: ["1.001"],
      channel: "required",
      title: "Lock",
      direction: "in",
      description: "1 locks the input (presses are ignored), 0 unlocks it",
    },
    led: {
      dpts: ["1.001"],
      channel: "required",
      title: "LED",
      direction: "in",
      description: "state shown by the LED of the key",
    },
  },
  contactKey(c: ChannelInfo, objects) {
    const f = fnOf(c.parameters);
    const led =
      objectOf(objects, c.id, "led") ??
      (f === "switch" || f === "dim"
        ? objectOf(objects, c.id, "switch")
        : undefined);
    return {
      icon: keyIcon(c.parameters),
      longPressMs: waitsForLong(c.parameters)
        ? Number(c.parameters.longPressMs ?? 500)
        : null,
      led: c.parameters.ledShown === true ? (led?.id ?? null) : null,
      ledInverted: c.parameters.ledInverted === true,
    };
  },
  createState(d) {
    const inputs: Record<string, InputState> = {};
    d.channels.forEach(
      (c) =>
        (inputs[c.id] = {
          pressed: false,
          long: false,
          locked: false,
          brighter: true,
          dimming: null,
          lowered: false,
        }),
    );
    return { inputs };
  },
  onInit(ctx) {
    ctx.device.channels.forEach((c) => scheduleCyclic(ctx, c.id));
  },
  onInput(ctx, input) {
    const ch = input.inputId;
    const st = ctx.state.inputs[ch];
    if (!st || !["down", "up", "hold"].includes(input.gesture)) return;
    if (st.locked) {
      ctx.note(ctx.t`${ch}: input locked, press ignored`);
      return;
    }
    if (input.gesture === "down") press(ctx, ch);
    else if (input.gesture === "hold") longPress(ctx, ch);
    else release(ctx, ch);
  },
  onObjectWrite(ctx, e) {
    const o = ctx.device.objects.find((x) => x.id === e.objectId);
    if (!o?.channel) return;
    const st = ctx.state.inputs[o.channel];
    if (!st) return;
    if (o.port === "lock") lock(ctx, o.channel, e.newValue === 1);
    // The status of the load received: one-key dimming starts brighter after switching off.
    else if (o.port === "switch" && e.newValue === 0) st.brighter = true;
    else if (o.port === "move") st.lowered = e.newValue === 1;
  },
  onTimer(ctx, key) {
    const [ch, what] = key.split(":");
    if (!ch || !ctx.state.inputs[ch]) return;
    if (what === "recovery") {
      const p = params(ctx, ch);
      react(ctx, ch, isBlind(p) ? p.blindBusRecovery : p.busRecovery);
    } else if (what === "cyclic") {
      const p = params(ctx, ch);
      const o = objectOf(ctx.device.objects, ch, "switch");
      const v = o ? ctx.getObject(o.id) : null;
      const when = p.cyclicWhen ?? "always";
      if (
        o &&
        v !== null &&
        (when === "always" || (when === "on") === (v === 1))
      )
        ctx.transmit(o.id);
      scheduleCyclic(ctx, ch);
    }
  },
  onBusFailure(ctx) {
    // The device stops; a press in progress is lost.
    Object.values(ctx.state.inputs).forEach((st) => {
      st.pressed = false;
      st.long = false;
      st.dimming = null;
    });
  },
  onBusRecovery(ctx) {
    ctx.device.channels.forEach((c) => {
      const p = params(ctx, c.id);
      const reaction = isBlind(p) ? p.blindBusRecovery : p.busRecovery;
      if (reaction && reaction !== "none")
        ctx.schedule(`${c.id}:recovery`, Number(p.busRecoveryDelayMs ?? 0));
      scheduleCyclic(ctx, c.id);
    });
  },
  channelState(state, ch): JsonObject {
    const st = state.inputs[ch];
    return st
      ? {
          pressed: st.pressed,
          locked: st.locked,
          brighter: st.brighter,
          lowered: st.lowered,
        }
      : {};
  },
};
