// Build docs/llms.txt: a plain-text authoring reference that a language model can read
// before writing a scenario. The catalogs are generated from the registry, so the file
// always matches the library it ships with.

const cell = (v) => String(v ?? "").replace(/\|/g, "\\|");

function paramLines(list, label) {
  if (!list.length) return [];
  return [
    `${label}:`,
    ...list.map(
      (p) =>
        `- \`${p.name}\` (${p.type}${p.required ? ", required" : ""}${p.default !== null ? `, default ${p.default}` : ""}${p.constraints ? `; ${p.constraints}` : ""})${p.description ? `: ${p.description}` : ""}`,
    ),
  ];
}

export const MINIMAL = {
  formatVersion: 2,
  title: "Lighting on one line",
  lines: [{ address: "1.1", name: "Ground floor" }],
  groupAddresses: [
    { address: "1/1/1", name: "Hall light", dpt: "1.001" },
    { address: "1/4/1", name: "Hall light status", dpt: "1.001" },
  ],
  devices: [
    {
      id: "pushButton",
      name: "Push-button",
      address: "1.1.1",
      kind: "pushButton",
      behavior: "pushButton/v1",
      objects: [
        {
          id: "key1",
          name: "Key 1",
          ga: ["1/1/1", "1/4/1"],
          dpt: "1.001",
          port: "input",
          flags: { W: true, T: true },
        },
      ],
      buttons: [
        {
          id: "key1",
          label: "Key 1",
          press: { object: "key1", value: "toggle" },
          led: "key1",
        },
      ],
    },
    {
      id: "switchActuator",
      name: "Switching actuator",
      address: "1.1.2",
      kind: "switchActuator",
      behavior: "switchActuator/v1",
      objects: [
        {
          id: "c1",
          name: "Channel 1",
          ga: "1/1/1",
          dpt: "1.001",
          port: "switch",
          channel: "s1",
          flags: { W: true, T: false },
        },
        {
          id: "e1",
          name: "Status 1",
          ga: "1/4/1",
          dpt: "1.001",
          port: "status",
          channel: "s1",
          flags: { W: false, T: true },
        },
      ],
      channels: [{ id: "s1", label: "Hall", equipment: { type: "lamp" } }],
    },
  ],
};

/**
 * @param {object} data reference data from site/data.ts
 * @param {{ file: string, title: string }[]} examples published example scenarios
 */
