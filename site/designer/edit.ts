// Editing operations of the guided designer: pure functions on a scenario in format 2.
// They find objects by their role (port, channel, touch action) rather than by a
// Identifier required: they also apply to handwritten scenarios.
// If an edit is impossible, throw EditRefusal; the caller makes no change.
import { SUPPORTED_DPTS, dptBits } from "../../src/knx/dpt";
import {
  defaultRead,
  defaultUpdate,
  parseClockStart,
} from "../../src/knx/scenario";
import { captureRegistry } from "../../src/knx/registry";
import { t } from "./lang";
import { SnippetRefusal, freeAddress, freeGa, usedAddresses } from "./snippets";

export class EditRefusal extends Error {}

type J = Record<string, unknown>;
export interface Obj extends J {
  id: string;
  name?: string;
  ga: string | string[];
  dpt?: string;
  port: string;
  channel?: string;
  flags: { W: boolean; T: boolean; R?: boolean; U?: boolean };
}
export interface Action {
  object: string;
  value: number | "toggle";
}
export interface Btn extends J {
  id: string;
  label?: string;
  icon?: string;
  press?: Action;
  short?: Action;
  long?: Action;
  release?: Action;
  led?: string;
}
export interface Chan extends J {
  id: string;
  label?: string;
  parameters?: J;
  initialState?: J;
  /** One load, several loads wired in parallel, or null for a free output. */
  equipment?: Load | Load[] | null;
  scenes?: Record<string, number>;
}
/** A load connected to an output (lamp, appliance, shutter…). */
export interface Load extends J {
  type: string;
  name?: string;
  view?: string;
  room?: string;
  parameters?: J;
  initialState?: J;
}
export interface Dev extends J {
  id: string;
  name?: string;
  address?: string;
  kind: string;
  behavior: string;
  parameters?: J;
  objects: Obj[];
  buttons?: Btn[];
  channels?: Chan[];
  /** Values that the reader enters in the diagram, written to an object and sent. */
  inputs?: InputDoc[];
  description?: string;
  medium?: string;
  room?: string;
}
export interface InputDoc extends J {
  id: string;
  type: "number";
  label?: string;
  object: string;
  min?: number;
  max?: number;
  step?: number;
}
export interface RoomDoc extends J {
  id: string;
  name?: string;
  temperatureC?: number;
  outsideTemperatureC?: number;
  windowOpen?: boolean;
  timeConstantMs?: number;
}
export interface Ga extends J {
  address: string;
  name?: string;
  dpt?: string;
}
export interface Doc extends J {
  formatVersion: 2;
  title?: string;
  description?: string;
  lines: J[];
  groupAddresses: Ga[];
  devices: Dev[];
  ipRouter?: J;
  topology?: Topo;
  rooms?: RoomDoc[];
  groupRanges?: { address: string; name: string }[];
}

export type IpRole = "areaCouplers" | "lineCouplers";
export type Routing = "filter" | "route" | "block";
export interface CouplerSet extends J {
  address: string;
  name?: string;
  down?: Routing;
  up?: Routing;
}
export interface Topo extends J {
  backbone?: boolean;
  mainLines?: boolean;
  ip?: IpRole;
  areas?: { address: number; name?: string }[];
  couplers?: CouplerSet[];
}

export const clone = <T>(v: T): T => structuredClone(v);

// ── Read and feedback ──────────────────────────────────────────────────────────────────

export const gasOf = (o: Obj): string[] =>
  Array.isArray(o.ga) ? o.ga : o.ga ? [o.ga] : [];
const setGas = (o: Obj, gas: string[]) =>
  (o.ga = gas.length === 1 ? gas[0]! : [...gas]);

export function device(doc: Doc, id: string): Dev {
  const d = doc.devices.find((x) => x.id === id);
  if (!d) throw new EditRefusal(t`device “${id}” not found`);
  return d;
}

export function gaDpt(doc: Doc, addr: string): string | undefined {
  const g = doc.groupAddresses.find((x) => x.address === addr);
  if (g?.dpt) return g.dpt;
  for (const d of doc.devices)
    for (const o of d.objects)
      if (gasOf(o).includes(addr) && o.dpt) return o.dpt;
  return undefined;
}

export interface Usage {
  deviceId: string;
  deviceName: string;
  objectId: string;
  objectName: string;
}

/**
 * Uses of a group address by service, following the engine rules:
 * - senders: spontaneous transmission (T flag; sending address is the first address);
 * - responders: reply to a read request (R flag; sending address);
 * - receivers: accept a received write (W flag; any object address);
 * - updaters: accept a received response (U flag; any object address).
 */
export function gaUsage(
  doc: Doc,
  addr: string,
): {
  senders: Usage[];
  responders: Usage[];
  receivers: Usage[];
  updaters: Usage[];
} {
  const senders: Usage[] = [];
  const responders: Usage[] = [];
  const receivers: Usage[] = [];
  const updaters: Usage[] = [];
  doc.devices.forEach((d) =>
    d.objects.forEach((o) => {
      const gas = gasOf(o);
      if (!gas.includes(addr)) return;
      const u = {
        deviceId: d.id,
        deviceName: d.name ?? d.id,
        objectId: o.id,
        objectName: o.name ?? o.id,
      };
      if (gas[0] === addr && flagOf(o, "T")) senders.push(u);
      if (gas[0] === addr && flagOf(o, "R")) responders.push(u);
      if (flagOf(o, "W")) receivers.push(u);
      if (flagOf(o, "U")) updaters.push(u);
    }),
  );
  return { senders, responders, receivers, updaters };
}

function freeObjectId(d: Dev, base: string): string {
  const used = new Set(d.objects.map((o) => o.id));
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(`${base}_${i}`)) return `${base}_${i}`;
}

const wrap = <T>(fn: () => T): T => {
  try {
    return fn();
  } catch (e) {
    if (e instanceof SnippetRefusal) throw new EditRefusal(e.message);
    throw e;
  }
};

// ── Group addresses ───────────────────────────────────────────────────────

