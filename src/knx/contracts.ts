import type { Translate } from "../i18n";
// Public contracts of the engine: device behaviors and controlled equipment,
// event log and observable state. No dependence on DOM or geometry.

// ── Parameter schemas (JSON Schema subset) ──

export type ParamType = "integer" | "number" | "boolean" | "string" | "null";

export interface ParamProperty {
  type: ParamType | ParamType[];
  /** Short label for a form ("Timer"). */
  title?: string;
  description?: string;
  /** Unit of the stored value; a time "ms" is entered in seconds in the forms. */
  unit?: "ms" | "%";
  /** Advanced setting, folded by default in the forms. */
  expert?: boolean;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  enum?: readonly (string | number | boolean | null)[];
  /** Wording of `enum' values, in the same order, for forms. */
  enumTitles?: readonly string[];
  /** Wording of null value in forms ("no timer"), "none" otherwise. */
  nullTitle?: string;
  default?: unknown;
}

export interface ParamSchema {
  type: "object";
  description?: string;
  properties: Record<string, ParamProperty>;
  required?: string[];
  additionalProperties?: false;
}

// ── Channel outputs ──────────────────────────────────────────────────────────

export type MotorDirection = "up" | "down" | "stop";

export type OutputCommand =
  | { type: "switch"; on: boolean }
  | { type: "motor"; direction: MotorDirection }
  /**
   * Change: target level (0–100 %) achieved in `fadeMs` (0 = immediate); optional colour
   * temperature in kelvin for a tunable white load.
   */
  | {
      type: "dim";
      level: number;
      fadeMs: number;
      colourTemperatureK?: number;
    };

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export type JsonObject = { [k: string]: JsonValue };

// ── Device behaviors ────────────────────────────────────────────

export interface ObjectFlags {
  /** Accepts a GroupValueWrite received. */
  W: boolean;
  /** May transmit when requested by the behavior. */
  T: boolean;
  /** Responds to a GroupValueRead received on its broadcast address. */
  R: boolean;
  /** A GroupValueResponse received updates the object, such as writing. */
  U: boolean;
}

/** Read-only view of a group object, as seen by a behavior. */
export interface ObjectInfo {
  readonly id: string;
  readonly name: string;
  readonly port: string;
  readonly channel: string | null;
  readonly dpt: string;
  readonly gas: readonly string[];
  readonly flags: Readonly<ObjectFlags>;
}

export interface ButtonActionInfo {
  readonly object: string;
  readonly value: number | "toggle";
}

export interface ButtonInfo {
  readonly id: string;
  readonly label: string;
  readonly press: ButtonActionInfo | null;
  readonly short: ButtonActionInfo | null;
  readonly long: ButtonActionInfo | null;
  /** Release after a long press (for example, to stop dimming). */
  readonly release: ButtonActionInfo | null;
  readonly led: string | null;
}

