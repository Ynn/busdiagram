// Commissioning in the guided workspace, as in ETS: download state columns (Adr, Prg, Par,
// Grp, Cfg) in the device lists, Download commands in the context menus, a line scan,
// the devices in programming mode, and a bar that waits for a programming button and
// keeps the history of the operations. The procedures run on the simulation of the
// preview, which holds the devices as installed; their result is written to the
// scenario's installation section.
import { html, nothing } from "lit";
import type { TemplateResult } from "lit";
import {
  downloadAll,
  downloadApplication,
  downloadStates,
  installationAsProject,
  programIndividualAddress,
  scanLine,
  unloadApplication,
} from "../../src/knx/commissioning";
import type {
  CommissioningResult,
  DownloadState,
} from "../../src/knx/commissioning";
import type { JsonObject } from "../../src/knx/contracts";
import { buildScenario } from "../../src/knx/scenario";
import { Network, buildTopology } from "../../src/knx/network";
import type { Simulation } from "../../src/knx/sim";
import { couplerTarget } from "../../src/knx/sim";
import type { Dev, Doc } from "./edit";
import { t } from "./lang";
import type { Column } from "./ws-table";
import type { Host, MenuItem } from "./ws-state";

/** What the workspace needs from the designer to commission. */
export interface Commissioner {
  /** Simulation of the preview: the devices as installed. */
  sim(): Simulation | null;
  /**
   * Write the installation section of the scenario, outside the undo history. `restart`:
   * an application changed, the preview starts again with it.
   */
  apply(installation: JsonObject, restart: boolean): void;
}

type Procedure = (doc: Doc, sim: Simulation) => CommissioningResult;

export interface CommissionState {
  /** Operation that waits for a programming button. */
  pending: { label: string; message: string; run: Procedure } | null;
  /** History of the operations, the latest first. */
  log: { ok: boolean; label: string; message: string; at: string }[];
}

export const initialCommission = (): CommissionState => ({
  pending: null,
  log: [],
});

/** Does the scenario simulate commissioning? */
export const commissioned = (doc: Doc | null) =>
  !!doc && typeof doc.installation === "object" && doc.installation !== null;

// ── Download state ─────────────────────────────────────────────────────────

const stateCache = new WeakMap<Doc, Map<string, DownloadState>>();
function statesOf(doc: Doc) {
  let s = stateCache.get(doc);
  if (!s) stateCache.set(doc, (s = downloadStates(doc)));
  return s;
}

const COLUMNS: [keyof DownloadState, string, () => string][] = [
  ["adr", "Adr", () => t`Individual address programmed in the device`],
  ["prg", "Prg", () => t`Application program loaded`],
  ["par", "Par", () => t`Parameters downloaded and up to date`],
  [
    "grp",
    "Grp",
    () => t`Group addresses (associations) downloaded and up to date`,
  ],
  [
    "cfg",
    "Cfg",
    () => t`Configuration (flags, DPTs, priorities) downloaded and up to date`,
  ],
];

/** Columns of the download state, as in the ETS topology, for a list of devices. */
export function stateColumns(doc: Doc): Column<Dev>[] {
  if (!commissioned(doc)) return [];
  const states = statesOf(doc);
  return COLUMNS.map(([k, label, title]) => ({
    id: `dl-${k}`,
    label,
    title: title(),
    className: "w-flag",
    sort: (d: Dev) => (states.get(d.id)?.[k] ? 1 : 0),
    cell: (d: Dev) => {
      const s = states.get(d.id);
      if (!s) return nothing;
      return s[k]
        ? html`<span class="w-dl ok" title=${title()}>✓</span>`
        : html`<span class="w-dl" title=${t`To download`}>✗</span>`;
    },
  }));
}

/** Summary of the download state of a coupler, for the line settings. */
export function couplerState(doc: Doc, address: string): string {
  const s = statesOf(doc).get(couplerTarget(address));
  if (!s) return "";
  const parts = COLUMNS.filter(([k]) => k !== "cfg").map(
    ([k, label]) => `${label} ${s[k] ? "✓" : "✗"}`,
  );
  return parts.join(" · ");
}

