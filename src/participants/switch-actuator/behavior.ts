// switchActuator/v1: multichannel on/off actuator, timer, delays, scenes with storing,
// status feedback, priority override (DPT 2.001), lock, logic link, and behavior on bus
// voltage failure and recovery.
import { switchLayout } from "./layout";
import { toObjectUnit } from "../../knx/units";
import type {
  BehaviorContext,
  BehaviorDefinition,
  DeviceInfo,
  JsonObject,
} from "../../knx/contracts";

type AfterForcing =
  "lastCommand" | "previous" | "unchanged" | "on" | "off" | "toggle";
type TimerRetrigger = "restart" | "none" | "add";
/** Limit of one "add-on" timer: five durations (current value of actuators). */
const MAX_TIMER_ADDS = 5;

interface SwitchChannelState {
  /** Logical switching state (command, status feedback); the relay contact follows relayMode. */
  on: boolean;
  /** Condition requested by the commands (switch, scene, timer), applied without forcing. */
  commanded: boolean;
  /** Timer expiry date, or null. */
  offAtMs: number | null;
  /** Force in progress, or null. */
  forced: "on" | "off" | null;
  /** Condition of the relay at the beginning of the forcing. */
  beforeForcing: boolean | null;
  /** Switched off by load shedding (power limit); commands are stored meanwhile. */
  shed: boolean;
  /** Locked by the lock object; commands are stored meanwhile. */
  locked: boolean;
  /** Condition of the relay when the lock began. */
  beforeLock: boolean | null;
  /** Value of the logic object, or null until it receives one. */
  logic: number | null;
  /** Command waiting for its switch-on or switch-off delay, or null. */
  delayed: boolean | null;
  /** End of that delay, or null. */
  delayAtMs: number | null;
  /** Scenes stored by a scene control telegram (DPT 18.001): scene → 0 or 1. */
  learned: Record<string, number>;
  /** Condition of the relay when the bus voltage failed. */
  beforeFailure: boolean | null;
  /** Alarm objects received: intrusion makes the output blink, fire forces it on. */
  intrusion: boolean;
  fire: boolean;
  /** Condition of the relay when the first alarm began. */
  beforeAlarm: boolean | null;
  /** Contact of the blinking output during an intrusion alarm. */
  blinkOn: boolean;
}

interface MeterChannel {
  /** Counted energy, Wh (fractional; transmitted rounded). */
  energyWh: number;
  /** Power at the last metering update, W. */
  powerW: number;
  /** Last transmitted power, W; null before the first transmission. */
  sentW: number | null;
}

export interface SwitchState {
  channels: Record<string, SwitchChannelState>;
  meter: {
    channels: Record<string, MeterChannel>;
    atMs: number;
    totalSentW: number | null;
    limitAlarm: number;
    started: boolean;
  };
}

const METER_PORTS = ["power", "energy", "totalPower", "powerLimit"];

type Ctx = BehaviorContext<SwitchState>;

const statusObjects = (ctx: Ctx, ch: string) =>
  ctx.device.objects.filter((o) => o.port === "status" && o.channel === ch);

/**
 * Drive the relay for a logical switching state. With a normally closed relay, the
 * contact is closed (the load is powered) when the logical state is off.
 */
function drive(ctx: Ctx, ch: string, on: boolean) {
  const nc =
    ctx.device.channels.find((c) => c.id === ch)?.parameters.relayMode ===
    "normallyClosed";
  ctx.setOutput(ch, { type: "switch", on: on !== nc });
}

function setRelay(ctx: Ctx, ch: string, on: boolean) {
  const st = ctx.state.channels[ch];
  if (!st || st.on === on) return;
  st.on = on;
  drive(ctx, ch, on);
  // Measure the new power shortly after the load has changed.
  if (metering(ctx)) ctx.schedule("meterSoon", 100);
  const status = statusObjects(ctx, ch);
  if (!status.length) return;
  status.forEach((o) => ctx.setObject(o.id, on ? 1 : 0));
  const delay = Number(
    ctx.device.channels.find((c) => c.id === ch)?.parameters.statusDelayMs ??
      300,
  );
  // A new change during the delay replaces the publication: it will send the last statement.
  ctx.schedule(`${ch}:status`, delay);
}

const channelParams = (ctx: Ctx, ch: string) =>
  ctx.device.channels.find((c) => c.id === ch)?.parameters ?? {};

/** State requested by the commands, combined with the logic object when it has a value. */
function target(ctx: Ctx, ch: string) {
  const st = ctx.state.channels[ch]!;
  if (st.logic === null) return st.commanded;
  return channelParams(ctx, ch).logicOperation === "or"
    ? st.commanded || st.logic === 1
    : st.commanded && st.logic === 1;
}

