// Scenario format (JSON provided by author), validation and standardized model.
// Input format 2 (`"formatVersion": 2`) and the internal model built from it.
import { defaultInitial, defaultRead, defaultUpdate } from "./ports";
import {
  compareAddress,
  isBroadcastGA,
  parseGA,
  parseIA,
  parseLine,
} from "./address";
import type {
  BehaviorDefinition,
  ButtonInfo,
  ChannelInfo,
  DeviceInfo,
  JsonObject,
  NumberInputInfo,
  ObjectFlags,
  Priority,
  ObjectInfo,
} from "./contracts";
import {
  checkValue,
  dptBits,
  dptInfo,
  isRepresentableDpt,
  isSupportedDpt,
  canonical,
} from "./dpt";
import type { Problem } from "./params";
import { validateParams } from "./params";
import type { Translate } from "../i18n";
import { en } from "../i18n";
import type { Registry } from "./registry";
import { captureRegistry } from "./registry";

export { parseGA, parseIA } from "./address";
export type { Problem } from "./params";

// ── Validated model ──

export type ButtonIcon =
  | "on"
  | "off"
  | "toggle"
  | "up"
  | "down"
  | "updown"
  | "scene"
  | "presence"
  | "clock"
  | "dimUp"
  | "dimDown";

export interface GroupAddress {
  address: string;
  name: string;
  dpt: string;
}

export interface EquipmentConfig {
  type: string;
  /** Name of the load ("Ceiling light"), or null. */
  name: string | null;
  /** Graphic view (default: type). */
  view: string;
  /** Room heated or cooled by this equipment, or null. */
  room: string | null;
  parameters: JsonObject;
  initialState: JsonObject;
}

export interface Channel extends ChannelInfo {
  /** Loads connected to the output, in order; they all receive its commands. */
  equipmentConfigs: EquipmentConfig[];
  /**
   * Text written on the push-button wired to a contact input, drawn on its key; the
   * label of the channel (the input) stays as it is. Null: the key shows the label.
   */
  keyLabel: string | null;
}

export interface KnxObject extends ObjectInfo {
  priority: Priority;
  /** Key `deviceId/objectId`. */
  key: string;
  deviceId: string;
  gas: string[];
  flags: ObjectFlags;
  initial: number | null;
  /** Class of the telegrams it sends, declared by its port. */
  telegram: "command" | "state";
  /** Drawn as driving the loads of its channel, declared by its port. */
  drivesLoad: boolean;
}

export interface Button extends ButtonInfo {
  index: number;
  icon: ButtonIcon;
}

export interface NumberInput extends NumberInputInfo {
  index: number;
}

export interface Device extends DeviceInfo {
  medium: "TP" | "IP";
  line: string | null;
  downstream: boolean;
  /**
   * Included in the project filter tables. False for visualization
   * declared without a dummy device: its addresses are excluded from filter tables.
   */
  inFilterTables: boolean;
  /** Group addresses assigned to the device in the project without an object (bus interface). */
  tableGAs: string[];
  description: string;
  /** Receiver device: group-address column on the left side of its card. */
  receiver: boolean;
  /** Presentation declared by its behavior. */
  presentation: {
    screen: readonly string[] | null;
    supervisor: boolean;
    busInterface: boolean;
    remoteSystem: boolean;
    metered: readonly string[];
  };
  objects: KnxObject[];
  buttons: Button[];
  inputs: NumberInput[];
  channels: Channel[];
}

/** Bus power supply of a segment (with its choke), shown on the diagram. */
export interface PowerSupply {
  name: string;
  /** Rated current in mA, or null when not given. */
  currentMa: number | null;
}

export interface Line {
  address: string;
  area: number;
  line: number;
  name: string;
  powerSupply: PowerSupply | null;
  extension: {
    address: string;
    mode: "repeater" | "segmentCoupler";
    switchable: boolean;
    powerSupply: PowerSupply | null;
  } | null;
}

/** Role of KNXnet/IP routers: instead of area couplers or line couplers. */
export type IpRole = "areaCouplers" | "lineCouplers";
/** Parameter "group telegrams" of a coupler, for a sense. */
export type GroupRouting = "filter" | "route" | "block";

export interface CouplerSettings {
  /** Primary line → secondary line (downstream). */
  down: GroupRouting;
  /** Secondary line → primary line (upstream). */
  up: GroupRouting;
  name: string;
}

/**
 * Resolved topology: what levels exist (backbone, main lines, IP network) and
 * The couplers themselves are deducing themselves from these levels.
 */
export interface TopologyConfig {
  /** Role of KNXnet/IP routers; null without IP network. */
  ip: IpRole | null;
  /** TP backbone (line 0.0) and TP area couplers. */
  backbone: boolean;
  /** Areas with a TP main line (A.0). */
  mainLines: number[];
  /** Author values, to rewrite the JSON. */
  forced: { backbone: boolean; mainLines: boolean };
  /** Areas of installation (reduce lines), with their name. */
  areas: { address: number; name: string }[];
  /** Explicit coupler settings, by individual address. */
  couplers: Map<string, CouplerSettings>;
  /** Names of KNXnet/IP routers. */
  routerName: string;
}

/** Coin: first-order thermal model, shared by its sensors and transmitters. */
export interface Room {
  id: string;
  name: string;
  /** Ambient temperature at departure, °C. */
  temperatureC: number;
  outsideTemperatureC: number;
  windowOpen: boolean;
  /** Loss time constant, window closed (simulated time, ms). */
  timeConstantMs: number;
}

export interface Scenario {
  formatVersion: 2;
  title: string;
  description: string;
  lines: Line[];
  rooms: Room[];
  /** Simulated clock: wall-clock time at simulation start and acceleration; null without a clock. */
  clock: ClockConfig | null;
  topology: TopologyConfig;
  groupAddresses: Map<string, GroupAddress>;
  /** Names of main groups ("1") and middle groups ("1/2"), as in the group address tree. */
  groupRanges: Map<string, string>;
  devices: Device[];
  devicesById: Map<string, Device>;
  options: { speed: number; filterTables: boolean };
}

export interface ClockConfig {
  /** Start as written in the scenario (local time, no time zone). */
  start: string;
  /** Start as milliseconds since 1970-01-01, reading the local time as UTC fields. */
  startMs: number;
  /** Clock seconds per simulated second. */
  speed: number;
}

/** "YYYY-MM-DDTHH:MM[:SS]" → milliseconds, using UTC fields for a time-zone-free clock. */
export function parseClockStart(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (!m) return null;
  const [y, mo, d, h, mi, se] = m
    .slice(1)
    .map((x) => Number(x ?? 0)) as number[];
  const ms = Date.UTC(y!, mo! - 1, d!, h!, mi!, se ?? 0);
  const back = new Date(ms);
  return back.getUTCMonth() === mo! - 1 &&
    back.getUTCDate() === d! &&
    h! < 24 &&
    mi! < 60 &&
    (se ?? 0) < 60
    ? ms
    : null;
}

export class ScenarioError extends Error {
  readonly problems: string[];
  constructor(readonly details: Problem[]) {
    const problems = details.map((p) =>
      p.path ? `${p.path} : ${p.message}` : p.message,
    );
    super(problems.join("\n"));
    this.name = "ScenarioError";
    this.problems = problems;
  }
}

