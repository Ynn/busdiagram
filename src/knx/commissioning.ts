// Commissioning procedures, as ETS runs them on an installation: program an individual
// address with the programming button, download an application, unload it, scan a line,
// list the devices in programming mode. They act on a simulation (what the devices
// answer) and on the scenario's `installation` section (what they hold). The application
// is downloaded to the device that answers at the address of the project: if the wrong
// programming button was pressed, the wrong device receives it, as on a real bus.
import type { Translate } from "../i18n";
import { en } from "../i18n";
import { compareAddress, parseLine } from "./address";
import type { JsonObject } from "./contracts";
import {
  FACTORY_ADDRESS,
  FACTORY_COUPLER_ADDRESS,
  applicationOf,
  memoryJson,
  parseMemory,
  programOf,
} from "./installation";
import { heldApplication, sameParameters, projectMemory } from "../bcu/device";
import { Network } from "./network";
import { captureRegistry } from "./registry";
import type { Scenario } from "./scenario";
import { buildScenario, commissionable } from "./scenario";
import type { Simulation } from "./sim";
import { couplerTarget } from "./sim";

type Rec = Record<string, unknown>;
const isRecord = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Result of a procedure. */
export type CommissioningResult =
  /**
   * Done. `installation` is the new section of the scenario; `restart` is true when an
   * application changed, which takes a new simulation (the address changes are already
   * in the running one).
   */
  | {
      status: "done";
      message: string;
      installation: JsonObject;
      restart: boolean;
    }
  /** ETS waits for a programming button: run the procedure again once one is pressed. */
  | { status: "waiting"; message: string }
  | { status: "failed"; message: string };

/** The project of a scenario, without its installation section. */
export function projectOf(raw: unknown): Scenario {
  if (!isRecord(raw)) return buildScenario(raw);
  const rest = { ...raw };
  delete rest.installation;
  return buildScenario(rest);
}

/** Individual address that the project gives to a device or coupler target. */
export function projectAddress(project: Scenario, target: string): string {
  if (target.startsWith("coupler:")) return target.slice(8);
  return project.devicesById.get(target)?.address ?? "";
}

/** What ETS expects at an address: its application program, or a coupler. */
function programIn(raw: Rec, target: string): string {
  if (target.startsWith("coupler:")) return "coupler";
  const d = (raw.devices as Rec[]).find((x) => x.id === target);
  return d ? programLabel(d) : "";
}

const programOfDevice = (d: Scenario["devices"][number] | undefined) =>
  d ? programLabel({ behavior: d.behavior }) : null;

/**
 * Application program of a device: that of a manufacturer's product (manufacturer,
 * product) when it is one, otherwise its behavior.
 */
export function programLabel(d: { behavior?: unknown }) {
  const behavior = typeof d.behavior === "string" ? d.behavior : "";
  const p = captureRegistry().bcuProducts.get(behavior);
  return p ? `${p.manufacturer} ${p.name}` : programOf(d as Rec);
}

/** Name of a target in the project, for messages. */
export function targetLabel(project: Scenario, target: string, t: Translate) {
  if (target.startsWith("coupler:")) {
    const a = target.slice(8);
    const net = new Network(project, undefined, t);
    const c = net.topology.couplers.find((x) => x.address === a);
    return c ? `${a} ${net.couplerName(c)}` : a;
  }
  const d = project.devicesById.get(target);
  return d ? `${d.address} ${d.name}` : target;
}

/** The installation section of a raw scenario, as an object to change. */
function sectionOf(sim: Simulation): {
  devices: Rec[];
  couplers: Rec[];
} {
  const s = (sim.installation() ?? {}) as Rec;
  return {
    devices: Array.isArray(s.devices) ? (s.devices as Rec[]) : [],
    couplers: Array.isArray(s.couplers) ? (s.couplers as Rec[]) : [],
  };
}

function entryOf(
  section: { devices: Rec[]; couplers: Rec[] },
  sim: Simulation,
  target: string,
): Rec {
  const coupler = target.startsWith("coupler:");
  const list = coupler ? section.couplers : section.devices;
  const key = coupler ? "coupler" : "device";
  const id = coupler ? target.slice(8) : target;
  let e = list.find((x) => x[key] === id);
  if (!e) {
    e = { [key]: id, address: sim.physicalAddress(target) };
    list.push(e);
  }
  return e;
}