/**
 * Apply the requested state, unless the output is forced, locked, or shed (the command
 * remains stored). Priority: forcing, then lock, then load shedding.
 */
function follow(ctx: Ctx, ch: string) {
  const st = ctx.state.channels[ch]!;
  if (st.fire || st.intrusion) {
    ctx.note(
      st.fire
        ? ctx.t`${ch}: fire alarm, command stored without effect`
        : ctx.t`${ch}: intrusion alarm, command stored without effect`,
    );
    return;
  }
  if (st.forced) {
    ctx.note(
      st.forced === "on"
        ? ctx.t`${ch}: output forced (on), command stored without effect`
        : ctx.t`${ch}: output forced (off), command stored without effect`,
    );
    return;
  }
  if (st.locked) {
    ctx.note(ctx.t`${ch}: output locked, command stored without effect`);
    return;
  }
  if (st.shed) {
    ctx.note(ctx.t`${ch}: output shed, command stored without effect`);
    return;
  }
  setRelay(ctx, ch, target(ctx, ch));
}

/** State after a forcing or a lock ends (afterForcing, afterLock). */
function resume(
  ctx: Ctx,
  ch: string,
  after: AfterForcing,
  before: boolean | null,
) {
  const st = ctx.state.channels[ch]!;
  if (after === "previous") st.commanded = before ?? st.commanded;
  else if (after === "unchanged") st.commanded = st.on;
  else if (after === "on" || after === "off") st.commanded = after === "on";
  else if (after === "toggle") st.commanded = !st.on;
  follow(ctx, ch);
}

/** Relay state imposed by the lock (lockStart), or null to keep the current one. */
function lockState(ctx: Ctx, ch: string): boolean | null {
  const a = channelParams(ctx, ch).lockStart;
  return a === "on" || a === "off" ? a === "on" : null;
}

function lock(ctx: Ctx, ch: string, locked: boolean) {
  const st = ctx.state.channels[ch];
  if (!st || st.locked === locked) return;
  st.locked = locked;
  if (locked) {
    st.beforeLock = st.on;
    ctx.note(ctx.t`${ch}: output locked`);
    const imposed = lockState(ctx, ch);
    // A forcing or an alarm in progress keeps priority; the lock applies when it ends.
    if (!st.forced && !st.fire && !st.intrusion && imposed !== null)
      setRelay(ctx, ch, imposed);
    return;
  }
  ctx.note(ctx.t`${ch}: output unlocked`);
  const before = st.beforeLock;
  st.beforeLock = null;
  if (!st.forced && !st.fire && !st.intrusion)
    resume(
      ctx,
      ch,
      (channelParams(ctx, ch).afterLock ?? "lastCommand") as AfterForcing,
      before,
    );
}

/** Command of the switching object, after its switch-on or switch-off delay. */
function requestSwitch(ctx: Ctx, ch: string, on: boolean) {
  const st = ctx.state.channels[ch];
  if (!st) return;
  const p = channelParams(ctx, ch);
  const delay = numParam(on ? p.onDelayMs : p.offDelayMs, 0);
  if (delay > 0) {
    // The same command during its delay does not restart it; the other one replaces it.
    if (st.delayed === on) return;
    st.delayed = on;
    st.delayAtMs = ctx.timeMs + delay;
    ctx.schedule(`${ch}:delay`, delay, on ? 1 : 0);
    ctx.note(
      on
        ? ctx.t`${ch}: switch-on delay of ${delay / 1000} s`
        : ctx.t`${ch}: switch-off delay of ${delay / 1000} s`,
    );
    return;
  }
  ctx.cancel(`${ch}:delay`);
  st.delayed = null;
  st.delayAtMs = null;
  commandSwitch(ctx, ch, on);
}