const ID_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;

const ICONS: ButtonIcon[] = [
  "on",
  "off",
  "toggle",
  "up",
  "down",
  "updown",
  "scene",
  "presence",
  "clock",
  "dimUp",
  "dimDown",
];

const ROOT_V2 = [
  "$schema",
  "formatVersion",
  "title",
  "description",
  "lines",
  "devices",
  "groupAddresses",
  "groupRanges",
  "ipRouter",
  "topology",
  "rooms",
  "clock",
  "options",
];
const ROOM_KEYS = [
  "id",
  "name",
  "temperatureC",
  "outsideTemperatureC",
  "windowOpen",
  "timeConstantMs",
];
const TOPOLOGY_KEYS = ["backbone", "mainLines", "ip", "areas", "couplers"];
const AREA_KEYS = ["address", "name"];
const COUPLER_KEYS = ["address", "name", "down", "up"];
const ROUTING: GroupRouting[] = ["filter", "route", "block"];
const LINE_KEYS = ["address", "name", "extension", "powerSupply"];
const EXT_KEYS = ["address", "mode", "switchable", "powerSupply"];
const PSU_KEYS = ["name", "currentMa"];
const GA_KEYS = ["address", "name", "dpt"];
const DEVICE_V2 = [
  "id",
  "name",
  "address",
  "kind",
  "behavior",
  "parameters",
  "objects",
  "buttons",
  "inputs",
  "channels",
  "medium",
  "downstream",
  "description",
  "inFilterTables",
  "room",
];
const OBJECT_V2 = [
  "id",
  "name",
  "ga",
  "dpt",
  "port",
  "channel",
  "value",
  "flags",
  "priority",
];
const BUTTON_V2 = [
  "id",
  "label",
  "icon",
  "press",
  "short",
  "long",
  "release",
  "led",
];
const ACTION_KEYS = ["object", "value"];
const INPUT_V2 = ["id", "type", "label", "object", "min", "max", "step"];
const CHANNEL_V2 = [
  "id",
  "label",
  "keyLabel",
  "keyContact",
  "parameters",
  "initialState",
  "equipment",
  "scenes",
];
const EQUIP_V2 = ["type", "name", "view", "room", "parameters", "initialState"];
const OPTIONS_KEYS = ["speed", "filterTables"];

type Rec = Record<string, unknown>;
/** Own property of a dictionary: « toString » or « __proto__ » does not mean anything. */
const own = <T>(o: Readonly<Record<string, T>>, k: string): T | undefined =>
  Object.hasOwn(o, k) ? o[k] : undefined;
const isRecord = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// ── Construction ───────────────────────────────────────────────────────────

