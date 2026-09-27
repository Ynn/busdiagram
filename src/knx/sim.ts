import type { Translate } from "../i18n";
import { en, translator } from "../i18n";
// Simulation engine: network routing, device behaviors, and equipment.
// Pure: no DOM, no coordinates, no real clock. Time progresses only by advance().
import type {
  ClockInfo,
  BehaviorContext,
  BehaviorDefinition,
  Diagnostic,
  EquipmentDefinition,
  Gesture,
  JournalEvent,
  JournalKind,
  JsonObject,
  JsonValue,
  OutputCommand,
  RoomInfo,
  SimSnapshot,
} from "./contracts";
import { isBroadcastGA, parseGA } from "./address";
import { configWarnings } from "./consistency";
import { EventQueue } from "./clock";
import type { Scheduled } from "./clock";
import { canonical, checkValue, decode, encode } from "./dpt";
import { Network } from "./network";
import type { TransportPlan } from "./network";
import type { Registry } from "./registry";
import { captureRegistry } from "./registry";
import type {
  Channel,
  Device,
  EquipmentConfig,
  KnxObject,
  Room,
  Scenario,
} from "./scenario";

export const TICK_MS = 20;
/** Window open: the loss of the room is multiplied by this factor. */
export const WINDOW_LOSS_FACTOR = 8;
/** No maximum thermal integration (the valves move during the interval). */
const THERMAL_STEP_MS = 1000;
/** Long-press threshold in real time (not multiplied by simulation speed). */
export const LONG_MS = 500;

export interface Reception {
  deviceId: string;
  timeMs: number;
  internal: boolean;
  objects: { objectId: string; result: "accepted" | "ignored" }[];
}

export type GroupService =
  "GroupValueWrite" | "GroupValueRead" | "GroupValueResponse";

export interface Telegram {
  id: number;
  timeMs: number;
  sourceDeviceId: string;
  sourceAddress: string;
  objectId: string;
  ga: string;
  dpt: string;
  /** Canonical value emitted. */
  value: number;
  /** Octet (or bit) useful transported. */
  raw: number;
  kind: "cmd" | "state";
  /** Group service: writing, reading (no value) or replying to a reading. */
  service: GroupService;
  /** Journal event that triggered transmission (input, timer expiry, reception, etc.). */
  causeId: number | null;
  /** Related "telegram-mitted" event. */
  eventId: number;
  plan: TransportPlan;
  receptions: Reception[];
}

export interface StepStop {
  timeMs: number;
  events: JournalEvent[];
}

export interface SimulationOptions {
  registry?: Registry;
  /** Events tolerated at the same time before diagnosing a cascade (1000). */
  maxEventsPerTimestamp?: number;
  /** Lines kept in the history of telegrams (200). */
  historyLimit?: number;
  /** Events retained in the journal (5000). */
  journalLimit?: number;
  /** Language of journal messages and diagnostics (English by default). */
  lang?: string;
}

type Item =
  | { type: "deliver"; telegramId: number; deviceId: string; internal: boolean }
  | { type: "coupler"; telegramId: number; couplerId: string }
  | {
      type: "timer";
      deviceId: string;
      key: string;
      payload: JsonValue;
      causeId: number | null;
    }
  | { type: "tick" };

interface DeviceRuntime {
  device: Device;
  // The type of state is specific to each behavior.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  def: BehaviorDefinition<any>;
  state: unknown;
  ctx: BehaviorContext<unknown>;
  timers: Map<string, Scheduled<Item>>;
}

interface EquipmentRuntime {
  type: string;
  config: EquipmentConfig;
  def: EquipmentDefinition;
  state: JsonObject;
}

const EXPLANATORY = new Set<JournalKind>([
  "telegram-emitted",
  "coupler-decision",
  "object-write-accepted",
  "object-write-ignored",
  "output-changed",
  "timer-fired",
]);

export class SimulationFault extends Error {}

const clone = <T>(v: T): T =>
  v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);

const sameCommand = (a: OutputCommand | null | undefined, b: OutputCommand) =>
  !!a &&
  a.type === b.type &&
  (a.type === "switch"
    ? a.on === (b as typeof a).on
    : a.type === "dim"
      ? a.level === (b as typeof a).level &&
        a.fadeMs === (b as typeof a).fadeMs &&
        a.colourTemperatureK === (b as typeof a).colourTemperatureK
      : a.direction === (b as typeof a).direction);

export class Simulation {
  readonly network: Network;
  /** Translation of messages produced by the engine. */
  readonly t: Translate;
  readonly registry: Registry;
  timeMs = 0;
  paused = false;
  fault: Diagnostic | null = null;
  /** Last explanatory decision (step by step). */
  lastStop: StepStop | null = null;
  journal: JournalEvent[] = [];
  /** History bounded, for the monitor. */
  history: Telegram[] = [];
  diagnostics: Diagnostic[] = [];

  private queue = new EventQueue<Item>();
  private devices = new Map<string, DeviceRuntime>();
  private objects = new Map<
    string,
    { value: number | null; updatedAtMs: number | null }
  >();
  private outputs = new Map<string, OutputCommand | null>();
  private equipment = new Map<string, EquipmentRuntime>();
  private rooms = new Map<
    string,
    {
      room: Room;
      temperatureC: number;
      outsideTemperatureC: number;
      windowOpen: boolean;
    }
  >();
  /** Telegrams whose delivery remains to be processed. */
  private active = new Map<number, { tel: Telegram; pending: number }>();
  private physicsMs = 0;
  /** Offset added to the simulated clock by setClock(). */
  private clockOffsetMs = 0;