// ── Procedures ─────────────────────────────────────────────────────────────

const now = () =>
  new Date().toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

function record(host: Host, ok: boolean, label: string, message: string) {
  host.ws.commission.log.unshift({ ok, label, message, at: now() });
  host.ws.commission.log.length = Math.min(host.ws.commission.log.length, 30);
}

/** Run a procedure; one that waits for a programming button is retried on each change. */
export function runProcedure(host: Host, label: string, run: Procedure) {
  const sim = host.commissioner.sim();
  const doc = host.doc;
  if (!sim || !doc) return;
  if (!sim.commissioning) {
    record(
      host,
      false,
      label,
      t`The preview does not simulate commissioning yet.`,
    );
    host.requestUpdate();
    return;
  }
  // The procedure changes the installation itself (an address written): the changes it
  // causes do not run it again.
  host.ws.commission.pending = null;
  running = true;
  let r: CommissioningResult;
  try {
    r = run(doc, sim);
  } finally {
    running = false;
  }
  if (r.status === "waiting")
    host.ws.commission.pending = { label, message: r.message, run };
  if (r.status === "done") {
    record(host, true, label, r.message);
    host.commissioner.apply(r.installation, r.restart);
  } else if (r.status === "failed") record(host, false, label, r.message);
  host.requestUpdate();
}

let running = false;

/** The installation changed (a programming button): an operation that waits goes on. */
export function installationChanged(host: Host) {
  const p = host.ws.commission.pending;
  if (p && !running) runProcedure(host, p.label, p.run);
  else host.requestUpdate();
}

const target = (key: string) =>
  key.startsWith("cpl:") ? couplerTarget(key.slice(4)) : key;

/** Download commands of a device (`dev:<id>`) or coupler (`cpl:<address>`). */
export function downloadItems(
  host: Host,
  key: string,
  name: string,
): MenuItem[] {
  if (!commissioned(host.doc)) return [];
  const id = target(key.startsWith("dev:") ? key.slice(4) : key);
  const items: [string, Procedure][] = [
    [
      t`Download all (individual address and application)`,
      (d, s) => downloadAll(d, s, id, t),
    ],
    [
      t`Download: individual address`,
      (d, s) => programIndividualAddress(d, s, id, t),
    ],
    [
      t`Download: partial (application)`,
      (d, s) => downloadApplication(d, s, id, t),
    ],
    [t`Unload the application`, (d, s) => unloadApplication(d, s, id, t)],
  ];
  return items.map(([label, run]) => ({
    label,
    run: () => runProcedure(host, `${label} — ${name}`, run),
  }));
}

/** Line scan, as a command of a line. */
export function scanItem(host: Host, line: string): MenuItem[] {
  if (!commissioned(host.doc)) return [];
  return [
    {
      label: t`Scan the line`,
      run: () => {
        const sim = host.commissioner.sim();
        if (!sim) return;
        const rows = scanLine(sim, line);
        record(
          host,
          true,
          t`Line scan ${line}`,
          rows.length
            ? rows
                .map(
                  (r) =>
                    `${r.address} ${r.program === null ? t`(no application)` : r.program === "coupler" ? t`(coupler)` : `(${r.program})`}${r.programmingMode ? ` ${t`programming mode`}` : ""}`,
                )
                .join(" · ")
            : t`No device answers on line ${line}.`,
        );
        host.requestUpdate();
      },
    },
  ];
}

/**
 * Couplers and repeaters with their names: those of a line (its line coupler, its
 * extension), or the area coupler of an area (`area:1`).
 */
export function lineCouplers(
  doc: Doc,
  line: string,
): { address: string; name: string }[] {
  const area = line.startsWith("area:") ? line.slice(5) : null;
  if (!commissioned(doc)) return [];
  try {
    const project: Record<string, unknown> = { ...doc };
    delete project.installation;
    const net = new Network(buildScenario(project), undefined, t);
    return net.topology.couplers
      .filter((c) =>
        area ? c.line === null && c.address === `${area}.0.0` : c.line === line,
      )
      .map((c) => ({
        address: c.address,
        name: `${c.address} ${net.couplerName(c)}`,
      }));
  } catch {
    return [];
  }
}