/** Command received (switch object or stage preset). */
export function commandSwitch(ctx: Ctx, ch: string, on: boolean) {
  const st = ctx.state.channels[ch];
  if (!st) return;
  const params = ctx.device.channels.find((c) => c.id === ch)?.parameters ?? {};
  const timerMs = typeof params.timerMs === "number" ? params.timerMs : null;
  if (on && timerMs) {
    // Stairs timer: recirculatable (default), non-recirculatable, or additional.
    const mode = (params.timerRetrigger ?? "restart") as TimerRetrigger;
    const running = st.offAtMs !== null && st.offAtMs > ctx.timeMs;
    let until = ctx.timeMs + timerMs;
    if (running && mode === "none") {
      ctx.note(
        ctx.t`${ch}: timer cannot be retriggered, telegram has no effect`,
      );
      return;
    }
    if (running && mode === "add")
      until = Math.min(
        st.offAtMs! + timerMs,
        ctx.timeMs + MAX_TIMER_ADDS * timerMs,
      );
    ctx.schedule(`${ch}:off`, until - ctx.timeMs);
    st.offAtMs = until;
    // Warning of extinction: the exit opens briefly before the end of the timer.
    const warn = Number(params.timerWarningMs ?? 0);
    if (warn > 0 && until - ctx.timeMs > warn)
      ctx.schedule(`${ch}:warn`, until - ctx.timeMs - warn);
    else ctx.cancel(`${ch}:warn`);
  } else if (!on) {
    if (timerMs && st.offAtMs !== null && params.timerOffAllowed === false) {
      ctx.note(
        ctx.t`${ch}: early switch-off of the timer not allowed, telegram 0 has no effect`,
      );
      return;
    }
    ctx.cancel(`${ch}:off`);
    ctx.cancel(`${ch}:warn`);
    st.offAtMs = null;
  }
  st.commanded = on;
  follow(ctx, ch);
}

/**
 * Alarm objects: fire forces the output on, intrusion makes it blink (blinkMs); fire has
 * priority over intrusion, both over forcing and the lock. When the last alarm ends, the
 * output takes the state set by afterAlarm, or the one forcing or the lock imposes.
 */
function alarm(ctx: Ctx, ch: string, kind: "fire" | "intrusion", on: boolean) {
  const st = ctx.state.channels[ch];
  if (!st || st[kind] === on) return;
  const before = st.fire || st.intrusion;
  if (!before) st.beforeAlarm = st.on;
  st[kind] = on;
  ctx.cancel(`${ch}:blink`);
  if (st.fire) {
    if (kind === "fire" && on) ctx.note(ctx.t`${ch}: fire alarm, output on`);
    setRelay(ctx, ch, true);
    drive(ctx, ch, true);
    return;
  }
  if (st.intrusion) {
    ctx.note(ctx.t`${ch}: intrusion alarm, output blinking`);
    setRelay(ctx, ch, true);
    st.blinkOn = true;
    drive(ctx, ch, true);
    ctx.schedule(`${ch}:blink`, numParam(channelParams(ctx, ch).blinkMs, 1000));
    return;
  }
  // The last alarm ended.
  ctx.note(ctx.t`${ch}: alarm ended`);
  drive(ctx, ch, st.on);
  const prev = st.beforeAlarm;
  st.beforeAlarm = null;
  if (st.forced) return setRelay(ctx, ch, st.forced === "on");
  if (st.locked) {
    const imposed = lockState(ctx, ch);
    if (imposed !== null) setRelay(ctx, ch, imposed);
    return;
  }
  resume(
    ctx,
    ch,
    (channelParams(ctx, ch).afterAlarm ?? "lastCommand") as AfterForcing,
    prev,
  );
}

/**
 * Priority command (DPT 2.001): bit 1 = control, bit 0 = value.
 * 2 → forced off, 3 → forced on, 0 or 1 → end of forcing.
 */
function force(ctx: Ctx, ch: string, raw: number) {
  const st = ctx.state.channels[ch];
  if (!st) return;
  if (raw & 2) {
    if (st.forced === null) st.beforeForcing = st.on;
    st.forced = raw & 1 ? "on" : "off";
    // Release time: the forcing ends by itself, counted from its last telegram.
    const release = numParam(channelParams(ctx, ch).forcedReleaseMs, 0);
    if (release > 0) ctx.schedule(`${ch}:release`, release);
    // An alarm keeps priority: the forcing applies when it ends.
    if (!st.fire && !st.intrusion) setRelay(ctx, ch, st.forced === "on");
    return;
  }
  if (st.forced === null) return;
  ctx.cancel(`${ch}:release`);
  const after = (channelParams(ctx, ch).afterForcing ??
    "lastCommand") as AfterForcing;
  st.forced = null;
  const before = st.beforeForcing;
  st.beforeForcing = null;
  if (st.fire || st.intrusion) return;
  if (st.locked) {
    // The lock is still active: the output takes the state it imposes.
    const imposed = lockState(ctx, ch);
    if (imposed !== null) setRelay(ctx, ch, imposed);
    return;
  }
  resume(ctx, ch, after, before);
}

/**
 * Scene telegram: recall the preset of each channel, or, with the learn bit of a scene
 * control telegram (DPT 18.001), store the current state of each channel as the scene.
 */