  /** Current simulated wall clock, or null when the scenario declares no clock. */
  clock(): ClockInfo | null {
    const c = this.scenario.clock;
    return c
      ? {
          nowMs: Math.round(
            c.startMs + this.timeMs * c.speed + this.clockOffsetMs,
          ),
          speed: c.speed,
        }
      : null;
  }

  /**
   * Set the simulated clock to another time (milliseconds since 1970-01-01, local time as
   * UTC fields). Devices reschedule their clock-based deadlines; return the telegrams sent.
   */
  setClock(nowMs: number): Telegram[] {
    const c = this.clock();
    if (!c || !Number.isFinite(nowMs) || this.fault) return [];
    this.clockOffsetMs += Math.round(nowMs) - c.nowMs;
    const first = this.nextTelegramId;
    const ev = this.log("input", null, {
      message: this
        .t`Clock set to ${new Date(Math.round(nowMs)).toISOString().slice(0, 19).replace("T", " ")}`,
      data: { action: "clock", value: nowMs },
    });
    this.withCause(ev.id, () =>
      this.devices.forEach(
        (rt) =>
          rt.def.onClockChange &&
          this.hook(rt, "onClockChange", () => rt.def.onClockChange!(rt.ctx)),
      ),
    );
    return this.history.filter((t) => t.id >= first);
  }
  private nextEventId = 1;
  private nextTelegramId = 1;
  private cause: number | null = null;
  private initializing = false;
  private cascadeAt = -1;
  private cascadeCount = 0;
  private listeners = new Set<(e: JournalEvent) => void>();
  private readonly maxSameTime: number;
  private readonly historyLimit: number;
  private readonly journalLimit: number;
  private readonly tickers: DeviceRuntime[] = [];