const GA_RE =
  /^([0-9]|[12][0-9]|3[01])\/[0-7]\/([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;

/** Create the next free address; main group follows the DPT (1 lighting, 2 shutters, 3 scenes). */
export function newGa(doc: Doc, dpt: string, name: string): string {
  const main = dpt.startsWith("17.")
    ? 3
    : dpt === "1.008" || dpt === "1.007" || dpt === "5.001"
      ? 2
      : 1;
  const middle =
    dpt === "2.001"
      ? 5
      : dpt === "1.007" || dpt === "3.007"
        ? 2
        : dpt === "1.005"
          ? 7
          : 1;
  const address = wrap(() => freeGa(doc, main, middle));
  doc.groupAddresses.push({ address, name, dpt });
  return address;
}

/**
 * New group address in a given middle group, as the “Add group addresses” command of
 * the first free subgroup; its DPT is set later by the first linked object.
 */
export function newGaIn(
  doc: Doc,
  main: number,
  middle: number,
  name: string,
  dpt?: string,
): string {
  const address = wrap(() => freeGa(doc, main, middle));
  doc.groupAddresses.push(dpt ? { address, name, dpt } : { address, name });
  return address;
}

/** Main (“M”) and middle (“M/m”) groups: those with addresses and those named. */
export function groupRangesOf(doc: Doc): {
  mains: number[];
  middles: string[];
} {
  const mains = new Set<number>();
  const middles = new Set<string>();
  doc.groupAddresses.forEach((g) => {
    const [m, mm] = g.address.split("/").map(Number);
    mains.add(m!);
    middles.add(`${m}/${mm}`);
  });
  (doc.groupRanges ?? []).forEach((r) => {
    const [m, mm] = r.address.split("/");
    mains.add(Number(m));
    if (mm !== undefined) middles.add(r.address);
  });
  const byNum = (a: string, b: string) => {
    const [x, y] = [a, b].map((s) => s.split("/").map(Number));
    return x![0]! - y![0]! || x![1]! - y![1]!;
  };
  return {
    mains: [...mains].sort((a, b) => a - b),
    middles: [...middles].sort(byNum),
  };
}

/** New main group: the first free number 0–31, with a name. */
export function addMainGroup(doc: Doc, name: string): string {
  const { mains } = groupRangesOf(doc);
  const free = Array.from({ length: 32 }, (_, i) => i).find(
    (i) => !mains.includes(i),
  );
  if (free === undefined) throw new EditRefusal(t`no free main group (0–31)`);
  setGroupRangeName(doc, String(free), name);
  return String(free);
}

/** New middle group in a main group: the first free number 0–7, with a name. */
export function addMiddleGroup(doc: Doc, main: number, name: string): string {
  const { middles } = groupRangesOf(doc);
  const free = Array.from({ length: 8 }, (_, i) => i).find(
    (i) => !middles.includes(`${main}/${i}`),
  );
  if (free === undefined)
    throw new EditRefusal(t`no free middle group in ${main} (0–7)`);
  setGroupRangeName(doc, `${main}/${free}`, name);
  return `${main}/${free}`;
}

/**
 * Possible DPTs for an address: linked objects require one data size.
 * If no object is linked, all DPTs are available.
 */
export function gaAllowedDpts(doc: Doc, addr: string): string[] {
  const bits = new Set<number>();
  doc.devices.forEach((d) =>
    d.objects.forEach(
      (o) => gasOf(o).includes(addr) && o.dpt && bits.add(dptBits(o.dpt)),
    ),
  );
  return bits.size === 1
    ? SUPPORTED_DPTS.filter((x) => bits.has(dptBits(x)))
    : bits.size
      ? []
      : [...SUPPORTED_DPTS];
}

export function setGaField(
  doc: Doc,
  addr: string,
  field: "name" | "dpt",
  value: string,
) {
  const g = doc.groupAddresses.find((x) => x.address === addr);
  if (!g) throw new EditRefusal(t`address ${addr} not declared`);
  if (field === "dpt" && value && !gaAllowedDpts(doc, addr).includes(value))
    throw new EditRefusal(
      t`${addr} links objects of another size: choose a DPT of the same size, or change the objects first`,
    );
  if (value) g[field] = value;
  else delete g[field];
}

/** Rename an address everywhere it is used, in one transaction. */
/** Name of a main group ("1") or middle group ("1/2"); an empty name removes it. */
export function setGroupRangeName(doc: Doc, address: string, name: string) {
  const list = [...(doc.groupRanges ?? [])].filter(
    (r) => r.address !== address,
  );
  const v = name.trim();
  if (v) list.push({ address, name: v });
  // Keep the tree order: main groups, then their middle groups.
  const key = (a: string) =>
    a
      .split("/")
      .map(Number)
      .reduce((k, n, i) => k + n * (i ? 1 : 100), 0);
  list.sort((a, b) => key(a.address) - key(b.address));
  if (list.length) doc.groupRanges = list;
  else delete doc.groupRanges;
}

export function renameGa(doc: Doc, from: string, to: string) {
  if (!GA_RE.test(to))
    throw new EditRefusal(t`“${to}” is not a valid group address (e.g. 1/1/1)`);
  if (from === to) return;
  if (
    doc.groupAddresses.some((g) => g.address === to) ||
    doc.devices.some((d) => d.objects.some((o) => gasOf(o).includes(to)))
  )
    throw new EditRefusal(t`address ${to} is already used`);
  doc.groupAddresses.forEach((g) => g.address === from && (g.address = to));
  doc.devices.forEach((d) =>
    d.objects.forEach((o) =>
      setGas(
        o,
        gasOf(o).map((g) => (g === from ? to : g)),
      ),
    ),
  );
}

/** Remove an address and its links; return the number of modified objects. */
export function removeGa(doc: Doc, addr: string): number {
  let n = 0;
  doc.devices.forEach((d) =>
    d.objects.forEach((o) => {
      const gas = gasOf(o);
      if (!gas.includes(addr)) return;
      if (gas[0] === addr && isActionTarget(d, o.id))
        throw new EditRefusal(
          t`${addr} is the sending address of a key of ${d.name ?? d.id}: change that key's address first`,
        );
      setGas(
        o,
        gas.filter((g) => g !== addr),
      );
      n++;
    }),
  );
  doc.groupAddresses = doc.groupAddresses.filter((g) => g.address !== addr);
  return n;
}

// ── Lines ───────────────────────────────────────────────────────────────────

/** "A.L", "A.0" (main line), "0.0" (backbone), or "IP". */
export const lineOf = (d: Dev): string | undefined =>
  d.medium === "IP" || (d.kind === "supervisor" && d.medium !== "TP")
    ? "IP"
    : d.address?.split(".").slice(0, 2).join(".");

export function setLineName(doc: Doc, line: string, name: string) {
  const l = doc.lines.find((x) => String(x.address) === line);
  if (!l) throw new EditRefusal(t`line ${line} not found`);
  if (name) l.name = name;
  else delete l.name;
}

export type ExtensionMode = "repeater" | "segmentCoupler";

/**
 * Line extension attached to the main segment of a line: a line repeater or a segment
 * coupler. The model has at most one per line, so repeaters are never chained.
 * null removes it and moves the devices behind it back to the main segment.
 */
export function setLineExtension(
  doc: Doc,
  line: string,
  mode: ExtensionMode | null,
) {
  const l = doc.lines.find((x) => String(x.address) === line);
  if (!l) throw new EditRefusal(t`line ${line} not found`);
  if (!mode) {
    delete l.extension;
    doc.devices.forEach((d) => {
      if (lineOf(d) === line) delete d.downstream;
    });
    return;
  }
  const ext = l.extension as J | undefined;
  if (ext) {
    ext.mode = mode;
    return;
  }
  const used = usedAddresses(doc);
  // Conventional repeater addresses first, then the first free address.
  const address =
    [64, 128, 192].map((n) => `${line}.${n}`).find((a) => !used.has(a)) ??
    wrap(() => freeAddress(doc, line));
  l.extension = { address, mode };
}

/**
 * Power supply of a line (or of its downstream segment): rated current in mA,
 * 0 for a supply whose current is not given, or null to remove it.
 */
export function setLinePowerSupply(
  doc: Doc,
  line: string,
  currentMa: number | null,
  downstream = false,
) {
  const l = doc.lines.find((x) => String(x.address) === line);
  if (!l) throw new EditRefusal(t`line ${line} not found`);
  const target = (downstream ? l.extension : l) as J | undefined;
  if (!target) throw new EditRefusal(t`line ${line} has no extension`);
  if (currentMa === null) delete target.powerSupply;
  else {
    const psu: J = { ...(target.powerSupply as J) };
    if (currentMa > 0) psu.currentMa = currentMa;
    else delete psu.currentMa;
    target.powerSupply = psu;
  }
}

export function setLineExtensionAddress(
  doc: Doc,
  line: string,
  address: string,
) {
  const l = doc.lines.find((x) => String(x.address) === line);
  const ext = l?.extension as J | undefined;
  if (!ext) throw new EditRefusal(t`line ${line} has no extension`);
  if (!new RegExp(`^${line.replace(".", "\\.")}\\.(\\d{1,3})$`).test(address))
    throw new EditRefusal(
      t`“${address}” is not an individual address of line ${line}`,
    );
  if (address !== ext.address && usedAddresses(doc).has(address))
    throw new EditRefusal(t`address ${address} is already used`);
  ext.address = address;
}

/** Place a device on the segment behind its line extension, or back on the main segment. */
export function setDownstream(doc: Doc, id: string, on: boolean) {
  const d = device(doc, id);
  const line = lineOf(d);
  const l = doc.lines.find((x) => String(x.address) === line);
  if (on && !l?.extension)
    throw new EditRefusal(t`line ${String(line)} has no extension`);
  if (on) d.downstream = true;
  else delete d.downstream;
}

/**
 * Simulated clock of the scenario: start as local date and time ("YYYY-MM-DDTHH:MM[:SS]")
 * and speed; a null start removes the clock.
 */
export function setClock(doc: Doc, start: string | null, speed?: number) {
  if (start === null) {
    delete doc.clock;
    return;
  }
  if (parseClockStart(start) === null)
    throw new EditRefusal(
      t`“${start}” is not a local date and time (YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS)`,
    );
  const s = speed ?? Number((doc.clock as J | undefined)?.speed ?? 1);
  if (!Number.isFinite(s) || s <= 0 || s > 3600)
    throw new EditRefusal(t`number > 0 and ≤ 3600 expected`);
  doc.clock = s === 1 ? { start } : { start, speed: s };
}

/** Remove a line and its devices; return the number of removed devices. */
export function removeLine(doc: Doc, line: string): number {
  if (!doc.lines.some((x) => String(x.address) === line))
    throw new EditRefusal(t`line ${line} not found`);
  if (doc.lines.length === 1)
    throw new EditRefusal(t`an installation keeps at least one line`);
  normalizeIp(doc);
  const before = doc.devices.length;
  doc.devices = doc.devices.filter((d) => lineOf(d) !== line);
  doc.lines = doc.lines.filter((x) => String(x.address) !== line);
  pruneTopology(doc);
  return before - doc.devices.length;
}

// ── Topology: areas, levels, IP network, couplers ──

export const areasOf = (doc: Doc): number[] =>
  [...new Set(doc.lines.map((l) => Number(String(l.address).split(".")[0])))]
    .filter((a) => a > 0)
    .sort((a, b) => a - b);

/** IP router role, including the legacy `ipRouter` form. */
export function ipRoleOf(doc: Doc): IpRole | null {
  const topo = doc.topology ?? {};
  if (topo.ip) return topo.ip;
  if (!doc.ipRouter) return null;
  return doc.lines.length === 1 && !topo.backbone && !topo.mainLines
    ? "lineCouplers"
    : "areaCouplers";
}

/** Rewrite legacy `ipRouter` (one router) as `topology.ip`, as the engine expects. */
export function normalizeIp(doc: Doc) {
  if (!doc.ipRouter) return;
  const role = ipRoleOf(doc)!;
  (doc.topology ??= {}).ip = role;
  delete doc.ipRouter;
}

/** Remove settings made irrelevant by a deleted area or coupler. */
function pruneTopology(doc: Doc) {
  const topo = doc.topology;
  if (!topo) return;
  const areas = new Set(areasOf(doc));
  if (topo.areas) topo.areas = topo.areas.filter((a) => areas.has(a.address));
  if (topo.areas?.length === 0) delete topo.areas;
  if (topo.couplers) {
    const exist = new Set(couplersOf(doc).map((c) => c.address));
    topo.couplers = topo.couplers.filter((c) => exist.has(c.address));
    if (!topo.couplers.length) delete topo.couplers;
  }
  if (!Object.keys(topo).length) delete doc.topology;
}

export interface CouplerView {
  address: string;
  kind: "line" | "area" | "router";
}
/** Couplers derived from topology, using the same rule as the engine. */
export function couplersOf(doc: Doc): CouplerView[] {
  const topo = doc.topology ?? {};
  const ip = ipRoleOf(doc);
  const areas = areasOf(doc);
  const areaLevel =
    ip !== "lineCouplers" &&
    (areas.length > 1 || !!topo.backbone || ip === "areaCouplers");
  const out: CouplerView[] = [];
  if (areaLevel)
    areas.forEach((a) =>
      out.push({
        address: `${a}.0.0`,
        kind: ip === "areaCouplers" ? "router" : "area",
      }),
    );
  doc.lines.forEach((l) => {
    const a = Number(String(l.address).split(".")[0]);
    const main =
      ip !== "lineCouplers" &&
      (areaLevel ||
        !!topo.mainLines ||
        doc.lines.filter((x) => String(x.address).startsWith(`${a}.`)).length >
          1);
    if (ip === "lineCouplers" || main)
      out.push({
        address: `${l.address}.0`,
        kind: ip === "lineCouplers" ? "router" : "line",
      });
  });
  return out;
}

/** Available levels: TP backbone, TP main lines, IP network. */
export function levelsOf(doc: Doc) {
  const areas = areasOf(doc);
  const cpl = couplersOf(doc);
  return {
    ip: ipRoleOf(doc),
    backbone: cpl.some((c) => c.kind === "area"),
    mainLines: areas.filter((a) =>
      cpl.some((c) => c.kind === "line" && c.address.startsWith(`${a}.`)),
    ),
  };
}

export function setTopologyFlag(
  doc: Doc,
  key: "backbone" | "mainLines",
  on: boolean,
) {
  normalizeIp(doc);
  const topo = (doc.topology ??= {});
  if (on && topo.ip === "lineCouplers")
    throw new EditRefusal(
      t`the IP routers act as line couplers: the IP network already replaces main lines and backbone`,
    );
  if (on) topo[key] = true;
  else delete topo[key];
  pruneTopology(doc);
}

export function setIpRole(doc: Doc, role: IpRole | null) {
  normalizeIp(doc);
  const topo = (doc.topology ??= {});
  if (!role) {
    if (
      doc.devices.some(
        (d) =>
          d.medium === "IP" || (d.kind === "supervisor" && d.medium !== "TP"),
      )
    )
      throw new EditRefusal(
        t`a device is connected to the IP network (supervisor): connect it to a line or delete it first`,
      );
    delete topo.ip;
  } else {
    topo.ip = role;
    // Routers used as line couplers replace TP main lines and the backbone.
    if (role === "lineCouplers") {
      delete topo.backbone;
      delete topo.mainLines;
    }
  }
  pruneTopology(doc);
}

/** Add the first free area with its Z.1 line. */
export function addArea(doc: Doc): number {
  const used = new Set(areasOf(doc));
  for (let a = 1; a <= 15; a++)
    if (!used.has(a)) {
      doc.lines.push({ address: `${a}.1` });
      doc.lines.sort((x, y) =>
        String(x.address).localeCompare(String(y.address), "en", {
          numeric: true,
        }),
      );
      return a;
    }
  throw new EditRefusal(t`all 15 areas are already used`);
}

/** Add the first free line from Z.1 through Z.15 in an area. */
export function addLine(doc: Doc, area: number): string {
  const used = new Set(doc.lines.map((l) => String(l.address)));
  for (let n = 1; n <= 15; n++)
    if (!used.has(`${area}.${n}`)) {
      doc.lines.push({ address: `${area}.${n}` });
      doc.lines.sort((x, y) =>
        String(x.address).localeCompare(String(y.address), "en", {
          numeric: true,
        }),
      );
      return `${area}.${n}`;
    }
  throw new EditRefusal(t`area ${area} already has its 15 lines`);
}

/** Remove an area, its lines, and its devices, including those on the main line. */
export function removeArea(doc: Doc, area: number): number {
  const areas = areasOf(doc);
  if (!areas.includes(area)) throw new EditRefusal(t`area ${area} not found`);
  if (areas.length === 1)
    throw new EditRefusal(t`an installation keeps at least one area`);
  normalizeIp(doc);
  const before = doc.devices.length;
  doc.devices = doc.devices.filter(
    (d) => !(d.medium !== "IP" && d.address?.startsWith(`${area}.`)),
  );
  doc.lines = doc.lines.filter(
    (l) => !String(l.address).startsWith(`${area}.`),
  );
  pruneTopology(doc);
  return before - doc.devices.length;
}

export function setAreaName(doc: Doc, area: number, name: string) {
  const topo = (doc.topology ??= {});
  const list = (topo.areas ??= []).filter((a) => a.address !== area);
  if (name) list.push({ address: area, name });
  list.sort((a, b) => a.address - b.address);
  topo.areas = list;
  pruneTopology(doc);
}

/** Coupler setting for group telegrams in one direction. */
export function setCouplerRouting(
  doc: Doc,
  address: string,
  dir: "down" | "up",
  mode: Routing,
) {
  normalizeIp(doc);
  if (!couplersOf(doc).some((c) => c.address === address))
    throw new EditRefusal(t`no coupler at ${address}`);
  const topo = (doc.topology ??= {});
  const list = (topo.couplers ??= []);
  let c = list.find((x) => x.address === address);
  if (!c) list.push((c = { address }));
  if (mode === "filter") delete c[dir];
  else c[dir] = mode;
  topo.couplers = list.filter((x) => x.down || x.up || x.name);
  pruneTopology(doc);
}

/** Connect a supervisor or device to the IP network or a line (Z.L, Z.0, 0.0). */
export function connectDevice(doc: Doc, id: string, where: string) {
  const d = device(doc, id);
  if (where === "IP") {
    if (!doc.topology?.ip && !doc.ipRouter)
      throw new EditRefusal(
        t`no IP network: choose KNXnet/IP routers first (Topology)`,
      );
    d.medium = "IP";
    delete d.address;
    delete d.downstream;
    return;
  }
  if (d.kind === "supervisor") d.medium = "TP";
  else delete d.medium;
  moveDevice(doc, id, where);
}

/** Whether the project includes the supervisor's addresses via a dummy device. */
export function setInFilterTables(doc: Doc, id: string, on: boolean) {
  const d = device(doc, id);
  if (on) delete d.inFilterTables;
  else d.inFilterTables = false;
}

// ── Participants ─────────────────────────────────────────────────────────────

export function setDeviceField(
  doc: Doc,
  id: string,
  field: "name" | "description",
  value: string,
) {
  const d = device(doc, id);
  if (value) d[field] = value;
  else delete d[field];
}

export function moveDevice(doc: Doc, id: string, line: string) {
  const d = device(doc, id);
  if (d.medium !== "IP" && d.address?.startsWith(`${line}.`)) return;
  const others = { ...doc, devices: doc.devices.filter((x) => x !== d) };
  d.address = wrap(() => freeAddress(others, line));
  delete d.downstream;
}

export function setDeviceAddress(doc: Doc, id: string, address: string) {
  const d = device(doc, id);
  if (!/^\d{1,2}\.\d{1,2}\.\d{1,3}$/.test(address))
    throw new EditRefusal(
      t`“${address}” is not an individual address (e.g. 1.1.10)`,
    );
  if (
    doc.devices.some((x) => x !== d && x.address === address) ||
    doc.ipRouter?.address === address
  )
    throw new EditRefusal(t`address ${address} is already used`);
  d.address = address;
}

export function removeDevice(doc: Doc, id: string) {
  device(doc, id);
  doc.devices = doc.devices.filter((x) => x.id !== id);
}

function isActionTarget(d: Dev, objectId: string) {
  return (d.buttons ?? []).some((b) =>
    [b.press, b.short, b.long, b.release].some((a) => a?.object === objectId),
  );
}

// ── Push button: keys and gestures ─────────────────────────────────────────────

export type ActionKind =
  "switch" | "move" | "step" | "dim" | "scene" | "percent" | "forced";

export const actionKinds = (): Record<
  ActionKind,
  { label: string; dpt: string; values: [number | "toggle", string][] }
> => ({
  switch: {
    label: t`Lighting`,
    dpt: "1.001",
    values: [
      [1, t`on`],
      [0, t`off`],
      ["toggle", t`toggle`],
    ],
  },
  move: {
    label: t`Shutter: up/down`,
    dpt: "1.008",
    values: [
      [0, t`up`],
      [1, t`down`],
      ["toggle", t`reverse direction`],
    ],
  },
  step: {
    label: t`Shutter: stop/step`,
    dpt: "1.007",
    values: [
      [0, t`stop / step ▲`],
      [1, t`stop / step ▼`],
    ],
  },
  scene: {
    label: t`Scene`,
    dpt: "17.001",
    values: Array.from(
      { length: 8 },
      (_, i) => [i, t`scene ${i + 1}`] as [number, string],
    ),
  },
  percent: {
    label: t`Percentage`,
    dpt: "5.001",
    values: [
      [0, t`0 %`],
      [25, t`25 %`],
      [50, t`50 %`],
      [75, t`75 %`],
      [100, t`100 %`],
    ],
  },
  dim: {
    label: t`Dimming (stops on release)`,
    dpt: "3.007",
    values: [
      [9, t`brighter`],
      [1, t`darker`],
      [11, t`brighter by 25 %`],
      [3, t`darker by 25 %`],
    ],
  },
  forced: {
    label: t`Forcing`,
    dpt: "2.001",
    values: [
      [2, t`force off`],
      [3, t`force on`],
      [0, t`end of forcing`],
    ],
  },
});

export const kindOfDpt = (dpt: string | undefined): ActionKind =>
  (Object.entries(actionKinds()).find(([, k]) => k.dpt === dpt)?.[0] as
    ActionKind | undefined) ?? "switch";

export type Gesture = "press" | "short" | "long";

export interface KeyView {
  id: string;
  label: string;
  mode: "press" | "shortlong";
  gestures: Partial<
    Record<
      Gesture,
      {
        objectId: string;
        kind: ActionKind;
        value: number | "toggle";
        ga: string | null;
      }
    >
  >;
  feedback: string | null;
  led: boolean;
}

export function keysOf(d: Dev): KeyView[] {
  return (d.buttons ?? []).map((b) => {
    const gestures: KeyView["gestures"] = {};
    (["press", "short", "long"] as Gesture[]).forEach((g) => {
      const a = b[g];
      if (!a) return;
      const o = d.objects.find((x) => x.id === a.object);
      gestures[g] = {
        objectId: a.object,
        kind: kindOfDpt(o?.dpt),
        value: a.value,
        ga: o ? (gasOf(o)[0] ?? null) : null,
      };
    });
    const first = d.objects.find(
      (x) => x.id === (b.press ?? b.short ?? b.long)?.object,
    );
    return {
      id: b.id,
      label: b.label ?? b.id,
      mode: b.press ? "press" : "shortlong",
      gestures,
      feedback: first ? (gasOf(first)[1] ?? null) : null,
      led: !!b.led,
    };
  });
}

function button(d: Dev, keyId: string): Btn {
  const b = (d.buttons ?? []).find((x) => x.id === keyId);
  if (!b) throw new EditRefusal(t`key “${keyId}” not found`);
  return b;
}

function gestureObject(
  doc: Doc,
  d: Dev,
  b: Btn,
  g: Gesture,
  kind: ActionKind,
  value: number | "toggle",
): Action {
  const k = actionKinds()[kind];
  const label = b.label ?? b.id;
  const suffix = g === "press" ? "" : g === "short" ? t` short` : t` long`;
  const id = freeObjectId(
    d,
    `${b.id}${g === "press" ? "" : g === "short" ? "_court" : "_long"}`,
  );
  const ga = newGa(doc, k.dpt, `${d.name ?? d.id} ${label}${suffix}`);
  d.objects.push({
    id,
    name: `${label}${suffix}`,
    ga,
    dpt: k.dpt,
    port: "input",
    flags: { W: true, T: true },
  });
  return { object: id, value };
}

export function addKey(doc: Doc, devId: string): string {
  const d = device(doc, devId);
  d.buttons ??= [];
  const used = new Set([
    ...d.buttons.map((b) => b.id),
    ...d.objects.map((o) => o.id),
  ]);
  let n = d.buttons.length + 1;
  while (used.has(`key${n}`)) n++;
  const b: Btn = { id: `key${n}`, label: `Key ${n}` };
  b.press = gestureObject(doc, d, b, "press", "switch", "toggle");
  b.led = b.press.object;
  d.buttons.push(b);
  sortObjects(d);
  return b.id;
}

/** Remove a key and gesture objects that serve no other purpose. */
export function removeKey(doc: Doc, devId: string, keyId: string) {
  const d = device(doc, devId);
  const b = button(d, keyId);
  d.buttons = (d.buttons ?? []).filter((x) => x !== b);
  const ids = [b.press, b.short, b.long].flatMap((a) => (a ? [a.object] : []));
  d.objects = d.objects.filter(
    (o) =>
      !ids.includes(o.id) ||
      isActionTarget(d, o.id) ||
      d.buttons!.some((x) => x.led === o.id),
  );
  sortObjects(d);
}

export function setKeyLabel(
  doc: Doc,
  devId: string,
  keyId: string,
  label: string,
) {
  button(device(doc, devId), keyId).label = label;
}

/** Single press versus short/long press: long moves a shutter; short stops or steps it. */
export function setKeyMode(
  doc: Doc,
  devId: string,
  keyId: string,
  mode: "press" | "shortlong",
) {
  const d = device(doc, devId);
  const b = button(d, keyId);
  if (mode === "shortlong" && b.press) {
    b.long = gestureObject(doc, d, b, "long", "move", "toggle");
    b.short = gestureObject(doc, d, b, "short", "step", 0);
    delete b.icon;
    const old = b.press.object;
    delete b.press;
    if (b.led === old) delete b.led;
    if (!isActionTarget(d, old))
      d.objects = d.objects.filter((o) => o.id !== old);
  } else if (mode === "press" && !b.press) {
    const keep = b.short ?? b.long!;
    delete b.release;
    const drop = [b.short, b.long]
      .filter((a) => a && a !== keep)
      .map((a) => a!.object);
    b.press = keep;
    delete b.short;
    delete b.long;
    d.objects = d.objects.filter(
      (o) => !drop.includes(o.id) || isActionTarget(d, o.id),
    );
  }
  // The objects of a key keep their place among the keys.
  sortObjects(d);
}

/** Change a gesture action; if data size changes, assign a new object address. */
export function setGestureAction(
  doc: Doc,
  devId: string,
  keyId: string,
  g: Gesture,
  kind: ActionKind,
  value: number | "toggle",
) {
  const d = device(doc, devId);
  const b = button(d, keyId);
  const a = b[g];
  if (!a) throw new EditRefusal(t`the key has no “${g}” gesture`);
  const k = actionKinds()[kind];
  if (value === "toggle" && dptBits(k.dpt) !== 1)
    throw new EditRefusal(t`“toggle” only exists for 1-bit data`);
  const o = d.objects.find((x) => x.id === a.object)!;
  if (o.dpt !== k.dpt) {
    const current = gasOf(o)[0];
    const compatible =
      current &&
      gaDpt(doc, current) &&
      dptBits(gaDpt(doc, current)!) === dptBits(k.dpt);
    o.dpt = k.dpt;
    if (!compatible)
      setGas(o, [newGa(doc, k.dpt, `${d.name ?? d.id} ${b.label ?? b.id}`)]);
    else if (current) {
      const decl = doc.groupAddresses.find((x) => x.address === current);
      if (
        decl &&
        decl.dpt &&
        decl.dpt !== k.dpt &&
        gaUsage(doc, current).senders.length +
          gaUsage(doc, current).receivers.length <=
          1
      )
        decl.dpt = k.dpt;
    }
  }
  a.value = value;
  delete b.icon;
  // Long-press dimming: release sends stop (3.007 = 0) on the same object.
  if (g === "long" && kind === "dim")
    b.release = { object: a.object, value: 0 };
  else if (g === "long") delete b.release;
}

/** Gesture sending address; keep other listened-to addresses. */
export function setGestureGa(
  doc: Doc,
  devId: string,
  keyId: string,
  g: Gesture,
  ga: string,
) {
  const d = device(doc, devId);
  const a = button(d, keyId)[g];
  if (!a) throw new EditRefusal(t`the key has no “${g}” gesture`);
  const o = d.objects.find((x) => x.id === a.object)!;
  const dpt = gaDpt(doc, ga);
  if (dpt && o.dpt && dptBits(dpt) !== dptBits(o.dpt))
    throw new EditRefusal(
      t`${ga} carries a ${dpt}, incompatible with the action (${o.dpt})`,
    );
  const rest = gasOf(o)
    .slice(1)
    .filter((x) => x !== ga);
  setGas(o, [ga, ...rest]);
}

/** Status feedback address listened to by the key object; resynchronizes toggle state. */
export function setKeyFeedback(
  doc: Doc,
  devId: string,
  keyId: string,
  ga: string | null,
) {
  const d = device(doc, devId);
  const b = button(d, keyId);
  [b.press, b.short, b.long].forEach((a) => {
    if (!a) return;
    const o = d.objects.find((x) => x.id === a.object)!;
    if (dptBits(o.dpt ?? "1.001") !== 1) return;
    const [emit, ...rest] = gasOf(o);
    const others = rest.filter((x) => !isFeedbackCandidate(doc, x));
    setGas(o, [emit!, ...(ga ? [ga] : []), ...others]);
    o.flags = { ...o.flags, W: true };
  });
}

const isFeedbackCandidate = (doc: Doc, ga: string) =>
  gaUsage(doc, ga).senders.some(() => true);

export function setKeyLed(doc: Doc, devId: string, keyId: string, on: boolean) {
  const d = device(doc, devId);
  const b = button(d, keyId);
  if (on) b.led = (b.press ?? b.short ?? b.long)!.object;
  else delete b.led;
}

// ── Actuators: channels ─────────────────────────────────────────────────────

function channel(d: Dev, ch: string): Chan {
  const c = (d.channels ?? []).find((x) => x.id === ch);
  if (!c) throw new EditRefusal(t`channel “${ch}” not found`);
  return c;
}

const objectFor = (d: Dev, port: string, ch?: string) =>
  d.objects.find(
    (o) =>
      o.port === port && (ch === undefined ? !o.channel : o.channel === ch),
  );

const num = (id: string) => id.replace(/\D+/g, "") || id;

/** Create, change, or remove a channel-port object. Empty `gas` removes it, except for command ports. */
export function setPortGas(
  doc: Doc,
  devId: string,
  port: string,
  ch: string | undefined,
  gas: string[],
  opts: {
    dpt: string;
    W: boolean;
    T: boolean;
    name: string;
    keepEmpty?: boolean;
    /** Target object when several objects share a port; otherwise the first one found. */
    objectId?: string;
  },
) {
  const d = device(doc, devId);
  if (ch !== undefined) channel(d, ch);
  for (const ga of gas) {
    const dpt = gaDpt(doc, ga);
    if (dpt && dptBits(dpt) !== dptBits(opts.dpt))
      throw new EditRefusal(
        t`${ga} carries a ${dpt}, incompatible with ${opts.dpt}`,
      );
  }
  let o = opts.objectId
    ? d.objects.find((x) => x.id === opts.objectId)
    : objectFor(d, port, ch);
  if (opts.objectId && !o)
    throw new EditRefusal(t`object “${opts.objectId}” not found`);
  if (!gas.length && !opts.keepEmpty) {
    if (o) d.objects = d.objects.filter((x) => x !== o);
    pruneInputs(d);
    return;
  }
  if (!o) {
    const base =
      {
        switch: "c",
        status: "e",
        forced: "f",
        scene: "sc",
        move: "move",
        stopStep: "stop",
        positionCommand: "target",
        positionStatus: "status",
      }[port] ?? port;
    o = {
      id: freeObjectId(
        d,
        ch && !["move", "stop", "target", "status"].includes(base)
          ? `${base}${num(ch)}`
          : ch && (d.channels?.length ?? 0) > 1
            ? `${base}${num(ch)}`
            : base,
      ),
      name: opts.name,
      ga: [],
      dpt: opts.dpt,
      port,
      ...(ch !== undefined ? { channel: ch } : {}),
      flags: { W: opts.W, T: opts.T },
    };
    d.objects.push(o);
    sortObjects(d);
  }
  setGas(o, gas);
}

// ── Values entered in the diagram ───────────────────────────────────────────

/** Inputs whose object was deleted go with it. */
function pruneInputs(d: Dev) {
  if (!d.inputs) return;
  d.inputs = d.inputs.filter((n) => d.objects.some((o) => o.id === n.object));
  if (!d.inputs.length) delete d.inputs;
}

/** Numeric input of an object, or undefined. */
export const inputOf = (d: Dev, objectId: string) =>
  (d.inputs ?? []).find((n) => n.object === objectId);

/**
 * Let the reader enter a value for an object in the diagram (a measurement of a weather
 * station, the power of a metered circuit…), or stop it with null. The value is written
 * to the object and sent, so the object needs a group address.
 */
export function setInput(
  doc: Doc,
  devId: string,
  objectId: string,
  input: { label?: string; min?: number; max?: number; step?: number } | null,
) {
  const d = device(doc, devId);
  const o = d.objects.find((x) => x.id === objectId);
  if (!o) throw new EditRefusal(t`object “${objectId}” not found`);
  const current = inputOf(d, objectId);
  if (!input) {
    d.inputs = (d.inputs ?? []).filter((n) => n !== current);
    if (!d.inputs.length) delete d.inputs;
    return;
  }
  if (!gasOf(o).length)
    throw new EditRefusal(
      t`link ${o.name ?? o.id} to a group address first: an entered value is sent on it`,
    );
  const next: InputDoc = current ?? {
    id: freeInputId(d, `${objectId}In`),
    type: "number",
    object: objectId,
  };
  (["label", "min", "max", "step"] as const).forEach((k) => {
    const v = input[k];
    if (v === undefined || v === "") delete next[k];
    else (next as J)[k] = v;
  });
  if (!current) (d.inputs ??= []).push(next);
}

/** Identifier unused by the keys and inputs of a device. */
function freeInputId(d: Dev, base: string) {
  const used = new Set([
    ...(d.buttons ?? []).map((b) => b.id),
    ...(d.inputs ?? []).map((n) => n.id),
  ]);
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}${n}`;
  return id;
}

// ── Object numbers ──────────────────────────────────────────────────────────

/** Numbers reserved for each key: its single or short press, then its long press. */
export const KEY_BLOCK = 2;

type PortTable = { ports: Record<string, { channel?: string }> };

/**
 * Number of each group object of a device, as in the object table of a
 * product: each key, then each channel, has a block of numbers of fixed size, so
 * that a key or an output keeps its numbers when another one gains or loses objects.
 * In a key block, the single or short press comes first, then the long press; in a
 * channel block, the place is the order of the ports declared by the behavior. The
 * other objects (functions of the whole device) follow, in the order of the ports,
 * then of the scenario. Numbers start at 1; unused places are gaps.
 */
export function objectNumbers(
  d: Dev,
  def: PortTable | undefined = captureRegistry().behaviors.get(d.behavior),
): Map<string, number> {
  const ports = Object.keys(def?.ports ?? {});
  const chPorts = ports.filter((p) =>
    ["required", "optional"].includes(def!.ports[p]!.channel ?? ""),
  );
  // Key blocks exist for the keys of a push-button, whose objects use the "input" port;
  // other devices attach keys to objects of their functions (a thermostat's presence).
  const isKeyObject = (id: string) => {
    const o = d.objects.find((x) => x.id === id);
    return !!o && (!o.port || o.port === "input");
  };
  const all = d.buttons ?? [];
  let last = -1;
  all.forEach((b, i) => {
    if ([b.press, b.short, b.long].some((a) => a && isKeyObject(a.object)))
      last = i;
  });
  const keys = all.slice(0, last + 1);
  const channels = d.channels ?? [];
  const chBase = 1 + keys.length * KEY_BLOCK;
  const restBase = chBase + channels.length * chPorts.length;
  const placeOf = (o: Obj): number | null => {
    // Objects of the keys of a push-button (other devices use keys on their functions).
    if (!o.port || o.port === "input")
      for (const [i, b] of keys.entries()) {
        if (b.press?.object === o.id || b.short?.object === o.id)
          return 1 + i * KEY_BLOCK;
        if (b.long?.object === o.id || b.release?.object === o.id)
          return 1 + i * KEY_BLOCK + 1;
      }
    if (o.channel !== undefined) {
      const c = channels.findIndex((x) => x.id === o.channel);
      const p = chPorts.indexOf(o.port);
      if (c >= 0 && p >= 0) return chBase + c * chPorts.length + p;
    }
    return null;
  };
  const numbers = new Map<string, number>();
  const taken = new Set<number>();
  const rest: Obj[] = [];
  for (const o of d.objects) {
    const n = placeOf(o);
    if (n !== null && !taken.has(n)) {
      numbers.set(o.id, n);
      taken.add(n);
    } else rest.push(o);
  }
  const rank = (o: Obj) => {
    const i = ports.indexOf(o.port);
    return i < 0 ? ports.length : i;
  };
  rest
    .map((o, i) => [o, i] as const)
    .sort(([a, i], [b, j]) => rank(a) - rank(b) || i - j)
    .forEach(([o], k) => numbers.set(o.id, restBase + k));
  return numbers;
}

/** Objects of a device in the order of their numbers. */
export function objectsInOrder(d: Dev): Obj[] {
  const n = objectNumbers(d);
  return [...d.objects].sort((a, b) => n.get(a.id)! - n.get(b.id)!);
}

/** Order the objects of a device by number, so that the scenario and the diagram follow it. */
export function sortObjects(d: Dev) {
  d.objects = objectsInOrder(d);
}

/** Whether the objects of a device are already in the order of their numbers. */
export const objectsSorted = (d: Dev) =>
  objectsInOrder(d).every((o, i) => o === d.objects[i]);

export interface SwitchChannelView {
  id: string;
  label: string;
  load: boolean;
  commands: string[];
  status: string | null;
  forced: string | null;
  timerS: number | null;
  scenes: string;
}

export function switchChannels(d: Dev): SwitchChannelView[] {
  return (d.channels ?? []).map((c) => ({
    id: c.id,
    label: c.label ?? c.id,
    load: loadsOf(c).length > 0,
    commands: d.objects
      .filter((o) => o.port === "switch" && o.channel === c.id)
      .flatMap(gasOf),
    status:
      gasOf(
        objectFor(d, "status", c.id) ?? ({ ga: [] } as unknown as Obj),
      )[0] ?? null,
    forced:
      gasOf(
        objectFor(d, "forced", c.id) ?? ({ ga: [] } as unknown as Obj),
      )[0] ?? null,
    timerS:
      typeof c.parameters?.timerMs === "number"
        ? c.parameters.timerMs / 1000
        : null,
    scenes: Object.entries(c.scenes ?? {})
      .map(([k, v]) => `${k}=${v}`)
      .join(", "),
  }));
}

export function setChannelLabel(
  doc: Doc,
  devId: string,
  ch: string,
  label: string,
) {
  channel(device(doc, devId), ch).label = label;
}

export function setChannelLoad(
  doc: Doc,
  devId: string,
  ch: string,
  equipment: Load | null,
) {
  const c = channel(device(doc, devId), ch);
  c.equipment = equipment;
}

// ── Loads connected to an output ──

/** Loads of an output, in order (the scenario writes one load as an object). */
export const loadsOf = (c: Chan): Load[] =>
  c.equipment == null
    ? []
    : Array.isArray(c.equipment)
      ? c.equipment
      : [c.equipment];

/** Store the loads of an output: none as null, one as an object, several as a list. */
function storeLoads(c: Chan, loads: Load[]) {
  c.equipment =
    loads.length === 0 ? null : loads.length === 1 ? loads[0]! : loads;
}

function loadAt(c: Chan, index: number): Load {
  const l = loadsOf(c)[index];
  if (!l) throw new EditRefusal(t`no load ${index + 1} on this output`);
  return l;
}

/** Connect a load to an output, after the existing ones; return its index. */
export function addLoad(doc: Doc, devId: string, ch: string, load: Load) {
  const c = channel(device(doc, devId), ch);
  const loads = [...loadsOf(c), load];
  storeLoads(c, loads);
  return loads.length - 1;
}

/** Disconnect a load from an output. */
export function removeLoad(doc: Doc, devId: string, ch: string, index: number) {
  const c = channel(device(doc, devId), ch);
  loadAt(c, index);
  storeLoads(
    c,
    loadsOf(c).filter((_, i) => i !== index),
  );
}

/** Move a load up (-1) or down (+1) among the loads of its output. */
export function moveLoad(
  doc: Doc,
  devId: string,
  ch: string,
  index: number,
  delta: -1 | 1,
) {
  const c = channel(device(doc, devId), ch);
  const loads = [...loadsOf(c)];
  const to = index + delta;
  if (!loads[index] || !loads[to])
    throw new EditRefusal(t`this load cannot move further`);
  [loads[index], loads[to]] = [loads[to]!, loads[index]!];
  storeLoads(c, loads);
}

/** Replace a load (another type), keeping its name and room. */
export function setLoadType(
  doc: Doc,
  devId: string,
  ch: string,
  index: number,
  load: Load,
) {
  const c = channel(device(doc, devId), ch);
  const old = loadAt(c, index);
  // Only a load that heats or cools has a room: keep the previous one if it still applies.
  const heats = !!captureRegistry().equipment.get(load.type)?.heatOutput;
  const room = heats ? (old.room ?? load.room) : undefined;
  const next: Load = {
    ...load,
    ...(old.name ? { name: old.name } : {}),
    ...(room ? { room } : {}),
  };
  if (!room) delete next.room;
  storeLoads(
    c,
    loadsOf(c).map((l, i) => (i === index ? next : l)),
  );
}

/** Name of a load; an empty name removes it. */
export function setLoadName(
  doc: Doc,
  devId: string,
  ch: string,
  index: number,
  name: string,
) {
  const l = loadAt(channel(device(doc, devId), ch), index);
  if (name.trim()) l.name = name.trim();
  else delete l.name;
}

// ── Rooms (heating) ──

export const roomsOf = (doc: Doc): RoomDoc[] => doc.rooms ?? [];

/** Add a room and return its ID. */
export function addRoom(doc: Doc, name?: string): string {
  const rooms = (doc.rooms ??= []);
  let n = rooms.length + 1;
  while (rooms.some((r) => r.id === `room${n}`)) n++;
  const id = `room${n}`;
  rooms.push({ id, name: name ?? t`Room ${n}` });
  return id;
}

export function setRoomField(
  doc: Doc,
  id: string,
  key: "name" | "temperatureC" | "outsideTemperatureC" | "windowOpen",
  value: string | number | boolean | undefined,
) {
  const r = roomsOf(doc).find((x) => x.id === id);
  if (!r) throw new EditRefusal(t`room ${id} not found`);
  if (value === undefined || value === "" || value === false) delete r[key];
  else (r as J)[key] = value;
}

/** Remove a room only when no radiator still heats it. */
export function removeRoom(doc: Doc, id: string) {
  const heaters = doc.devices.flatMap((d) =>
    (d.channels ?? [])
      .filter((c) => loadsOf(c).some((l) => l.room === id))
      .map((c) => `${d.name ?? d.id} · ${c.label ?? c.id}`),
  );
  if (heaters.length)
    throw new EditRefusal(
      t`the room still feeds ${heaters.join(", ")}: first choose another room for these outputs`,
    );
  doc.rooms = roomsOf(doc).filter((r) => r.id !== id);
  if (!doc.rooms.length) delete doc.rooms;
  doc.devices.forEach((d) => d.room === id && delete d.room);
}

/** Room containing a device (sensor or contact); an empty string removes the link. */
export function setDeviceRoom(doc: Doc, devId: string, room: string) {
  const d = device(doc, devId);
  if (room) d.room = room;
  else delete d.room;
}

/** Room heated by a load connected to an output (the first one by default). */
export function setEquipmentRoom(
  doc: Doc,
  devId: string,
  ch: string,
  room: string,
  index = 0,
) {
  const c = channel(device(doc, devId), ch);
  if (!loadsOf(c).length) throw new EditRefusal(t`no load connected`);
  loadAt(c, index).room = room;
}

/** Channel parameter, or device parameter if `ch` is null; undefined removes it. */
export function setParam(
  doc: Doc,
  devId: string,
  ch: string | null,
  key: string,
  value: unknown,
  scope: "behavior" | "equipment" | "equipmentState" | "state" = "behavior",
  /** Load of the output, for the "equipment" and "equipmentState" scopes. */
  index = 0,
) {
  const d = device(doc, devId);
  let target: J;
  if (ch === null) target = d.parameters ??= {};
  else {
    const c = channel(d, ch);
    if (scope === "equipment" || scope === "equipmentState") {
      if (!loadsOf(c).length)
        throw new EditRefusal(t`no equipment connected to this channel`);
      const l = loadAt(c, index);
      target =
        scope === "equipment" ? (l.parameters ??= {}) : (l.initialState ??= {});
    } else if (scope === "state") target = c.initialState ??= {};
    else target = c.parameters ??= {};
  }
  // Only an absent value (undefined) removes a property. null and empty string are explicit values
  // and must not silently be replaced by the schema default.
  if (value === undefined) delete target[key];
  else target[key] = value;
  if (ch === null && d.parameters && !Object.keys(d.parameters).length)
    delete d.parameters;
}

export function setChannelScenes(
  doc: Doc,
  devId: string,
  ch: string,
  text: string,
) {
  const c = channel(device(doc, devId), ch);
  const scenes: Record<string, number> = {};
  for (const part of text.split(/[,;\s]+/).filter(Boolean)) {
    const m = /^(\d{1,2})\s*=\s*(-?\d+(?:\.\d+)?)$/.exec(part);
    if (!m)
      throw new EditRefusal(t`“${part}”: write scene=value, e.g. 1=1, 2=0`);
    scenes[String(Number(m[1]))] = Number(m[2]);
  }
  if (Object.keys(scenes).length) c.scenes = scenes;
  else delete c.scenes;
}

export function addChannel(
  doc: Doc,
  devId: string,
  equipment: Load | null,
): string {
  const d = device(doc, devId);
  d.channels ??= [];
  const used = new Set(d.channels.map((c) => c.id));
  let n = d.channels.length + 1;
  while (used.has(`s${n}`)) n++;
  // A new output repeats the settings of the previous one (required parameters such as
  // a shutter travel time, initial state, and load of the same type).
  const prev = d.channels[d.channels.length - 1];
  const copy = <T>(v: T): T =>
    v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
  const numbered = /^(.*?)(\d+)$/.exec(prev?.label ?? "");
  const label = numbered
    ? `${numbered[1]}${n}`
    : equipment
      ? `L${n}`
      : t`unused`;
  const ch: Chan = { id: `s${n}`, label, equipment };
  if (prev?.parameters) ch.parameters = copy(prev.parameters);
  if (prev?.initialState) ch.initialState = copy(prev.initialState);
  if (equipment && prev && loadsOf(prev)[0]?.type === equipment.type)
    ch.equipment = copy(prev.equipment);
  d.channels.push(ch);
  sortObjects(d);
  return `s${n}`;
}

/**
 * Number of outputs of an actuator: outputs are added after the last one (with the same
 * load and settings) or removed from the end, with their objects.
 */
export function setOutputCount(
  doc: Doc,
  devId: string,
  count: number,
  load: Load | null,
) {
  const d = device(doc, devId);
  if (!Number.isInteger(count) || count < 1 || count > 64)
    throw new EditRefusal(t`number of outputs from 1 to 64 expected`);
  while ((d.channels?.length ?? 0) < count) addChannel(doc, devId, load);
  while ((d.channels?.length ?? 0) > count)
    removeChannel(doc, devId, d.channels!.at(-1)!.id);
}

/** Number of keys of a push-button: keys are added after the last one or removed from the end. */
export function setKeyCount(doc: Doc, devId: string, count: number) {
  const d = device(doc, devId);
  if (!Number.isInteger(count) || count < 1 || count > 32)
    throw new EditRefusal(t`number of keys from 1 to 32 expected`);
  while ((d.buttons?.length ?? 0) < count) addKey(doc, devId);
  while ((d.buttons?.length ?? 0) > count)
    removeKey(doc, devId, d.buttons!.at(-1)!.id);
}

export function removeChannel(doc: Doc, devId: string, ch: string) {
  const d = device(doc, devId);
  channel(d, ch);
  d.channels = d.channels!.filter((c) => c.id !== ch);
  d.objects = d.objects.filter((o) => o.channel !== ch);
  pruneInputs(d);
  sortObjects(d);
}

// ── Afficheur ────────────────────────────────────────────────────────────────

export function addDisplay(doc: Doc, devId: string, ga: string) {
  const d = device(doc, devId);
  if (d.objects.some((o) => gasOf(o).includes(ga)))
    throw new EditRefusal(t`${ga} is already displayed`);
  const g = doc.groupAddresses.find((x) => x.address === ga);
  d.objects.push({
    id: freeObjectId(d, `o${d.objects.length + 1}`),
    name: g?.name || ga,
    ga,
    dpt: gaDpt(doc, ga) ?? "1.001",
    port: "display",
    flags: { W: true, T: false },
  });
  sortObjects(d);
}

// ── Objets (mode expert) ─────────────────────────────────────────────────────

export function setObjectFlag(
  doc: Doc,
  devId: string,
  objectId: string,
  flag: "W" | "T" | "R" | "U",
  on: boolean,
) {
  const o = device(doc, devId).objects.find((x) => x.id === objectId);
  if (!o) throw new EditRefusal(t`object “${objectId}” not found`);
  o.flags = { ...o.flags, [flag]: on };
  // Write R and U flags only if they differ from the port defaults.
  if (flag === "R" && on === defaultRead(o.port)) delete o.flags.R;
  if (flag === "U" && on === defaultUpdate(o.port)) delete o.flags.U;
}

/** Rename a communication object; an empty name falls back to its ID. */
export function setObjectName(
  doc: Doc,
  devId: string,
  objectId: string,
  name: string,
) {
  const o = device(doc, devId).objects.find((x) => x.id === objectId);
  if (!o) throw new EditRefusal(t`object “${objectId}” not found`);
  const v = name.trim();
  if (v) o.name = v;
  else delete o.name;
}

/** Effective flag value; R and U have port-specific defaults. */
export function flagOf(o: Obj, f: "W" | "T" | "R" | "U"): boolean {
  const fl = (o.flags ?? {}) as Partial<Obj["flags"]>;
  if (f === "R") return fl.R ?? defaultRead(o.port);
  if (f === "U") return fl.U ?? defaultUpdate(o.port);
  return !!fl[f];
}

export function removeObject(doc: Doc, devId: string, objectId: string) {
  const d = device(doc, devId);
  if (isActionTarget(d, objectId))
    throw new EditRefusal(
      t`object used by a key: delete or change the key first`,
    );
  if ((d.buttons ?? []).some((b) => b.led === objectId))
    throw new EditRefusal(t`object used by an LED`);
  d.objects = d.objects.filter((o) => o.id !== objectId);
  pruneInputs(d);
}

// ── Grouped operations: links and setting copies ──

export interface ObjectRef {
  dev: string;
  obj: string;
}

/** Objects that can link to a group address have the same data size. */
export interface MemberCandidate extends ObjectRef {
  deviceName: string;
  objectName: string;
  port: string;
  channel: string | null;
  dpt: string;
  /** Current object sending address (its first address), or null. */
  sending: string | null;
  member: boolean;
  compatible: boolean;
  flags: { W: boolean; T: boolean; R: boolean; U: boolean };
}

export function gaMemberCandidates(doc: Doc, addr: string): MemberCandidate[] {
  const dpt = gaDpt(doc, addr);
  return doc.devices.flatMap((d) =>
    d.objects.map((o) => {
      const gas = gasOf(o);
      return {
        dev: d.id,
        obj: o.id,
        deviceName: d.name ?? d.id,
        objectName: o.name ?? o.id,
        port: o.port,
        channel: o.channel ?? null,
        dpt: o.dpt ?? "",
        sending: gas[0] ?? null,
        member: gas.includes(addr),
        compatible:
          !dpt ||
          !o.dpt ||
          dptBits(dpt) === dptBits(o.dpt) ||
          gas.includes(addr),
        flags: {
          W: flagOf(o, "W"),
          T: flagOf(o, "T"),
          R: flagOf(o, "R"),
          U: flagOf(o, "U"),
        },
      };
    }),
  );
}

/** Impact of changing links, shown in the summary before applying. */
export interface MemberChange extends ObjectRef {
  kind: "add" | "remove";
  label: string;
  /** New object sending address if it changes; null means none remains. */
  sendingAfter?: string | null;
  /** Link added to an object that keeps its sending address; the new address is listened to only. */
  keeps?: string;
}

export function planGaMembers(
  doc: Doc,
  addr: string,
  wanted: Set<string>,
): MemberChange[] {
  const out: MemberChange[] = [];
  gaMemberCandidates(doc, addr).forEach((c) => {
    const key = `${c.dev}/${c.obj}`;
    const label = `${c.deviceName} · ${c.objectName}`;
    if (wanted.has(key) && !c.member)
      out.push({
        dev: c.dev,
        obj: c.obj,
        kind: "add",
        label,
        ...(c.sending ? { keeps: c.sending } : { sendingAfter: addr }),
      });
    if (!wanted.has(key) && c.member) {
      const o = device(doc, c.dev).objects.find((x) => x.id === c.obj)!;
      const rest = gasOf(o).filter((g) => g !== addr);
      out.push({
        dev: c.dev,
        obj: c.obj,
        kind: "remove",
        label,
        ...(c.sending === addr ? { sendingAfter: rest[0] ?? null } : {}),
      });
    }
  });
  return out;
}

/**
 * Add or remove a group address on several objects in one operation.
 * An added address goes at the end of the object's list (listened to; its sending address
 * only if it had none); flags and all other addresses stay unchanged.
 */
export function setGaMembers(
  doc: Doc,
  addr: string,
  add: ObjectRef[],
  remove: ObjectRef[],
) {
  const dpt = gaDpt(doc, addr);
  const find = (r: ObjectRef) => {
    const d = device(doc, r.dev);
    const o = d.objects.find((x) => x.id === r.obj);
    if (!o) throw new EditRefusal(t`object “${r.obj}” not found`);
    return { d, o };
  };
  add.forEach((r) => {
    const { d, o } = find(r);
    if (dpt && o.dpt && dptBits(dpt) !== dptBits(o.dpt))
      throw new EditRefusal(
        t`${o.name ?? o.id} (${d.name ?? d.id}): ${addr} carries a ${dpt}, incompatible with ${o.dpt}`,
      );
    const gas = gasOf(o);
    if (!gas.includes(addr)) setGas(o, [...gas, addr]);
  });
  remove.forEach((r) => {
    const { d, o } = find(r);
    const gas = gasOf(o);
    if (gas[0] === addr && gas.length === 1 && isActionTarget(d, o.id))
      throw new EditRefusal(
        t`${addr} is the only address of the key using ${o.name ?? o.id} (${d.name ?? d.id}): a key must send on an address`,
      );
    setGas(
      o,
      gas.filter((g) => g !== addr),
    );
  });
}

/**
 * Make one of an object's addresses its sending address (the first of its list); the
 * other addresses keep their order and remain listened to.
 */
export function setSendingGa(
  doc: Doc,
  devId: string,
  objectId: string,
  addr: string,
) {
  const o = device(doc, devId).objects.find((x) => x.id === objectId);
  if (!o) throw new EditRefusal(t`object “${objectId}” not found`);
  const gas = gasOf(o);
  if (!gas.includes(addr))
    throw new EditRefusal(t`${addr} is not linked to ${o.name ?? o.id}`);
  setGas(o, [addr, ...gas.filter((g) => g !== addr)]);
}

export interface CopyWhat {
  /** Output settings such as timer and travel time. */
  parameters: boolean;
  /** Connected load: type, room, settings, and initial state. */
  load: boolean;
  /** Scene presets. */
  scenes: boolean;
}

export interface ChannelRef {
  dev: string;
  ch: string;
}

/** Outputs that can receive an output's settings must have the same behavior. */
export function copyTargets(doc: Doc, devId: string, ch: string) {
  const src = device(doc, devId);
  return doc.devices
    .filter((d) => d.behavior === src.behavior)
    .flatMap((d) =>
      (d.channels ?? [])
        .filter((c) => !(d.id === devId && c.id === ch))
        .map((c) => ({
          dev: d.id,
          ch: c.id,
          deviceName: d.name ?? d.id,
          label: c.label ?? c.id,
        })),
    );
}

/**
 * Copy one output's settings to other outputs of the same behavior. Objects,
 * group addresses, and target labels are never changed.
 */
export function copyChannelSettings(
  doc: Doc,
  devId: string,
  ch: string,
  targets: ChannelRef[],
  what: CopyWhat,
) {
  const srcDev = device(doc, devId);
  const src = channel(srcDev, ch);
  if (!targets.length) throw new EditRefusal(t`no output selected`);
  if (!what.parameters && !what.load && !what.scenes)
    throw new EditRefusal(t`no setting selected`);
  const clone = <T>(v: T): T => structuredClone(v);
  targets.forEach((r) => {
    const d = device(doc, r.dev);
    if (d.behavior !== srcDev.behavior)
      throw new EditRefusal(
        t`${d.name ?? d.id} does not have the same behaviour as ${srcDev.name ?? srcDev.id}`,
      );
    const c = channel(d, r.ch);
    const put = (key: "parameters" | "equipment" | "scenes") => {
      if (src[key] === undefined) delete c[key];
      else c[key] = clone(src[key]) as never;
    };
    if (what.parameters) put("parameters");
    if (what.load) put("equipment");
    if (what.scenes) put("scenes");
  });
}
