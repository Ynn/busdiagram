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

/**
 * Organization of the parameters of a behavior in the designer, as pages: pages of the
 * whole device, then pages repeated for each channel. Every parameter that no page
 * places is still shown, on an automatic page. Texts are written in English and
 * translated like parameter titles.
 */
export interface ParameterLayout {
  /** Pages of the device, after its General page (name, line, address). */
  readonly device?: readonly ParameterPage[];
  /** Pages repeated for each channel, grouped under it (an output, a group). */
  readonly channel?: readonly ParameterPage[];
}

export interface ParameterPage {
  readonly id: string;
  readonly title: string;
  readonly items: readonly ParameterItem[];
}

/**
 * Content of a page, one item per row: a parameter (of the device on a device page, of
 * the channel on a channel page), an initial state of the channel, the box that enables
 * the group object of a port, a heading, a note, the scenes of a channel, or items shown
 * only under a condition on a parameter.
 */
export type ParameterItem =
  | { readonly parameter: string }
  | { readonly initialState: string }
  | { readonly groupObject: string }
  | { readonly heading: string }
  | { readonly note: string }
  | { readonly scenes: true }
  | {
      readonly when: ParameterCondition;
      readonly items: readonly ParameterItem[];
    };

/**
 * Condition of a `when` item: on the current value of a parameter (its default value
 * when absent), or on a group object being enabled.
 */
export type ParameterCondition =
  | {
      readonly parameter: string;
      /** Shown when the value is one of these. */
      readonly is?: readonly JsonValue[];
      /** Shown when the value is none of these. */
      readonly not?: readonly JsonValue[];
    }
  | {
      /** Shown when the group object of this port is enabled. */
      readonly groupObject: string;
    };

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
  /** Responds to a GroupValueRead received on any of its group addresses, on its sending address. */
  R: boolean;
  /** A GroupValueResponse received updates the object, such as writing. */
  U: boolean;
  /** Communication: off, the object neither sends nor handles any message. */
  C: boolean;
  /** Read on initialisation: when the device starts again, it reads the object's value. */
  I: boolean;
}

/** Transmission priority of a group object (system priority is kept for management). */
export type Priority = "urgent" | "normal" | "low";

/** Read-only view of a group object, as seen by a behavior. */
export interface ObjectInfo {
  readonly id: string;
  readonly name: string;
  readonly port: string;
  readonly channel: string | null;
  readonly dpt: string;
  readonly gas: readonly string[];
  readonly flags: Readonly<ObjectFlags>;
  /** Transmission priority of the frames sent by the object. */
  readonly priority: Priority;
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
  /** The LED is lit while the object `led` is 0 (and off while it is 1). */
  readonly ledInverted?: boolean;
  /**
   * Contact input of a device with `contactInputs`: the key reports when it is pressed
   * ("down") and released ("up"), and "hold" when it is held past `longPressMs`.
   */
  readonly contact?: boolean;
  /** Long-press time of a contact input, or null when its function has no long press. */
  readonly longPressMs?: number | null;
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
  /** Type of the first load connected, or null if the output is free. */
  readonly equipment: string | null;
  /** Types of all the loads connected, in order; they receive the same commands. */
  readonly loads: readonly string[];
  /**
   * Contact of the push-button wired to a contact input (installation): normally open
   * (closes when pressed, the default) or normally closed.
   */
  readonly keyContact?: "normallyOpen" | "normallyClosed";
}

/** What the presentation of a device is decided from. */
export interface PresentationInput {
  readonly kind: string;
  readonly objects: readonly {
    readonly id: string;
    readonly port: string;
    readonly channel: string | null;
  }[];
  readonly channels: readonly { readonly id: string }[];
}

/** How the diagram and the designer present a device. */
export interface DevicePresentation {
  /** Objects facing a screen drawn at the head of the plate (a thermostat display). */
  screen?: readonly string[];
  /** Drawn as a supervision software: values written under the object names. */
  supervisor?: boolean;
  /** Bus interface: its panel writes and reads any group address. */
  busInterface?: boolean;
  /** The `system` field of its device state is shown next to its address. */
  remoteSystem?: boolean;
  /** Group-address column on the left; by default for a device with channels and no keys. */
  receiver?: boolean;
  /** Channels whose loads show their measured power. */
  metered?: readonly string[];
}

/** Load connected to an output, as configured. */
export interface LoadInfo {
  readonly type: string;
  readonly parameters: Readonly<JsonObject>;
}

/** Device as the rules of its behavior see it: channels with the parameters of their loads. */
export interface RuleDeviceInfo extends DeviceInfo {
  readonly channels: readonly (ChannelInfo & {
    readonly equipmentConfigs: readonly LoadInfo[];
  })[];
}

