// alarmModule/v1: alarm module with one zone per channel. For intrusion and for fire, a
// trigger object sets a latched alarm state; it stays set when the trigger returns to 0,
// until a reset is received, which is refused while the trigger is still 1. The states
// are kept on a bus voltage failure (they live in the device).
import type {
  BehaviorContext,
  BehaviorDefinition,
  JsonObject,
} from "../../knx/contracts";
import { alarmModuleLayout } from "./layout";

const KINDS = ["intrusion", "fire"] as const;
type Kind = (typeof KINDS)[number];

interface ZoneState {
  trigger: Record<Kind, boolean>;
  alarm: Record<Kind, boolean>;
}

interface AlarmState {
  zones: Record<string, ZoneState>;
}

type Ctx = BehaviorContext<AlarmState>;

function sendState(ctx: Ctx, ch: string, kind: Kind) {
  const v = ctx.state.zones[ch]!.alarm[kind] ? 1 : 0;
  ctx.device.objects
    .filter((o) => o.port === `${kind}State` && o.channel === ch)
    .forEach((o) => {
      ctx.setObject(o.id, v);
      ctx.transmit(o.id);
    });
}

function trigger(ctx: Ctx, ch: string, kind: Kind, on: boolean) {
  const z = ctx.state.zones[ch];
  if (!z) return;
  z.trigger[kind] = on;
  if (!on || z.alarm[kind]) return;
  z.alarm[kind] = true;
  ctx.note(
    kind === "fire"
      ? ctx.t`${ch}: fire alarm triggered and stored`
      : ctx.t`${ch}: intrusion alarm triggered and stored`,
  );
  sendState(ctx, ch, kind);
}

function reset(ctx: Ctx, ch: string, kind: Kind) {
  const z = ctx.state.zones[ch];
  if (!z || !z.alarm[kind]) return;
  if (z.trigger[kind]) {
    ctx.note(
      kind === "fire"
        ? ctx.t`${ch}: reset refused, the fire trigger is still active`
        : ctx.t`${ch}: reset refused, the intrusion trigger is still active`,
    );
    return;
  }
  z.alarm[kind] = false;
  ctx.note(
    kind === "fire"
      ? ctx.t`${ch}: fire alarm reset`
      : ctx.t`${ch}: intrusion alarm reset`,
  );
  sendState(ctx, ch, kind);
}

const port = (kind: Kind, role: "Trigger" | "Reset" | "State") => {
  const fire = kind === "fire";
  if (role === "Trigger")
    return {
      dpts: ["1.005", "1.001"],
      channel: "required" as const,
      title: fire ? "Fire trigger" : "Intrusion trigger",
      direction: "in" as const,
      description: fire
        ? "1 from a fire detector sets the stored fire alarm"
        : "1 from an intrusion contact or detector sets the stored intrusion alarm",
    };
  if (role === "Reset")
    return {
      dpts: ["1.015", "1.001"],
      channel: "required" as const,
      title: fire ? "Fire reset" : "Intrusion reset",
      direction: "in" as const,
      description:
        "1 resets the stored alarm, only once its trigger has returned to 0",
    };
  return {
    dpts: ["1.005", "1.001"],
    channel: "required" as const,
    title: fire ? "Fire alarm" : "Intrusion alarm",
    direction: "out" as const,
    description: fire
      ? "Stored fire alarm, sent on each change; link it to the fire objects of the actuators"
      : "Stored intrusion alarm, sent on each change; link it to the intrusion objects of the actuators",
    defaultFlags: { R: true },
    telegram: "state" as const,
  };
};

export const alarmModule: BehaviorDefinition<AlarmState> = {
  description:
    "Alarm module: for each zone, an intrusion and a fire alarm set by a trigger, stored until a reset accepted once the trigger has returned to 0.",
  parameterLayout: alarmModuleLayout,
  ports: {
    intrusionTrigger: port("intrusion", "Trigger"),
    intrusionReset: port("intrusion", "Reset"),
    intrusionState: port("intrusion", "State"),
    fireTrigger: port("fire", "Trigger"),
    fireReset: port("fire", "Reset"),
    fireState: port("fire", "State"),
  },
  createState: (d) => ({
    zones: Object.fromEntries(
      d.channels.map((c) => [
        c.id,
        {
          trigger: { intrusion: false, fire: false },
          alarm: { intrusion: false, fire: false },
        },
      ]),
    ),
  }),
  onInit(ctx) {
    for (const c of ctx.device.channels)
      for (const kind of KINDS)
        ctx.device.objects
          .filter((o) => o.port === `${kind}State` && o.channel === c.id)
          .forEach((o) => ctx.setObject(o.id, 0));
  },
  onObjectWrite(ctx, e) {
    const o = ctx.device.objects.find((x) => x.id === e.objectId);
    if (!o?.channel) return;
    for (const kind of KINDS) {
      if (o.port === `${kind}Trigger`)
        trigger(ctx, o.channel, kind, e.newValue === 1);
      else if (o.port === `${kind}Reset` && e.newValue === 1)
        reset(ctx, o.channel, kind);
    }
  },
  // The states are kept; they are sent again when the voltage returns.
  onBusRecovery(ctx) {
    for (const c of ctx.device.channels)
      for (const kind of KINDS) sendState(ctx, c.id, kind);
  },
  channelState(state, ch): JsonObject {
    const z = state.zones[ch];
    return z
      ? {
          intrusion: z.alarm.intrusion,
          fire: z.alarm.fire,
          intrusionTrigger: z.trigger.intrusion,
          fireTrigger: z.trigger.fire,
        }
      : {};
  },
};
