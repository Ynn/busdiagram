// Authoring schema (JSON Schema 2020-12) for format v2, built from definitions
// recorded: the behavior and equipment parameters are integrated.
// It is used for publishing (self-completion, help), reference documentation and testing.
// contract; the validator executed by the engine remains builtScenario(), which applies in addition
// cross-reference rules (objects, channels, ports' DPTs, addresses).
import type { ParamSchema } from "./contracts";
import { SUPPORTED_DPTS, dptInfo } from "./dpt";
import type { Registry } from "./registry";

const BYTE = "([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])";
const NIBBLE = "([0-9]|1[0-5])";
const MAIN = "([0-9]|[12][0-9]|3[01])";

export const IA_PATTERN = `^${NIBBLE}\\.${NIBBLE}\\.${BYTE}$`;
const NIBBLE1 = "([1-9]|1[0-5])";
export const LINE_PATTERN = `^${NIBBLE1}\\.${NIBBLE1}$`;
export const GA_PATTERN = `^${MAIN}/[0-7]/${BYTE}$`;
const ID_PATTERN = "^[A-Za-z][\\w.-]*(/v\\d+)?$";
/** Device IDs, object, channel, key, input: without "/" or space. */
export const ID_ATOM = "^[A-Za-z0-9_][A-Za-z0-9_.-]*$";

const ICONS: [string, string][] = [
  ["on", "I: on"],
  ["off", "O: off"],
  ["toggle", "I/O: toggle"],
  ["up", "▲: up"],
  ["down", "▼: down"],
  ["updown", "▲▼: shutter on one key"],
  ["scene", "☰: scene"],
  ["presence", "◉: presence"],
  ["clock", "◷: clock"],
  ["dimUp", "☼+: brighten"],
  ["dimDown", "☼−: dim"],
];

/** Role of objects for standard behaviors. */
export const PORT_DOCS: Record<string, string> = {
  input: "Object written by a button or numeric input, then transmitted.",
  display:
    "Object that receives and displays a value, such as an indicator or supervisor.",
  switch: "Channel switch command (0 = off, 1 = on).",
  status: "Relay status feedback, sent after each effective change.",
  move: "Shutter: 0 raises toward 0%, 1 lowers toward 100%.",
  stopStep:
    "Shutter: stop when moving; otherwise step by stepPct (0 up, 1 down).",
  positionCommand: "Shutter target position in percent.",
  positionStatus: "Actuator's estimated shutter position, sent after stopping.",
  scene:
    "Scene number (bus byte 0–63 represents scenes 1–64); without a channel, apply to all channels.",
  forced:
    "Priority override (2 = force off, 3 = force on, 0/1 = end override).",
  dim: "Relative dimming (3.007): direction bit and step size 1–7; 0 stops dimming.",
  value: "Brightness value in percent (5.001); zero switches off.",
  valueStatus: "Brightness value feedback (5.001), sent after a transition.",
  error: "Lamp or ballast fault in a DALI group (1.005).",
  broadcastSwitch: "Switch all groups with a DALI broadcast.",
  broadcastValue: "Set all group levels with a DALI broadcast.",
  generalError: "Fault on the DALI line across all groups (1.005).",
  actualTemp: "Thermostat: measured temperature (9.001), sent on change.",
  externalTemp:
    "Thermostat: temperature from an external sensor (9.001), replacing the internal sensor.",
  baseSetpoint: "Thermostat: base heating comfort setpoint (9.001).",
  setpointShift: "Thermostat: offset from the base setpoint (9.002, in K).",
  setpointStatus: "Thermostat: current setpoint (9.001).",
  hvacMode:
    "Thermostat: selected mode (20.102: 0 auto, 1 comfort, 2 standby, 3 economy, 4 protection).",
  hvacModeStatus: "Thermostat: current mode (20.102).",
  presence: "Thermostat: presence requests comfort mode.",
  window: "Thermostat: an open window requests priority protection mode.",
  heatCool: "Thermostat: 1 selects heating, 0 selects cooling (1.100).",
  heatCoolStatus: "Thermostat: current heating or cooling mode.",
  heatingValue: "Thermostat: continuous heating control value (5.001).",
  heatingSwitch: "Thermostat: one-bit heating command (two-point or PWM).",
  coolingValue: "Thermostat: continuous cooling control value (5.001).",
  coolingSwitch: "Thermostat: one-bit cooling command.",
  fault:
    "Heating actuator: missing control value triggers emergency mode (1.005).",
  contact:
    "Window contact: 1.019 or 1.001 uses 1 for open; 1.009 uses 1 for closed.",
  temperature: "Sensor: room temperature (9.001).",
};