  constructor(
    readonly scenario: Scenario,
    options: SimulationOptions = {},
  ) {
    this.registry = options.registry ?? captureRegistry();
    this.maxSameTime = options.maxEventsPerTimestamp ?? 1000;
    this.historyLimit = options.historyLimit ?? 200;
    this.journalLimit = options.journalLimit ?? 5000;
    this.t = translator(options.lang ?? "en");
    this.network = new Network(scenario, undefined, this.t);
    this.init();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  private init() {
    const s = this.scenario;
    this.initializing = true;
    this.tickers.length = 0;
    s.rooms.forEach((room) =>
      this.rooms.set(room.id, {
        room,
        temperatureC: room.temperatureC,
        outsideTemperatureC: room.outsideTemperatureC,
        windowOpen: room.windowOpen,
      }),
    );
    s.devices.forEach((d) => {
      d.objects.forEach((o) =>
        this.objects.set(o.key, { value: o.initial, updatedAtMs: null }),
      );
      d.channels.forEach((c) => {
        const key = `${d.id}/${c.id}`;
        this.outputs.set(key, null);
        const cfg = c.equipmentConfig;
        const def = cfg ? this.registry.equipment.get(cfg.type) : undefined;
        if (cfg && def)
          this.equipment.set(key, {
            type: cfg.type,
            config: cfg,
            def,
            state: def.create(cfg.parameters, cfg.initialState),
          });
      });
      const def = this.registry.behaviors.get(d.behavior);
      if (!def)
        throw new SimulationFault(
          this.t`behavior “${d.behavior}” not registered`,
        );
      const rt: DeviceRuntime = {
        device: d,
        def,
        state: undefined,
        ctx: undefined as never,
        timers: new Map(),
      };
      rt.state = def.createState(d);
      rt.ctx = this.makeContext(rt);
      this.devices.set(d.id, rt);
      if (def.onTick) this.tickers.push(rt);
    });
    // Parameters that disagree with the load they compensate: non-blocking warnings.
    configWarnings(s, this.t).forEach((w) =>
      this.warn(w.code, w.message, w.deviceId),
    );
    this.devices.forEach((rt) =>
      this.hook(rt, "onInit", () => rt.def.onInit?.(rt.ctx)),
    );
    this.initializing = false;
    if (this.tickers.length) this.queue.push(TICK_MS, { type: "tick" });
  }

  /** Reset to initial state at t = 0; clear events, deadlines, journal, and diagnostics. */
  reset() {
    this.queue.clear();
    this.devices.clear();
    this.objects.clear();
    this.outputs.clear();
    this.equipment.clear();
    this.rooms.clear();
    this.active.clear();
    this.history = [];
    this.journal = [];
    this.diagnostics = [];
    this.reported.clear();
    this.timeMs = 0;
    this.physicsMs = 0;
    this.clockOffsetMs = 0;
    this.nextEventId = 1;
    this.nextTelegramId = 1;
    this.cause = null;
    this.fault = null;
    this.lastStop = null;
    this.cascadeAt = -1;
    this.cascadeCount = 0;
    this.network.resetModes();
    this.init();
  }

  play() {
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }

  subscribe(fn: (e: JournalEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── Time ────────────────────────────────────────────────────────────────

  /** Advance simulated time by integer `dtMs` ≥ 0, processing every deadline. */
  advance(dtMs: number): void {
    if (!Number.isInteger(dtMs) || dtMs < 0)
      throw new RangeError(
        this.t`advance: non-negative integer duration expected (got ${dtMs})`,
      );
    this.run(this.timeMs + dtMs, false);
  }

  /**
   * Advance by at most `dtMs`, stopping just after the first explanatory event.
   * Return that stop, or null if no explanatory event occurs within the interval.
   */
  advanceUntilExplained(dtMs: number): StepStop | null {
    if (!Number.isInteger(dtMs) || dtMs < 0)
      throw new RangeError(
        this.t`non-negative integer duration expected (got ${dtMs})`,
      );
    return this.run(this.timeMs + dtMs, true);
  }

  /** Advance to the next explanatory event (send, coupler, receive, output, deadline). */
  stepToNextEvent(horizonMs = 3_600_000): StepStop | null {
    const limit = this.timeMs + horizonMs;
    while (!this.fault) {
      const next = this.queue.peek();
      if (!next || next.timeMs > limit) return null;
      const stop = this.processNext(next, true);
      if (stop) return stop;
    }
    return null;
  }

  /** Next queued event time, excluding ticks, or null. */
  nextEventTime(): number | null {
    const e = this.queue.list().find((x) => x.item.type !== "tick");
    return e ? e.timeMs : null;
  }

  /** Whether events remain or physical equipment is still moving. */
  busy(): boolean {
    if (this.fault) return false;
    if (this.queue.list().some((e) => e.item.type !== "tick")) return true;
    for (const eq of this.equipment.values())
      if (eq.state.moving === true) return true;
    return this.tickers.length > 0 || this.rooms.size > 0;
  }

  private run(target: number, stopOnExplain: boolean): StepStop | null {
    while (!this.fault) {
      const next = this.queue.peek();
      if (!next || next.timeMs > target) break;
      const stop = this.processNext(next, stopOnExplain);
      if (stop) return stop;
    }
    if (!this.fault) {
      this.advancePhysics(target);
      this.timeMs = target;
    }
    return null;
  }

  private processNext(
    next: Scheduled<Item>,
    stopOnExplain: boolean,
  ): StepStop | null {
    this.advancePhysics(next.timeMs);
    this.timeMs = next.timeMs;
    if (next.timeMs === this.cascadeAt) this.cascadeCount++;
    else {
      this.cascadeAt = next.timeMs;
      this.cascadeCount = 1;
    }
    if (this.cascadeCount > this.maxSameTime) {
      this.raise({
        timeMs: this.timeMs,
        level: "error",
        code: "cascade",
        message: this
          .t`more than ${this.maxSameTime} events at t = ${this.timeMs} ms: cascade stopped (see the chain of causes in the journal)`,
        deviceId:
          next.item.type === "timer" || next.item.type === "deliver"
            ? next.item.deviceId
            : undefined,
      });
      return null;
    }
    this.queue.pop();
    const before = this.nextEventId;
    this.process(next.item);
    if (!stopOnExplain) return null;
    const events = this.journal.filter(
      (e) => e.id >= before && EXPLANATORY.has(e.kind),
    );
    if (!events.length) return null;
    this.lastStop = { timeMs: this.timeMs, events };
    return this.lastStop;
  }

  private advancePhysics(toMs: number) {
    // With rooms, advance equipment and temperatures together in short steps.
    const step = this.rooms.size ? THERMAL_STEP_MS : Infinity;
    while (this.physicsMs < toMs) {
      const dt = Math.min(step, toMs - this.physicsMs);
      this.physicsMs += dt;
      this.advanceEquipment(dt);
      if (this.rooms.size) this.advanceRooms(dt);
    }
  }

  /**
   * First-order room model: dT/dt = (Tout − T)/τe + H/τ, where H is the sum of heat inputs
   * (full-power maintained temperature difference, K); τe = τ, or τ/8 with an open window. Integrate exactly
   * for constant inputs over the step.
   */
  private advanceRooms(dt: number) {
    const heat = new Map<string, number>();
    for (const [key, eq] of this.equipment) {
      const room = eq.config.room;
      if (!room || !eq.def.heatOutput) continue;
      try {
        const h = eq.def.heatOutput(eq.state, eq.config.parameters);
        if (Number.isFinite(h)) heat.set(room, (heat.get(room) ?? 0) + h);
      } catch (e) {
        this.reportOnce(`heat:${key}`, {
          code: "extension-error",
          message: this
            .t`equipment ${key} (${eq.type}): ${(e as Error)?.message ?? e}`,
          extension: eq.type,
        });
      }
    }
    this.rooms.forEach((r, id) => {
      const tau = r.room.timeConstantMs;
      const tauE = r.windowOpen ? tau / WINDOW_LOSS_FACTOR : tau;
      const eq = r.outsideTemperatureC + ((heat.get(id) ?? 0) * tauE) / tau;
      r.temperatureC = eq + (r.temperatureC - eq) * Math.exp(-dt / tauE);
    });
  }

  private advanceEquipment(dt: number) {
    for (const [key, eq] of this.equipment) {
      if (!eq.def.advance) continue;
      try {
        eq.state = eq.def.advance(eq.state, dt, eq.config.parameters);
      } catch (e) {
        this.raise({
          timeMs: this.timeMs,
          level: "error",
          code: "extension-error",
          message: this
            .t`equipment ${key} (${eq.type}): ${(e as Error)?.message ?? e}`,
          extension: eq.type,
        });
      }
    }
  }

  private process(item: Item) {
    switch (item.type) {
      case "tick":
        this.tickers.forEach((rt) =>
          this.hook(rt, "onTick", () => rt.def.onTick!(rt.ctx, TICK_MS)),
        );
        this.queue.push(this.timeMs + TICK_MS, { type: "tick" });
        break;
      case "timer": {
        const rt = this.devices.get(item.deviceId);
        if (!rt) return;
        rt.timers.delete(item.key);
        const ev = this.log("timer-fired", item.causeId, {
          deviceId: item.deviceId,
          message: this.t`timer “${item.key}”`,
          data: { key: item.key },
        });
        this.withCause(ev.id, () =>
          this.hook(rt, "onTimer", () =>
            rt.def.onTimer?.(rt.ctx, item.key, item.payload),
          ),
        );
        break;
      }
      case "coupler": {
        const a = this.active.get(item.telegramId);
        const c = a?.tel.plan.couplers.find(
          (x) => x.couplerId === item.couplerId,
        );
        if (!a || !c) return;
        const cpl = this.network.coupler(c.couplerId)!;
        this.log("coupler-decision", a.tel.eventId, {
          telegramId: a.tel.id,
          couplerId: c.couplerId,
          ga: a.tel.ga,
          message: this
            .t`${this.network.couplerName(cpl)} ${cpl.address}: ${c.pass ? (c.tag === "rep" ? this.t`repeated` : this.t`forwarded`) : this.t`filtered`}`,
          data: {
            tag: c.tag,
            pass: c.pass,
            rcBefore: c.rcBefore,
            rcAfter: c.rcAfter,
          },
        });
        this.settle(item.telegramId);
        break;
      }
      case "deliver":
        this.deliver(item.telegramId, item.deviceId, item.internal);
        break;
    }
  }

  // ── Journal ──────────────────────────────────────────────────────────────

  private log(
    kind: JournalKind,
    causeId: number | null,
    fields: Partial<JournalEvent> = {},
  ): JournalEvent {
    const e: JournalEvent = {
      id: this.nextEventId++,
      timeMs: this.timeMs,
      kind,
      causeId,
      ...fields,
    };
    if (this.initializing) return e;
    this.journal.push(e);
    if (this.journal.length > this.journalLimit)
      this.journal.splice(0, this.journal.length - this.journalLimit);
    this.listeners.forEach((fn) => {
      try {
        fn(e);
      } catch {
        // A failing subscriber must not stop the simulation.
      }
    });
    return e;
  }

  private withCause<T>(id: number | null, fn: () => T): T {
    const prev = this.cause;
    this.cause = id;
    try {
      return fn();
    } finally {
      this.cause = prev;
    }
  }

  private raise(d: Diagnostic) {
    this.diagnostics.push(d);
    this.log("diagnostic", this.cause, {
      deviceId: d.deviceId,
      message: d.message,
      data: { code: d.code, level: d.level },
    });
    if (d.level === "error") {
      this.fault = d;
      this.paused = true;
    }
  }

  private warn(code: string, message: string, deviceId?: string) {
    const d: Diagnostic = {
      timeMs: this.timeMs,
      level: "warning",
      code,
      message,
      deviceId,
    };
    this.diagnostics.push(d);
    if (this.diagnostics.length > 200) this.diagnostics.shift();
    this.log("diagnostic", this.cause, {
      deviceId,
      message,
      data: { code, level: "warning" },
    });
  }

  private hook(rt: DeviceRuntime, name: string, fn: () => void) {
    if (this.fault) return;
    try {
      fn();
    } catch (e) {
      this.raise({
        timeMs: this.timeMs,
        level: "error",
        code: "extension-error",
        message: this
          .t`${rt.device.name} (${rt.device.id}) · ${rt.device.behavior}.${name}: ${(e as Error)?.message ?? e}`,
        deviceId: rt.device.id,
        extension: rt.device.behavior,
      });
    }
  }

  // ── Behavior context ───────────────────────────────────────────

  private makeContext(rt: DeviceRuntime): BehaviorContext<unknown> {
    const d = rt.device;
    const obj = (id: string) => {
      const o = d.objects.find((x) => x.id === id);
      if (!o) throw new Error(this.t`unknown object “${id}” in ${d.id}`);
      return o;
    };
    const chan = (id: string) => {
      const c = d.channels.find((x) => x.id === id);
      if (!c) throw new Error(this.t`unknown channel “${id}” in ${d.id}`);
      return c;
    };
    const now = () => this.timeMs;
    return {
      get timeMs() {
        return now();
      },
      device: d,
      get state() {
        return rt.state;
      },
      getObject: (id) => this.objects.get(obj(id).key)?.value ?? null,
      setObject: (id, value) => this.setObject(obj(id), value),
      transmit: (id) => this.transmit(rt, obj(id)),
      setOutput: (ch, cmd) => this.setOutput(d, chan(ch), cmd),
      getOutput: (ch) => this.outputs.get(`${d.id}/${chan(ch).id}`) ?? null,
      readEquipment: (ch) => {
        const eq = this.equipment.get(`${d.id}/${chan(ch).id}`);
        return eq ? clone(eq.state) : null;
      },
      readPower: (ch) => {
        const eq = this.equipment.get(`${d.id}/${chan(ch).id}`);
        if (!eq?.def.powerW) return null;
        try {
          const w = eq.def.powerW(eq.state, eq.config.parameters);
          return Number.isFinite(w) ? w : null;
        } catch {
          return null;
        }
      },
      readRoom: () => (d.room ? this.room(d.room) : null),
      clock: () => this.clock(),
      setOutsideTemperature: (celsius) => {
        if (!Number.isFinite(celsius)) return;
        const v = Math.min(50, Math.max(-30, celsius));
        this.rooms.forEach((r) => (r.outsideTemperatureC = v));
      },
      schedule: (key, delayMs, payload) =>
        this.schedule(rt, key, delayMs, payload ?? null),
      cancel: (key) => {
        const t = rt.timers.get(key);
        if (t) {
          this.queue.cancel(t);
          rt.timers.delete(key);
        }
      },
      t: this.t,
      note: (message) => {
        this.log("note", this.cause, { deviceId: d.id, message });
      },
    };
  }

  private setObject(o: KnxObject, value: number) {
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new Error(this.t`non-numeric value for ${o.key}`);
    const v = canonical(o.dpt, value);
    const cur = this.objects.get(o.key)!;
    const changed = cur.value !== v;
    cur.value = v;
    if (this.initializing) return;
    cur.updatedAtMs = this.timeMs;
    if (changed)
      this.log("object-changed", this.cause, {
        deviceId: o.deviceId,
        objectId: o.id,
        value: v,
      });
  }

  private schedule(
    rt: DeviceRuntime,
    key: string,
    delayMs: number,
    payload: JsonValue,
  ) {
    if (typeof key !== "string" || !key)
      throw new Error(this.t`timer key required`);
    if (typeof delayMs !== "number" || !Number.isFinite(delayMs) || delayMs < 0)
      throw new Error(this.t`invalid delay for “${key}”: ${delayMs}`);
    const prev = rt.timers.get(key);
    if (prev) this.queue.cancel(prev);
    const e = this.queue.push(this.timeMs + Math.round(delayMs), {
      type: "timer",
      deviceId: rt.device.id,
      key,
      payload: clone(payload),
      causeId: this.cause,
    });
    rt.timers.set(key, e);
  }

  private setOutput(d: Device, c: Channel, cmd: OutputCommand) {
    const ok =
      (cmd?.type === "switch" && typeof cmd.on === "boolean") ||
      (cmd?.type === "motor" &&
        ["up", "down", "stop"].includes(cmd.direction)) ||
      (cmd?.type === "dim" &&
        Number.isFinite(cmd.level) &&
        Number.isFinite(cmd.fadeMs) &&
        cmd.fadeMs >= 0);
    if (!ok)
      throw new Error(
        this.t`invalid output command on ${c.id}: ${JSON.stringify(cmd)}`,
      );
    const key = `${d.id}/${c.id}`;
    // Repeating the same order is idempotent and does not restart the physical model.
    if (sameCommand(this.outputs.get(key), cmd)) return;
    const eq = this.equipment.get(key);
    if (eq && eq.def.accepts !== cmd.type) {
      this.raise({
        timeMs: this.timeMs,
        level: "error",
        code: "incompatible-command",
        message: this
          .t`${key}: command “${cmd.type}” incompatible with equipment ${eq.type}`,
        deviceId: d.id,
      });
      return;
    }
    this.outputs.set(key, { ...cmd });
    if (eq) eq.state = eq.def.applyCommand(eq.state, cmd, eq.config.parameters);
    this.log("output-changed", this.cause, {
      deviceId: d.id,
      channelId: c.id,
      message: describeCommand(cmd, this.t),
      data: { command: { ...cmd } as JsonObject },
    });
  }

  // ── Transmission and delivery ──

  private transmit(rt: DeviceRuntime, o: KnxObject) {
    const d = rt.device;
    const ignore = (reason: string) =>
      this.log("transmit-ignored", this.cause, {
        deviceId: d.id,
        objectId: o.id,
        message: reason,
      });
    if (this.initializing) return;
    if (!o.flags.T)
      return void ignore(
        this.t`T flag disabled: value changed locally, no telegram`,
      );
    const ga = o.gas[0];
    if (!ga) {
      ignore(this.t`no group address associated`);
      return this.warn(
        "no-ga",
        this.t`${d.id}/${o.id}: transmission requested without a group address`,
        d.id,
      );
    }
    const value = this.objects.get(o.key)!.value;
    if (value === null) return void ignore(this.t`unknown value`);
    this.emit(d, {
      objectId: o.id,
      ga,
      dpt: o.dpt,
      value,
      service: "GroupValueWrite",
      kind:
        o.port === "status" || o.port === "positionStatus" ? "state" : "cmd",
    });
  }

  /** Create and route a group telegram for any service. */
  private emit(
    d: Device,
    spec: {
      objectId: string;
      ga: string;
      dpt: string;
      value: number;
      service: GroupService;
      kind: "cmd" | "state";
    },
  ): Telegram {
    const { ga, value } = spec;
    const raw = spec.service === "GroupValueRead" ? 0 : encode(spec.dpt, value);
    const id = this.nextTelegramId++;
    const plan = this.network.plan(d.id, ga, this.timeMs);
    const ev = this.log("telegram-emitted", this.cause, {
      deviceId: d.id,
      objectId: spec.objectId || undefined,
      telegramId: id,
      ga,
      value: spec.service === "GroupValueRead" ? null : value,
      data: { raw, dpt: spec.dpt, service: spec.service },
    });
    const tel: Telegram = {
      id,
      timeMs: this.timeMs,
      sourceDeviceId: d.id,
      sourceAddress: d.address,
      objectId: spec.objectId,
      ga,
      dpt: spec.dpt,
      value,
      raw,
      kind: spec.kind,
      service: spec.service,
      causeId: this.cause,
      eventId: ev.id,
      plan,
      receptions: [],
    };
    let pending = 0;
    // Internal link: other objects of the same device associated with the group address.
    if (d.objects.some((x) => x.id !== spec.objectId && x.gas.includes(ga))) {
      this.queue.push(this.timeMs, {
        type: "deliver",
        telegramId: id,
        deviceId: d.id,
        internal: true,
      });
      pending++;
    }
    plan.couplers.forEach((c) =>
      this.queue.push(c.tDecisionMs, {
        type: "coupler",
        telegramId: id,
        couplerId: c.couplerId,
      }),
    );
    plan.deliveries.forEach((r) => {
      this.queue.push(r.tDeliverMs, {
        type: "deliver",
        telegramId: id,
        deviceId: r.deviceId,
        internal: false,
      });
      pending++;
    });
    if (pending + plan.couplers.length)
      this.active.set(id, { tel, pending: pending + plan.couplers.length });
    this.history.push(tel);
    if (this.history.length > this.historyLimit)
      this.history.splice(0, this.history.length - this.historyLimit);
    this.telegramListeners.forEach((fn) => {
      try {
        fn(tel);
      } catch {
        // Likewise, a subscriber cannot block the engine.
      }
    });
    return tel;
  }

  /** DPT of an address: declared value, otherwise the first linked object's DPT, otherwise 1.001. */
  gaDpt(ga: string): string {
    const declared = this.scenario.groupAddresses.get(ga)?.dpt;
    if (declared) return declared;
    for (const d of this.scenario.devices)
      for (const o of d.objects) if (o.gas.includes(ga)) return o.dpt;
    return "1.001";
  }

  /**
   * Group write from a device without a linked object (USB interface):
   * the telegram starts at its individual address and follows the topology.
   */
  groupWrite(deviceId: string, ga: string, value: number): Telegram | null {
    return this.request(deviceId, ga, "GroupValueWrite", value);
  }

  /** For a group read, objects with R set reply when this is their sending address. */
  groupRead(deviceId: string, ga: string): Telegram | null {
    return this.request(deviceId, ga, "GroupValueRead", 0);
  }

  private request(
    deviceId: string,
    ga: string,
    service: GroupService,
    value: number,
  ): Telegram | null {
    const rt = this.devices.get(deviceId);
    if (!rt || !parseGA(ga) || isBroadcastGA(ga) || this.fault) return null;
    const dpt = this.gaDpt(ga);
    if (service === "GroupValueWrite") {
      // Reject invalid values before transmission; otherwise carry the encoded value.
      const bad = checkValue(dpt, value, this.t);
      if (bad) throw new RangeError(this.t`write to ${ga} refused: ${bad}`);
      value = canonical(dpt, value);
    }
    const ev = this.log("input", null, {
      deviceId,
      ga,
      value: service === "GroupValueRead" ? null : value,
      message:
        service === "GroupValueRead"
          ? this.t`USB interface: reading ${ga}`
          : this.t`USB interface: writing ${ga}`,
      data: { service },
    });
    let tel: Telegram | null = null;
    this.withCause(ev.id, () => {
      tel = this.emit(rt.device, {
        objectId: "",
        ga,
        dpt,
        value,
        service,
        kind: "cmd",
      });
    });
    return tel;
  }

  private telegramListeners = new Set<(t: Telegram) => void>();

  /** Called exactly once per telegram, including automatic transmissions. */
  onTelegram(fn: (t: Telegram) => void): () => void {
    this.telegramListeners.add(fn);
    return () => this.telegramListeners.delete(fn);
  }

  private settle(id: number) {
    const a = this.active.get(id);
    if (a && --a.pending <= 0) this.active.delete(id);
  }

  private deliver(telegramId: number, deviceId: string, internal: boolean) {
    const a = this.active.get(telegramId);
    const rt = this.devices.get(deviceId);
    if (!a || !rt) return;
    const tel = a.tel;
    const d = rt.device;
    const assoc = d.objects.filter(
      (o) => o.gas.includes(tel.ga) && !(internal && o.id === tel.objectId),
    );
    const rec = this.log("telegram-received", tel.eventId, {
      deviceId,
      telegramId,
      ga: tel.ga,
      value: tel.value,
      message: assoc.length ? undefined : this.t`reached but no association`,
      data: { internal, associated: assoc.length },
    });
    const reception: Reception = {
      deviceId,
      timeMs: this.timeMs,
      internal,
      objects: [],
    };
    tel.receptions.push(reception);
    if (tel.service === "GroupValueRead") {
      this.answerRead(rt, tel, rec.id, reception, internal);
      this.settle(telegramId);
      return;
    }
    const response = tel.service === "GroupValueResponse";
    for (const o of assoc) {
      if (this.fault) break;
      if (response && !o.flags.U) {
        this.log("object-write-ignored", rec.id, {
          deviceId,
          objectId: o.id,
          telegramId,
          ga: tel.ga,
          value: tel.value,
          message: this.t`U flag off: response ignored, value unchanged`,
        });
        reception.objects.push({ objectId: o.id, result: "ignored" });
        continue;
      }
      if (!response && !o.flags.W) {
        this.log("object-write-ignored", rec.id, {
          deviceId,
          objectId: o.id,
          telegramId,
          ga: tel.ga,
          value: tel.value,
          message: this.t`W flag disabled: value and behavior unchanged`,
        });
        reception.objects.push({ objectId: o.id, result: "ignored" });
        continue;
      }
      const cur = this.objects.get(o.key)!;
      const oldValue = cur.value;
      const newValue = decode(o.dpt, tel.raw);
      cur.value = newValue;
      cur.updatedAtMs = this.timeMs;
      const acc = this.log("object-write-accepted", rec.id, {
        deviceId,
        objectId: o.id,
        telegramId,
        ga: tel.ga,
        value: newValue,
        data: { oldValue, internal },
      });
      reception.objects.push({ objectId: o.id, result: "accepted" });
      this.withCause(acc.id, () =>
        this.hook(rt, "onObjectWrite", () =>
          rt.def.onObjectWrite?.(rt.ctx, {
            objectId: o.id,
            oldValue,
            newValue,
            origin: internal ? "internal" : "bus",
            telegramId,
            ga: tel.ga,
          }),
        ),
      );
    }
    this.settle(telegramId);
  }

  /** Reply to a read: every object with R set and this sending address responds. */
  private answerRead(
    rt: DeviceRuntime,
    tel: Telegram,
    causeId: number,
    reception: Reception,
    internal: boolean,
  ) {
    if (internal) return;
    rt.device.objects
      .filter((o) => o.gas.includes(tel.ga))
      .forEach((o) => {
        const cur = this.objects.get(o.key)!;
        const why = !o.flags.R
          ? this.t`R flag off: no response`
          : o.gas[0] !== tel.ga
            ? this.t`${tel.ga} is not the object's sending address: no response`
            : cur.value === null
              ? this.t`unknown value: no response`
              : null;
        reception.objects.push({
          objectId: o.id,
          result: why ? "ignored" : "accepted",
        });
        if (why) {
          this.log("object-write-ignored", causeId, {
            deviceId: rt.device.id,
            objectId: o.id,
            telegramId: tel.id,
            ga: tel.ga,
            message: why,
          });
          return;
        }
        this.withCause(causeId, () =>
          this.emit(rt.device, {
            objectId: o.id,
            ga: tel.ga,
            dpt: o.dpt,
            value: cur.value!,
            service: "GroupValueResponse",
            kind: "state",
          }),
        );
      });
  }

  // ── Local inputs ──

  /**
   * Gest on a key or enter a digital entry, processed at the current moment.
   * Returns the transmitted telegrams; on pause, they wait for the resumption to circulate.
   */
  input(
    deviceId: string,
    inputId: string,
    gesture: Gesture,
    value?: number,
  ): Telegram[] {
    const rt = this.devices.get(deviceId);
    if (!rt || this.fault) return [];
    const d = rt.device;
    if (gesture === "value") {
      const inp = d.inputs.find((x) => x.id === inputId);
      if (!inp || typeof value !== "number" || !Number.isFinite(value))
        return [];
      value = Math.min(inp.max, Math.max(inp.min, value));
    } else {
      const b = d.buttons.find((x) => x.id === inputId);
      if (!b || !b[gesture]) return [];
    }
    const first = this.nextTelegramId;
    const before = this.nextEventId;
    const ev = this.log("input", null, {
      deviceId,
      message:
        gesture === "value"
          ? `${inputId} = ${value}`
          : `${inputId} · ${gesture}`,
      data: { inputId, gesture, ...(value !== undefined ? { value } : {}) },
    });
    this.withCause(ev.id, () =>
      this.hook(rt, "onInput", () =>
        rt.def.onInput?.(rt.ctx, { inputId, gesture, value }),
      ),
    );
    // A gesture's transmission is itself an explanatory stop.
    const events = this.journal.filter(
      (e) => e.id >= before && EXPLANATORY.has(e.kind),
    );
    if (events.length) this.lastStop = { timeMs: this.timeMs, events };
    return this.history.filter((t) => t.id >= first);
  }

  /** Legacy adapter: identify a key by its index. */
  press(
    deviceId: string,
    button: number | string,
    gesture: "press" | "short" | "long",
  ): Telegram | null {
    const d = this.scenario.devicesById.get(deviceId);
    const b =
      typeof button === "number"
        ? d?.buttons[button]
        : d?.buttons.find((x) => x.id === button);
    if (!b) return null;
    return this.input(deviceId, b.id, gesture)[0] ?? null;
  }

  // ── Reading state ──

  objectValue(deviceId: string, objectId: string): number | null {
    return this.objects.get(`${deviceId}/${objectId}`)?.value ?? null;
  }

  objectUpdatedAt(deviceId: string, objectId: string): number | null {
    return this.objects.get(`${deviceId}/${objectId}`)?.updatedAtMs ?? null;
  }

  output(deviceId: string, channelId: string): OutputCommand | null {
    return this.outputs.get(`${deviceId}/${channelId}`) ?? null;
  }

  equipmentState(
    deviceId: string,
    channelId: string,
  ): Readonly<JsonObject> | null {
    return this.equipment.get(`${deviceId}/${channelId}`)?.state ?? null;
  }

  /** Physical action on equipment, such as a simulated fault, recorded in the journal. */
  equipmentAction(
    deviceId: string,
    channelId: string,
    action: string,
    payload: JsonValue = null,
  ): boolean {
    const eq = this.equipment.get(`${deviceId}/${channelId}`);
    if (!eq?.def.interact || this.fault) return false;
    let next: JsonObject;
    try {
      next = eq.def.interact(
        eq.state,
        action,
        eq.config.parameters ?? {},
        payload,
      );
      if (!next || typeof next !== "object" || Array.isArray(next))
        throw new Error(this.t`interact must return the state (object)`);
    } catch (e) {
      // As with advance, a failing extension suspends this simulator with a diagnostic.
      this.raise({
        timeMs: this.timeMs,
        level: "error",
        code: "extension-error",
        message: this
          .t`equipment ${deviceId}/${channelId} (${eq.type}).interact(${action}): ${(e as Error)?.message ?? e}`,
        deviceId,
        extension: eq.type,
      });
      return false;
    }
    if (next === eq.state) return false;
    eq.state = next;
    this.log("note", null, {
      deviceId,
      channelId,
      message: this.t`equipment action: ${action}`,
      data: { action, payload },
    });
    return true;
  }

  /** Current physical state of a room, or null. */
  room(roomId: string): RoomInfo | null {
    const r = this.rooms.get(roomId);
    return r
      ? {
          id: roomId,
          name: r.room.name,
          temperatureC: r.temperatureC,
          outsideTemperatureC: r.outsideTemperatureC,
          windowOpen: r.windowOpen,
        }
      : null;
  }

  /**
   * Physical room action from the UI: open or close the window
   * (`window`, value 1/0), or set outdoor temperature (`outside`, °C).
   * Notify devices in the room through onRoomChange; return emitted telegrams.
   */
  roomAction(
    roomId: string,
    action: "window" | "outside",
    value: number,
  ): Telegram[] {
    const r = this.rooms.get(roomId);
    if (!r || this.fault || !Number.isFinite(value)) return [];
    if (action === "window") {
      if (r.windowOpen === !!value) return [];
      r.windowOpen = !!value;
    } else {
      const v = Math.min(50, Math.max(-30, value));
      if (v === r.outsideTemperatureC) return [];
      r.outsideTemperatureC = v;
    }
    const first = this.nextTelegramId;
    const before = this.nextEventId;
    const ev = this.log("input", null, {
      message:
        action === "window"
          ? r.windowOpen
            ? this.t`${r.room.name}: window opened`
            : this.t`${r.room.name}: window closed`
          : this
              .t`${r.room.name}: outside temperature ${r.outsideTemperatureC} °C`,
      data: { room: roomId, action, value },
    });
    const info = this.room(roomId)!;
    this.withCause(ev.id, () =>
      this.devices.forEach(
        (rt) =>
          rt.device.room === roomId &&
          rt.def.onRoomChange &&
          this.hook(rt, "onRoomChange", () =>
            rt.def.onRoomChange!(rt.ctx, info),
          ),
      ),
    );
    const events = this.journal.filter(
      (e) => e.id >= before && EXPLANATORY.has(e.kind),
    );
    if (events.length) this.lastStop = { timeMs: this.timeMs, events };
    return this.history.filter((t) => t.id >= first);
  }

  channelState(deviceId: string, channelId: string): JsonObject {
    const rt = this.devices.get(deviceId);
    if (!rt?.def.channelState) return {};
    try {
      return rt.def.channelState(rt.state, channelId, this.timeMs, rt.device);
    } catch (e) {
      // A failing projection does not stop simulation, but records a diagnostic.
      this.reportOnce(`projection:${deviceId}/${channelId}`, {
        code: "extension-error",
        message: this
          .t`${rt.device.behavior}.channelState(${channelId}): ${(e as Error)?.message ?? e}`,
        deviceId,
        extension: rt.device.behavior,
      });
      return {};
    }
  }

  /** Device application state (deviceState), or {} if it exposes none. */
  deviceState(deviceId: string): JsonObject {
    const rt = this.devices.get(deviceId);
    if (!rt?.def.deviceState) return {};
    try {
      return rt.def.deviceState(rt.state, this.timeMs, rt.device);
    } catch (e) {
      this.reportOnce(`projection:${deviceId}`, {
        code: "extension-error",
        message: this
          .t`${rt.device.behavior}.deviceState: ${(e as Error)?.message ?? e}`,
        deviceId,
        extension: rt.device.behavior,
      });
      return {};
    }
  }

  private reported = new Set<string>();

  /**
   * Report a warning only once per key, for a failed view or projection:
   * it appears in getState().diagnostics without suspending the simulation.
   */
  reportOnce(key: string, d: Omit<Diagnostic, "timeMs" | "level">) {
    if (this.reported.has(key)) return;
    this.reported.add(key);
    this.diagnostics.push({ timeMs: this.timeMs, level: "warning", ...d });
    if (this.diagnostics.length > 200) this.diagnostics.shift();
  }

  telegram(id: number): Telegram | undefined {
    return this.active.get(id)?.tel ?? this.history.find((t) => t.id === id);
  }

  /** Telegrams still being delivered; never truncated by journal history. */
  inFlight(): Telegram[] {
    return [...this.active.values()].map((a) => a.tel);
  }

  /** Telegrams to draw now, including in-flight messages and fading ttravels. */
  visibleTelegrams(fadeMs = 2000): Telegram[] {
    const out = new Map<number, Telegram>();
    this.history.forEach(
      (t) => this.timeMs < t.plan.endMs + fadeMs && out.set(t.id, t),
    );
    this.active.forEach((a) => out.set(a.tel.id, a.tel));
    return [...out.values()].sort((a, b) => a.id - b.id);
  }

  /** Serializable observable state as a copy with no internal references. */
  getState(): SimSnapshot {
    const objects: SimSnapshot["objects"] = {};
    const channels: SimSnapshot["channels"] = {};
    const equipment: SimSnapshot["equipment"] = {};
    this.scenario.devices.forEach((d) => {
      d.objects.forEach((o) => {
        const v = this.objects.get(o.key)!;
        objects[o.key] = {
          value: v.value,
          updatedAtMs: v.updatedAtMs,
          flags: { ...o.flags },
        };
      });
      d.channels.forEach((c) => {
        const key = `${d.id}/${c.id}`;
        channels[key] = {
          output: clone(this.outputs.get(key) ?? null),
          state: clone(this.channelState(d.id, c.id)),
        };
        const eq = this.equipment.get(key);
        if (eq) equipment[key] = { type: eq.type, state: clone(eq.state) };
      });
    });
    return {
      timeMs: this.timeMs,
      clock: this.clock(),
      paused: this.paused,
      faulted: this.fault !== null,
      objects,
      channels,
      equipment,
      rooms: Object.fromEntries(
        [...this.rooms].map(([id, r]) => [
          id,
          {
            temperatureC: r.temperatureC,
            outsideTemperatureC: r.outsideTemperatureC,
            windowOpen: r.windowOpen,
          },
        ]),
      ),
      telegramsInFlight: this.active.size,
      diagnostics: clone(this.diagnostics),
    };
  }
}

export function describeCommand(c: OutputCommand, t: Translate = en): string {
  if (c.type === "switch") return c.on ? t`relay closed` : t`relay open`;
  if (c.type === "dim")
    return c.level <= 0
      ? t`off`
      : c.fadeMs > 0
        ? t`dimming to ${Math.round(c.level)} % in ${(c.fadeMs / 1000).toFixed(1)} s`
        : t`level ${Math.round(c.level)} %`;
  return c.direction === "up"
    ? t`motor ▲ up`
    : c.direction === "down"
      ? t`motor ▼ down`
      : t`motor stopped`;
}