export function buildScenario(
  raw: unknown,
  registry: Registry = captureRegistry(),
  t: Translate = en,
): Scenario {
  const problems: Problem[] = [];
  const err = (path: string, code: string, message: string) =>
    problems.push({ path, code, message });

  if (!isRecord(raw))
    throw new ScenarioError([
      {
        path: "",
        code: "type",
        message: t`The scenario must be a JSON object.`,
      },
    ]);

  if (raw.formatVersion !== 2)
    throw new ScenarioError([
      raw.formatVersion === undefined
        ? {
            path: "formatVersion",
            code: "required",
            message: t`required: add "formatVersion": 2 at the root of the scenario`,
          }
        : {
            path: "formatVersion",
            code: "version",
            message: t`unknown format version “${String(raw.formatVersion)}” (supported version: 2)`,
          },
    ]);
  const unknownKeys = (obj: Rec, allowed: string[], path: string) => {
    Object.keys(obj).forEach((k) => {
      if (!allowed.includes(k))
        err(
          path ? `${path}.${k}` : k,
          "unknown-field",
          t`unknown field “${k}”`,
        );
    });
  };
  const str = (
    obj: Rec,
    key: string,
    path: string,
    required = false,
  ): string | undefined => {
    const v = obj[key];
    if (v === undefined) {
      if (required)
        err(`${path}.${key}`.replace(/^\./, ""), "required", t`required field`);
      return undefined;
    }
    if (typeof v !== "string") {
      err(`${path}.${key}`.replace(/^\./, ""), "type", t`text expected`);
      return undefined;
    }
    return v;
  };
  /** Non-empty ID, without "/": Composite keys (device/object) remain unique. */
  const ident = (
    obj: Rec,
    key: string,
    path: string,
    required = true,
  ): string | undefined => {
    const at = `${path}.${key}`.replace(/^\./, "");
    if (obj[key] === "") {
      err(at, "required", t`empty identifier`);
      return undefined;
    }
    const v = str(obj, key, path, required);
    if (v === undefined) return undefined;
    if (!ID_RE.test(v)) {
      err(
        at,
        "id",
        t`invalid identifier “${v}”: letters, digits, “_”, “-” or “.”, no space or “/”`,
      );
      return undefined;
    }
    return v;
  };
  /** Text required and not empty (port, behaviour, type of equipment, etc.). */
  const nonEmpty = (
    obj: Rec,
    key: string,
    path: string,
  ): string | undefined => {
    if (obj[key] === "") {
      err(`${path}.${key}`.replace(/^\./, ""), "required", t`empty value`);
      return undefined;
    }
    return str(obj, key, path, true);
  };
  const arr = (
    obj: Rec,
    key: string,
    path: string,
    required = false,
  ): unknown[] => {
    const v = obj[key];
    if (v === undefined) {
      if (required) err(`${path}${key}`, "required", t`list required`);
      return [];
    }
    if (!Array.isArray(v)) {
      err(`${path}${key}`, "type", t`list expected`);
      return [];
    }
    return v;
  };

  unknownKeys(raw, ROOT_V2, "");
  const title = str(raw, "title", "") ?? "";
  const description = str(raw, "description", "") ?? "";

  // ── Lines
  const lines: Line[] = [];
  const rawLines = arr(raw, "lines", "", true);
  if (Array.isArray(raw.lines) && rawLines.length === 0)
    err("lines", "required", t`at least one line is required`);
  rawLines.forEach((l, i) => {
    const p = `lines[${i}]`;
    if (!isRecord(l)) return err(p, "type", t`object expected`);
    unknownKeys(l, LINE_KEYS, p);
    const address = str(l, "address", p, true);
    if (address === undefined) return;
    const m = parseLine(address);
    if (!m)
      return err(
        `${p}.address`,
        "address",
        t`“${address}” is not a valid line address (e.g. 1.1, area and line 0–15)`,
      );
    if (m[0] === 0 && m[1] !== 0)
      return err(
        `${p}.address`,
        "address",
        t`lines 0.1 to 0.15, connected directly to the backbone, exist in KNX but are not supported by BusDiagram; use an area from 1 to 15`,
      );
    if (m[0] === 0 || m[1] === 0)
      return err(
        `${p}.address`,
        "address",
        t`${address} is not a line: Z.0 is the main line of area Z and 0.0 the backbone; they appear through “topology” (area and line 1–15)`,
      );
    if (lines.some((x) => x.address === address))
      return err(p, "duplicate", t`duplicate line ${address}`);
    // Power supply of a segment: an optional name and rated current.
    const psu = (v: unknown, at: string): PowerSupply | null => {
      if (v === undefined) return null;
      if (!isRecord(v)) {
        err(at, "type", t`object expected`);
        return null;
      }
      unknownKeys(v, PSU_KEYS, at);
      const c = v.currentMa;
      if (c !== undefined && (typeof c !== "number" || !(c > 0)))
        err(`${at}.currentMa`, "range", t`strictly positive number expected`);
      return {
        name: str(v, "name", at) ?? "",
        currentMa: typeof c === "number" && c > 0 ? c : null,
      };
    };
    const powerSupply = psu(l.powerSupply, `${p}.powerSupply`);
    let extension: Line["extension"] = null;
    if (l.extension !== undefined) {
      const e = l.extension;
      if (!isRecord(e)) err(`${p}.extension`, "type", t`object expected`);
      else {
        unknownKeys(e, EXT_KEYS, `${p}.extension`);
        const ea = str(e, "address", `${p}.extension`, true) ?? "";
        const ia = parseIA(ea);
        if (!ia)
          err(
            `${p}.extension.address`,
            "address",
            t`“${ea}” is not a valid individual address`,
          );
        else if (`${ia[0]}.${ia[1]}` !== address)
          err(
            `${p}.extension.address`,
            "address",
            t`extension ${ea} does not belong to line ${address}`,
          );
        else if (ia[2] === 0)
          err(
            `${p}.extension.address`,
            "address",
            t`${ea} is reserved for the line coupler; a line repeater or segment coupler uses a device number from 1 to 255, for example ${address}.64`,
          );
        if (
          e.mode !== undefined &&
          e.mode !== "repeater" &&
          e.mode !== "segmentCoupler"
        )
          err(
            `${p}.extension.mode`,
            "enum",
            t`“repeater” or “segmentCoupler” expected`,
          );
        if (e.switchable !== undefined && typeof e.switchable !== "boolean")
          err(`${p}.extension.switchable`, "type", t`boolean expected`);
        extension = {
          address: ea,
          mode: e.mode === "segmentCoupler" ? "segmentCoupler" : "repeater",
          switchable: e.switchable === true,
          powerSupply: psu(e.powerSupply, `${p}.extension.powerSupply`),
        };
      }
    }
    lines.push({
      address,
      area: m[0],
      line: m[1],
      name: str(l, "name", p) ?? "",
      powerSupply,
      extension,
    });
  });
  lines.sort((a, b) => a.area - b.area || a.line - b.line);

  // ── Topology: available levels, IP router roles, and coupler settings ──
  const areaIds = [...new Set(lines.map((l) => l.area))].sort((a, b) => a - b);
  const rawTopo = raw.topology;
  const topo: Rec = isRecord(rawTopo) ? rawTopo : {};
  if (rawTopo !== undefined && !isRecord(rawTopo))
    err("topology", "type", t`object expected`);
  else if (rawTopo !== undefined) unknownKeys(topo, TOPOLOGY_KEYS, "topology");
  const flag = (key: string) => {
    const v = topo[key];
    if (v !== undefined && typeof v !== "boolean")
      err(`topology.${key}`, "type", t`boolean expected`);
    return v === true;
  };
  const forcedBackbone = flag("backbone");
  const forcedMainLines = flag("mainLines");
  let ip: IpRole | null = null;
  if (topo.ip !== undefined) {
    if (topo.ip !== "areaCouplers" && topo.ip !== "lineCouplers")
      err("topology.ip", "enum", t`“areaCouplers” or “lineCouplers” expected`);
    else ip = topo.ip;
  }
  let routerName = t`KNX/IP router`;
  // Old writing: one router, above the highest level.
  let legacyRouter: { address: string; path: string } | null = null;
  if (raw.ipRouter !== undefined) {
    const r = raw.ipRouter;
    if (!isRecord(r)) err("ipRouter", "type", t`object expected`);
    else {
      unknownKeys(r, ["address", "name"], "ipRouter");
      const a = str(r, "address", "ipRouter", true) ?? "";
      if (!parseIA(a))
        err(
          "ipRouter.address",
          "address",
          t`“${a}” is not a valid individual address`,
        );
      routerName = str(r, "name", "ipRouter") ?? routerName;
      if (ip)
        err(
          "ipRouter",
          "conflict",
          t`“ipRouter” and “topology.ip” both describe the IP network: keep “topology.ip”`,
        );
      else {
        ip =
          lines.length === 1 && !forcedBackbone && !forcedMainLines
            ? "lineCouplers"
            : "areaCouplers";
        legacyRouter = { address: a, path: "ipRouter.address" };
      }
    }
  }
  if (ip === "lineCouplers" && (forcedBackbone || forcedMainLines))
    err(
      "topology.ip",
      "conflict",
      t`with IP routers as line couplers, the IP network acts as main lines and backbone: remove “backbone” and “mainLines”`,
    );
  const areaLevel =
    ip !== "lineCouplers" &&
    (areaIds.length > 1 || forcedBackbone || ip === "areaCouplers");
  const mainLines =
    ip === "lineCouplers"
      ? []
      : areaIds.filter(
          (a) =>
            areaLevel ||
            forcedMainLines ||
            lines.filter((l) => l.area === a).length > 1,
        );
  const tpBackbone = areaLevel && ip !== "areaCouplers";
  // Couplers deducted: address → description (for settings and address uniqueness).
  const couplerAddr = new Map<string, string>();
  mainLines.forEach((a) =>
    lines
      .filter((l) => l.area === a)
      .forEach((l) =>
        couplerAddr.set(`${l.address}.0`, t`line coupler ${l.address}`),
      ),
  );
  if (areaLevel)
    areaIds.forEach((a) =>
      couplerAddr.set(
        `${a}.0.0`,
        ip === "areaCouplers"
          ? t`KNXnet/IP router of area ${a}`
          : t`area coupler ${a}`,
      ),
    );
  if (ip === "lineCouplers")
    lines.forEach((l) =>
      couplerAddr.set(
        `${l.address}.0`,
        t`KNXnet/IP router of line ${l.address}`,
      ),
    );
  if (legacyRouter && parseIA(legacyRouter.address)) {
    const expected =
      ip === "lineCouplers"
        ? [`${lines[0]?.address}.0`]
        : areaIds.map((a) => `${a}.0.0`);
    if (expected.length > 1)
      err(
        legacyRouter.path,
        "address",
        t`several areas: one KNXnet/IP router per area (${expected.join(", ")}); write “topology”: { "ip": "areaCouplers" } instead of “ipRouter”`,
      );
    else if (expected[0] !== legacyRouter.address)
      err(
        legacyRouter.path,
        "address",
        t`a KNXnet/IP router is a coupler: its address is ${expected[0]} (Z.L.0 for a line, Z.0.0 for an area)`,
      );
  }

  const areaNames = new Map<number, string>();
  arr(topo, "areas", "topology.").forEach((z, i) => {
    const p = `topology.areas[${i}]`;
    if (!isRecord(z)) return err(p, "type", t`object expected`);
    unknownKeys(z, AREA_KEYS, p);
    const a = z.address;
    if (typeof a !== "number" || !Number.isInteger(a) || a < 1 || a > 15)
      return err(`${p}.address`, "range", t`area number 1–15 expected`);
    if (!areaIds.includes(a))
      return err(
        `${p}.address`,
        "reference",
        t`area ${a} has no declared line`,
      );
    if (areaNames.has(a))
      return err(`${p}.address`, "duplicate", t`duplicate area ${a}`);
    areaNames.set(a, str(z, "name", p) ?? "");
  });

  const couplerSettings = new Map<string, CouplerSettings>();
  arr(topo, "couplers", "topology.").forEach((c, i) => {
    const p = `topology.couplers[${i}]`;
    if (!isRecord(c)) return err(p, "type", t`object expected`);
    unknownKeys(c, COUPLER_KEYS, p);
    const a = str(c, "address", p, true);
    if (a === undefined) return;
    if (!couplerAddr.has(a))
      return err(
        `${p}.address`,
        "reference",
        t`no coupler at ${a} (couplers of this installation: ${[...couplerAddr.keys()].join(", ") || t`none`})`,
      );
    if (couplerSettings.has(a))
      return err(`${p}.address`, "duplicate", t`duplicate coupler ${a}`);
    const dir = (key: "down" | "up"): GroupRouting => {
      const v = c[key];
      if (v === undefined) return "filter";
      if (!ROUTING.includes(v as GroupRouting)) {
        err(`${p}.${key}`, "enum", t`“filter”, “route” or “block” expected`);
        return "filter";
      }
      return v as GroupRouting;
    };
    couplerSettings.set(a, {
      down: dir("down"),
      up: dir("up"),
      name: str(c, "name", p) ?? "",
    });
  });

  const topology: TopologyConfig = {
    ip,
    backbone: tpBackbone,
    mainLines,
    forced: { backbone: forcedBackbone, mainLines: forcedMainLines },
    areas: areaIds.map((a) => ({ address: a, name: areaNames.get(a) ?? "" })),
    couplers: couplerSettings,
    routerName,
  };

  // ── Rooms (thermal model) ──
  const rooms: Room[] = [];
  arr(raw, "rooms", "").forEach((r, i) => {
    const p = `rooms[${i}]`;
    if (!isRecord(r)) return err(p, "type", t`object expected`);
    unknownKeys(r, ROOM_KEYS, p);
    const id = ident(r, "id", p);
    if (!id) return;
    if (rooms.some((x) => x.id === id))
      return err(`${p}.id`, "duplicate", t`duplicate room “${id}”`);
    const num = (k: string, def: number, min: number, max: number) => {
      const v = r[k];
      if (v === undefined) return def;
      if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
        err(`${p}.${k}`, "range", t`number ${min}…${max} expected`);
        return def;
      }
      return v;
    };
    if (r.windowOpen !== undefined && typeof r.windowOpen !== "boolean")
      err(`${p}.windowOpen`, "type", t`boolean expected`);
    const tau = num("timeConstantMs", 300_000, 1000, 86_400_000);
    if (!Number.isInteger(tau))
      err(`${p}.timeConstantMs`, "type", t`integer expected`);
    rooms.push({
      id,
      name: str(r, "name", p) ?? id,
      temperatureC: num("temperatureC", 20, -30, 60),
      outsideTemperatureC: num("outsideTemperatureC", 5, -30, 50),
      windowOpen: r.windowOpen === true,
      timeConstantMs: Math.round(tau),
    });
  });
  // ── Simulated clock ──
  let clock: ClockConfig | null = null;
  if (raw.clock !== undefined) {
    const c = raw.clock;
    if (!isRecord(c)) err("clock", "type", t`object expected`);
    else {
      unknownKeys(c, ["start", "speed"], "clock");
      const start = str(c, "start", "clock", true);
      const startMs = start === undefined ? null : parseClockStart(start);
      if (start !== undefined && startMs === null)
        err(
          "clock.start",
          "format",
          t`“${start}” is not a local date and time (YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS)`,
        );
      const speed = c.speed === undefined ? 1 : c.speed;
      if (
        typeof speed !== "number" ||
        !Number.isFinite(speed) ||
        speed <= 0 ||
        speed > 3600
      )
        err("clock.speed", "range", t`number > 0 and ≤ 3600 expected`);
      else if (start !== undefined && startMs !== null)
        clock = { start, startMs, speed };
    }
  }

  /** Reference to a declared room; null if absent. */
  const roomRef = (obj: Rec, path: string): string | null => {
    if (obj.room === undefined || obj.room === null) return null;
    if (typeof obj.room !== "string" || !rooms.some((r) => r.id === obj.room)) {
      err(
        `${path}.room`,
        "unknown-room",
        t`unknown room “${String(obj.room)}” (declared rooms: ${rooms.map((r) => r.id).join(", ") || t`none`})`,
      );
      return null;
    }
    return obj.room;
  };

  // ── Declared group addresses ──
  const groupAddresses = new Map<string, GroupAddress>();
  arr(raw, "groupAddresses", "").forEach((g, i) => {
    const p = `groupAddresses[${i}]`;
    if (!isRecord(g)) return err(p, "type", t`object expected`);
    unknownKeys(g, GA_KEYS, p);
    const address = str(g, "address", p, true);
    if (address === undefined) return;
    if (!parseGA(address))
      return err(
        `${p}.address`,
        "address",
        t`“${address}” is not a valid 3-level group address (0–31/0–7/0–255)`,
      );
    if (isBroadcastGA(address))
      return err(
        `${p}.address`,
        "address",
        t`0/0/0 is the broadcast address and cannot be used as a group address`,
      );
    if (groupAddresses.has(address))
      return err(p, "duplicate", t`duplicate group address ${address}`);
    if (g.dpt === "")
      err(`${p}.dpt`, "dpt", t`empty DPT (remove the field or write a DPT)`);
    const dpt = str(g, "dpt", p) ?? "";
    // A declared DPT may be one that is shown but not simulated (known size).
    if (dpt && !isRepresentableDpt(dpt))
      err(`${p}.dpt`, "dpt", t`DPT “${dpt}” not supported`);
    groupAddresses.set(address, {
      address,
      name: str(g, "name", p) ?? "",
      dpt,
    });
  });

  // Names of main and middle groups: "M" (0–31) or "M/m" (middle 0–7).
  const groupRanges = new Map<string, string>();
  arr(raw, "groupRanges", "").forEach((r, i) => {
    const p = `groupRanges[${i}]`;
    if (!isRecord(r)) return err(p, "type", t`object expected`);
    unknownKeys(r, ["address", "name"], p);
    const address = str(r, "address", p, true);
    const name = str(r, "name", p, true);
    if (address === undefined || name === undefined) return;
    const m = /^(\d{1,2})(?:\/(\d))?$/.exec(address);
    if (!m || Number(m[1]) > 31 || (m[2] !== undefined && Number(m[2]) > 7))
      return err(
        `${p}.address`,
        "address",
        t`“${address}” is not a main group (0–31) or a middle group (0–31/0–7)`,
      );
    if (groupRanges.has(address))
      return err(p, "duplicate", t`duplicate group range ${address}`);
    groupRanges.set(address, name);
  });

  // ── Participants
  const devices: Device[] = [];
  const devicesById = new Map<string, Device>();
  const usedIA = new Map<string, string>();
  couplerAddr.forEach((what, a) => usedIA.set(a, what));
  lines.forEach((l, li) => {
    if (!l.extension) return;
    const prev = usedIA.get(l.extension.address);
    if (prev)
      err(
        `lines[${li}].extension.address`,
        "duplicate",
        t`individual address ${l.extension.address} already used (${prev})`,
      );
    else usedIA.set(l.extension.address, `line ${l.address} extension`);
  });

  arr(raw, "devices", "", true).forEach((d, di) => {
    const p = `devices[${di}]`;
    if (!isRecord(d)) return err(p, "type", t`object expected`);
    unknownKeys(d, DEVICE_V2, p);
    const dev = buildDevice(d, p);
    if (!dev) return;
    devices.push(dev);
    devicesById.set(dev.id, dev);
  });

  function buildDevice(d: Rec, p: string): Device | null {
    const id = ident(d, "id", p);
    if (!id) return null;
    if (devicesById.has(id)) {
      err(`${p}.id`, "duplicate", t`duplicate identifier “${id}”`);
      return null;
    }
    const rawButtons = arr(d, "buttons", `${p}.`);
    const rawInputs = arr(d, "inputs", `${p}.`);
    const kind = str(d, "kind", p, true) ?? "generic";

    const behaviorId = nonEmpty(d, "behavior", p) ?? "";
    const behavior: BehaviorDefinition<unknown> | undefined =
      registry.behaviors.get(behaviorId);
    if (behaviorId && !behavior)
      err(
        `${p}.behavior`,
        "unknown-behavior",
        t`unknown behavior “${behaviorId}” (extension not loaded? Available behaviors: ${[...registry.behaviors.keys()].join(", ")})`,
      );

    // Media and address
    let medium: "TP" | "IP" = "TP";
    if (d.medium !== undefined) {
      if (d.medium !== "TP" && d.medium !== "IP")
        err(`${p}.medium`, "enum", t`“TP” or “IP” expected`);
      else medium = d.medium;
    }
    const address = str(d, "address", p) ?? "";
    let line: string | null = null;
    if (d.downstream !== undefined && typeof d.downstream !== "boolean")
      err(`${p}.downstream`, "type", t`boolean expected`);
    if (d.inFilterTables !== undefined && typeof d.inFilterTables !== "boolean")
      err(`${p}.inFilterTables`, "type", t`boolean expected`);
    if (medium === "TP") {
      const ia = parseIA(address);
      if (!ia)
        err(
          `${p}.address`,
          "address",
          t`“${address}” is not a valid individual address (e.g. 1.1.10; area and line 0–15, device 0–255)`,
        );
      else {
        line = `${ia[0]}.${ia[1]}`;
        if (ia[2] === 0)
          err(
            `${p}.address`,
            "address",
            ia[1] !== 0
              ? t`${address} is reserved for the line coupler`
              : ia[0] !== 0
                ? t`${address} is reserved for the area (backbone) coupler`
                : t`${address} is not a device address: device number 0 is reserved for couplers`,
          );
        const l = lines.find((x) => x.address === line);
        if (ia[0] === 0 && ia[1] === 0) {
          if (!topology.backbone)
            err(
              `${p}.address`,
              "reference",
              t`${address} is on the backbone (0.0), absent from this installation: add an area or “topology”: { "backbone": true }`,
            );
        } else if (ia[1] === 0) {
          if (!topology.mainLines.includes(ia[0]))
            err(
              `${p}.address`,
              "reference",
              t`${address} is on main line ${line}, absent from this installation: add a line to area ${ia[0]} or “topology”: { "mainLines": true }`,
            );
        } else if (!l)
          err(
            `${p}.address`,
            "reference",
            t`line ${line} is not declared in “lines”`,
          );
        if (d.downstream === true && !l?.extension)
          err(
            `${p}.downstream`,
            "reference",
            t`line ${line} has no extension (repeater/segment coupler)`,
          );
      }
    } else {
      if (!topology.ip)
        err(
          `${p}.medium`,
          "reference",
          t`an IP device requires an IP network (“topology”: { "ip": … })`,
        );
      if (address && !parseIA(address))
        err(
          `${p}.address`,
          "address",
          t`“${address}” is not a valid individual address`,
        );
    }
    if (address) {
      const prev = usedIA.get(address);
      if (prev)
        err(
          `${p}.address`,
          "duplicate",
          t`individual address ${address} already used (${prev})`,
        );
      else usedIA.set(address, `${p}.address`);
    }

    const parameters = validateParams(
      behavior?.parameters,
      d.parameters,
      `${p}.parameters`,
      problems,
      t,
    );
    // Channels
    const channels: Channel[] = [];
    const rawChannels = arr(d, "channels", `${p}.`);
    rawChannels.forEach((c, ci) => {
      const cp = `${p}.channels[${ci}]`;
      if (!isRecord(c)) return err(cp, "type", t`object expected`);
      unknownKeys(c, CHANNEL_V2, cp);
      const cid = ident(c, "id", cp);
      if (!cid) return;
      if (channels.some((x) => x.id === cid))
        return err(`${cp}.id`, "duplicate", t`duplicate channel “${cid}”`);
      const label = str(c, "label", cp) ?? cid;
      const keyLabel = str(c, "keyLabel", cp) ?? null;
      let keyContact: "normallyOpen" | "normallyClosed" = "normallyOpen";
      if (c.keyContact !== undefined) {
        if (
          c.keyContact === "normallyOpen" ||
          c.keyContact === "normallyClosed"
        )
          keyContact = c.keyContact;
        else
          err(
            `${cp}.keyContact`,
            "enum",
            t`“normallyOpen” or “normallyClosed” expected`,
          );
      }

      const rawParams: unknown = c.parameters;
      const rawInit: unknown = c.initialState;
      const equipment: EquipmentConfig[] = [];
      const rawEquip: unknown = c.equipment;
      const chParams = validateParams(
        behavior?.channelParameters,
        rawParams,
        `${cp}.parameters`,
        problems,
      );
      const chInit = validateParams(
        behavior?.channelInitialState,
        rawInit,
        `${cp}.initialState`,
        problems,
      );

      // One load, a list of loads switched together by the output, or none.
      const rawLoads =
        rawEquip === undefined || rawEquip === null
          ? []
          : Array.isArray(rawEquip)
            ? rawEquip.map((x, i) => [x, `${cp}.equipment[${i}]`] as const)
            : [[rawEquip, `${cp}.equipment`] as const];
      rawLoads.forEach(([rawEquip, ep]) => {
        if (!isRecord(rawEquip))
          return err(ep, "type", t`object, list of objects, or null expected`);
        unknownKeys(rawEquip, EQUIP_V2, ep);
        const type = nonEmpty(rawEquip, "type", ep) ?? "";
        const def = registry.equipment.get(type);
        if (type && !def)
          err(
            `${ep}.type`,
            "unknown-equipment",
            t`unknown equipment “${type}” (available: ${[...registry.equipment.keys()].join(", ")})`,
          );
        if (
          def &&
          behavior &&
          behavior.output &&
          def.accepts !== behavior.output
        )
          err(
            `${ep}.type`,
            "incompatible",
            t`“${type}” expects “${def.accepts}” commands, behavior ${behaviorId} sends “${behavior.output}”`,
          );
        if (def && behavior && !behavior.output)
          err(
            `${ep}.type`,
            "incompatible",
            t`behavior ${behaviorId} drives no output`,
          );
        const room = roomRef(rawEquip, ep);
        if (!room && def?.heatOutput)
          err(
            `${ep}.room`,
            "required",
            t`heated or cooled room required (“room”)`,
          );
        const before = problems.length;
        const eqParams = validateParams(
          def?.parameters,
          rawEquip.parameters,
          `${ep}.parameters`,
          problems,
          t,
        );
        if (def?.checkParameters && problems.length === before)
          def
            .checkParameters(eqParams, t)
            .forEach((x) =>
              err(`${ep}.parameters.${x.parameter}`, "range", x.message),
            );
        equipment.push({
          type,
          name: str(rawEquip, "name", ep) ?? null,
          // A shutter with slats is drawn as a venetian blind unless a view is given.
          view:
            str(rawEquip, "view", ep) ??
            (type === "shutter" && Number(eqParams.slatTravelMs ?? 0) > 0
              ? "venetianBlind"
              : type),
          room,
          parameters: eqParams,
          initialState: validateParams(
            def?.initialState,
            rawEquip.initialState,
            `${ep}.initialState`,
            problems,
            t,
          ),
        });
      });
      // A motor output drives one motor: shutters wired in parallel need a relay.
      if (behavior?.output === "motor" && equipment.length > 1)
        err(
          `${cp}.equipment`,
          "range",
          t`a shutter output drives one motor; connect each shutter to its own output`,
        );

      const scenes = new Map<number, number>();
      if (c.scenes !== undefined) {
        if (!isRecord(c.scenes))
          err(
            `${cp}.scenes`,
            "type",
            t`object { scene number: value } expected`,
          );
        else
          Object.entries(c.scenes).forEach(([k, v]) => {
            const n = Number(k);
            const sp = `${cp}.scenes.${k}`;
            // Canonical spelling: "01" and "1" would designate the same scene.
            if (!/^([1-9]|[1-5][0-9]|6[0-4])$/.test(k))
              return err(sp, "range", t`integer scene number 1–64 expected`);
            if (typeof v !== "number" || !Number.isFinite(v))
              return err(sp, "type", t`number expected`);
            if (behavior?.output === "switch" && v !== 0 && v !== 1)
              return err(
                sp,
                "range",
                t`preset 0 or 1 expected for a switching channel`,
              );
            if (behavior?.output === "motor" && (v < 0 || v > 100))
              return err(
                sp,
                "range",
                t`position 0–100 % expected for a shutter`,
              );
            scenes.set(n, v);
          });
      }
      channels.push({
        id: cid,
        label,
        keyLabel,
        keyContact,
        parameters: chParams,
        initialState: chInit,
        scenes,
        equipment: equipment[0]?.type ?? null,
        loads: equipment.map((e) => e.type),
        equipmentConfigs: equipment,
      });
    });

    // Objects (first pass: identity, GA, port, channel, DPT)
    const objects: KnxObject[] = [];
    const objectFlagsRaw = new Map<KnxObject, unknown>();
    const rawObjects = arr(d, "objects", `${p}.`, true);
    rawObjects.forEach((o, oi) => {
      const op = `${p}.objects[${oi}]`;
      if (!isRecord(o)) return err(op, "type", t`object expected`);
      unknownKeys(o, OBJECT_V2, op);
      const oid = ident(o, "id", op);
      if (!oid) return;
      if (objects.some((x) => x.id === oid))
        return err(`${op}.id`, "duplicate", t`duplicate object “${oid}”`);
      let gas: string[] = [];
      if (Array.isArray(o.ga)) gas = o.ga as string[];
      else if (typeof o.ga === "string") {
        // "" is not "no address": write [].
        if (o.ga === "")
          err(
            `${op}.ga`,
            "address",
            t`empty address: write [] for an unassociated object`,
          );
        gas = o.ga === "" ? [] : [o.ga];
      } else if (o.ga !== undefined)
        err(`${op}.ga`, "type", t`group address or list of addresses expected`);
      else
        err(
          `${op}.ga`,
          "required",
          t`required field (empty list for an unassociated object)`,
        );
      gas = gas.filter((g, gi) => {
        if (typeof g !== "string" || !parseGA(g)) {
          err(
            `${op}.ga`,
            "address",
            t`“${String(g)}” is not a valid 3-level group address (e.g. 1/1/1)`,
          );
          return false;
        }
        if (isBroadcastGA(g)) {
          err(
            `${op}.ga`,
            "address",
            t`0/0/0 is the broadcast address and cannot be used as a group address`,
          );
          return false;
        }
        if (gas.indexOf(g) !== gi) {
          err(`${op}.ga`, "duplicate", t`duplicate address ${g} in the object`);
          return false;
        }
        return true;
      });

      const port = nonEmpty(o, "port", op) ?? "";
      const portDef = behavior ? own(behavior.ports, port) : undefined;
      if (port && behavior && !portDef)
        err(
          `${op}.port`,
          "port",
          t`port “${port}” not accepted by ${behaviorId} (ports: ${Object.keys(behavior.ports).join(", ")})`,
        );

      let channel: string | null = null;
      const chRaw = str(o, "channel", op);
      if (chRaw) {
        if (!channels.some((c) => c.id === chRaw))
          err(
            `${op}.channel`,
            "reference",
            t`channel “${chRaw}” missing from ${p}.channels`,
          );
        else channel = chRaw;
        if (portDef?.channel === "none")
          err(
            `${op}.channel`,
            "port",
            t`port “${port}” does not refer to a channel`,
          );
      } else if (portDef?.channel === "required") {
        err(`${op}.channel`, "required", t`port “${port}” requires a channel`);
      }

      const dpt =
        str(o, "dpt", op) ?? groupAddresses.get(gas[0] ?? "")?.dpt ?? "";
      if (!dpt)
        err(
          `${op}.dpt`,
          "required",
          t`DPT required (on the object or on its first group address)`,
        );
      else if (!isSupportedDpt(dpt)) {
        // A passive or display device may show a data type without simulating it.
        if (!isRepresentableDpt(dpt))
          err(`${op}.dpt`, "dpt", t`DPT “${dpt}” not supported`);
        else if (behavior && !behavior.representsAnyDpt)
          err(
            `${op}.dpt`,
            "dpt",
            t`DPT ${dpt} is not simulated: only objects of a device that shows values without using them (${[
              ...registry.behaviors,
            ]
              .filter(([, b]) => b.representsAnyDpt)
              .map(([id]) => id)
              .join(", ")}) may use it`,
          );
        else if (o.value !== undefined && o.value !== null)
          err(
            `${op}.value`,
            "range",
            t`DPT ${dpt} is not simulated: its value stays unknown until a telegram is received`,
          );
      } else if (
        portDef &&
        portDef.dpts !== "any" &&
        !portDef.dpts.includes(dpt)
      )
        err(
          `${op}.dpt`,
          "dpt",
          t`DPT ${dpt} incompatible with port “${port}” (expected: ${portDef.dpts.join(", ")})`,
        );

      let initial: number | null = defaultInitial(portDef, dpt);
      if (o.value !== undefined) {
        if (o.value === null) initial = null;
        else if (typeof o.value !== "number")
          err(`${op}.value`, "type", t`number expected`);
        else if (dptInfo(dpt)) {
          const bad = checkValue(dpt, o.value, t);
          if (bad) err(`${op}.value`, "range", bad);
          else initial = canonical(dpt, o.value);
        }
      }
      const obj: KnxObject = {
        key: `${id}/${oid}`,
        id: oid,
        deviceId: id,
        name: str(o, "name", op) ?? oid,
        gas,
        port,
        channel,
        dpt,
        initial,
        flags: { W: true, T: false, R: false, U: false, C: true, I: false },
        priority: "low",
        telegram: portDef?.telegram ?? "command",
        drivesLoad: portDef?.drivesLoad === true,
      };
      if (o.priority !== undefined) {
        if (
          o.priority === "low" ||
          o.priority === "normal" ||
          o.priority === "urgent"
        )
          obj.priority = o.priority;
        else
          err(
            `${op}.priority`,
            "enum",
            t`“low”, “normal” or “urgent” expected (system priority is reserved for management)`,
          );
      }
      objects.push(obj);
      objectFlagsRaw.set(obj, o.flags);
    });

    const findObj = (path: string, oid: unknown) => {
      const o = objects.find((x) => x.id === oid);
      if (!o)
        err(
          path,
          "reference",
          t`object “${String(oid)}” not found in this device`,
        );
      return o ?? null;
    };
    const inputIds = new Set<string>();

    // Keys
    const buttons: Button[] = [];
    if (
      rawButtons.length &&
      behavior &&
      !(behavior.acceptsKeys ?? behavior.acceptsInputs)
    )
      err(
        `${p}.buttons`,
        "incompatible",
        t`behavior ${behaviorId} does not use keys`,
      );
    rawButtons.forEach((b, bi) => {
      const buttonPath = `${p}.buttons[${bi}]`;
      if (!isRecord(b)) return err(buttonPath, "type", t`object expected`);
      unknownKeys(b, BUTTON_V2, buttonPath);
      const bid = ident(b, "id", buttonPath);
      if (bid && inputIds.has(bid))
        err(
          `${buttonPath}.id`,
          "duplicate",
          t`duplicate key identifier “${bid}”`,
        );
      if (bid) inputIds.add(bid);
      if (b.icon !== undefined && !ICONS.includes(b.icon as ButtonIcon))
        err(`${buttonPath}.icon`, "enum", t`unknown icon “${String(b.icon)}”`);
      if (
        b.press === undefined &&
        b.short === undefined &&
        b.long === undefined
      )
        err(
          buttonPath,
          "required",
          t`a “press”, “short” or “long” action is required`,
        );
      if (
        b.press !== undefined &&
        (b.short !== undefined || b.long !== undefined)
      )
        err(
          buttonPath,
          "conflict",
          t`“press” cannot be combined with “short”/“long”`,
        );
      const action = (gesture: string) => {
        const a = b[gesture];
        const ap = `${buttonPath}.${gesture}`;
        if (a === undefined) return null;
        if (!isRecord(a)) {
          err(ap, "type", t`object { object, value } expected`);
          return null;
        }
        unknownKeys(a, ACTION_KEYS, ap);
        const o = findObj(`${ap}.object`, a.object);
        if (a.value !== "toggle" && typeof a.value !== "number") {
          err(`${ap}.value`, "type", t`number or “toggle” expected`);
          return null;
        }
        if (!o) return null;
        if (a.value === "toggle" && dptBits(o.dpt) !== 1)
          err(
            `${ap}.value`,
            "toggle",
            t`“toggle” only makes sense for a 1-bit object (DPT ${o.dpt})`,
          );
        if (typeof a.value === "number" && dptInfo(o.dpt)) {
          const bad = checkValue(o.dpt, a.value, t);
          if (bad) err(`${ap}.value`, "range", bad);
        }
        return { object: o.id, value: a.value as number | "toggle" };
      };
      const press = action("press");
      const short = action("short");
      const long = action("long");
      const release = action("release");
      if (release && !long)
        err(
          `${buttonPath}.release`,
          "conflict",
          t`“release” (release after a long press) requires “long”`,
        );
      const pressObj = press
        ? objects.find((o) => o.id === press.object)
        : undefined;
      const icon: ButtonIcon =
        (b.icon as ButtonIcon | undefined) ??
        defaultIcon(
          press,
          long,
          pressObj?.dpt,
          objects.find((o) => o.id === long?.object)?.dpt,
        );
      let led: string | null = null;
      if (b.led !== undefined)
        led = findObj(`${buttonPath}.led`, b.led)?.id ?? null;
      buttons.push({
        id: bid ?? `button-${bi}`,
        index: bi,
        label: str(b, "label", buttonPath) ?? `Key ${bi + 1}`,
        icon,
        press,
        short,
        long,
        release,
        led,
      });
    });

    // Contact inputs: one key per channel, pressed and released on the diagram.
    if (behavior?.contactInputs) {
      if (rawButtons.length)
        err(
          `${p}.buttons`,
          "incompatible",
          t`behavior ${behaviorId} takes its keys from its channels; remove “buttons”`,
        );
      channels.forEach((c, ci) => {
        const own = objects.filter((o) => o.channel === c.id);
        let key: ReturnType<NonNullable<typeof behavior.contactKey>> = {};
        try {
          key = behavior.contactKey?.(c, own) ?? {};
        } catch {
          // A failing extension gets the default key.
        }
        buttons.push({
          id: c.id,
          index: ci,
          label: c.keyLabel || c.label,
          icon: ICONS.includes(key.icon as ButtonIcon)
            ? (key.icon as ButtonIcon)
            : "toggle",
          press: null,
          short: null,
          long: null,
          release: null,
          led:
            key.led !== undefined
              ? key.led
              : (own.find((o) => o.port === "led")?.id ?? null),
          ledInverted: key.ledInverted === true,
          contact: true,
          longPressMs:
            typeof key.longPressMs === "number" && key.longPressMs > 0
              ? key.longPressMs
              : null,
        });
      });
    }

    // Digital entries
    const inputs: NumberInput[] = [];
    if (rawInputs.length && behavior && !behavior.acceptsInputs)
      err(
        `${p}.inputs`,
        "incompatible",
        t`behavior ${behaviorId} does not use inputs`,
      );
    rawInputs.forEach((n, ni) => {
      const np = `${p}.inputs[${ni}]`;
      if (!isRecord(n)) return err(np, "type", t`object expected`);
      unknownKeys(n, INPUT_V2, np);
      const nid = ident(n, "id", np);
      if (nid && inputIds.has(nid))
        err(
          `${np}.id`,
          "duplicate",
          t`identifier “${nid}” already used by a key or an input`,
        );
      if (nid) inputIds.add(nid);
      if (n.type !== "number") err(`${np}.type`, "enum", t`“number” expected`);
      const o = findObj(`${np}.object`, n.object);
      if (o) {
        // A push button writes its input objects; a thermostat writes its setpoint; a
        // device may also take an entered value for another object it sends (brightness).
        if (
          o.port !== "input" &&
          (!behavior || behavior.ports.input) &&
          behavior?.ports[o.port]?.direction !== "out"
        )
          err(
            `${np}.object`,
            "port",
            t`object “${o.id}” must have port “input”`,
          );
      }
      const info = o ? dptInfo(o.dpt) : undefined;
      const num = (k: string, def: number | undefined) => {
        const v = n[k];
        if (v === undefined) {
          if (def === undefined)
            err(`${np}.${k}`, "required", t`number required`);
          return def ?? 0;
        }
        if (typeof v !== "number" || !Number.isFinite(v)) {
          err(`${np}.${k}`, "type", t`number expected`);
          return def ?? 0;
        }
        return v;
      };
      const min = num("min", info?.min);
      const max = num("max", info?.max);
      const step = num("step", info?.integer ? 1 : 1);
      if (min >= max) err(np, "range", t`“min” must be less than “max”`);
      if (step <= 0)
        err(`${np}.step`, "range", t`strictly positive step expected`);
      if (info && (min < info.min || max > info.max))
        err(
          np,
          "range",
          t`bounds outside the range ${info.min}…${info.max} of DPT ${info.id}`,
        );
      inputs.push({
        id: nid ?? `input-${ni}`,
        index: ni,
        type: "number",
        label: str(n, "label", np) ?? nid ?? "",
        object: o?.id ?? "",
        min,
        max,
        step,
      });
    });

    // Flags: W and T explicit, the others with their defaults.
    objects.forEach((o) => {
      const f = objectFlagsRaw.get(o);
      const fp = `${p}.objects[${rawObjects.findIndex((x) => isRecord(x) && x.id === o.id)}].flags`;
      if (!isRecord(f)) {
        err(
          fp,
          f === undefined ? "required" : "type",
          t`flags { W, T } required`,
        );
        return;
      }
      Object.keys(f).forEach((k) => {
        if (!["W", "T", "R", "U", "C", "I"].includes(k))
          err(
            `${fp}.${k}`,
            "unknown-field",
            t`unknown flag “${k}” (C, R, W, T, U and I are simulated)`,
          );
      });
      if (typeof f.W !== "boolean") err(`${fp}.W`, "type", t`boolean expected`);
      if (typeof f.T !== "boolean") err(`${fp}.T`, "type", t`boolean expected`);
      for (const k of ["R", "U", "C", "I"] as const)
        if (f[k] !== undefined && typeof f[k] !== "boolean")
          err(`${fp}.${k}`, "type", t`boolean expected`);
      o.flags = {
        W: f.W === true,
        T: f.T === true,
        R: typeof f.R === "boolean" ? f.R : defaultRead(behavior, o.port),
        U: typeof f.U === "boolean" ? f.U : defaultUpdate(behavior, o.port),
        C: f.C !== false,
        I: f.I === true,
      };
    });

    const shown = behavior?.presentation?.({ kind, objects, channels }) ?? {};
    const receiver =
      shown.receiver ??
      (buttons.length === 0 && inputs.length === 0 && channels.length > 0);

    const device: Device = {
      id,
      name: str(d, "name", p) ?? id,
      address,
      kind,
      behavior: behaviorId,
      parameters,
      medium,
      line,
      downstream: d.downstream === true,
      inFilterTables: d.inFilterTables !== false,
      tableGAs: [],
      description: str(d, "description", p) ?? "",
      room: roomRef(d, p),
      objects,
      buttons,
      inputs,
      channels,
      receiver,
      presentation: {
        screen: shown.screen?.length ? [...shown.screen] : null,
        supervisor: shown.supervisor === true,
        busInterface: shown.busInterface === true,
        remoteSystem: shown.remoteSystem === true,
        metered: [...(shown.metered ?? [])],
      },
    };
    // Rules of the behavior, on the assembled device.
    behavior
      ?.validate?.(device, t)
      .forEach((x) => err(x.path ? `${p}.${x.path}` : p, x.code, x.message));
    device.tableGAs = behavior?.normalize?.(device).tableGroupAddresses ?? [];
    return device;
  }

  // ── Link consistency: each group address carries one data size. ──
  const sizes = new Map<string, { bits: number; where: string }>();
  groupAddresses.forEach(
    (g) =>
      g.dpt &&
      isRepresentableDpt(g.dpt) &&
      sizes.set(g.address, {
        bits: dptBits(g.dpt),
        where: `groupAddresses (${g.dpt})`,
      }),
  );
  devices.forEach((d, di) =>
    // Every DPT whose size is known counts, including those shown without simulation.
    d.objects.forEach((o, oi) => {
      if (!isRepresentableDpt(o.dpt)) return;
      o.gas.forEach((ga) => {
        const s = sizes.get(ga);
        const bits = dptBits(o.dpt);
        if (!s) sizes.set(ga, { bits, where: `${d.id}/${o.id} (${o.dpt})` });
        else if (s.bits !== bits)
          err(
            `devices[${di}].objects[${oi}].dpt`,
            "association",
            t`${ga} is associated with objects of different sizes: ${o.dpt} here, ${s.where} elsewhere`,
          );
      });
    }),
  );

  // ── Options
  let speed = 1;
  let filterTables = false;
  if (raw.options !== undefined) {
    if (!isRecord(raw.options)) err("options", "type", t`object expected`);
    else {
      unknownKeys(raw.options, OPTIONS_KEYS, "options");
      const s = raw.options.speed;
      if (s !== undefined) {
        if (typeof s !== "number" || !Number.isFinite(s) || s <= 0)
          err("options.speed", "range", t`strictly positive number expected`);
        else speed = s;
      }
      const f = raw.options.filterTables;
      if (f !== undefined) {
        if (typeof f !== "boolean")
          err("options.filterTables", "type", t`boolean expected`);
        else filterTables = f;
      }
    }
  }

  if (problems.length) throw new ScenarioError(problems);
  return {
    formatVersion: 2,
    title,
    description,
    lines,
    rooms,
    clock,
    topology,
    groupAddresses,
    groupRanges,
    devices,
    devicesById,
    options: { speed, filterTables },
  };
}

/** Icon deduced when `icon` is absent. */
export function defaultIcon(
  press: { value: number | "toggle" } | null,
  long: { value: number | "toggle" } | null | undefined,
  pressDpt: string | undefined,
  longDpt?: string,
): ButtonIcon {
  // Long-press dimming (3.007): bit 3 sets the direction.
  if (long && longDpt === "3.007" && typeof long.value === "number")
    return long.value & 8 ? "dimUp" : "dimDown";
  if (long) return "updown";
  if (press?.value === "toggle") return "toggle";
  if (press?.value === 0) return "off";
  return pressDpt === "17.001" ? "scene" : "on";
}

export function gaName(s: Scenario, ga: string): string {
  return s.groupAddresses.get(ga)?.name ?? "";
}

export const sortAddresses = (list: string[]) => [...list].sort(compareAddress);
