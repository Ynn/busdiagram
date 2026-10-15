// Installation: what the devices of the installation hold, apart from the project.
// The scenario describes the project, as in ETS; its optional `installation` section says,
// for each device and coupler, the individual address programmed in it, whether it is in
// programming mode, and the application it was downloaded with. The simulation runs what
// the devices hold: a device without an application does nothing, a device downloaded
// before a change of the project keeps the former settings and associations.
import type { Translate } from "../i18n";
import { compareAddress, parseGA, parseIA } from "./address";
import type { JsonObject } from "./contracts";
import type { Problem } from "./params";
import type { GroupRouting } from "./scenario";

/** Individual address of a device at delivery (KNX Standard 03_05_01). */
export const FACTORY_ADDRESS = "15.15.255";
/** Individual address of a coupler at delivery. */
export const FACTORY_COUPLER_ADDRESS = "15.15.0";

/** What a coupler holds after a download: its filter table and routing settings. */
export interface CouplerApplication {
  /** Group addresses of the filter table; null for a repeater, which does not filter. */
  filterTable: string[] | null;
  down: GroupRouting;
  up: GroupRouting;
}

export interface DeviceInstallation {
  /** Individual address programmed in the device. */
  address: string;
  programmingMode: boolean;
  /** Application part of the device as downloaded (scenario JSON), or null: none loaded. */
  application: JsonObject | null;
}

export interface CouplerInstallation {
  address: string;
  programmingMode: boolean;
  application: CouplerApplication | null;
}

/** Built `installation` section. Devices and couplers not listed are as delivered. */
export interface Commissioning {
  devices: Map<string, DeviceInstallation>;
  /** By the coupler's address in the project (`1.1.0`, `1.1.64`…). */
  couplers: Map<string, CouplerInstallation>;
}

/** Fields of a device that belong to its application, downloaded by ETS. */
const APP_DEVICE = ["behavior", "parameters", "objects", "buttons"] as const;
/** Fields of a channel that belong to the application; the others are its wiring. */
const APP_CHANNEL = ["parameters", "scenes"] as const;

type Rec = Record<string, unknown>;
const isRecord = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/**
 * Application part of a device of the scenario, as ETS downloads it: application program
 * (behavior), parameters, group objects with their associations and flags, keys, and
 * the parameters and scenes of each channel. Names, address, room, and wiring (loads,
 * wired push-buttons) stay in the project.
 */
export function applicationOf(device: Rec): JsonObject {
  const app: Rec = {};
  APP_DEVICE.forEach((k) => {
    if (device[k] !== undefined) app[k] = clone(device[k]);
  });
  if (Array.isArray(device.channels))
    app.channels = device.channels.filter(isRecord).map((c) => {
      const ch: Rec = { id: c.id };
      APP_CHANNEL.forEach((k) => {
        if (c[k] !== undefined) ch[k] = clone(c[k]);
      });
      return ch;
    });
  return app as JsonObject;
}

/** Application program of a device or of its downloaded application. */
export const programOf = (device: Rec): string =>
  typeof device.behavior === "string" ? device.behavior : "";

/**
 * Device as the installation runs it: the project device (name, address, wiring) with the
 * application it holds. Without an application, its objects have no association (an empty list).
 */
export function installedDevice(project: Rec, app: JsonObject | null): Rec {
  if (!app) {
    const objects = Array.isArray(project.objects)
      ? project.objects.map((o) => {
          if (!isRecord(o)) return o;
          const rest = { ...o };
          rest.ga = [];
          return rest;
        })
      : project.objects;
    return { ...project, objects };
  }
  const a = app as Rec;
  const d: Rec = { ...project };
  APP_DEVICE.forEach((k) => {
    if (a[k] === undefined) delete d[k];
    else d[k] = clone(a[k]);
  });
  const appChannels = new Map(
    (Array.isArray(a.channels) ? a.channels : [])
      .filter(isRecord)
      .map((c) => [c.id, c] as const),
  );
  if (Array.isArray(project.channels))
    d.channels = project.channels.map((c) => {
      if (!isRecord(c)) return c;
      const ch: Rec = { ...c };
      const loaded = appChannels.get(c.id);
      APP_CHANNEL.forEach((k) => {
        if (loaded?.[k] === undefined) delete ch[k];
        else ch[k] = clone(loaded[k]);
      });
      return ch;
    });
  // Objects and keys of channels that the device no longer has are not in it.
  const channels = new Set(
    (Array.isArray(d.channels) ? d.channels : [])
      .filter(isRecord)
      .map((c) => c.id),
  );
  if (Array.isArray(d.objects))
    d.objects = d.objects.filter(
      (o) => !isRecord(o) || o.channel === undefined || channels.has(o.channel),
    );
  const objects = new Set(
    (Array.isArray(d.objects) ? d.objects : [])
      .filter(isRecord)
      .map((o) => o.id),
  );
  if (Array.isArray(d.inputs))
    d.inputs = d.inputs.filter(
      (i) => !isRecord(i) || objects.has(i.object as string),
    );
  return d;
}

/**
 * Read the `installation` section. Returns null when absent; problems go to `err` with
 * their path. `devices` and `couplers` say which identifiers exist in the project.
 */
