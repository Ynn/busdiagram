import { t } from "./lang";
// Scenario snippets for common devices in a sample installation, with
// free individual addresses and IDs selected automatically.
// An insertion completely succeeds or is refused with a reason (SnippetRefusal):
// no partial transfer or address already occupied.

type Json = Record<string, unknown>;
type Doc = Json & {
  lines?: Json[];
  devices?: Json[];
  groupAddresses?: Json[];
  ipRouter?: Json;
  topology?: Json;
};

export class SnippetRefusal extends Error {}

export interface SnippetContext {
  /** Target line ("1.1"); by default the first line declared. */
  line?: string;
}

const flags = (W: boolean, T: boolean) => ({ W, T });
const isRec = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Does the document have the minimum form necessary for an insertion? */
export function shapeProblem(doc: unknown): string | null {
  if (!isRec(doc)) return t`the root must be an object { … }`;
  for (const k of ["lines", "devices", "groupAddresses"])
    if (doc[k] !== undefined && !Array.isArray(doc[k]))
      return t`“${k}” must be a list [ … ]`;
  if (doc.ipRouter !== undefined && !isRec(doc.ipRouter))
    return t`“ipRouter” must be an object`;
  if (
    ((doc.lines as unknown[]) ?? []).some(
      (l) => !isRec(l) || typeof l.address !== "string",
    )
  )
    return t`each line needs an “area.line” address`;
  if (((doc.devices as unknown[]) ?? []).some((d) => !isRec(d)))
    return t`each device must be an object`;
  return null;
}

function freeId(doc: Doc, base: string) {
  const used = new Set((doc.devices ?? []).map((d) => d.id));
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(`${base}${i}`)) return `${base}${i}`;
}

/** Occupied individual addresses: devices, router, line extensions. */
export function usedAddresses(doc: Doc): Set<string> {
  const used = new Set<string>();
  (doc.devices ?? []).forEach(
    (d) => typeof d.address === "string" && used.add(d.address),
  );
  if (typeof doc.ipRouter?.address === "string") used.add(doc.ipRouter.address);
  (doc.lines ?? []).forEach((l) => {
    const ext = l.extension as Json | undefined;
    if (typeof ext?.address === "string") used.add(ext.address);
  });
  return used;
}

/** First free address of the line (1–255; « .0 » is that of the coupler). */
export function freeAddress(doc: Doc, line?: string): string {
  const target = line ?? String(doc.lines?.[0]?.address ?? "1.1");
  // "Z.0" (main line) and "0.0" (backbone) are not reported in "lines".
  const level = /^\d+\.0$/.test(target);
  if (!level && !(doc.lines ?? []).some((l) => l.address === target))
    throw new SnippetRefusal(t`line ${target} is not declared`);
  const used = usedAddresses(doc);
  for (let i = 1; i <= 255; i++)
    if (!used.has(`${target}.${i}`)) return `${target}.${i}`;
  throw new SnippetRefusal(t`no free address left on line ${target}`);
}

/** Next free group address in the given main/medium group. */
export function freeGa(
  doc: Doc,
  main = 1,
  middle = 1,
  taken: string[] = [],
): string {
  const used = new Set<string>(taken);
  (doc.groupAddresses ?? []).forEach((g) => used.add(String(g.address)));
  (doc.devices ?? []).forEach((d) =>
    (Array.isArray(d.objects) ? (d.objects as Json[]) : []).forEach((o) =>
      [o?.ga].flat().forEach((g) => used.add(String(g))),
    ),
  );
  for (let i = 1; i <= 255; i++)
    if (!used.has(`${main}/${middle}/${i}`)) return `${main}/${middle}/${i}`;
  throw new SnippetRefusal(
    t`no free group address left in ${main}/${middle}/…`,
  );
}

function ensureBase(input: Doc): Doc {
  const problem = shapeProblem(input);
  if (problem) throw new SnippetRefusal(problem);
  const doc = input;
  return {
    formatVersion: 2,
    title: doc.title ?? t`New installation`,
    ...doc,
    lines: doc.lines?.length
      ? doc.lines
      : [{ address: "1.1", name: t`Lab kit`, powerSupply: { currentMa: 640 } }],
    groupAddresses: doc.groupAddresses ?? [],
    devices: doc.devices ?? [],
  };
}