const done = (
  message: string,
  section: { devices: Rec[]; couplers: Rec[] },
  restart: boolean,
): CommissioningResult => {
  const installation: Rec = {};
  if (section.devices.length) installation.devices = section.devices;
  if (section.couplers.length) installation.couplers = section.couplers;
  return {
    status: "done",
    message,
    installation: installation as JsonObject,
    restart,
  };
};

/**
 * Program the individual address of the project into the device whose programming
 * button is pressed. ETS first checks that no other device already answers at that
 * address, then waits for exactly one device in programming mode, writes the address,
 * and restarts it, which ends programming mode.
 */
export function programIndividualAddress(
  raw: unknown,
  sim: Simulation,
  target: string,
  t: Translate = en,
): CommissioningResult {
  if (!sim.commissioning)
    return {
      status: "failed",
      message: t`This diagram does not simulate commissioning.`,
    };
  const project = projectOf(raw);
  const address = projectAddress(project, target);
  const pressed = sim.readAddressInProgrammingMode();
  const holders = sim.reachableAt(address);
  if (holders.length && !holders.every((h) => pressed.includes(h)))
    return {
      status: "failed",
      message: t`The individual address ${address} is already used on the bus by another device. Scan the line, then give a free address in the project or reprogram that device.`,
    };
  if (!pressed.length)
    return {
      status: "waiting",
      message: t`Press the programming button of ${targetLabel(project, target, t)}.`,
    };
  if (pressed.length > 1)
    return {
      status: "failed",
      message: t`Several devices are in programming mode (${pressed.map((p) => sim.physicalAddress(p)).join(", ")}): only one programming LED may be on. Press the programming button again on the devices that should not be programmed.`,
    };
  const written = sim.writeIndividualAddress(address);
  written.forEach((w) => sim.restartDevice(w));
  return done(
    t`Individual address ${address} programmed.`,
    sectionOf(sim),
    false,
  );
}

/**
 * Download the application of the project to the device at its individual address
 * (ETS: Download → Partial, or Application). The device must answer at that address and
 * have the same application program; otherwise nothing is downloaded.
 */
export function downloadApplication(
  raw: unknown,
  sim: Simulation,
  target: string,
  t: Translate = en,
): CommissioningResult {
  if (!sim.commissioning || !isRecord(raw))
    return {
      status: "failed",
      message: t`This diagram does not simulate commissioning.`,
    };
  const project = projectOf(raw);
  const address = projectAddress(project, target);
  const found = sim.reachableAt(address);
  if (!found.length)
    return {
      status: "failed",
      message: t`No device answers at ${address}. Program its individual address first (Download → Individual address, or Download all), and check its line and bus voltage.`,
    };
  if (found.length > 1)
    return {
      status: "failed",
      message: t`Several devices answer at ${address}: the address is used twice on the bus. Scan the line and give each device its own address.`,
    };
  const physical = found[0]!;
  const expected = programIn(raw, target);
  const pd = project.devicesById.get(physical);
  const held = physical.startsWith("coupler:")
    ? "coupler"
    : pd
      ? programLabel({ behavior: pd.behavior })
      : "";
  if (held !== expected)
    return {
      status: "failed",
      message: t`The device at ${address} does not have the application program of the project (${held === "coupler" ? t`coupler` : held} found, ${expected === "coupler" ? t`coupler` : expected} expected). Check that the right programming button was pressed.`,
    };
  const section = sectionOf(sim);
  const e = entryOf(section, sim, physical);
  if (target.startsWith("coupler:")) {
    const net = new Network(project, undefined, t);
    const c = net.topology.couplers.find(
      (x) => couplerTarget(x.address) === target,
    )!;
    e.application = {
      filterTable: net.filterTable(c),
      down: net.routing(c, "B"),
      up: net.routing(c, "A"),
    };
  } else {
    const d = (raw.devices as Rec[]).find((x) => x.id === target)!;
    const image = projectImage(d);
    if (image) {
      // A manufacturer's device: the memory as a complete download by ETS writes it.
      e.memory = memoryJson(image.memory);
      delete e.application;
    } else e.application = applicationOf(d);
  }
  return done(
    physical === target
      ? t`Application downloaded to ${address}.`
      : t`Application downloaded to ${address}: the device that answered there is ${targetLabel(project, physical, t)} of the diagram, not the one of the project.`,
    section,
    true,
  );
}