/** Remove the entries of devices and couplers that the project no longer has. */
export function pruneInstallation(doc: Doc) {
  const inst = doc.installation as
    | { devices?: { device: string }[]; couplers?: { coupler: string }[] }
    | undefined;
  if (!inst || typeof inst !== "object") return;
  const ids = new Set(doc.devices.map((d) => d.id));
  if (Array.isArray(inst.devices)) {
    inst.devices = inst.devices.filter((e) => ids.has(e.device));
    if (!inst.devices.length) delete inst.devices;
  }
  if (Array.isArray(inst.couplers)) {
    try {
      const project: Record<string, unknown> = { ...doc };
      delete project.installation;
      const couplers = new Set(
        buildTopology(buildScenario(project)).couplers.map((c) => c.address),
      );
      inst.couplers = inst.couplers.filter((e) => couplers.has(e.coupler));
      if (!inst.couplers.length) delete inst.couplers;
    } catch {
      // The project is not valid: the edit is refused anyway.
    }
  }
}

// ── Bar ────────────────────────────────────────────────────────────────────

/** Bar of the workspace: waiting operation, global commands, history. */
export function commissionBar(
  host: Host,
  doc: Doc,
): TemplateResult | typeof nothing {
  if (!commissioned(doc)) return nothing;
  const c = host.ws.commission;
  const inMode = () => {
    const sim = host.commissioner.sim();
    if (!sim) return;
    const on = sim.readAddressInProgrammingMode();
    record(
      host,
      true,
      t`Devices in programming mode`,
      on.length
        ? on
            .map((k) => `${sim.physicalAddress(k)} ${sim.targetName(k)}`)
            .join(" · ")
        : t`No device is in programming mode.`,
    );
    host.requestUpdate();
  };
  return html`<section class="w-commission" aria-label=${t`Commissioning`}>
    <div class="w-commission-bar">
      <b>${t`Commissioning`}</b>
      <button class="g-btn small" @click=${inMode}>
        ${t`Devices in programming mode`}
      </button>
      <button
        class="g-btn small"
        title=${t`Every device and coupler back to its delivery state: address 15.15.255 (15.15.0 for a coupler), no application.`}
        @click=${() => {
          c.pending = null;
          record(
            host,
            true,
            t`Delivery state`,
            t`Every device is back to its delivery state.`,
          );
          host.commissioner.apply({}, true);
        }}
      >
        ${t`Delivery state`}
      </button>
      <button
        class="g-btn small"
        title=${t`Every device and coupler holds the project, as after a complete download.`}
        @click=${() => {
          c.pending = null;
          record(
            host,
            true,
            t`Installation as the project`,
            t`Every device holds its address and application of the project.`,
          );
          host.commissioner.apply(installationAsProject(doc), true);
        }}
      >
        ${t`As the project`}
      </button>
    </div>
    ${
      c.pending
        ? html`<div class="w-commission-wait" role="status">
            <span class="w-spin" aria-hidden="true"></span>
            <span><b>${c.pending.label}</b> — ${c.pending.message}</span>
            <button
              class="g-btn small"
              @click=${() => {
                record(host, false, c.pending!.label, t`Cancelled.`);
                c.pending = null;
                host.requestUpdate();
              }}
            >
              ${t`Cancel`}
            </button>
          </div>`
        : nothing
    }
    ${
      c.log.length
        ? html`<ol class="w-commission-log">
            ${c.log.map(
              (e) =>
                html`<li class=${e.ok ? "ok" : "ko"}>
                  <span>${e.ok ? "✓" : "✗"}</span><time>${e.at}</time>
                  <b>${e.label}</b> ${e.message}
                </li>`,
            )}
          </ol>`
        : html`<p class="w-commission-help">
            ${t`Devices start as delivered. Right-click a device: Download all, then press its programming button in the diagram (the small square beside its address).`}
          </p>`
    }
  </section>`;
}