export interface Snippet {
  id: string;
  readonly label: string;
  readonly hint: string;
  apply(doc: Doc, ctx?: SnippetContext): Doc;
}

/**
 * Push-button interface: four contact inputs, each switching a new group address by
 * toggling; the function of each input is set on its pages.
 */
const buttonInterface: Snippet = {
  id: "buttonInterface4",
  get label() {
    return t`Push-button interface`;
  },
  get hint() {
    return t`Four contact inputs for conventional push-buttons; each has a function (switching, dimming, blind, value, scene), a lock and a bus voltage recovery reaction.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    const inputs = [1, 2, 3, 4];
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "buttonInterface"),
          name: t`Push-button interface`,
          address: freeAddress(doc, ctx.line),
          kind: "buttonInterface",
          behavior: "buttonInterface/v1",
          channels: inputs.map((i) => ({
            id: `in${i}`,
            label: t`Input ${i}`,
            parameters: { function: "switch" },
          })),
          objects: inputs.map((i) => ({
            id: `sw${i}`,
            name: t`Switching ${i}`,
            ga: [],
            dpt: "1.001",
            port: "switch",
            channel: `in${i}`,
            flags: flags(true, true),
          })),
        },
      ],
    };
  },
};

function switchActuator(outputs: number): Snippet {
  return {
    id: `switchActuator${outputs}`,
    get label() {
      return t`${outputs}-output switch actuator`;
    },
    get hint() {
      return t`One channel and one lamp per output; fill in the objects' group addresses.`;
    },
    apply(input, ctx = {}) {
      const doc = ensureBase(input);
      const id = freeId(doc, "switchActuator");
      return {
        ...doc,
        devices: [
          ...doc.devices!,
          {
            id,
            // The number of outputs is a setting (Configuration page), not part of the name.
            name: t`Switch actuator`,
            address: freeAddress(doc, ctx.line),
            kind: "switchActuator",
            behavior: "switchActuator/v1",
            objects: Array.from({ length: outputs }, (_, i) => ({
              id: `c${i + 1}`,
              name: t`Command L${i + 1}`,
              ga: [],
              dpt: "1.001",
              port: "switch",
              channel: `s${i + 1}`,
              flags: flags(true, false),
            })),
            channels: Array.from({ length: outputs }, (_, i) => ({
              id: `s${i + 1}`,
              label: `L${i + 1}`,
              equipment: { type: "lamp" },
            })),
          },
        ],
      };
    },
  };
}

/** Objects for a dimmer channel (switch, dim, value, and feedback), without addresses. */
function dimObjects(ch: string, label: string, dali: boolean) {
  const o = (
    id: string,
    name: string,
    dpt: string,
    port: string,
    out = false,
  ) => ({
    id: `${ch}${id}`,
    name: `${label} ${name}`,
    ga: [],
    dpt,
    port,
    channel: ch,
    flags: flags(!out, out),
  });
  return [
    o("s", t`switching`, "1.001", "switch"),
    o("d", t`dimming`, "3.007", "dim"),
    o("v", t`value`, "5.001", "value"),
    o("e", t`status`, "1.001", "status", true),
    o("ev", t`value status`, "5.001", "valueStatus", true),
    ...(dali ? [o("err", t`fault`, "1.005", "error", true)] : []),
  ];
}