/**
 * Download all (ETS: individual address and application): the individual address with
 * the programming button, then the application.
 */
export function downloadAll(
  raw: unknown,
  sim: Simulation,
  target: string,
  t: Translate = en,
): CommissioningResult {
  const project = projectOf(raw);
  const address = projectAddress(project, target);
  // Already at its address (and not in programming mode): the application only.
  const at = sim.reachableAt(address);
  if (!(at.length === 1 && !sim.programmingMode(at[0]!))) {
    const r = programIndividualAddress(raw, sim, target, t);
    if (r.status !== "done") return r;
  }
  const r = downloadApplication(raw, sim, target, t);
  return r.status === "done"
    ? {
        ...r,
        message: t`Individual address and application downloaded to ${address}.`,
      }
    : r;
}

/** Unload the application of the device at the project's address (ETS: Unload). */
export function unloadApplication(
  raw: unknown,
  sim: Simulation,
  target: string,
  t: Translate = en,
): CommissioningResult {
  if (!sim.commissioning)
    return {
      status: "failed",
      message: t`This diagram does not simulate commissioning.`,
    };
  const project = projectOf(raw);
  const address = projectAddress(project, target);
  const found = sim.reachableAt(address);
  if (found.length !== 1)
    return {
      status: "failed",
      message: found.length
        ? t`Several devices answer at ${address}: the address is used twice on the bus.`
        : t`No device answers at ${address}.`,
    };
  const section = sectionOf(sim);
  const e = entryOf(section, sim, found[0]!);
  delete e.application;
  // A manufacturer's device: its memory as delivered, without an application.
  delete e.memory;
  return done(t`Application unloaded from ${address}.`, section, true);
}

/** Device found by a line scan. */
export interface ScanRow {
  address: string;
  /** Device or coupler of the diagram that answered (`coupler:…` for a coupler). */
  target: string;
  /** Application program it holds, or null when none is loaded. */
  program: string | null;
  programmingMode: boolean;
}

/**
 * Scan a line (ETS: Diagnostics → Line scan): the devices that answer at the addresses
 * of the line, with what they hold. Unprogrammed devices (15.15.255) are not on it.
 */
export function scanLine(sim: Simulation, line: string): ScanRow[] {
  if (!parseLine(line)) return [];
  const prefix = `${line}.`;
  return sim
    .commissioningTargets()
    .map((target) => ({ target, address: sim.physicalAddress(target) }))
    .filter((r) => r.address.startsWith(prefix))
    .filter((r) => sim.reachableAt(r.address).includes(r.target))
    .map((r) => ({
      ...r,
      program: sim.applicationLoaded(r.target)
        ? r.target.startsWith("coupler:")
          ? "coupler"
          : programOfDevice(sim.scenario.devicesById.get(r.target))
        : null,
      programmingMode: sim.programmingMode(r.target),
    }))
    .sort((a, b) => compareAddress(a.address, b.address));
}

/**
 * Installation where every device and coupler holds the project: its address and its
 * application, as after a complete download. For an author who starts from a working
 * installation, or to correct an exercise.
 */
export function installationAsProject(raw: unknown): JsonObject {
  const project = projectOf(raw);
  const r = raw as Rec;
  const devices = (r.devices as Rec[])
    .filter((d) => {
      const dev = project.devicesById.get(d.id as string);
      return dev && commissionable(dev);
    })
    .map((d) => {
      // A manufacturer's device holds the memory a complete download of the project writes.
      const memory = (d.ets as Rec | undefined)?.memory;
      return {
        device: d.id,
        address: project.devicesById.get(d.id as string)!.address,
        application: applicationOf(d),
        ...(memory ? { memory } : {}),
      };
    });
  const net = new Network(project);
  const couplers = net.topology.couplers.map((c) => ({
    coupler: c.address,
    address: c.address,
    application: {
      filterTable: net.filterTable(c),
      down: net.routing(c, "B"),
      up: net.routing(c, "A"),
    },
  }));
  return { devices, couplers } as unknown as JsonObject;
}

/** Installation as delivered: every device and coupler at its factory address, empty. */
export const factoryInstallation = (): JsonObject => ({});

export { FACTORY_ADDRESS, FACTORY_COUPLER_ADDRESS };