/** Blocking error found by the rules of a behavior. */
export interface RuleProblem {
  /** Path relative to the device, such as `parameters.groupAddresses`; "" for the device. */
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

/** Non-blocking warning found by the rules of a behavior. */
export interface RuleWarning {
  readonly code: string;
  readonly channelId?: string;
  readonly message: string;
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

/**
 * Gesture on a key or an input: the actions of a configured key (press, short, long,
 * release), an entered value, or the edges of a contact input (down when it is pressed,
 * hold when it is held past its long-press time, up when it is released).
 */
export type Gesture =
  "press" | "short" | "long" | "release" | "value" | "down" | "up" | "hold";

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
  /** State of a load of a channel: the first one, or the one at `index` (see `ChannelInfo.loads`). */
  readEquipment(channelId: string, index?: number): Readonly<JsonObject> | null;
  /** Electrical power (W) drawn through the channel: the sum of its loads; null if none models it. */
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
   * "in": the object receives (W true, T false); "out": the object emits (W false, T true);
   * "both": it emits and listens to the state, as a push-button that toggles (W and T true).
   * Provides form defaults; flags remain editable.
   */
  direction?: "in" | "out" | "both";
  description?: string;
  /** Flags R and U of its objects when the scenario does not write them (false otherwise). */
  defaultFlags?: { readonly R?: boolean; readonly U?: boolean };
  /** Class of the telegrams its objects send: a command (default), or a state report. */
  telegram?: "command" | "state";
  /** The diagram links its objects to the loads of their channel (command of an output). */
  drivesLoad?: boolean;
  /** Its objects start with an unknown value until a telegram gives one (a display). */
  initialUnknown?: boolean;
  /**
   * At most one object per channel (per device for a port without channel): the behavior
   * reads a single value, such as a measurement or an enable; a second one is refused.
   */
  single?: boolean;
}

export interface BehaviorDefinition<S = unknown> {
  description?: string;
  /** Device settings (`device.parameters`). */
  parameters?: ParamSchema;
  /** Parameters of each channel (`channels[].parameters`). */
  channelParameters?: ParamSchema;
  /** Initial application status of each channel (`channels[].initialState`). */
  channelInitialState?: ParamSchema;
  /** Pages of parameters in the designer; derived from the schemas when absent. */
  parameterLayout?: ParameterLayout;
  /**
   * Group objects of each channel that follow one of its parameters, as a product's
   * parameter dialog shows the objects of the chosen function: for each value of the
   * parameter, the ports present and their DPT. The designer creates and removes them.
   */
  channelObjects?: {
    readonly parameter: string;
    readonly values: Readonly<
      Record<string, readonly { readonly port: string; readonly dpt: string }[]>
    >;
  };
  /** Ports of accepted objects, with their DPTs. */
  ports: Record<string, BehaviorPort>;
  /** Type of output control emitted by this behavior ("switch", "motor"). */
  output?: OutputCommand["type"];
  /** Does this behavior use local keys or inputs? */
  acceptsInputs?: boolean;
  /** Keys (`buttons`) are refused when false; by default they follow `acceptsInputs`. */
  acceptsKeys?: boolean;
  /**
   * Its objects may carry a standard DPT that is shown but not simulated: the device
   * shows or keeps values without using them (visualization, device without logic).
   */
  representsAnyDpt?: boolean;
  /**
   * Each channel is a contact input (a key on the diagram): the device receives the
   * edges "down" and "up", and "hold" when the key is held past its long-press time.
   */
  contactInputs?: boolean;
  /**
   * Key of a contact input channel on the diagram: its icon (a key icon name), the object
   * that its LED shows, and whether the LED is lit for 0. Without it, the key has the
   * toggle icon and the LED shows the channel's `led` object.
   */
  contactKey?(
    channel: ChannelInfo,
    objects: readonly ObjectInfo[],
  ): {
    icon?: string;
    led?: string | null;
    ledInverted?: boolean;
    /** Long-press time (ms), or null when the input has no long press. */
    longPressMs?: number | null;
  };
  /**
   * Errors specific to the behavior, on a device whose structure is valid: the scenario
   * is refused. Paths are relative to the device (`channels[2].scenes.17`).
   */
  validate?(device: RuleDeviceInfo, t: Translate): RuleProblem[];
  /** Data derived from the configuration that the engine uses afterwards. */
  normalize?(device: RuleDeviceInfo): {
    /** Group addresses of the device kept by the filter tables without an object. */
    tableGroupAddresses?: string[];
  };
  /** Teaching warnings about the configuration: the simulation runs. */
  warnings?(device: RuleDeviceInfo, t: Translate): RuleWarning[];
  /** How the diagram and the designer present a device of this behavior. */
  presentation?(device: PresentationInput): DevicePresentation;
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
  /**
   * The bus voltage of the device's segment fails. The device can still set its outputs
   * (a relay switched by stored energy); then it stops: its timers are cancelled, and it
   * neither receives nor sends until the voltage returns.
   */
  onBusFailure?(ctx: BehaviorContext<S>): void;
  /** The bus voltage returns after a failure; the device starts again with its state. */
  onBusRecovery?(ctx: BehaviorContext<S>): void;
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

/** Size of the view of an equipment in the diagram. */
export interface EquipmentSize {
  width: number;
  height: number;
  /** Distance from the top of the drawing to its axis (default: mid-height). */
  anchorY?: number;
}

/**
 * Model entry of a participant: what the library needs of it, without the designer.
 * Pure data: installed once by the registry, never importing it.
 */
export interface ParticipantModel {
  // The definitions are heterogeneous: the type of state is specific to each.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  /** Behaviors, by public identifier. */
  readonly behaviors?: Readonly<Record<string, BehaviorDefinition<any>>>;
  /** Equipment, by identifier. */
  readonly equipment?: Readonly<Record<string, EquipmentDefinition<any>>>;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  /** Texts of the behaviors and their log messages, by language. */
  readonly messages?: Readonly<Record<string, Record<string, string>>>;
  /** Sizes of the views of its equipment, by view: the layout reads them without the views. */
  readonly viewSizes?: Readonly<Record<string, EquipmentSize>>;
}

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
  /** Segments whose bus voltage is cut (`L1.1`, `L1.1b`…). */
  unpoweredSegments: string[];
  diagnostics: Diagnostic[];
}