function dimmer(dali: boolean): Snippet {
  return {
    id: dali ? "dali" : "dim",
    get label() {
      return dali ? t`DALI gateway (2 groups)` : t`Dimmer`;
    },
    get hint() {
      return dali
        ? t`Two DALI groups (ballasts A0–A1 and A2–A3): switching, dimming, value, status and fault per group; fill in the group addresses.`
        : t`One dimmable output: switching, dimming, value and status; fill in the group addresses.`;
    },
    apply(input, ctx = {}) {
      const doc = ensureBase(input);
      const groups = dali
        ? [
            { id: "g1", label: t`Group 1`, first: 0 },
            { id: "g2", label: t`Group 2`, first: 2 },
          ]
        : [{ id: "s1", label: "L1", first: 0 }];
      return {
        ...doc,
        devices: [
          ...doc.devices!,
          {
            id: freeId(doc, dali ? "dali" : "dimmerActuator"),
            name: dali ? t`DALI gateway` : t`Dimmer`,
            address: freeAddress(doc, ctx.line),
            kind: dali ? "daliGateway" : "dimmerActuator",
            behavior: dali ? "daliGateway/v1" : "dimmerActuator/v1",
            objects: groups.flatMap((g) => dimObjects(g.id, g.label, dali)),
            channels: groups.map((g) => ({
              id: g.id,
              label: g.label,
              equipment: dali
                ? {
                    type: "daliGroup",
                    parameters: { ballasts: 2, firstAddress: g.first },
                  }
                : { type: "dimmableLamp" },
            })),
          },
        ],
      };
    },
  };
}

/** First room, created on demand ("Room 1") for a sensor or radiator. */
function withRoom(doc: Doc): { doc: Doc; room: string } {
  const rooms = (Array.isArray(doc.rooms) ? doc.rooms : []) as Json[];
  if (rooms.length) return { doc, room: String(rooms[0]!.id) };
  return {
    doc: { ...doc, rooms: [{ id: "room1", name: t`Room 1` }] },
    room: "room1",
  };
}

/** Room thermostat: temperature and control value on new addresses. */
const thermostat: Snippet = {
  id: "roomThermostat",
  get label() {
    return t`Room thermostat`;
  },
  get hint() {
    return t`PI control of its room: temperature (9.001), heating control value (5.001), mode (20.102), window and presence; link its objects to group addresses.`;
  },
  apply(input, ctx = {}) {
    const { doc, room } = withRoom(ensureBase(input));
    const o = (
      id: string,
      name: string,
      ga: string | string[],
      dpt: string,
      port: string,
      out: boolean,
    ) => ({ id, name, ga, dpt, port, flags: flags(!out, out) });
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "roomThermostat"),
          name: t`Room thermostat`,
          address: freeAddress(doc, ctx.line),
          kind: "thermostat",
          behavior: "roomThermostat/v1",
          room,
          objects: [
            o("temp", t`Measured temperature`, [], "9.001", "actualTemp", true),
            o("base", t`Base setpoint`, [], "9.001", "baseSetpoint", false),
            o("mode", t`Mode (preset)`, [], "20.102", "hvacMode", false),
            {
              ...o("presence", t`Presence`, [], "1.018", "presence", false),
              flags: flags(true, true),
            },
            o("win", t`Window`, [], "1.019", "window", false),
            o(
              "val",
              t`Heating control value`,
              [],
              "5.001",
              "heatingValue",
              true,
            ),
          ],
          buttons: [
            {
              id: "presence",
              label: t`Presence`,
              icon: "presence",
              press: { object: "presence", value: "toggle" },
              led: "presence",
            },
          ],
        },
      ],
    };
  },
};

/** Heating actuator 2 outputs, each with its radiator in the first room. */
const heatingActuator: Snippet = {
  id: "heatingActuator",
  get label() {
    return t`Heating actuator, 2 outputs`;
  },
  get hint() {
    return t`Electrothermal valves driven by PWM from a 5.001 control value; fill in the group addresses.`;
  },
  apply(input, ctx = {}) {
    const { doc, room } = withRoom(ensureBase(input));
    const chans = ["h1", "h2"];
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "heatingActuator"),
          name: t`Heating actuator`,
          address: freeAddress(doc, ctx.line),
          kind: "heatingActuator",
          behavior: "heatingActuator/v1",
          objects: chans.flatMap((c, i) => [
            {
              id: `${c}v`,
              name: t`H${i + 1} control value`,
              ga: [],
              dpt: "5.001",
              port: "value",
              channel: c,
              flags: flags(true, false),
            },
            {
              id: `${c}s`,
              name: t`H${i + 1} control value status`,
              ga: [],
              dpt: "5.001",
              port: "valueStatus",
              channel: c,
              flags: flags(false, true),
            },
          ]),
          channels: chans.map((c, i) => ({
            id: c,
            label: `H${i + 1}`,
            equipment: { type: "radiator", room },
          })),
        },
      ],
    };
  },
};

