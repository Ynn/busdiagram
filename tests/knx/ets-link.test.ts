// Link to ETS through busdiagram-ets (raw cEMI frames over a WebSocket), with a fake
// WebSocket.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import {
  EtsLink,
  type LinkStatus,
  type SocketLike,
} from "../../src/bridge/ets-link";
import { decodeCemi } from "../../src/knx/cemi";
import type { Simulation } from "../../src/knx/sim";
import { raw } from "./helpers";

const bytes = (hex: string) =>
  Uint8Array.from(hex.split(" ").map((x) => parseInt(x, 16))).buffer;

/** ETS (tunnel 15.15.251) writes 1 to 1/1/1, as the program passes it on. */
const ETS_WRITE = "29 00 B4 E0 FF FB 09 01 01 00 81";

class FakeSocket implements SocketLike {
  binaryType = "blob";
  readyState = 0;
  sent: (string | Uint8Array)[] = [];
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: { code: number; reason: string }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  send(d: string | Uint8Array) {
    this.sent.push(d);
  }
  close() {}
  open(ets = 1) {
    this.readyState = 1;
    this.onopen?.({});
    this.receive(JSON.stringify({ type: "status", ets }));
  }
  receive(data: string | ArrayBuffer) {
    this.onmessage?.({ data });
  }
  frames() {
    return this.sent
      .filter((x): x is Uint8Array => x instanceof Uint8Array)
      .map((x) => decodeCemi(x));
  }
}

/** ETS reads the individual address of the devices in programming mode (broadcast). */
const ETS_ADDRESS_READ = "11 00 B0 E0 FF FB 00 00 01 01 00";

function setup(
  accepting: () => string | null = () => null,
  managing?: () => string | null,
) {
  const sim: Simulation = createSimulator(raw("usb-interface.json"));
  sim.advance(3000);
  const ws = new FakeSocket();
  const statuses: LinkStatus[] = [];
  const link = new EtsLink({
    url: "ws://127.0.0.1:3761/ws",
    target: () => ({ sim, access: { device: "usbInterface" } }),
    accepting,
    managing,
    onStatus: (s) => statuses.push(s),
    socket: () => ws,
  });
  link.connect();
  return { sim, ws, link, statuses };
}

describe("link to ETS", () => {
  it("opens with the socket and follows the number of ETS connections", () => {
    const { ws, link } = setup();
    expect(link.current.state).toBe("connecting");
    ws.open(0);
    expect(link.current).toMatchObject({ state: "open", ets: 0 });
    ws.receive(JSON.stringify({ type: "status", ets: 1 }));
    expect(link.current.ets).toBe(1);
  });

  it("a write from ETS switches the actuator; its status goes back to ETS", () => {
    const { sim, ws, link } = setup();
    ws.open();
    ws.receive(bytes(ETS_WRITE));
    sim.advance(15000);
    expect(sim.equipmentState("switchActuator", "s1")?.on).toBe(true);
    const out = ws.frames();
    // The status of the actuator, from 1.2.1, after two line couplers; not the write.
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      service: "GroupValueWrite",
      source: "1.2.1",
      ga: "1/4/1",
      hopCount: 4,
      data: [1],
    });
    expect(sim.history.some((t) => t.sourceAddress === "15.15.251")).toBe(true);
    expect(link.current).toMatchObject({ received: 1, sent: 1, refused: 0 });
  });

  it("refuses telegrams while the simulation does not accept them", () => {
    const { sim, ws, link } = setup(() => "simulation paused");
    ws.open();
    ws.receive(bytes(ETS_WRITE));
    sim.advance(15000);
    expect(sim.equipmentState("switchActuator", "s1")?.on).toBe(false);
    expect(link.current.refused).toBe(1);
    expect(link.current.lastProblem).toMatch(/simulation paused/);
  });

  it("lets device management in while paused, not once stopped", () => {
    const paused = setup(
      () => "simulation paused",
      () => null,
    );
    paused.ws.open();
    paused.ws.receive(bytes(ETS_ADDRESS_READ));
    expect(paused.link.current).toMatchObject({ received: 1, refused: 0 });
    const stopped = setup(
      () => "simulation stopped",
      () => "simulation stopped",
    );
    stopped.ws.open();
    stopped.ws.receive(bytes(ETS_ADDRESS_READ));
    expect(stopped.link.current.refused).toBe(1);
    expect(stopped.link.current.lastProblem).toMatch(/device management/);
  });

  it("ignores confirmations and invalid frames", () => {
    const { sim, ws, link } = setup();
    ws.open();
    ws.receive(bytes("2E 00 B4 E0 FF FB 09 01 01 00 81"));
    ws.receive(bytes("29 00 B4 E0 FF FB 09 01 02 00 81"));
    sim.advance(15000);
    expect(sim.equipmentState("switchActuator", "s1")?.on).toBe(false);
    expect(link.current.refused).toBe(1);
  });

  it("stops sending once closed, and says why", () => {
    const { sim, ws, link } = setup();
    ws.open();
    ws.onclose?.({ code: 4001, reason: "" });
    // Another diagram took over: this one stops, without trying again.
    expect(link.current).toMatchObject({ state: "off", ets: 0 });
    expect(link.current.detail).toMatch(/another diagram/);
    sim.groupWrite("usbInterface", "1/1/1", 1);
    expect(ws.frames()).toHaveLength(0);
  });

  it("sends the diagram's own writes from the interface", () => {
    const { sim, ws } = setup();
    ws.open();
    sim.groupWrite("usbInterface", "1/1/1", 1);
    expect(ws.frames()[0]).toMatchObject({
      source: "1.1.255",
      ga: "1/1/1",
      hopCount: 6,
    });
  });

  it("says it confirms, then confirms a frame to a device as the bus acknowledges it", () => {
    const { ws } = setup();
    ws.open();
    // With the addresses of the interface and its tunnels, free at the top of the line
    // of its access point.
    const hello = JSON.parse(ws.sent[0] as string) as {
      type: string;
      confirms: boolean;
      addresses: string;
    };
    expect(hello).toMatchObject({ type: "hello", confirms: true });
    const list = hello.addresses.split(" ");
    expect(list).toHaveLength(5);
    expect(list[0]).toMatch(/^1\.1\.25[0-4]$/);
    // T_Connect from ETS to 1.1.99, where no device is.
    ws.sent = [];
    ws.receive(bytes("29 00 B0 60 FF FB 11 63 00 80"));
    const con = ws.sent.find((x): x is Uint8Array => x instanceof Uint8Array)!;
    expect(con[0]).toBe(0x2e);
    // Its confirm bit: not acknowledged.
    expect(con[2]! & 0x01).toBe(1);
  });
});