export interface NumberInputInfo {
  readonly id: string;
  readonly type: "number";
  readonly label: string;
  readonly object: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export interface ChannelInfo {
  readonly id: string;
  readonly label: string;
  readonly parameters: Readonly<JsonObject>;
  readonly initialState: Readonly<JsonObject>;
  /** Stage presets: stage number 1–64 → value (0/1, percentage...). */
  readonly scenes: ReadonlyMap<number, number>;
  /** Type of equipment connected, or null if the output is free. */
  readonly equipment: string | null;
}

/** Exhibit: Physical dimensions that a sensor can measure (read only). */
export interface RoomInfo {
  readonly id: string;
  readonly name: string;
  /** Ambient temperature, °C. */
  readonly temperatureC: number;
  readonly outsideTemperatureC: number;
  readonly windowOpen: boolean;
}

export interface DeviceInfo {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly kind: string;
  readonly behavior: string;
  readonly parameters: Readonly<JsonObject>;
  /** Room containing the device (for sensors), or null. */
  readonly room: string | null;
  readonly objects: readonly ObjectInfo[];
  readonly buttons: readonly ButtonInfo[];
  readonly inputs: readonly NumberInputInfo[];
  readonly channels: readonly ChannelInfo[];
}

export type Gesture = "press" | "short" | "long" | "release" | "value";

export interface InputEvent {
  /** ID of a device key or digital input. */
  readonly inputId: string;
  readonly gesture: Gesture;
  /** Entered value (only for a value gesture). */
  readonly value?: number;
}

export interface ObjectWriteEvent {
  readonly objectId: string;
  readonly oldValue: number | null;
  readonly newValue: number;
  /** "bus" means a received telegram; "internal" means a write from another object on the same device. */
  readonly origin: "bus" | "internal";
  readonly telegramId: number;
  readonly ga: string;
}

export interface BehaviorContext<S = unknown> {
  /** Current simulated time, in whole milliseconds. */
  readonly timeMs: number;
  readonly device: DeviceInfo;
  /** Clean, serializable state held by the simulation instance. */
  readonly state: S;
  getObject(objectId: string): number | null;
  /** Update the local value without transmitting or calling onObjectWrite. */
  setObject(objectId: string, value: number): void;
  /** Request transmission of the current object value (subject to T flag and GA checks). */
  transmit(objectId: string): void;
  /** Set the command for a device channel. */
  setOutput(channelId: string, command: OutputCommand): void;
  getOutput(channelId: string): OutputCommand | null;
  /**
   * State of the load connected to the channel, as an actuator can read it
   * (for example, a DALI ballast). Read only; null when no equipment is connected.
   */
  readEquipment(channelId: string): Readonly<JsonObject> | null;
  /** Electrical power (W) drawn by the load of the channel; null if the load does not model it. */
  readPower(channelId: string): number | null;
  /** Device room (`device.room`), where its sensors take measurements; null if unassigned. */
  readRoom(): RoomInfo | null;
  /**
   * Set the outdoor temperature of every room (physical world, °C, clamped to −30…50),
   * for a device that represents the weather, such as a weather station.
   */
  setOutsideTemperature(celsius: number): void;
  /**
   * Simulated wall clock of the scenario (`clock`), or null without one. Convert a clock
   * delay to a simulation delay by dividing it by `speed`.
   */
  clock(): ClockInfo | null;
  /** Schedule or replace a device timer identified by `key`. */
  schedule(key: string, delayMs: number, payload?: JsonValue): void;
  /** Cancel the `key` deadline; no effect if it does not exist. */
  cancel(key: string): void;
  /** Add a note to the event log, visible in its details. */
  note(message: string): void;
  /**
   * Translate text into the simulator language with ctx.t`text ${value}`. Source text is
   * English; an extension can add translations with registerMessages().
   */
  t: Translate;
}

export interface BehaviorPort {
  /** Accepted DPTs; "any" means all supported DPTs. */
  dpts: readonly string[] | "any";
  /** "required": the object must designate a channel; "optional": channel or all channels. */
  channel?: "required" | "optional" | "none";
  /** Short label for forms (such as "Status feedback"). */
  title?: string;
  /**
   * "in": the object receives (W true, T false); "out": the object emits (W false, T true).
   * Provides form defaults; flags remain editable.
   */
  direction?: "in" | "out";
  description?: string;
}

export interface BehaviorDefinition<S = unknown> {
  description?: string;
  /** Device settings (`device.parameters`). */
  parameters?: ParamSchema;
  /** Parameters of each channel (`channels[].parameters`). */
  channelParameters?: ParamSchema;
  /** Initial application status of each channel (`channels[].initialState`). */
  channelInitialState?: ParamSchema;
  /** Ports of accepted objects, with their DPTs. */
  ports: Record<string, BehaviorPort>;
  /** Type of output control emitted by this behavior ("switch", "motor"). */
  output?: OutputCommand["type"];
  /** Does this behavior use local keys or inputs? */
  acceptsInputs?: boolean;
  createState(device: DeviceInfo): S;
  onInit?(ctx: BehaviorContext<S>): void;
  onInput?(ctx: BehaviorContext<S>, input: InputEvent): void;
  onObjectWrite?(ctx: BehaviorContext<S>, event: ObjectWriteEvent): void;
  onTick?(ctx: BehaviorContext<S>, dtMs: number): void;
  /**
   * The device room changed a discrete state (for example, window open or closed in
   * the interface); a contact reacts immediately. Read temperature with readRoom().
   */
  onRoomChange?(ctx: BehaviorContext<S>, room: RoomInfo): void;
  onTimer?(ctx: BehaviorContext<S>, key: string, payload: JsonValue): void;
  /** The simulated clock was set to another time (setClock); reschedule clock-based deadlines. */
  onClockChange?(ctx: BehaviorContext<S>): void;
  /** Device application state for display, excluding channel state (setpoint, mode, etc.). */
  deviceState?(state: S, timeMs: number, device: DeviceInfo): JsonObject;
  /** Channel application state projected at `timeMs` for a snapshot. */
  channelState?(
    state: S,
    channelId: string,
    timeMs: number,
    device: DeviceInfo,
  ): JsonObject;
}

// ── Non-KNX equipment ──

export interface EquipmentDefinition<S extends JsonObject = JsonObject> {
  /** Short name for forms ("Light"). */
  title?: string;
  description?: string;
  parameters?: ParamSchema;
  initialState?: ParamSchema;
  /** Type of command accepted ("switch" for a lamp, "motor" for a shutter). */
  accepts: OutputCommand["type"];
  create(parameters: JsonObject, initialState: JsonObject): S;
  /**
   * Constraints between parameters that the schema cannot express (e.g. DALI addresses)
   * Returns problems: name of the fault parameter and message.
   */
  checkParameters?(
    parameters: JsonObject,
    t: Translate,
  ): { parameter: string; message: string }[];
  /** Apply a command; pure function. */
  applyCommand(state: S, command: OutputCommand, parameters: JsonObject): S;
  /** Evolve the state during `dtMs` with the current order; pure function. */
  advance?(state: S, dtMs: number, parameters: JsonObject): S;
  /**
   * Thermal input to the equipment room (`equipment.room`), expressed as the deviation of
   * temperature it would maintain on its own in constant operation (K; negative for cooling).
   */
  heatOutput?(state: S, parameters: JsonObject): number;
  /** Electrical power drawn in the current state (W), for metering actuators. */
  powerW?(state: S, parameters: JsonObject): number;
  /**
   * Physical action on equipment from the interface (e.g. simulated ballast failure);
   * pure function. The actuator's behavior only sees it if it questions the equipment.
   */
  interact?(
    state: S,
    action: string,
    parameters: JsonObject,
    payload: JsonValue,
  ): S;
}

// ── Journal ──────────────────────────────────────────────────────────────────

export type JournalKind =
  | "input"
  | "object-changed"
  | "telegram-emitted"
  | "coupler-decision"
  | "telegram-received"
  | "object-write-accepted"
  | "object-write-ignored"
  | "transmit-ignored"
  | "output-changed"
  | "timer-fired"
  | "note"
  | "diagnostic";

export interface JournalEvent {
  id: number;
  timeMs: number;
  kind: JournalKind;
  /** Journal event that caused this event. */
  causeId: number | null;
  deviceId?: string;
  objectId?: string;
  channelId?: string;
  telegramId?: number;
  couplerId?: string;
  ga?: string;
  value?: number | null;
  message?: string;
  data?: JsonObject;
}

export interface Diagnostic {
  timeMs: number;
  level: "warning" | "error";
  code: string;
  message: string;
  deviceId?: string;
  extension?: string;
}

// ── Observable state ──

export interface ObjectSnapshot {
  value: number | null;
  updatedAtMs: number | null;
  flags: ObjectFlags;
}

export interface ChannelSnapshot {
  output: OutputCommand | null;
  state: JsonObject;
}

export interface EquipmentSnapshot {
  type: string;
  state: JsonObject;
}

export interface RoomSnapshot {
  temperatureC: number;
  outsideTemperatureC: number;
  windowOpen: boolean;
}

/** Simulated wall clock: milliseconds since 1970-01-01 read as local time (UTC fields). */
export interface ClockInfo {
  nowMs: number;
  /** Clock seconds per simulated second. */
  speed: number;
}

export interface SimSnapshot {
  timeMs: number;
  /** Simulated clock, or null when the scenario declares none. */
  clock: ClockInfo | null;
  paused: boolean;
  faulted: boolean;
  objects: Record<string, ObjectSnapshot>;
  channels: Record<string, ChannelSnapshot>;
  equipment: Record<string, EquipmentSnapshot>;
  rooms: Record<string, RoomSnapshot>;
  telegramsInFlight: number;
  diagnostics: Diagnostic[];
}