/** Window contact (binary entry) of the first room, on a new address. */
const windowContact: Snippet = {
  id: "windowContact",
  get label() {
    return t`Window contact`;
  },
  get hint() {
    return t`Sends its room's window opening (1.019); link it to the address of the thermostat's “Window” object.`;
  },
  apply(input, ctx = {}) {
    const { doc, room } = withRoom(ensureBase(input));
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "windowContact"),
          name: t`Window contact`,
          address: freeAddress(doc, ctx.line),
          kind: "binaryInput",
          behavior: "windowContact/v1",
          room,
          objects: [
            {
              id: "c",
              name: t`Window`,
              ga: [],
              dpt: "1.019",
              port: "contact",
              flags: flags(false, true),
            },
          ],
        },
      ],
    };
  },
};

/** Temperature probe of the first room, on a new address 9.001. */
const temperatureSensor: Snippet = {
  id: "temperatureSensor",
  get label() {
    return t`Temperature sensor`;
  },
  get hint() {
    return t`Sends its room's temperature (9.001); link it for instance to the address of a thermostat's “External temperature” object.`;
  },
  apply(input, ctx = {}) {
    const { doc, room } = withRoom(ensureBase(input));
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "temperatureSensor"),
          name: t`Temperature sensor`,
          address: freeAddress(doc, ctx.line),
          kind: "sensor",
          behavior: "temperatureSensor/v1",
          room,
          objects: [
            {
              id: "t",
              name: t`Temperature`,
              ga: [],
              dpt: "9.001",
              port: "temperature",
              flags: flags(false, true),
            },
          ],
        },
      ],
    };
  },
};

/** Independent energy meter: one measured circuit with power, energy, and an input. */
const energyMeter: Snippet = {
  id: "energyMeter",
  get label() {
    return t`Energy meter`;
  },
  get hint() {
    return t`Measures a circuit that it does not switch (heat pump, water heater, sockets): power (14.056) and energy (13.010); the measured power is entered on the device.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "energyMeter"),
          name: t`Energy meter`,
          address: freeAddress(doc, ctx.line),
          kind: "energyMeter",
          behavior: "energyMeter/v1",
          objects: [
            {
              id: "p1",
              name: t`Power`,
              ga: [],
              dpt: "14.056",
              port: "power",
              channel: "c1",
              flags: flags(false, true),
            },
            {
              id: "e1",
              name: t`Energy`,
              ga: [],
              dpt: "13.010",
              port: "energy",
              channel: "c1",
              flags: flags(false, true),
            },
          ],
          inputs: [
            {
              id: "p1",
              type: "number",
              label: t`Power (W)`,
              object: "p1",
              min: 0,
              max: 10000,
              step: 100,
            },
          ],
          channels: [
            { id: "c1", label: t`Circuit 1`, initialState: { powerW: 1000 } },
          ],
        },
      ],
    };
  },
};

/** Gateway to another building system: one value from it, one command to it. */
const systemGateway: Snippet = {
  id: "systemGateway",
  get label() {
    return t`Gateway to another system`;
  },
  get hint() {
    return t`Boundary with Modbus, BACnet, or M-Bus: a value from the other system (9.001) is entered and sent on KNX; a command (1.001) is received and forwarded. The other system is not simulated.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "gateway"),
          name: t`Gateway to another system`,
          address: freeAddress(doc, ctx.line),
          kind: "gateway",
          behavior: "systemGateway/v1",
          parameters: { system: "Modbus" },
          objects: [
            {
              id: "v1",
              name: t`Value from the other system`,
              ga: [],
              dpt: "9.001",
              port: "value",
              flags: flags(false, true),
            },
            {
              id: "c1",
              name: t`Command to the other system`,
              ga: [],
              dpt: "1.001",
              port: "command",
              flags: flags(true, false),
            },
          ],
          inputs: [
            {
              id: "v1",
              type: "number",
              label: t`Value`,
              object: "v1",
              min: 0,
              max: 100,
              step: 1,
            },
          ],
        },
      ],
    };
  },
};