/**
 * State of a device in the project against what it holds, as the columns of the ETS
 * topology: individual address programmed (Adr), application program loaded (Prg),
 * parameters (Par), group addresses (Grp), and configuration (Cfg: flags, DPTs,
 * priorities) up to date. A coupler has no Par or Cfg; its Grp is the filter table.
 */
export interface DownloadState {
  adr: boolean;
  prg: boolean;
  par: boolean;
  grp: boolean;
  cfg: boolean;
}

const json = (v: unknown) => JSON.stringify(v ?? null);

/** Download state of each target of a scenario with an installation section. */
/** Memory of a manufacturer's device with the project's settings, if it has one. */
function projectImage(d: Rec): { mask: string; memory: Uint8Array } | null {
  const ets = d.ets;
  if (
    !isRecord(ets) ||
    typeof ets.mask !== "string" ||
    ets.memory === undefined
  )
    return null;
  const memory = parseMemory(ets.memory);
  if (!memory) return null;
  const objects = Array.isArray(d.objects) ? (d.objects as unknown[]) : [];
  const address = typeof d.address === "string" ? d.address : "";
  return {
    mask: ets.mask,
    memory: projectMemory(ets.mask, memory, objects, address),
  };
}

export function downloadStates(
  raw: unknown,
  registry = captureRegistry(),
): Map<string, DownloadState> {
  const out = new Map<string, DownloadState>();
  if (!isRecord(raw) || !isRecord(raw.installation)) return out;
  let project: Scenario;
  let installed: Scenario;
  try {
    project = projectOf(raw);
    installed = buildScenario(raw, registry);
  } catch {
    return out;
  }
  const k = installed.commissioning!;
  (raw.devices as Rec[]).forEach((d) => {
    const dev = project.devicesById.get(d.id as string);
    if (!dev || !commissionable(dev)) return;
    const held = k.devices.get(dev.id);
    const image = projectImage(d);
    const product = image && registry.bcuProducts.get(dev.behavior);
    // A manufacturer's device holds the application of its memory, compared with the
    // one of the project's image.
    const app = (
      product
        ? held?.memory &&
          heldApplication(
            product,
            image.mask,
            held.memory,
            d.objects as unknown[],
          )
        : held?.application
    ) as Rec | null | undefined;
    const want = ((product &&
      heldApplication(
        product,
        image.mask,
        image.memory,
        d.objects as unknown[],
      )) ??
      applicationOf(d)) as Rec;
    const prg = !!app && programOf(app) === programOf(want);
    const objects = (o: unknown, part: "ga" | "cfg") =>
      (Array.isArray(o) ? o : [])
        .filter(isRecord)
        .map((x) =>
          part === "ga"
            ? [x.id, x.ga ?? null]
            : [x.id, x.flags ?? null, x.dpt ?? null, x.priority ?? null],
        );
    const params = (a: Rec) => [
      a.parameters ?? null,
      a.buttons ?? null,
      (Array.isArray(a.channels) ? a.channels : []).map((c: Rec) => [
        c.id,
        c.parameters ?? null,
        c.scenes ?? null,
      ]),
      (Array.isArray(a.objects) ? a.objects : [])
        .filter(isRecord)
        .map((x) => [x.id, x.port ?? null, x.channel ?? null]),
    ];
    out.set(dev.id, {
      adr: (held?.address ?? FACTORY_ADDRESS) === dev.address,
      prg,
      par:
        prg &&
        (product
          ? sameParameters(product, held!.memory!, image.memory)
          : json(params(app!)) === json(params(want))),
      grp:
        prg &&
        json(objects(app!.objects, "ga")) === json(objects(want.objects, "ga")),
      cfg:
        prg &&
        json(objects(app!.objects, "cfg")) ===
          json(objects(want.objects, "cfg")),
    });
  });
  const net = new Network(project);
  net.topology.couplers.forEach((c) => {
    const held = k.couplers.get(c.address);
    const app = held?.application;
    const prg = !!app;
    out.set(couplerTarget(c.address), {
      adr: (held?.address ?? FACTORY_COUPLER_ADDRESS) === c.address,
      prg,
      par:
        prg &&
        app.down === net.routing(c, "B") &&
        app.up === net.routing(c, "A"),
      grp: prg && json(app.filterTable) === json(net.filterTable(c)),
      cfg: prg,
    });
  });
  return out;
}
