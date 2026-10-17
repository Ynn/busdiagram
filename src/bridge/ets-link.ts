// Link between the simulation and ETS through the busdiagram-ets program (ets-bridge/),
// which serves this page and runs a KNXnet/IP tunnelling server that ETS connects to.
//
// WebSocket protocol: each binary message is one cEMI L_Data frame (a group telegram, or
// a device management frame to or from a device), both ways; the program also sends
// {"type":"status","ets":N}, the number of ETS tunnels. The page says
// {"type":"hello","confirms":true} when it opens: it then confirms each frame from ETS
// to a device (L_Data.con, negative when no device acknowledges it), which the program
// gives ETS instead of a confirmation of its own.
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
import type { ManagementTimers } from "../knx/management";
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
  /**
   * Why the device management of ETS (individual addresses, downloads) cannot reach the
   * devices now (simulation stopped), or null. A pause stops the application, not the
   * bus: ETS goes on programming the devices, and a download is not broken by it.
   */
  managing?: () => string | null;
  /** Status changes and telegram counts, for the view. */
  onStatus: (s: LinkStatus) => void;
  /** A telegram from ETS entered the simulation: the view must run it. */
  onIngest?: (tel: Telegram) => void;
  socket?: (url: string) => SocketLike;
  /** Language of the status messages. */
  t?: Translate;
  /** Timers of the transport connections (the tests give theirs). */
  timers?: ManagementTimers;
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
    this.management = new DeviceManagement(
      () => this.o.target()?.sim ?? null,
      (address) =>
        this.refuse(
          this
            .t`ETS downloads the device ${address}: turn on Simulate commissioning (designer, Installation panel) so that the devices hold what ETS writes`,
        ),
      (address, devices, refused) =>
        this.refuse(
          refused === "write"
            ? this
                .t`Several devices have the address ${address} (${devices.join(", ")}): none of them takes what ETS writes, give each its own address`
            : refused === "read"
              ? this
                  .t`Several devices have the address ${address} (${devices.join(", ")}): their answers to ETS differ and collide`
              : this
                  .t`Several devices have the address ${address} (${devices.join(", ")}): ETS sees the address occupied`,
        ),
      // A device ends a connection ETS left without a frame (as the fast line scan of
      // ETS finds the devices: by the T_Disconnect of each one it connected to).
      (frame) => {
        const ws = this.ws;
        if (!ws || ws.readyState !== 1) return;
        ws.send(frame);
        this.update({ sent: this.status.sent + 1 });
      },
      o.timers,
    );
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
      // The frames from ETS to a device are confirmed by the page (see the protocol);
      // the interface and its tunnels take addresses free in the line of the access
      // point, as an interface installed there.
      const addresses = interfaceAddresses(this.o.target());
      ws.send(
        JSON.stringify({
          type: "hello",
          confirms: true,
          ...(addresses.length ? { addresses: addresses.join(" ") } : {}),
        }),
      );
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
    this.management.reset();
    if (ws) ws.close(1000, "closed by the reader");
    if (this.status.state !== "off")
      this.update({ state: "off", detail: "", ets: 0 });
  }

  /** Follow another simulation (scenario loaded again): tap its access point. */
  retarget() {
    // The connections of ETS were with the devices of the former simulation.
    this.management.reset();
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
      const why = this.o.managing?.() ?? null;
      if (why)
        return this.refuse(
          this.t`device management from ETS not let in: ${why}`,
        );
      const ws = this.ws;
      // A frame to a device: its link layer acknowledgement first, as the interface
      // confirms it to ETS (negative when no device has the address).
      if (!l.group && ws && ws.readyState === 1)
        ws.send(confirmation(cemi, this.management.acknowledges(l)));
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

/**
 * L_Data.con of a frame from ETS (an L_Data.ind without additional information, as the
 * program passes it): the same frame, its confirm bit set when it was not acknowledged.
 */
export function confirmation(cemi: Uint8Array, acknowledged: boolean) {
  const out = Uint8Array.from(cemi);
  out[0] = L_DATA_CON;
  const ctrl1 = 2 + (out[1] ?? 0);
  out[ctrl1] = acknowledged ? out[ctrl1]! & ~0x01 : out[ctrl1]! | 0x01;
  return out;
}

/**
 * Addresses free in the line where ETS reaches the simulation (that of its access point),
 * from the top of the line: the interface's, then those of its four tunnels; none when
 * the access point is not on a line (or it has not five free).
 */
export function interfaceAddresses(
  target: { sim: Simulation; access: AccessPoint } | null,
): string[] {
  if (!target) return [];
  const { sim, access } = target;
  const topology = sim.network.topology;
  const segment =
    "device" in access
      ? topology.deviceSegment.get(access.device)
      : access.segment;
  const s = segment ? topology.segments.get(segment) : undefined;
  if (!s || s.kind !== "line" || !/^\d+\.\d+$/.test(s.ref)) return [];
  const used = new Set([
    ...sim.scenario.devices.map((d) => d.address),
    ...sim.commissioningTargets().map((t) => sim.physicalAddress(t)),
  ]);
  const free: string[] = [];
  for (let d = 254; d > 0 && free.length < 5; d--)
    if (!used.has(`${s.ref}.${d}`)) free.push(`${s.ref}.${d}`);
  return free.length === 5 ? free : [];
}