/** Weather station: wind and brightness measurements with threshold outputs. */
const weatherStation: Snippet = {
  id: "weatherStation",
  get label() {
    return t`Weather station`;
  },
  get hint() {
    return t`Wind speed (9.005) and brightness (9.004) entered on the device, wind alarm (1.005) and sun protection (1.001) outputs.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "weatherStation"),
          name: t`Weather station`,
          address: freeAddress(doc, ctx.line),
          kind: "weatherStation",
          behavior: "weatherStation/v1",
          objects: [
            {
              id: "wind",
              name: t`Wind speed`,
              ga: [],
              dpt: "9.005",
              port: "wind",
              flags: flags(false, true),
            },
            {
              id: "brightness",
              name: t`Brightness`,
              ga: [],
              dpt: "9.004",
              port: "brightness",
              flags: flags(false, true),
            },
            {
              id: "windAlarm",
              name: t`Wind alarm`,
              ga: [],
              dpt: "1.005",
              port: "windAlarm",
              flags: flags(false, true),
            },
            {
              id: "sun",
              name: t`Sun protection`,
              ga: [],
              dpt: "1.001",
              port: "sunProtection",
              flags: flags(false, true),
            },
          ],
          inputs: [
            {
              id: "wind",
              type: "number",
              label: t`Wind (m/s)`,
              object: "wind",
              min: 0,
              max: 40,
              step: 1,
            },
            {
              id: "brightness",
              type: "number",
              label: t`Brightness (lx)`,
              object: "brightness",
              min: 0,
              max: 100000,
              step: 5000,
            },
          ],
        },
      ],
    };
  },
};

/** Air quality sensor: temperature, humidity, CO₂, CO₂ alarm, and ventilation value. */
const airQualitySensor: Snippet = {
  id: "airQualitySensor",
  get label() {
    return t`Air quality sensor`;
  },
  get hint() {
    return t`Temperature (9.001), humidity (9.007), and CO₂ (9.008) entered on the device; CO₂ alarm (1.005) and ventilation control value (5.001).`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    const obj = (id: string, name: string, dpt: string, port: string) => ({
      id,
      name,
      ga: [],
      dpt,
      port,
      flags: flags(false, true),
    });
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "airSensor"),
          name: t`Air quality sensor`,
          address: freeAddress(doc, ctx.line),
          kind: "sensor",
          behavior: "airQualitySensor/v1",
          objects: [
            obj("temp", t`Temperature`, "9.001", "temperature"),
            obj("hum", t`Relative humidity`, "9.007", "humidity"),
            obj("co2", t`CO₂`, "9.008", "co2"),
            obj("co2Alarm", t`CO₂ alarm`, "1.005", "co2Alarm"),
            obj("vent", t`Ventilation control value`, "5.001", "ventilation"),
          ],
          inputs: [
            {
              id: "temp",
              type: "number",
              label: t`Temperature (°C)`,
              object: "temp",
              min: 10,
              max: 35,
              step: 0.5,
            },
            {
              id: "hum",
              type: "number",
              label: t`Humidity (%)`,
              object: "hum",
              min: 0,
              max: 100,
              step: 5,
            },
            {
              id: "co2",
              type: "number",
              label: t`CO₂ (ppm)`,
              object: "co2",
              min: 400,
              max: 3000,
              step: 100,
            },
          ],
        },
      ],
    };
  },
};

/** Simulated clock added when a time device needs one. */
const DEFAULT_CLOCK = { start: "2026-01-05T06:55:00", speed: 60 };

/** Clock master: time of day and date on new addresses; adds a simulated clock if needed. */
const clockMaster: Snippet = {
  id: "clockMaster",
  get label() {
    return t`Clock master`;
  },
  get hint() {
    return t`Sends the time (10.001) and the date (11.001) of the simulated clock; adds a clock to the scenario if it has none.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    const flagsR = { W: false, T: true, R: true };
    return {
      ...doc,
      clock: doc.clock ?? { ...DEFAULT_CLOCK },
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "clock"),
          name: t`Clock master`,
          address: freeAddress(doc, ctx.line),
          kind: "clock",
          behavior: "clockMaster/v1",
          objects: [
            {
              id: "time",
              name: t`Time of day`,
              ga: [],
              dpt: "10.001",
              port: "time",
              flags: flagsR,
            },
            {
              id: "date",
              name: t`Date`,
              ga: [],
              dpt: "11.001",
              port: "date",
              flags: flagsR,
            },
          ],
        },
      ],
    };
  },
};