export function llmReference(data, examples) {
  const out = [];
  const push = (...lines) => out.push(...lines);

  push(
    "# BusDiagram — authoring reference for language models",
    "",
    "BusDiagram draws instructional diagrams of KNX installations from a JSON document called a scenario, and can simulate the telegrams exchanged when the reader operates the diagram. This file explains how to write a valid scenario (format 2) from a textual description. The catalogs below are generated from the library and list every accepted behavior, port, equipment type, and data point type.",
    "",
    "Related files, relative to this one: `schema/scenario-v2.schema.json` (JSON Schema), `scenarios/*.json` (complete examples), `designer/index.html` (editor with validation), `player.html` (viewer).",
    "",
    "## Output contract",
    "",
    "- Produce a single JSON object. Do not add comments or trailing commas.",
    '- Required at the root: `"formatVersion": 2`, `lines`, and `devices`. Recommended: `title`, `description`, and `groupAddresses` (names and DPTs shown in the monitor).',
    '- Lines: `{ "address": "1.1" }` with area and line numbers 1–15. The layout is derived from addresses; never provide coordinates.',
    "- Individual addresses: `area.line.device` with device 1–255 on a declared line. `A.L.0` is reserved for the line coupler. Each address is used once.",
    "- Group addresses: three levels, `main/middle/sub` with main 0–31, middle 0–7, sub 0–255. `0/0/0` is refused.",
    "- Identifiers (`id`) use letters, digits, `_`, `.`, and `-`, and are unique within their list.",
    "- Each device has `id`, `kind`, `behavior`, and `objects`. `kind` is a free classification used for display (for example `pushButton`, `switchActuator`, `supervisor`); `behavior` must be one of the identifiers listed below.",
    "- Each object has `id`, `ga`, `port`, and `flags`, usually `dpt` and `name`. `ga` is a string or an array; the first address is the sending address, the others are receive-only; `[]` leaves the object unassociated. `port` must belong to the device behavior, and `dpt` must be accepted by that port.",
    "- Flags: `W` (a received write updates the object), `T` (the object may transmit), optional `R` (answers reads on its sending address) and `U` (a response updates it). Inputs of an actuator use `W: true, T: false`; commands and status feedback use `W: false, T: true`.",
    "- Objects linked to the same group address must have the same payload size (all one-bit, all one-byte, and so on).",
    '- Buttons (`buttons`) belong to devices whose behavior accepts inputs. An action is `{ "object": "<object id>", "value": <number | "toggle"> }` under `press`, or under `short`, `long`, and `release` for a two-function key. `led` names an object whose value lights the key indicator.',
    '- Numeric inputs (`inputs`) are `{ "id", "type": "number", "label", "object", "min", "max", "step" }`; the entered value is written to the object and transmitted.',
    "- Channels (`channels`) are actuator outputs: `{ id, label, parameters?, initialState?, equipment? }`. `equipment` connects a load such as a lamp or a shutter. Objects of an output port name their `channel`.",
    '- Topology beyond one line: `topology.mainLines`, `topology.backbone`, `topology.ip` (`"areaCouplers"` or `"lineCouplers"`), and `topology.couplers` for per-coupler `"filter"`, `"route"`, or `"block"` settings. Devices with `"medium": "IP"` connect to the IP network.',
    '- Simulated clock: `"clock": { "start": "2026-09-28T21:57:00", "speed": 60 }` at the root enables `clockMaster/v1`, `timeSwitch/v1`, and time windows of `logicGate/v1`; `speed` is clock seconds per simulated second.',
    '- Heated rooms: `"rooms": [{ "id": "living", "name": "Living room", "temperatureC": 19, "outsideTemperatureC": 5 }]` at the root (optional `windowOpen`, `timeConstantMs`). A `roomThermostat/v1`, `windowContact/v1`, or `temperatureSensor/v1` device sets `"room": "living"`; a radiator load uses `"equipment": { "type": "radiator", "room": "living" }`.',
    '- Line extension: `lines[].extension = { "address": "A.L.64", "mode": "repeater" }` (or `"segmentCoupler"`) adds a second segment connected to the main segment, one per line; devices on that segment set `"downstream": true`.',
    "- Use only behaviors, ports, DPTs, parameters, and equipment types from this file. When the description needs a device that is not listed, use `passive/v1` and state the limitation in `description`.",
    "",
    "## Recommended workflow",
    "",
    "1. Identify lines, devices, and group addresses in the description. Give every group address a name and a DPT.",
    "2. Write the scenario, starting from the closest example below.",
    "3. Validate. With a checkout of the project: `npm run validate -- file.json` (or `-` for standard input; `--json` for machine-readable output). Each problem gives a JSON path such as `devices[1].objects[0].dpt`, a code, and a message.",
    "4. Fix each reported path and validate again until the scenario is valid.",
    "5. Open the result: `designer/index.html#json=<percent-encoded JSON>` loads it in the designer with inline diagnostics, and `player.html#json=<percent-encoded JSON>` shows it full screen. Percent-encode the whole JSON text (for example with `encodeURIComponent`).",
    "",
    "## Minimal complete example",
    "",
    "A push-button toggles a lamp through a switching actuator; the actuator status feedback keeps the key synchronized.",
    "",
    "```json",
    JSON.stringify(MINIMAL, null, 2),
    "```",
    "",
    "## Behaviors",
    "",
  );

  for (const b of data.behaviors) {
    push(`### \`${b.id}\``, "", b.description, "");
    if (b.acceptsInputs) push("Accepts `buttons` and numeric `inputs`.", "");
    if (b.output)
      push(
        `Drives channel outputs with \`${b.output}\` commands; connect a compatible equipment type.`,
        "",
      );
    if (b.ports.length) {
      push(
        "| Port | DPTs | Channel | Direction | Description |",
        "| --- | --- | --- | --- | --- |",
        ...b.ports.map(
          (p) =>
            `| \`${p.name}\` | ${cell(p.dpts)} | ${p.channel} | ${p.direction ?? "—"} | ${cell(p.description)} |`,
        ),
        "",
      );
    } else push("No communication objects (`objects: []`).", "");
    const params = [
      ...paramLines(b.parameters, "Device `parameters`"),
      ...paramLines(b.channelParameters, "Channel `parameters`"),
      ...paramLines(b.channelInitialState, "Channel `initialState`"),
    ];
    if (params.length) push(...params, "");
  }

  push("## Equipment types", "");
  for (const e of data.equipment) {
    push(
      `### \`${e.id}\``,
      "",
      `${e.description} Accepts \`${e.accepts}\` commands.`,
      "",
    );
    const params = [
      ...paramLines(e.parameters, "`parameters`"),
      ...paramLines(e.initialState, "`initialState`"),
    ];
    if (params.length) push(...params, "");
  }

  push(
    "## Data point types",
    "",
    "| DPT | Name | Size (bits) | Range |",
    "| --- | --- | --- | --- |",
    ...data.dpts.map(
      (d) => `| \`${d.id}\` | ${cell(d.name)} | ${d.bits} | ${cell(d.range)} |`,
    ),
    "",
    "## Complete examples",
    "",
    ...examples.map((x) => `- \`scenarios/${x.file}\`: ${x.title}`),
    "",
  );
  return out.join("\n");
}