export function parseInstallation(
  raw: unknown,
  devices: ReadonlySet<string>,
  couplers: ReadonlySet<string>,
  err: (p: Problem) => void,
  t: Translate,
): Commissioning | null {
  if (raw === undefined) return null;
  const out: Commissioning = { devices: new Map(), couplers: new Map() };
  const fail = (path: string, code: string, message: string) =>
    err({ path, code, message });
  if (!isRecord(raw)) {
    fail("installation", "type", t`object expected`);
    return out;
  }
  Object.keys(raw).forEach(
    (k) =>
      k !== "devices" &&
      k !== "couplers" &&
      fail(`installation.${k}`, "unknown-field", t`unknown field “${k}”`),
  );
  const common = (e: Rec, p: string, keys: string[]) => {
    Object.keys(e).forEach(
      (k) =>
        keys.includes(k) ||
        fail(`${p}.${k}`, "unknown-field", t`unknown field “${k}”`),
    );
    let address: string | undefined;
    if (e.address !== undefined) {
      if (typeof e.address !== "string" || !parseIA(e.address))
        fail(
          `${p}.address`,
          "address",
          t`individual address area.line.device expected`,
        );
      else address = e.address;
    }
    let programmingMode = false;
    if (e.programmingMode !== undefined) {
      if (typeof e.programmingMode !== "boolean")
        fail(`${p}.programmingMode`, "type", t`boolean expected`);
      else programmingMode = e.programmingMode;
    }
    return { address, programmingMode };
  };
  const list = (key: "devices" | "couplers") => {
    const v = raw[key];
    if (v === undefined) return [];
    if (!Array.isArray(v)) {
      fail(`installation.${key}`, "type", t`array expected`);
      return [];
    }
    return v;
  };
  list("devices").forEach((e: unknown, i) => {
    const p = `installation.devices[${i}]`;
    if (!isRecord(e)) return fail(p, "type", t`object expected`);
    const c = common(e, p, [
      "device",
      "address",
      "programmingMode",
      "application",
    ]);
    const id = e.device;
    if (typeof id !== "string" || !devices.has(id))
      return fail(
        `${p}.device`,
        "reference",
        t`unknown device “${String(id)}”`,
      );
    if (out.devices.has(id))
      return fail(`${p}.device`, "duplicate", t`device listed twice`);
    let application: JsonObject | null = null;
    if (e.application !== undefined) {
      if (
        !isRecord(e.application) ||
        typeof e.application.behavior !== "string"
      )
        fail(
          `${p}.application`,
          "type",
          t`application object with its behavior expected`,
        );
      else application = clone(e.application) as JsonObject;
    }
    out.devices.set(id, {
      address: c.address ?? FACTORY_ADDRESS,
      programmingMode: c.programmingMode,
      application,
    });
  });
  list("couplers").forEach((e: unknown, i) => {
    const p = `installation.couplers[${i}]`;
    if (!isRecord(e)) return fail(p, "type", t`object expected`);
    const c = common(e, p, [
      "coupler",
      "address",
      "programmingMode",
      "application",
    ]);
    const id = e.coupler;
    if (typeof id !== "string" || !couplers.has(id))
      return fail(
        `${p}.coupler`,
        "reference",
        t`no coupler or repeater at ${String(id)} in the topology`,
      );
    if (out.couplers.has(id))
      return fail(`${p}.coupler`, "duplicate", t`coupler listed twice`);
    let application: CouplerApplication | null = null;
    const a = e.application;
    if (a !== undefined) {
      const ap = `${p}.application`;
      if (!isRecord(a)) fail(ap, "type", t`object expected`);
      else {
        const routing = (k: "down" | "up"): GroupRouting => {
          const v = a[k];
          if (v === undefined) return "filter";
          if (v !== "filter" && v !== "route" && v !== "block") {
            fail(`${ap}.${k}`, "enum", t`filter, route, or block expected`);
            return "filter";
          }
          return v;
        };
        let filterTable: string[] | null = null;
        if (a.filterTable !== undefined && a.filterTable !== null) {
          if (
            !Array.isArray(a.filterTable) ||
            a.filterTable.some((g) => typeof g !== "string" || !parseGA(g))
          )
            fail(
              `${ap}.filterTable`,
              "type",
              t`array of group addresses expected`,
            );
          else
            filterTable = [...new Set(a.filterTable as string[])].sort(
              compareAddress,
            );
        }
        application = { filterTable, down: routing("down"), up: routing("up") };
      }
    }
    out.couplers.set(id, {
      address: c.address ?? FACTORY_COUPLER_ADDRESS,
      programmingMode: c.programmingMode,
      application,
    });
  });
  return out;
}

/** The section as JSON, in the order of the project (for a scenario saved after changes). */
export function installationJson(
  c: Commissioning,
  deviceOrder: readonly string[],
  couplerOrder: readonly string[],
): JsonObject {
  const devices = deviceOrder
    .filter((id) => c.devices.has(id))
    .map((id) => {
      const d = c.devices.get(id)!;
      const e: Rec = { device: id, address: d.address };
      if (d.programmingMode) e.programmingMode = true;
      if (d.application) e.application = clone(d.application);
      return e;
    });
  const couplers = couplerOrder
    .filter((a) => c.couplers.has(a))
    .map((a) => {
      const k = c.couplers.get(a)!;
      const e: Rec = { coupler: a, address: k.address };
      if (k.programmingMode) e.programmingMode = true;
      if (k.application)
        e.application = {
          filterTable: k.application.filterTable,
          down: k.application.down,
          up: k.application.up,
        };
      return e;
    });
  const out: Rec = {};
  if (devices.length) out.devices = devices;
  if (couplers.length) out.couplers = couplers;
  return out as JsonObject;
}