/** Weekly time switch: one output on a new address; adds a simulated clock if needed. */
const timeSwitchSnippet: Snippet = {
  id: "timeSwitch",
  get label() {
    return t`Weekly time switch`;
  },
  get hint() {
    return t`Sends 1 at 07:00 and 0 at 22:00 every day; edit the program and link the output.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    return {
      ...doc,
      clock: doc.clock ?? { ...DEFAULT_CLOCK },
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "timeSwitch"),
          name: t`Weekly time switch`,
          address: freeAddress(doc, ctx.line),
          kind: "timeSwitch",
          behavior: "timeSwitch/v1",
          parameters: { program: "Daily 07:00 = 1; Daily 22:00 = 0" },
          objects: [
            {
              id: "out",
              name: t`Programmed output`,
              ga: [],
              dpt: "1.001",
              port: "output",
              flags: flags(false, true),
            },
          ],
        },
      ],
    };
  },
};

/** Logic module: two one-bit inputs and one output on new addresses. */
const logicModule: Snippet = {
  id: "logicModule",
  get label() {
    return t`Logic module`;
  },
  get hint() {
    return t`AND of two one-bit inputs sent on a new output address; change the operation and link the inputs.`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "logicModule"),
          name: t`Logic module`,
          address: freeAddress(doc, ctx.line),
          kind: "logicModule",
          behavior: "logicGate/v1",
          parameters: { operation: "and" },
          objects: [
            {
              id: "in1",
              name: t`Logic input 1`,
              ga: [],
              dpt: "1.001",
              port: "logicIn",
              flags: flags(true, false),
            },
            {
              id: "in2",
              name: t`Logic input 2`,
              ga: [],
              dpt: "1.001",
              port: "logicIn",
              flags: flags(true, false),
            },
            {
              id: "out",
              name: t`Logic output`,
              ga: [],
              dpt: "1.001",
              port: "logicOut",
              flags: flags(false, true),
            },
          ],
        },
      ],
    };
  },
};

export const SNIPPETS: Snippet[] = [
  buttonInterface,
  switchActuator(4),
  switchActuator(6),
  dimmer(false),
  dimmer(true),
  thermostat,
  heatingActuator,
  windowContact,
  temperatureSensor,
  weatherStation,
  airQualitySensor,
  energyMeter,
  systemGateway,
  logicModule,
  clockMaster,
  timeSwitchSnippet,
  {
    id: "shutterActuator",
    get label() {
      return t`Shutter actuator`;
    },
    get hint() {
      return t`Up/down, stop/step, setpoint and position feedback; link them to group addresses.`;
    },
    apply(input, ctx = {}) {
      const doc = ensureBase(input);
      return {
        ...doc,
        devices: [
          ...doc.devices!,
          {
            id: freeId(doc, "shutterActuator"),
            name: t`Shutter actuator`,
            address: freeAddress(doc, ctx.line),
            kind: "shutterActuator",
            behavior: "shutterActuator/v1",
            objects: [
              {
                id: "move",
                name: t`Up/down`,
                ga: [],
                dpt: "1.008",
                port: "move",
                channel: "s1",
                flags: flags(true, false),
              },
              {
                id: "stop",
                name: t`Stop/step`,
                ga: [],
                dpt: "1.007",
                port: "stopStep",
                channel: "s1",
                flags: flags(true, false),
              },
              {
                id: "target",
                name: t`Requested position`,
                ga: [],
                dpt: "5.001",
                port: "positionCommand",
                channel: "s1",
                flags: flags(true, false),
              },
              {
                id: "status",
                name: t`Estimated position`,
                ga: [],
                dpt: "5.001",
                port: "positionStatus",
                channel: "s1",
                flags: flags(false, true),
              },
            ],
            channels: [
              {
                id: "s1",
                label: t`Shutter`,
                parameters: { estimatedTravelTimeMs: 20000 },
                equipment: {
                  type: "shutter",
                  parameters: { actualTravelTimeMs: 20000 },
                },
              },
            ],
          },
        ],
      };
    },
  },
  {
    id: "pir",
    get label() {
      return t`Presence detector`;
    },
    get hint() {
      return t`A “Passage” key: 1 on detection, 0 after the hold time (10 s).`;
    },
    apply(input, ctx = {}) {
      const doc = ensureBase(input);
      return {
        ...doc,
        devices: [
          ...doc.devices!,
          {
            id: freeId(doc, "pir"),
            name: t`Presence detector`,
            address: freeAddress(doc, ctx.line),
            kind: "sensor",
            behavior: "presenceDetector/v1",
            objects: [
              {
                id: "p",
                name: t`Presence`,
                ga: [],
                dpt: "1.001",
                port: "input",
                flags: flags(false, true),
              },
            ],
            buttons: [
              {
                id: "motion",
                label: t`Passage`,
                icon: "presence",
                press: { object: "p", value: 1 },
              },
            ],
          },
        ],
      };
    },
  },
  {
    id: "sup",
    get label() {
      return t`IP supervisor`;
    },
    get hint() {
      return t`Display on the IP network; adds the KNXnet/IP routers if missing.`;
    },
    apply(input, ctx = {}) {
      const doc = ensureBase(input);
      void ctx;
      const topology = (doc.topology ?? {}) as Json;
      return {
        ...doc,
        // KNXnet/IP routers used as line couplers for one line, or area couplers otherwise.
        ...(doc.ipRouter || topology.ip
          ? {}
          : {
              topology: {
                ...topology,
                ip:
                  doc.lines!.length === 1 &&
                  !topology.backbone &&
                  !topology.mainLines
                    ? "lineCouplers"
                    : "areaCouplers",
              },
            }),
        devices: [
          ...doc.devices!,
          {
            id: freeId(doc, "sup"),
            name: t`Supervisor`,
            kind: "supervisor",
            behavior: "display/v1",
            objects: [],
          },
        ],
      };
    },
  },
  {
    id: "usbInterface",
    get label() {
      return t`USB interface`;
    },
    get hint() {
      return t`Access to the bus through a USB interface: write and read group addresses from the USB interface panel of the diagram.`;
    },
    apply(input, ctx = {}) {
      const doc = ensureBase(input);
      const line = ctx.line ?? String(doc.lines![0]!.address);
      // Usual address of an interface: Z.L.255, otherwise the first free.
      const first = freeAddress(doc, line); // also check that the line exists
      const address = usedAddresses(doc).has(`${line}.255`)
        ? first
        : `${line}.255`;
      return {
        ...doc,
        devices: [
          ...doc.devices!,
          {
            id: freeId(doc, "usbInterface"),
            name: t`USB interface`,
            address,
            kind: "interface",
            behavior: "usbInterface/v1",
            objects: [],
          },
        ],
      };
    },
  },
  {
    id: "ga",
    get label() {
      return t`Group address`;
    },
    get hint() {
      return t`Declares the next free address 1/1/x (name and DPT to fill in).`;
    },
    apply(input) {
      const doc = ensureBase(input);
      return {
        ...doc,
      };
    },
  },
  {
    id: "line",
    get label() {
      return t`Line`;
    },
    get hint() {
      return t`Adds the next line of the area: couplers and main line appear.`;
    },
    apply(input, ctx = {}) {
      const doc = ensureBase(input);
      const used = new Set(doc.lines!.map((l) => String(l.address)));
      const area = String(ctx.line ?? doc.lines![0]!.address).split(".")[0];
      let n = 1;
      while (n <= 15 && used.has(`${area}.${n}`)) n++;
      if (n > 15)
        throw new SnippetRefusal(t`area ${area} already has its 15 lines`);
      return {
        ...doc,
        lines: [
          ...doc.lines!,
          {
            address: `${area}.${n}`,
            name: t`Line ${area}.${n}`,
            powerSupply: { currentMa: 640 },
          },
        ],
      };
    },
  },
];
