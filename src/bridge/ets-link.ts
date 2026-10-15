// Link between the simulation and ETS through the busdiagram-ets program (ets-bridge/),
// which serves this page and runs a KNXnet/IP tunnelling server that ETS connects to.
//
// WebSocket protocol: each binary message is one cEMI L_Data frame (a group telegram, or
// a device management frame to or from a device), both ways; the program also sends {"type":"status","ets":N}, the number of ETS tunnels.
//
// The simulation is reached at one access point: a bus interface of the scenario, or,
// without one, its main line:
// - a group telegram from ETS enters the bus there (Simulation.ingest) with its bytes;
// - a telegram that reaches that point through the topology leaves for ETS
//   (Simulation.tap), with the routing counter it has there.
import {
  CemiError,
  L_DATA_CON,
  L_DATA_IND,
  dataToRaw,
  decodeCemi,
  encodeCemi,
  rawToData,
} from "../knx/cemi";
import { DeviceManagement, decodeLData } from "../knx/management";
import type { AccessPoint, Simulation, Telegram } from "../knx/sim";
import type { Translate } from "../i18n";
import { en } from "../i18n";

/** cEMI frame of a telegram on the bus at the access point, sent to ETS. */
export function telegramCemi(tel: Telegram, hopCount: number): Uint8Array {
  const read = tel.service === "GroupValueRead";
  return encodeCemi({
    messageCode: L_DATA_IND,
    service: tel.service,
    source: tel.sourceAddress,
    ga: tel.ga,
    priority: tel.priority,
    hopCount: Math.max(0, Math.min(7, hopCount)),
    size: read ? 0 : tel.size,
    data: read ? [] : rawToData(tel.raw, tel.size),
  });
}

export type LinkState =
  /** Not started, stopped by the reader, or taken over by another diagram (`detail`). */
  | "off"
  | "connecting"
  /** Connected to the program: telegrams flow as soon as ETS is connected too. */
  | "open"
  /** Lost; `detail` says why. The view may try again. */
  | "closed";

export interface LinkStatus {
  state: LinkState;
  /** Why the link is closed. */
  detail: string;
  /** ETS connections (tunnels) open on the program. */
  ets: number;
  /** Telegrams sent to ETS, received from ETS, and received but not let in. */
  sent: number;
  received: number;
  refused: number;
  /** Last problem met while open (frame refused, telegram not let in…). */
  lastProblem: string;
}

/** Minimal WebSocket, so that tests can provide their own. */
export interface SocketLike {
  binaryType: string;
  readyState: number;
  send(data: string | Uint8Array): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code: number; reason: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export interface EtsLinkOptions {
  /** WebSocket address of the program, such as ws://127.0.0.1:3761/ws. */
  url: string;
  /**
   * Simulation and its access point (a bus interface, or the main line), read at each
   * telegram.
   */
  target: () => { sim: Simulation; access: AccessPoint } | null;
  /**
   * Why a telegram from ETS cannot enter now (simulation paused or stopped), or null:
   * commands are refused rather than queued and played later in a batch.
   */
  accepting: () => string | null;
  /** Status changes and telegram counts, for the view. */
  onStatus: (s: LinkStatus) => void;
  /** A telegram from ETS entered the simulation: the view must run it. */
  onIngest?: (tel: Telegram) => void;
  socket?: (url: string) => SocketLike;
  /** Language of the status messages. */
  t?: Translate;
}

function closeReason(code: number, t: Translate): string {
  switch (code) {
    case 1000:
      return t`closed`;
    case 1001:
      return t`the program is shutting down`;
    case 4001:
      return t`another diagram was linked to ETS`;
    default:
      return t`connection lost: is BusDiagram-ETS running?`;
  }
}

export class EtsLink {
  private ws: SocketLike | null = null;
  private untap: (() => void) | null = null;
  private status: LinkStatus = {
    state: "off",
    detail: "",
    ets: 0,
    sent: 0,
    received: 0,
    refused: 0,
    lastProblem: "",
  };

  private readonly t: Translate;
  /** Device management of the simulated devices (individual address, descriptor…). */
  private readonly management: DeviceManagement;

  constructor(private readonly o: EtsLinkOptions) {
    this.t = o.t ?? en;
    this.management = new DeviceManagement(() => this.o.target()?.sim ?? null);
  }

  get current(): LinkStatus {
    return { ...this.status };
  }