function applyScene(ctx: Ctx, channels: string[], raw: number, dpt: string) {
  const scene = (raw & 0x3f) + 1;
  if (dpt === "18.001" && raw & 0x80) {
    channels.forEach((ch) => {
      const st = ctx.state.channels[ch];
      if (!st) return;
      if (channelParams(ctx, ch).sceneLearning === false) {
        ctx.note(
          ctx.t`${ch}: scene storing disabled, scene ${scene} unchanged`,
        );
        return;
      }
      // Only a scene assigned to the output is stored: an output that does not take part
      // in a scene does not join it by learning (as an inactive scene of an actuator).
      if (!ctx.device.channels.find((c) => c.id === ch)?.scenes.has(scene)) {
        ctx.note(
          ctx.t`${ch}: scene ${scene} not assigned to this output, not stored`,
        );
        return;
      }
      st.learned[String(scene)] = st.on ? 1 : 0;
      ctx.note(
        st.on
          ? ctx.t`${ch}: scene ${scene} stored (on)`
          : ctx.t`${ch}: scene ${scene} stored (off)`,
      );
    });
    return;
  }
  channels.forEach((ch) => {
    const preset =
      ctx.state.channels[ch]?.learned[String(scene)] ??
      ctx.device.channels.find((c) => c.id === ch)?.scenes.get(scene);
    if (preset === undefined) {
      ctx.note(ctx.t`${ch}: no preset for scene ${scene}, command ignored`);
      return;
    }
    commandSwitch(ctx, ch, preset > 0);
  });
}

function channelsFor(d: DeviceInfo) {
  return d.channels.map((c) => c.id);
}

const metering = (ctx: Ctx) =>
  ctx.device.objects.some((o) => METER_PORTS.includes(o.port));

const numParam = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function sendPort(ctx: Ctx, port: string, ch: string | null, value: number) {
  ctx.device.objects
    .filter(
      (o) => o.port === port && (ch === null ? !o.channel : o.channel === ch),
    )
    .forEach((o) => {
      // Power is computed in W and energy in Wh; kW and kWh objects get converted values.
      ctx.setObject(o.id, toObjectUnit(o.dpt, value));
      ctx.transmit(o.id);
    });
}

/**
 * Metering update: integrate energy with the power of the previous interval, then send
 * power on change (or cyclically) and energy cyclically. Energy is counted with a time
 * scale so that the counter moves visibly in simulated seconds.
 */
function meter(ctx: Ctx, cyclic: boolean) {
  const p = ctx.device.parameters;
  const m = ctx.state.meter;
  const scale = numParam(p.energyTimeScale, 60);
  const hours = ((ctx.timeMs - m.atMs) / 3_600_000) * scale;
  m.atMs = ctx.timeMs;
  const delta = numParam(p.powerSendDeltaW, 10);
  let total = 0;
  for (const ch of channelsFor(ctx.device)) {
    const c = (m.channels[ch] ??= { energyWh: 0, powerW: 0, sentW: null });
    c.energyWh += c.powerW * hours;
    c.powerW = ctx.readPower(ch) ?? 0;
    total += c.powerW;
    if (cyclic || c.sentW === null || Math.abs(c.powerW - c.sentW) >= delta) {
      c.sentW = c.powerW;
      sendPort(ctx, "power", ch, c.powerW);
    }
    if (cyclic) sendPort(ctx, "energy", ch, Math.round(c.energyWh));
  }
  if (
    cyclic ||
    m.totalSentW === null ||
    Math.abs(total - m.totalSentW) >= delta
  ) {
    m.totalSentW = total;
    sendPort(ctx, "totalPower", null, total);
  }
  const limit = numParam(p.powerLimitW, 0);
  if (limit > 0) {
    const hyst = numParam(p.powerLimitHysteresisW, 50);
    const before = m.limitAlarm;
    // Reset strictly below limit − hysteresis: stable at the limit with no hysteresis.
    const after = before
      ? total < limit - hyst
        ? 0
        : 1
      : total >= limit
        ? 1
        : 0;
    if (after !== before) {
      m.limitAlarm = after;
      ctx.note(
        after
          ? ctx.t`Total power ${Math.round(total)} W reaches the limit ${limit} W`
          : ctx.t`Total power ${Math.round(total)} W is back below ${limit - hyst} W`,
      );
      sendPort(ctx, "powerLimit", null, after);
    }
    // While the limit is exceeded, marked outputs that are on are shed.
    if (m.limitAlarm) shed(ctx);
  }
}

/** Load shedding: switch off the marked outputs, then try again after a minimum time. */
function shed(ctx: Ctx) {
  for (const c of ctx.device.channels) {
    const st = ctx.state.channels[c.id];
    if (!st || c.parameters.loadShedding !== true || st.shed || !st.on)
      continue;
    if (st.forced || st.locked) continue;
    st.shed = true;
    ctx.note(ctx.t`${c.id}: switched off by load shedding`);
    setRelay(ctx, c.id, false);
    ctx.schedule(
      `${c.id}:unshed`,
      numParam(ctx.device.parameters.sheddingTimeMs, 20000),
    );
  }
}