// Enumeration wordings are used for forms; they are not JSON Schema.
const params = (s: ParamSchema | undefined) =>
  s
    ? {
        ...s,
        properties: Object.fromEntries(
          Object.entries(s.properties).map(([k, p]) => {
            const { enumTitles, nullTitle, ...rest } = p;
            void enumTitles;
            void nullTitle;
            return [k, rest];
          }),
        ),
      }
    : { type: "object", maxProperties: 0 };

const text = (description: string) => ({ type: "string", description });

export function buildAuthorSchema(registry: Registry): Record<string, unknown> {
  const behaviorIds = [...registry.behaviors.keys()];
  const equipmentIds = [...registry.equipment.keys()];
  const portOneOf = (
    names: string[],
    describe: (n: string) => string | undefined,
  ) =>
    names.map((n) => ({
      const: n,
      description: describe(n) ?? PORT_DOCS[n] ?? n,
    }));
  const allPorts = [
    ...new Set([
      ...Object.keys(PORT_DOCS),
      ...[...registry.behaviors.values()].flatMap((d) => Object.keys(d.ports)),
    ]),
  ];
  const byBehavior = [...registry.behaviors].map(([id, def]) => ({
    if: { properties: { behavior: { const: id } }, required: ["behavior"] },
    then: {
      properties: {
        parameters: params(def.parameters),
        channels: {
          items: {
            properties: {
              parameters: params(def.channelParameters),
              initialState: params(def.channelInitialState),
            },
          },
        },
        // A device without ports (USB interface) has no objects.
        objects: Object.keys(def.ports).length
          ? {
              items: {
                properties: {
                  port: {
                    oneOf: portOneOf(
                      Object.keys(def.ports),
                      (n) => def.ports[n]?.description,
                    ),
                  },
                },
              },
            }
          : { maxItems: 0 },
      },
    },
  }));
  const byEquipment = [...registry.equipment].map(([id, def]) => ({
    if: { properties: { type: { const: id } }, required: ["type"] },
    then: {
      properties: {
        parameters: params(def.parameters),
        initialState: params(def.initialState),
      },
      ...(def.parameters?.required?.length
        ? { required: ["type", "parameters"] }
        : {}),
    },
  }));
  const action = {
    type: "object",
    description:
      "Button action: write a value to an object on the same device, then transmit it.",
    additionalProperties: false,
    required: ["object", "value"],
    properties: {
      object: text(
        "ID of an object on the same device (input port, with a group address).",
      ),
      value: {
        anyOf: [{ type: "number" }, { const: "toggle" }],
        description:
          "Value within the object's DPT range, or “toggle” to invert a one-bit local object value.",
      },
    },
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://bus-diagram.local/schema/scenario-v2.schema.json",
    title: "ScenarioV2",
    description:
      "BusDiagram scenario, format 2. Generated by `npm run schema`.",
    type: "object",
    additionalProperties: false,
    required: ["formatVersion", "lines", "devices"],
    properties: {
      $schema: text(
        "Schema path for editor completion; ignored by BusDiagram.",
      ),
      formatVersion: {
        const: 2,
        description:
          "Format version 2. Without this field, the file is read as legacy format 1.",
      },
      title: text("Title displayed in the toolbar."),
      description: text("Description displayed below the toolbar."),
      lines: {
        type: "array",
        minItems: 1,
        items: { $ref: "#/$defs/line" },
        description:
          "Twisted-pair lines. Multiple lines add line couplers and main lines; multiple areas add a backbone.",
      },
      clock: {
        type: "object",
        additionalProperties: false,
        required: ["start"],
        description:
          "Simulated clock: local date and time at simulation start, and acceleration. Clock masters, time switches, and time windows use it.",
        properties: {
          start: {
            type: "string",
            pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(:\\d{2})?$",
            description:
              "Local date and time at start, such as 2026-09-28T21:58:00 (no time zone).",
          },
          speed: {
            type: "number",
            exclusiveMinimum: 0,
            maximum: 3600,
            default: 1,
            description:
              "Clock seconds per simulated second; 60 makes one minute pass per second.",
          },
        },
      },
      rooms: {
        type: "array",
        items: { $ref: "#/$defs/room" },
        description:
          "Rooms: thermal state shared by assigned thermostats, window contacts, and radiators.",
      },
      topology: {
        type: "object",
        description:
          "Topology levels and coupler settings. Without this field, a main line appears with two lines in an area and a backbone with two areas.",
        additionalProperties: false,
        properties: {
          backbone: {
            type: "boolean",
            description:
              "Backbone line 0.0 and area couplers A.0.0, even with one area.",
          },
          mainLines: {
            type: "boolean",
            description:
              "Area main lines A.0 and line couplers A.L.0, even with one line.",
          },
          ip: {
            enum: ["areaCouplers", "lineCouplers"],
            description:
              "IP network: KNXnet/IP routers replace area couplers (areaCouplers, A.0.0) or line couplers (lineCouplers, A.L.0). Devices with medium IP connect to it.",
          },
          areas: {
            type: "array",
            description: "Area names.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["address"],
              properties: {
                address: {
                  type: "integer",
                  minimum: 1,
                  maximum: 15,
                  description: "Area number.",
                },
                name: text(
                  "Area name displayed in the diagram, for example “Building A”.",
                ),
              },
            },
          },
          couplers: {
            type: "array",
            description:
              "Group-telegram routing settings for couplers and routers; filtering is the default.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["address"],
              properties: {
                address: {
                  type: "string",
                  pattern: IA_PATTERN,
                  description:
                    "Coupler address: A.L.0 for a line or A.0.0 for an area.",
                },
                name: text("Display name."),
                down: {
                  enum: ["filter", "route", "block"],
                  description:
                    "Primary-to-secondary direction: filter by association table, route everything, or block everything.",
                },
                up: {
                  enum: ["filter", "route", "block"],
                  description:
                    "Secondary → primary line: filter, route, or block.",
                },
              },
            },
          },
        },
      },
      ipRouter: {
        type: "object",
        description:
          "Legacy single-router IP network setting; prefer topology.ip. The address must belong to a coupler (A.L.0 or A.0.0).",
        additionalProperties: false,
        required: ["address"],
        properties: {
          address: {
            type: "string",
            pattern: IA_PATTERN,
            description: "Router individual address.",
          },
          name: text("Display name; defaults to “KNX/IP router”."),
        },
      },
      groupAddresses: {
        type: "array",
        items: { $ref: "#/$defs/groupAddress" },
        description:
          "Declared group addresses: names and DPTs displayed in the monitor and inherited by associated objects.",
      },
      devices: {
        type: "array",
        items: { $ref: "#/$defs/device" },
        description:
          "Devices in cable order on their line; order determines propagation delay.",
      },
      options: {
        type: "object",
        description: "Initial simulation settings.",
        additionalProperties: false,
        properties: {
          speed: {
            type: "number",
            exclusiveMinimum: 0,
            description:
              "Initial speed (1 = normal simulated time, 0.35 = slower).",
          },
          filterTables: {
            type: "boolean",
            description: "Show coupler filter tables on startup.",
          },
        },
      },
    },
    $defs: {
      dpt: {
        description: "Supported datapoint type.",
        oneOf: SUPPORTED_DPTS.map((id) => ({
          const: id,
          description: dptInfo(id)!.name,
        })),
      },
      line: {
        type: "object",
        description: "TP line.",
        additionalProperties: false,
        required: ["address"],
        properties: {
          address: {
            type: "string",
            pattern: LINE_PATTERN,
            description:
              "Line address in area.line form, such as 1.1; values 1–15. Main lines and backbone come from topology.",
          },
          name: text(
            "Name displayed under the bus, for example “Example line”.",
          ),
          extension: {
            type: "object",
            description:
              "Line extension: repeater or segment coupler to a downstream segment.",
            additionalProperties: false,
            required: ["address"],
            properties: {
              address: {
                type: "string",
                pattern: IA_PATTERN,
                description:
                  "Extension individual address on the line, such as 2.1.64.",
              },
              mode: {
                enum: ["repeater", "segmentCoupler"],
                description:
                  "repeater: forward without filtering; segmentCoupler: use a filter table.",
              },
              switchable: {
                type: "boolean",
                description:
                  "Show a repeater/segment-coupler selector in the toolbar.",
              },
            },
          },
        },
      },
      groupAddress: {
        type: "object",
        description: "Declared group address.",
        additionalProperties: false,
        required: ["address"],
        properties: {
          address: {
            type: "string",
            pattern: GA_PATTERN,
            description:
              "Three-level group address (main/middle/subgroup), such as 1/1/1.",
          },
          name: text("Purpose shown in the monitor and tooltips."),
          dpt: {
            $ref: "#/$defs/dpt",
            description:
              "DPT inherited by objects that do not declare their own.",
          },
        },
      },
      object: {
        type: "object",
        description: "Communication object of a device.",
        additionalProperties: false,
        required: ["id", "ga", "port", "flags"],
        properties: {
          id: {
            type: "string",
            pattern: ID_ATOM,
            description:
              "ID unique within the device; buttons, inputs, and indicators may refer to it.",
          },
          name: text("Name shown on the device card; defaults to the ID."),
          ga: {
            description:
              "Associated group addresses: the first is the sending address; others are receive-only. An empty list leaves the object unassociated.",
            anyOf: [
              { type: "string", pattern: GA_PATTERN },
              {
                type: "array",
                uniqueItems: true,
                items: { type: "string", pattern: GA_PATTERN },
              },
            ],
          },
          dpt: {
            $ref: "#/$defs/dpt",
            description:
              "Object DPT; defaults to the DPT of its first declared group address.",
          },
          port: {
            oneOf: portOneOf(allPorts, () => undefined),
            description: "Object role in the device's behavior.",
          },
          channel: text(
            "Channel ID within the device; required by actuator ports.",
          ),
          value: {
            type: ["number", "null"],
            description:
              "Initial value (zero by default; unknown for a display port).",
          },
          flags: {
            type: "object",
            description:
              "Modeled flags: W write, T transmit, R read, U update. C communication is always enabled.",
            additionalProperties: false,
            required: ["W", "T"],
            properties: {
              W: {
                type: "boolean",
                description:
                  "Accept a received GroupValueWrite; otherwise the telegram is ignored and the value stays unchanged.",
              },
              T: {
                type: "boolean",
                description:
                  "Allow the behavior to transmit this object; otherwise its value may change locally without a telegram.",
              },
              R: {
                type: "boolean",
                description:
                  "Answer GroupValueRead on the object's sending address; enabled by default for status ports.",
              },
              U: {
                type: "boolean",
                description:
                  "Apply a received GroupValueResponse as an update; enabled by default for display ports.",
              },
            },
          },
        },
      },
      button: {
        type: "object",
        description:
          "Button drawn on the device card; use press or a short/long pair.",
        additionalProperties: false,
        required: ["id"],
        properties: {
          id: {
            type: "string",
            pattern: ID_ATOM,
            description: "ID unique among buttons and inputs on this device.",
          },
          label: text(
            "Label on the button; for example “Key 2 · Down” displays Key 2 prominently.",
          ),
          icon: {
            oneOf: ICONS.map(([c, d]) => ({ const: c, description: d })),
            description: "Icon inferred from the action when omitted.",
          },
          press: {
            ...action,
            description:
              "Action taken immediately on press; cannot be combined with short/long.",
          },
          short: {
            ...action,
            description: "Action on release before the long-press threshold.",
          },
          long: {
            ...action,
            description:
              "Action after the long-press threshold (0.5 s by default).",
          },
          release: {
            ...action,
            description:
              "Action on release after a long press, such as stopping DPT 3.007 dimming.",
          },
          led: text("Object whose value lights the button indicator."),
        },
        anyOf: [
          { required: ["press"] },
          { required: ["short"] },
          { required: ["long"] },
        ],
        not: {
          anyOf: [
            { required: ["press", "short"] },
            { required: ["press", "long"] },
          ],
        },
      },
      input: {
        type: "object",
        description: "Numeric input drawn on the device card.",
        additionalProperties: false,
        required: ["id", "type", "object"],
        properties: {
          id: {
            type: "string",
            pattern: ID_ATOM,
            description: "ID unique among buttons and inputs on this device.",
          },
          type: {
            const: "number",
            description: "The only input type is number.",
          },
          label: text("Label displayed above the input."),
          object: text(
            "Input object with a group address; written and transmitted on submission.",
          ),
          min: {
            type: "number",
            description: "Minimum value; defaults to the DPT minimum.",
          },
          max: {
            type: "number",
            description: "Maximum value; defaults to the DPT maximum.",
          },
          step: {
            type: "number",
            exclusiveMinimum: 0,
            description: "Input step; defaults to 1.",
          },
        },
      },
      room: {
        type: "object",
        description:
          "Room thermal model: heat loss toward outside temperature plus equipment output; an open window increases loss.",
        additionalProperties: false,
        required: ["id"],
        properties: {
          id: {
            type: "string",
            pattern: ID_ATOM,
            description: "ID referenced by room assignments.",
          },
          name: text("Display name; defaults to the ID."),
          temperatureC: {
            type: "number",
            minimum: -30,
            maximum: 60,
            description: "Initial indoor temperature in °C; defaults to 20.",
          },
          outsideTemperatureC: {
            type: "number",
            minimum: -30,
            maximum: 50,
            description: "Outside temperature in °C; defaults to 5.",
          },
          windowOpen: {
            type: "boolean",
            description: "Window initially open.",
          },
          timeConstantMs: {
            type: "integer",
            minimum: 1000,
            maximum: 86400000,
            description:
              "Thermal loss time constant in simulated milliseconds; defaults to 300,000 ms.",
          },
        },
      },
      equipment: {
        type: "object",
        description: "Non-KNX equipment connected to a channel output.",
        additionalProperties: false,
        required: ["type"],
        properties: {
          type: {
            anyOf: [
              { enum: equipmentIds },
              { type: "string", pattern: ID_PATTERN },
            ],
            description:
              "Equipment type: lamp, shutter, or a registered extension type.",
          },
          view: text(
            "View type; defaults to the equipment type, such as an extension's ledStrip view.",
          ),
          room: {
            type: "string",
            pattern: ID_ATOM,
            description:
              "Heated or cooled room ID from rooms; required for a radiator.",
          },
          parameters: {
            type: "object",
            description:
              "Equipment parameters, such as a shutter's actualTravelTimeMs.",
          },
          initialState: {
            type: "object",
            description:
              "Initial physical state, such as a shutter's positionPct.",
          },
        },
        allOf: byEquipment,
      },
      channel: {
        type: "object",
        description:
          "Actuator output channel; declare hardware channels even when unused.",
        additionalProperties: false,
        required: ["id"],
        properties: {
          id: {
            type: "string",
            pattern: ID_ATOM,
            description:
              "ID unique within the device and referenced by its communication objects.",
          },
          label: text(
            "Load label, such as L1; use “unused” for an unconnected output.",
          ),
          parameters: {
            type: "object",
            description:
              "Behavior-specific channel parameters, such as timer or travel time.",
          },
          initialState: {
            type: "object",
            description: "Initial application state of the channel.",
          },
          equipment: {
            anyOf: [{ $ref: "#/$defs/equipment" }, { type: "null" }],
            description:
              "Connected equipment, or null for a free output without a drawn load.",
          },
          scenes: {
            type: "object",
            description:
              "Scene presets: scene number 1–64 maps to a relay state or shutter position.",
            propertyNames: { pattern: "^([1-9]|[1-5][0-9]|6[0-4])$" },
            additionalProperties: { type: "number" },
          },
        },
      },
      device: {
        type: "object",
        description:
          "KNX device with an individual address, objects, buttons, inputs, and channels.",
        additionalProperties: false,
        required: ["id", "kind", "behavior", "objects"],
        properties: {
          id: {
            type: "string",
            pattern: ID_ATOM,
            description: "ID unique within the scenario.",
          },
          name: text("Name shown on the device card; defaults to the ID."),
          address: {
            type: "string",
            pattern: IA_PATTERN,
            description:
              "Individual address in area.line.device form; its line must be declared.",
          },
          kind: text(
            "Device grouping and rendering: pushButton, switchActuator, shutterActuator, sensor, supervisor, generic…",
          ),
          behavior: {
            anyOf: [
              { enum: behaviorIds },
              { type: "string", pattern: ID_PATTERN },
            ],
            description: "Versioned ID of the device's registered behavior.",
          },
          parameters: {
            type: "object",
            description: "Device parameters defined by its behavior.",
          },
          medium: {
            enum: ["TP", "IP"],
            description:
              "Communication medium: TP by default, or IP on the topology.ip network; supervisors default to IP.",
          },
          room: {
            type: "string",
            pattern: ID_ATOM,
            description:
              "Assigned room ID; thermostats, window contacts, and temperature sensors observe that room.",
          },
          inFilterTables: {
            type: "boolean",
            description:
              "false: do not include this virtual device in coupler filter tables.",
          },
          downstream: {
            type: "boolean",
            description:
              "Device on the downstream segment of a line extension.",
          },
          description: text(
            "Explanation shown when selecting the device card.",
          ),
          objects: {
            type: "array",
            items: { $ref: "#/$defs/object" },
            description: "Communication objects in device-card order.",
          },
          buttons: {
            type: "array",
            items: { $ref: "#/$defs/button" },
            description: "Keys (push button, sensor).",
          },
          inputs: {
            type: "array",
            items: { $ref: "#/$defs/input" },
            description: "Numeric inputs.",
          },
          channels: {
            type: "array",
            items: { $ref: "#/$defs/channel" },
            description: "Actuator channels (outputs).",
          },
        },
        allOf: byBehavior,
      },
    },
  };
}