  connect() {
    this.close();
    this.update({ state: "connecting", detail: this.o.url });
    let ws: SocketLike;
    try {
      ws = this.o.socket
        ? this.o.socket(this.o.url)
        : (new WebSocket(this.o.url) as unknown as SocketLike);
    } catch (e) {
      this.update({ state: "closed", detail: String((e as Error).message) });
      return;
    }
    this.ws = ws;
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.attach();
      this.update({ state: "open", detail: "" });
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      if (typeof ev.data === "string") this.onText(ev.data);
      else if (ev.data instanceof ArrayBuffer || ev.data instanceof Uint8Array)
        this.onFrame(new Uint8Array(ev.data));
    };
    ws.onclose = (ev) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.detach();
      // Another diagram was linked: this one stops, without trying again.
      this.update({
        state: ev.code === 4001 ? "off" : "closed",
        ets: 0,
        detail: closeReason(ev.code, this.t),
      });
    };
    ws.onerror = () => undefined;
  }

  /** Stop the link; nothing that was not yet sent is sent later. */
  close() {
    const ws = this.ws;
    this.ws = null;
    this.detach();
    if (ws) ws.close(1000, "closed by the reader");
    if (this.status.state !== "off")
      this.update({ state: "off", detail: "", ets: 0 });
  }

  /** Follow another simulation (scenario loaded again): tap its access point. */
  retarget() {
    if (this.status.state === "open") this.attach();
  }

  private update(p: Partial<LinkStatus>) {
    this.status = { ...this.status, ...p };
    this.o.onStatus(this.current);
  }

  private refuse(message: string) {
    this.update({ refused: this.status.refused + 1, lastProblem: message });
  }

  private onText(text: string) {
    try {
      const m = JSON.parse(text) as { type?: string; ets?: unknown };
      if (m.type === "status" && typeof m.ets === "number")
        this.update({ ets: m.ets });
    } catch {
      // Not a status: ignored.
    }
  }

  private onFrame(cemi: Uint8Array) {
    // Device management (programming an individual address, finding a device): the
    // devices answer at once, outside the group communication of the simulation.
    const l = decodeLData(cemi);
    if (l && l.messageCode !== L_DATA_CON && DeviceManagement.concerns(l)) {
      this.update({ received: this.status.received + 1 });
      const ws = this.ws;
      for (const frame of this.management.handle(l)) {
        if (!ws || ws.readyState !== 1) break;
        ws.send(frame);
        this.update({ sent: this.status.sent + 1 });
      }
      return;
    }
    let f;
    try {
      f = decodeCemi(cemi);
    } catch (e) {
      if (e instanceof CemiError)
        return this.refuse(this.t`frame from ETS ignored: ${e.message}`);
      throw e;
    }
    // A confirmation tells the sender its frame left; it is not a telegram on the bus.
    if (f.messageCode === L_DATA_CON) return;
    this.update({ received: this.status.received + 1 });
    const target = this.o.target();
    const why = !target ? this.t`no scenario loaded` : this.o.accepting();
    if (!target || why)
      return this.refuse(
        this.t`telegram from ETS to ${f.ga} not let in: ${why}`,
      );
    if (f.size > 4)
      return this.refuse(
        this.t`telegram from ETS to ${f.ga}: ${f.size} bytes are not simulated`,
      );
    const tel = target.sim.ingest(target.access, {
      service: f.service,
      ga: f.ga,
      sourceAddress: f.source,
      size: f.size,
      raw: f.service === "GroupValueRead" ? 0 : dataToRaw(f.data, f.size),
      // The simulation has no system priority for group telegrams.
      priority: f.priority === "system" ? "urgent" : f.priority,
      hopCount: f.hopCount,
    });
    if (!tel)
      return this.refuse(
        this.t`telegram from ETS to ${f.ga} not let in (see the journal)`,
      );
    this.o.onIngest?.(tel);
  }

  private attach() {
    this.detach();
    const target = this.o.target();
    if (!target) return;
    this.untap = target.sim.tap(target.access, (e) => {
      const ws = this.ws;
      if (!ws || ws.readyState !== 1 || this.status.state !== "open") return;
      ws.send(telegramCemi(e.telegram, e.hopCount));
      this.update({ sent: this.status.sent + 1 });
    });
  }

  private detach() {
    this.untap?.();
    this.untap = null;
  }
}