export const switchActuator: BehaviorDefinition<SwitchState> = {
  // Metered outputs (power or energy objects) show the power of their loads.
  presentation: (d) => ({
    receiver: true,
    metered: d.channels
      .filter((c) =>
        d.objects.some(
          (o) =>
            o.channel === c.id && (o.port === "power" || o.port === "energy"),
        ),
      )
      .map((c) => c.id),
  }),
  parameterLayout: switchLayout,
  description:
    "Switch actuator: each channel drives a relay; optional timer, status feedback, and power and energy metering.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      meterIntervalMs: {
        title: "Metering send interval",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 1000,
        default: 5000,
        description:
          "Cyclic sending of power and energy values (ms), for channels with metering objects.",
      },
      powerSendDeltaW: {
        title: "Power send threshold",
        expert: true,
        type: "number",
        minimum: 0,
        default: 10,
        description:
          "Send a power value when it changes by at least this many watts.",
      },
      energyTimeScale: {
        title: "Energy time scale",
        expert: true,
        type: "number",
        exclusiveMinimum: 0,
        default: 60,
        description:
          "Energy counting speed: 60 counts one simulated second as one minute, so that the counter moves visibly; 1 counts real time.",
      },
      powerLimitW: {
        title: "Total power limit",
        type: "number",
        minimum: 0,
        default: 0,
        description:
          "Total power (W) of the actuator outputs at which the powerLimit object is set, for load shedding (0 disables it).",
      },
      sheddingTimeMs: {
        title: "Minimum shedding time",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 0,
        default: 20000,
        description:
          "A shed output is switched on again after this time, if its command still requests it; it is shed again if the limit is still exceeded.",
      },
      powerLimitHysteresisW: {
        title: "Power limit hysteresis",
        expert: true,
        type: "number",
        minimum: 0,
        default: 50,
        description:
          "The powerLimit object is reset below limit − hysteresis (W).",
      },
    },
  },
  channelParameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      timerMs: {
        title: "Timer",
        unit: "ms",
        type: ["integer", "null"],
        nullTitle: "no timer",
        exclusiveMinimum: 0,
        default: null,
        description: "Timer duration (ms); null disables the timer.",
      },
      timerRetrigger: {
        title: "Timer retriggering",
        expert: true,
        type: "string",
        enum: ["restart", "none", "add"],
        enumTitles: ["Restarts", "No effect", "Extends"],
        default: "restart",
        description:
          "When 1 is received during a timer: restart begins a full period, none ignores it, and add extends the period (up to five times).",
      },
      timerWarningMs: {
        title: "Switch-off warning",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 0,
        default: 0,
        description:
          "Time before the timer ends when the output briefly opens for one second as a warning (0 disables the warning).",
      },
      timerOffAllowed: {
        title: "Early switch-off by 0",
        expert: true,
        type: "boolean",
        default: true,
        description:
          "Allow a 0 write to switch off before the timer ends; otherwise ignore it.",
      },
      loadShedding: {
        title: "Shed on power limit",
        type: "boolean",
        default: false,
        description:
          "Switch this output off while the total power limit of the actuator is exceeded (load shedding).",
      },
      relayMode: {
        title: "Relay operating mode",
        type: "string",
        enum: ["normallyOpen", "normallyClosed"],
        enumTitles: ["Normally open", "Normally closed"],
        default: "normallyOpen",
        description:
          "normallyOpen closes the contact when the channel is on; normallyClosed closes it when the channel is off, so the load is powered while the switching state is 0. Status feedback reports the switching state, not the contact.",
      },
      statusDelayMs: {
        title: "Status feedback delay",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 0,
        default: 300,
        description: "Delay before sending status feedback (ms).",
      },
      onDelayMs: {
        title: "Switch-on delay",
        unit: "ms",
        type: "integer",
        minimum: 0,
        default: 0,
        description:
          "Delay between a 1 on the switching object and switching on (0: at once). A 0 received meanwhile cancels it; scenes, forcing, and the lock act at once.",
      },
      offDelayMs: {
        title: "Switch-off delay",
        unit: "ms",
        type: "integer",
        minimum: 0,
        default: 0,
        description:
          "Delay between a 0 on the switching object and switching off (0: at once). A 1 received meanwhile cancels it.",
      },
      lockStart: {
        title: "When locked",
        type: "string",
        enum: ["unchanged", "on", "off"],
        enumTitles: ["Unchanged", "On", "Off"],
        default: "unchanged",
        description:
          "State of the output when the lock object receives 1; while locked, commands are stored without effect. Forcing has priority over the lock.",
      },
      afterLock: {
        title: "End of lock",
        type: "string",
        enum: ["lastCommand", "previous", "unchanged", "on", "off", "toggle"],
        enumTitles: [
          "Last command",
          "Previous state",
          "Unchanged",
          "On",
          "Off",
          "Toggle",
        ],
        default: "lastCommand",
        description:
          "State when the lock object receives 0: follow the latest command received while locked, restore the state before the lock, keep the current state, switch on, switch off, or invert.",
      },
      logicOperation: {
        title: "Logic operation",
        type: "string",
        enum: ["and", "or"],
        enumTitles: [
          "AND: on when the command and the logic object are 1",
          "OR: on when the command or the logic object is 1",
        ],
        default: "and",
        description:
          "Combination of the switching command with the logic object (for example an enable from a presence detector). Until the logic object receives a value, the command acts alone.",
      },
      sceneLearning: {
        title: "Scene storing",
        type: "boolean",
        default: true,
        description:
          "A scene control telegram with the learn bit (DPT 18.001) stores the current state of the output as the scene; it replaces the configured preset until the simulation restarts.",
      },
      busFailure: {
        title: "On bus voltage failure",
        type: "string",
        enum: ["unchanged", "off", "on"],
        enumTitles: ["Unchanged", "Off", "On"],
        default: "unchanged",
        description:
          "State of the output when the bus voltage fails; the relay is then left as it is until the voltage returns.",
      },
      busRecovery: {
        title: "On bus voltage recovery",
        type: "string",
        enum: ["previous", "off", "on"],
        enumTitles: ["State before the failure", "Off", "On"],
        default: "previous",
        description:
          "State of the output when the bus voltage returns; the status feedback is then sent.",
      },
      blinkMs: {
        title: "Blinking period on intrusion",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 1000,
        default: 1000,
        description:
          "Time the contact stays closed, then open, while the intrusion alarm makes the output blink; mind the switching life of the relay.",
      },
      afterAlarm: {
        title: "End of the alarms",
        type: "string",
        enum: ["lastCommand", "previous", "unchanged", "on", "off"],
        enumTitles: [
          "Last command",
          "Previous state",
          "Unchanged",
          "On",
          "Off",
        ],
        default: "lastCommand",
        description:
          "State when the last alarm (fire, intrusion) ends: follow the latest command received during the alarm, restore the state before it, keep it on, switch on, or switch off.",
      },
      forcedReleaseMs: {
        title: "Release time of forcing",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 0,
        default: 0,
        description:
          "Time after which a forcing ends by itself, counted from its last forcing telegram, as if a release telegram had arrived (0: only a release telegram ends it). Actuators offer up to several hours.",
      },
      afterForcing: {
        title: "End of forcing",
        expert: true,
        type: "string",
        enum: ["lastCommand", "previous", "unchanged", "on", "off", "toggle"],
        enumTitles: [
          "Last command",
          "Previous state",
          "Unchanged",
          "On",
          "Off",
          "Toggle",
        ],
        default: "lastCommand",
        description:
          "State after a priority override ends: follow the latest command received during the override, restore the previous state, keep the forced state, switch on, switch off, or invert the forced state.",
      },
    },
  },
  channelInitialState: {
    type: "object",
    additionalProperties: false,
    properties: {
      on: {
        title: "On at start",
        type: "boolean",
        default: false,
        description:
          "Switching state of the channel when the simulation starts.",
      },
    },
  },
  ports: {
    switch: {
      description: "Switching command of the output (0 = off, 1 = on).",
      drivesLoad: true,
      dpts: ["1.001"],
      channel: "required",
      title: "Command",
      direction: "in",
    },
    status: {
      description: "Status of the relay, sent after each effective change.",
      defaultFlags: { R: true },
      telegram: "state",
      dpts: ["1.001"],
      channel: "required",
      title: "Status feedback",
      direction: "out",
    },
    scene: {
      drivesLoad: true,
      dpts: ["17.001", "18.001"],
      channel: "optional",
      title: "Scene",
      direction: "in",
      description:
        "scene number (17.001), or scene control (18.001) whose learn bit stores the current state",
    },
    forced: {
      description:
        "Priority override (2 = force off, 3 = force on, 0 or 1 = end of the override).",
      dpts: ["2.001"],
      channel: "required",
      title: "Forcing",
      direction: "in",
    },
    lock: {
      dpts: ["1.001"],
      channel: "required",
      title: "Lock",
      direction: "in",
      description:
        "1 locks the output in the state set by lockStart, 0 unlocks it (afterLock)",
    },
    logic: {
      dpts: ["1.001"],
      channel: "required",
      title: "Logic link",
      direction: "in",
      description:
        "combined with the switching command by logicOperation (AND or OR)",
    },
    power: {
      dpts: ["14.056", "9.024"],
      channel: "required",
      title: "Power",
      direction: "out",
      description:
        "electrical power drawn by the load of the channel: W with 14.056, kW with 9.024",
    },
    energy: {
      dpts: ["13.010", "13.013"],
      channel: "required",
      title: "Energy",
      direction: "out",
      description:
        "active energy counted for the channel, sent cyclically: Wh with 13.010, kWh with 13.013",
    },
    totalPower: {
      dpts: ["14.056", "9.024"],
      channel: "none",
      title: "Total power",
      direction: "out",
      description:
        "sum of the power of all channels: W with 14.056, kW with 9.024",
    },
    powerLimit: {
      dpts: ["1.005", "1.001"],
      channel: "none",
      title: "Power limit",
      direction: "out",
      description:
        "1 when the total power reaches powerLimitW, 0 after hysteresis (load shedding)",
    },
    intrusionAlarm: {
      description:
        "1 makes the output blink and ignore the commands; 0 ends the alarm (afterAlarm). Without channel, applies to all channels.",
      dpts: ["1.005", "1.001"],
      channel: "optional",
      title: "Intrusion alarm",
      direction: "in",
    },
    fireAlarm: {
      description:
        "1 forces the output on and ignores the commands, with priority over intrusion; 0 ends the alarm. Without channel, applies to all channels.",
      dpts: ["1.005", "1.001"],
      channel: "optional",
      title: "Fire alarm",
      direction: "in",
    },
  },
  output: "switch",
  createState(d) {
    const channels: Record<string, SwitchChannelState> = {};
    d.channels.forEach((c) => {
      const on = c.initialState.on === true;
      channels[c.id] = {
        on,
        commanded: on,
        offAtMs: null,
        forced: null,
        beforeForcing: null,
        shed: false,
        locked: false,
        beforeLock: null,
        logic: null,
        delayed: null,
        delayAtMs: null,
        learned: {},
        beforeFailure: null,
        intrusion: false,
        fire: false,
        beforeAlarm: null,
        blinkOn: false,
      };
    });
    return {
      channels,
      meter: {
        channels: {},
        atMs: 0,
        totalSentW: null,
        limitAlarm: 0,
        started: false,
      },
    };
  },
  onInit(ctx) {
    if (metering(ctx)) ctx.schedule("meterSoon", 500);
    channelsFor(ctx.device).forEach((ch) => {
      const on = ctx.state.channels[ch]!.on;
      drive(ctx, ch, on);
      statusObjects(ctx, ch).forEach((o) => ctx.setObject(o.id, on ? 1 : 0));
    });
  },
  onObjectWrite(ctx, e) {
    const o = ctx.device.objects.find((x) => x.id === e.objectId);
    if (!o) return;
    if (o.port === "switch" && o.channel)
      requestSwitch(ctx, o.channel, e.newValue !== 0);
    else if (o.port === "forced" && o.channel)
      force(ctx, o.channel, e.newValue);
    else if (o.port === "lock" && o.channel)
      lock(ctx, o.channel, e.newValue === 1);
    else if (o.port === "intrusionAlarm" || o.port === "fireAlarm")
      (o.channel ? [o.channel] : channelsFor(ctx.device)).forEach((ch) =>
        alarm(
          ctx,
          ch,
          o.port === "fireAlarm" ? "fire" : "intrusion",
          e.newValue === 1,
        ),
      );
    else if (o.port === "logic" && o.channel) {
      const st = ctx.state.channels[o.channel];
      if (!st) return;
      st.logic = e.newValue ? 1 : 0;
      follow(ctx, o.channel);
    } else if (o.port === "scene")
      applyScene(
        ctx,
        o.channel ? [o.channel] : channelsFor(ctx.device),
        e.newValue,
        o.dpt,
      );
  },
  onTimer(ctx, key) {
    if (key === "meterSoon" || key === "meter") {
      meter(ctx, key === "meter");
      const m = ctx.state.meter;
      if (key === "meter" || !m.started) {
        m.started = true;
        ctx.schedule(
          "meter",
          numParam(ctx.device.parameters.meterIntervalMs, 5000),
        );
      }
      return;
    }
    const [ch, what] = key.split(":");
    if (!ch) return;
    if (what === "unshed") {
      const st = ctx.state.channels[ch];
      if (!st?.shed) return;
      st.shed = false;
      ctx.note(ctx.t`${ch}: load shedding ended, stored command applied`);
      follow(ctx, ch);
      return;
    }
    if (what === "release") {
      ctx.note(ctx.t`${ch}: release time elapsed, end of forcing`);
      force(ctx, ch, 0);
      return;
    }
    if (what === "delay") {
      const st = ctx.state.channels[ch];
      if (!st || st.delayed === null) return;
      const on = st.delayed;
      st.delayed = null;
      st.delayAtMs = null;
      commandSwitch(ctx, ch, on);
      return;
    }
    if (what === "off") {
      const st = ctx.state.channels[ch];
      if (!st) return;
      st.offAtMs = null;
      st.commanded = false;
      follow(ctx, ch);
    } else if (what === "blink") {
      const st = ctx.state.channels[ch];
      if (!st?.intrusion || st.fire) return;
      // The contact alternates; the switching state (and status) stays on.
      st.blinkOn = !st.blinkOn;
      drive(ctx, ch, st.blinkOn);
      ctx.schedule(
        `${ch}:blink`,
        numParam(channelParams(ctx, ch).blinkMs, 1000),
      );
    } else if (what === "warn") {
      const st = ctx.state.channels[ch];
      if (!st?.on || st.forced || st.fire || st.intrusion) return;
      // Open the output for one second without status feedback as an expiry warning.
      drive(ctx, ch, false);
      ctx.note(ctx.t`${ch}: switch-off warning`);
      ctx.schedule(`${ch}:warnEnd`, 1000);
    } else if (what === "warnEnd") {
      const st = ctx.state.channels[ch];
      if (st) drive(ctx, ch, st.on);
    } else if (what === "status") {
      statusObjects(ctx, ch).forEach((o) => ctx.transmit(o.id));
    }
  },
  onBusFailure(ctx) {
    channelsFor(ctx.device).forEach((ch) => {
      const st = ctx.state.channels[ch]!;
      st.beforeFailure = st.on;
      // The device stops: its timers are cancelled, and so are the delays in progress.
      st.offAtMs = null;
      st.delayed = null;
      st.delayAtMs = null;
      const a = channelParams(ctx, ch).busFailure;
      if (a === "on" || a === "off") setRelay(ctx, ch, a === "on");
    });
    ctx.state.meter.started = false;
  },
  onBusRecovery(ctx) {
    if (metering(ctx)) ctx.schedule("meterSoon", 500);
    channelsFor(ctx.device).forEach((ch) => {
      const st = ctx.state.channels[ch]!;
      const a = channelParams(ctx, ch).busRecovery ?? "previous";
      const on =
        a === "on" || a === "off" ? a === "on" : (st.beforeFailure ?? st.on);
      st.beforeFailure = null;
      commandSwitch(ctx, ch, on);
      // The release time stopped with the bus voltage: it runs again in full.
      const release = numParam(channelParams(ctx, ch).forcedReleaseMs, 0);
      if (st.forced && release > 0) ctx.schedule(`${ch}:release`, release);
      // Alarms and load shedding kept through the failure act again on the output.
      if (st.fire) {
        setRelay(ctx, ch, true);
        drive(ctx, ch, true);
      } else if (st.intrusion) {
        setRelay(ctx, ch, true);
        st.blinkOn = true;
        drive(ctx, ch, true);
        ctx.schedule(
          `${ch}:blink`,
          numParam(channelParams(ctx, ch).blinkMs, 1000),
        );
      }
      if (st.shed)
        ctx.schedule(
          `${ch}:unshed`,
          numParam(ctx.device.parameters.sheddingTimeMs, 20000),
        );
      // The actuator reports its state after a restart.
      statusObjects(ctx, ch).forEach((o) => ctx.setObject(o.id, st.on ? 1 : 0));
      if (statusObjects(ctx, ch).length)
        ctx.schedule(
          `${ch}:status`,
          numParam(channelParams(ctx, ch).statusDelayMs, 300),
        );
    });
  },
  channelState(state, ch): JsonObject {
    const st = state.channels[ch];
    return st
      ? {
          on: st.on,
          commanded: st.commanded,
          offAtMs: st.offAtMs,
          forced: st.forced,
          shed: st.shed,
          locked: st.locked,
          logic: st.logic,
          delayed: st.delayed,
          delayAtMs: st.delayAtMs,
          learnedScenes: { ...st.learned },
          energyWh: state.meter.channels[ch]?.energyWh ?? 0,
          powerW: state.meter.channels[ch]?.powerW ?? 0,
        }
      : {};
  },
};
