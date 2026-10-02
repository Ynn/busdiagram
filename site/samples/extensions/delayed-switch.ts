// Example extension: a switch with delayed turn-on.
// A 1 schedules turn-on after delayMs. A 0 cancels pending turn-on and switches off.
// A later 1 replaces the pending deadline. This module uses only the public API.
import { registerBehavior, registerMessages } from "bus-diagram";
import type { BehaviorContext, BehaviorDefinition } from "bus-diagram";

interface ChannelState {
  on: boolean;
  /** Scheduled turn-on time, or null. */
  onAtMs: number | null;
}

interface State {
  channels: Record<string, ChannelState>;
}

type Ctx = BehaviorContext<State>;

function setRelay(ctx: Ctx, ch: string, on: boolean) {
  const st = ctx.state.channels[ch];
  if (!st || st.on === on) return;
  st.on = on;
  ctx.setOutput(ch, { type: "switch", on });
  const status = ctx.device.objects.filter(
    (o) => o.port === "status" && o.channel === ch,
  );
  status.forEach((o) => ctx.setObject(o.id, on ? 1 : 0));
  if (status.length) ctx.schedule(`${ch}:status`, 300);
}

// #region behavior
export const delayedSwitch: BehaviorDefinition<State> = {
  description: "Switch with delayed turn-on and immediate turn-off.",
  channelParameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      delayMs: {
        title: "Turn-on delay",
        unit: "ms",
        type: "integer",
        minimum: 0,
        default: 2000,
        description: "Turn-on delay (ms).",
      },
    },
  },
  ports: {
    switch: {
      dpts: ["1.001"],
      channel: "required",
      title: "Command",
      direction: "in",
      description: "Switching command of the output, applied after the delay.",
      drivesLoad: true,
    },
    status: {
      dpts: ["1.001"],
      channel: "required",
      title: "Status feedback",
      direction: "out",
      description: "Status of the output, sent after each effective change.",
      defaultFlags: { R: true },
      telegram: "state",
    },
  },
  output: "switch",
  createState: (d) => ({
    channels: Object.fromEntries(
      d.channels.map((c) => [c.id, { on: false, onAtMs: null }]),
    ),
  }),
  onInit(ctx) {
    ctx.device.channels.forEach((c) =>
      ctx.setOutput(c.id, { type: "switch", on: false }),
    );
  },
  onObjectWrite(ctx, e) {
    const o = ctx.device.objects.find((x) => x.id === e.objectId);
    const ch = o?.channel;
    if (!o || o.port !== "switch" || !ch) return;
    const st = ctx.state.channels[ch]!;
    if (e.newValue) {
      const delay = Number(
        ctx.device.channels.find((c) => c.id === ch)?.parameters.delayMs ??
          2000,
      );
      ctx.schedule(`${ch}:on`, delay); // replaces a pending timer with the same key
      st.onAtMs = ctx.timeMs + delay;
      ctx.note(ctx.t`${ch}: scheduled to switch on in ${delay / 1000} s`);
    } else {
      ctx.cancel(`${ch}:on`);
      st.onAtMs = null;
      setRelay(ctx, ch, false);
    }
  },
  onTimer(ctx, key) {
    const [ch, what] = key.split(":");
    if (!ch) return;
    if (what === "on") {
      ctx.state.channels[ch]!.onAtMs = null;
      setRelay(ctx, ch, true);
    } else if (what === "status")
      ctx.device.objects
        .filter((o) => o.port === "status" && o.channel === ch)
        .forEach((o) => ctx.transmit(o.id));
  },
  channelState: (state, ch) => ({ ...(state.channels[ch] ?? {}) }),
};
// #endregion behavior

registerBehavior("delayedSwitch/v1", delayedSwitch);

// The extension supplies French text for its English source message.
registerMessages("fr", {
  "{0}: scheduled to switch on in {1} s": "{0} : allumage prévu dans {1} s",
});
