// Device management of the simulated devices, as ETS reaches them through a tunnel
// (KNX Standard 03_03_04 Transport Layer, 03_03_07 Application Layer, 03_05_02
// Management Procedures). The devices answer what ETS asks to program an individual
// address and to find a device on the bus:
// - A_IndividualAddress_Read and _Write, sent to all: devices in programming mode answer
//   with their address, or take the new one;
// - connection-oriented communication with a device at its individual address
//   (T_Connect, numbered data acknowledged with T_ACK, T_Disconnect), and connectionless
//   communication: device descriptor, properties of the device object, authorization,
//   memory reads (zeros: the simulated devices have no memory image), restart.
// The application is not downloaded by ETS: the simulation answers that its memory and
// properties cannot be written, so that ETS stops with an error rather than in a state
// it does not know.
import { iaText } from "./cemi";
import type { Simulation } from "./sim";

/** Mask version of the simulated devices: TP1, System B (KNX Standard 03_05_01 §4.1). */
export const MASK_VERSION = 0x07b0;
/** Manufacturer code of the simulated devices: KNX Association (as KNX Virtual's). */
export const MANUFACTURER = 0x00fa;

/** A standard L_Data frame of any destination and transport service. */
export interface LDataFrame {
  messageCode: number;
  ctrl1: number;
  source: number;
  destination: number;
  /** Destination is a group address (0/0/0: sent to all). */
  group: boolean;
  hopCount: number;
  /** TPDU: TPCI octet, then the APDU. */
  tpdu: number[];
}

export const APCI = {
  individualAddressWrite: 0x0c0,
  individualAddressRead: 0x100,
  individualAddressResponse: 0x140,
  adcRead: 0x180,
  adcResponse: 0x1c0,
  memoryRead: 0x200,
  memoryResponse: 0x240,
  memoryWrite: 0x280,
  deviceDescriptorRead: 0x300,
  deviceDescriptorResponse: 0x340,
  restart: 0x380,
  authorizeRequest: 0x3d1,
  authorizeResponse: 0x3d2,
  keyWrite: 0x3d3,
  keyResponse: 0x3d4,
  propertyValueRead: 0x3d5,
  propertyValueResponse: 0x3d6,
  propertyValueWrite: 0x3d7,
  propertyDescriptionRead: 0x3d8,
  propertyDescriptionResponse: 0x3d9,
  memoryExtendedWrite: 0x1fb,
  memoryExtendedWriteResponse: 0x1fc,
  memoryExtendedRead: 0x1fd,
  memoryExtendedReadResponse: 0x1fe,
} as const;

/**
 * Octets of memory a response carries at most: a standard frame holds 16 octets of TPDU,
 * of which A_Memory_Response takes 4 and A_MemoryExtended_ReadResponse 6 (the maximum
 * APDU length the devices announce, 15).
 */
const MEMORY_READ_MAX = 12;
const EXTENDED_READ_MAX = 10;

/** Return codes of the extended memory services: done, or the memory refused it. */
const EXTENDED_OK = 0x00;
const EXTENDED_REFUSED = 0xf1;

/** Read a standard L_Data frame; null when it is not one. */
export function decodeLData(bytes: Uint8Array | number[]): LDataFrame | null {
  const b = Array.from(bytes);
  if (b.length < 2) return null;
  const at = 2 + b[1]!;
  if (b.length < at + 8) return null;
  const ctrl1 = b[at]!;
  const ctrl2 = b[at + 1]!;
  if (!(ctrl1 & 0x80) || ctrl2 & 0x0f) return null;
  const len = b[at + 6]!;
  if (b.length !== at + 8 + len) return null;
  return {
    messageCode: b[0]!,
    ctrl1,
    source: (b[at + 2]! << 8) | b[at + 3]!,
    destination: (b[at + 4]! << 8) | b[at + 5]!,
    group: (ctrl2 & 0x80) !== 0,
    hopCount: (ctrl2 >> 4) & 7,
    tpdu: b.slice(at + 7),
  };
}

/** Bytes of an L_Data.ind frame from a device, system priority, routing counter 6. */
export function encodeLData(f: {
  source: number;
  destination: number;
  group: boolean;
  tpdu: number[];
}): Uint8Array {
  // Standard frame, no repetition, broadcast bit, system priority (management).
  const ctrl1 = 0x80 | 0x20 | 0x10;
  const ctrl2 = (f.group ? 0x80 : 0) | (6 << 4);
  return Uint8Array.from([
    0x29,
    0x00,
    ctrl1,
    ctrl2,
    f.source >> 8,
    f.source & 0xff,
    f.destination >> 8,
    f.destination & 0xff,
    f.tpdu.length - 1,
    ...f.tpdu,
  ]);
}

const iaWord = (s: string) => {
  const [a, l, d] = s.split(".").map(Number) as [number, number, number];
  return (a << 12) | (l << 8) | d;
};

/** APCI of an APDU (4 or 10 bits) and its data: 6 bits in the APCI octet, then octets. */
function apduOf(tpdu: number[]): {
  apci: number;
  short: number;
  data: number[];
} {
  // 4-bit APCI services keep 6 bits of data in the second octet (apci & 0x3c0 names
  // them); 10-bit ones use the whole octet.
  const hi = ((tpdu[0] ?? 0) & 0x03) << 8;
  const lo = tpdu[1] ?? 0;
  return { apci: hi | lo, short: lo & 0x3f, data: tpdu.slice(2) };
}

/** APDU of a service: the 10-bit APCI (with the 6 bits of a short value), then data. */
const apdu = (apci: number, data: number[] = []) => [
  (apci >> 8) & 0x03,
  apci & 0xff,
  ...data,
];

interface Connection {
  peer: number;
  /** Sequence number expected from the peer. */
  recv: number;
  /** Sequence number of our next numbered frame. */
  send: number;
}

/** Services that change a device (APCI, or its four high bits for the short ones). */
const CHANGES = new Set<number>([
  APCI.memoryWrite,
  APCI.memoryExtendedWrite,
  APCI.restart,
  APCI.propertyValueWrite,
  APCI.keyWrite,
]);

/**
 * Device management of a simulation: a frame from ETS in, the frames of the devices out.
 * Group telegrams are not handled here (see EtsLink).
 */
export class DeviceManagement {
  private conns = new Map<string, Connection>();
  /** The simulation the connections were opened with: another one has none of them. */
  private of: Simulation | null = null;

  constructor(
    private readonly sim: () => Simulation | null,
    /**
     * ETS reads or writes the memory of a manufacturer's device while the diagram does not
     * simulate commissioning: the device holds no memory, and ETS stops.
     */
    private readonly onUncommissioned: (address: string) => void = () => {},
    /**
     * Several devices have an individual address (told once per address while they
     * do), and what ETS asked them that none did: a change ("write"), or a read whose
     * answers differ ("read").
     */
    private readonly onDuplicate: (
      address: string,
      devices: string[],
      refused?: "write" | "read",
    ) => void = () => {},
  ) {}

  /** Addresses whose duplicates were told, for the current simulation. */
  private duplicates = new Set<string>();

  /**
   * Is a frame from ETS acknowledged on the bus (its link layer acknowledgement, which
   * the interface confirms to ETS): a group telegram always, a frame to a device when a
   * device answers at that address, one or several.
   */
  acknowledges(f: LDataFrame): boolean {
    if (f.group) return true;
    const sim = this.sim();
    return !!sim && sim.reachableAt(iaText(f.destination)).length > 0;
  }

  /** Is this frame for device management (not a group telegram)? */
  static concerns(f: LDataFrame): boolean {
    if (!f.group) return true;
    // Sent to all (0/0/0) with a management service: individual address services.
    if (f.destination !== 0 || f.tpdu.length < 2) return false;
    const a = ((f.tpdu[0]! & 0x03) << 8) | (f.tpdu[1]! & 0xc0);
    return (
      a === APCI.individualAddressRead ||
      a === APCI.individualAddressWrite ||
      a === APCI.individualAddressResponse
    );
  }

  /** Forget the connections (the link stops, or follows another simulation). */
  reset() {
    this.conns.clear();
    this.duplicates.clear();
    this.of = null;
  }

  /** Frames answered by the devices to a frame from ETS (L_Data.req or .ind). */
  handle(f: LDataFrame): Uint8Array[] {
    const sim = this.sim();
    if (sim !== this.of) this.reset();
    this.of = sim;
    if (!sim) return [];
    if (f.group) return this.broadcast(sim, f);
    const address = iaText(f.destination);
    const targets = sim.reachableAt(address);
    // Several devices at the same address: said (again if they come back after they
    // were not). The address is occupied; the transport layer of the first one stands
    // for theirs, whose identical acknowledgements make one on the bus.
    if (targets.length > 1 && !this.duplicates.has(address)) {
      this.duplicates.add(address);
      this.onDuplicate(address, targets);
    } else if (targets.length <= 1) this.duplicates.delete(address);
    if (!targets.length) return [];
    const target = targets[0]!;
    const tpci = f.tpdu[0]!;
    const out: Uint8Array[] = [];
    const send = (tpdu: number[]) =>
      out.push(
        encodeLData({
          source: f.destination,
          destination: f.source,
          group: false,
          tpdu,
        }),
      );
    // Control PDUs: TPCI 1x00 00xx.
    if ((tpci & 0x80) !== 0) {
      if (tpci === 0x80) {
        this.conns.set(target, { peer: f.source, recv: 0, send: 0 });
        return out;
      }
      if (tpci === 0x81) {
        // Only the peer of a connection ends it.
        if (this.conns.get(target)?.peer === f.source)
          this.conns.delete(target);
        return out;
      }
      // T_ACK and T_NAK of our numbered frames.
      return out;
    }
    const numbered = (tpci & 0x40) !== 0;
    let reply: (apduBytes: number[]) => void;
    if (numbered) {
      const c = this.conns.get(target);
      if (!c || c.peer !== f.source) {
        // Not connected: T_Disconnect, as the transport layer does.
        send([0x81]);
        return out;
      }
      const seq = (tpci >> 2) & 0x0f;
      if (seq !== c.recv) {
        // A repetition of the last frame: acknowledged again, not handled twice.
        if (seq === ((c.recv + 15) & 0x0f)) send([0xc2 | (seq << 2)]);
        return out;
      }
      c.recv = (c.recv + 1) & 0x0f;
      send([0xc2 | (seq << 2)]);
      reply = (a) => {
        const s = c.send;
        c.send = (c.send + 1) & 0x0f;
        send([0x40 | (s << 2) | (a[0]! & 0x03), ...a.slice(1)]);
      };
    } else reply = (a) => send(a);
    if (targets.length === 1) this.service(sim, target, f, reply);
    else this.ambiguous(sim, targets, f, reply);
    return out;
  }

  /**
   * A service for several devices at one address. A change is made in none of them: which
   * one ETS meant is not known. A read is answered when they all give the same answer,
   * which makes one on the bus; different answers collide, and none comes.
   */
  private ambiguous(
    sim: Simulation,
    targets: string[],
    f: LDataFrame,
    reply: (apdu: number[]) => void,
  ) {
    const { apci } = apduOf(f.tpdu);
    const address = iaText(f.destination);
    if (CHANGES.has(apci & 0x3c0) || CHANGES.has(apci)) {
      this.onDuplicate(address, targets, "write");
      return;
    }
    const answers = targets.map((t) => {
      const a: number[][] = [];
      this.service(sim, t, f, (x) => a.push(x));
      return JSON.stringify(a);
    });
    if (answers.some((a) => a !== answers[0])) {
      this.onDuplicate(address, targets, "read");
      return;
    }
    (JSON.parse(answers[0]!) as number[][]).forEach(reply);
  }

  private broadcast(sim: Simulation, f: LDataFrame): Uint8Array[] {
    const { apci, data } = apduOf(f.tpdu);
    const a = apci & 0x3c0;
    if (a === APCI.individualAddressRead)
      return sim.readAddressInProgrammingMode().map((k) =>
        encodeLData({
          source: iaWord(sim.physicalAddress(k)),
          destination: 0,
          group: true,
          tpdu: apdu(APCI.individualAddressResponse),
        }),
      );
    if (a === APCI.individualAddressWrite && data.length >= 2) {
      const w = (data[0]! << 8) | data[1]!;
      sim.writeIndividualAddress(iaText(w));
    }
    return [];
  }

  private service(
    sim: Simulation,
    target: string,
    f: LDataFrame,
    reply: (apdu: number[]) => void,
  ) {
    const { apci, short, data } = apduOf(f.tpdu);
    const four = apci & 0x3c0;
    const bcu = sim.bcu(target);
    if (
      !bcu &&
      sim.maskVersion(target) !== MASK_VERSION &&
      (four === APCI.memoryRead || four === APCI.memoryWrite)
    )
      this.onUncommissioned(iaText(f.destination));
    if (four === APCI.deviceDescriptorRead) {
      // Descriptor type 0: the mask version; other types are not supported (type 0x3F).
      const mask = sim.maskVersion(target);
      if (short === 0)
        reply(apdu(APCI.deviceDescriptorResponse, [mask >> 8, mask & 0xff]));
      else reply(apdu(APCI.deviceDescriptorResponse | 0x3f));
      return;
    }
    if (four === APCI.restart) {
      sim.restartDevice(target);
      return;
    }
    if (four === APCI.memoryRead && data.length >= 2) {
      const n = short;
      const at = (data[0]! << 8) | data[1]!;
      // The BCU of a manufacturer's device reads its memory; outside it, a response
      // without octets says the read failed (zeros for the devices without a BCU).
      if (bcu) {
        // More than a frame holds: refused, as a read outside the memory.
        const read =
          n <= MEMORY_READ_MAX
            ? bcu.profile.readMemory(bcu.state, at, n)
            : null;
        reply(
          read
            ? apdu(APCI.memoryResponse | n, [data[0]!, data[1]!, ...read])
            : apdu(APCI.memoryResponse, [data[0]!, data[1]!]),
        );
      } else
        reply(
          n <= MEMORY_READ_MAX
            ? apdu(APCI.memoryResponse | n, [
                data[0]!,
                data[1]!,
                ...Array<number>(n).fill(0),
              ])
            : apdu(APCI.memoryResponse, [data[0]!, data[1]!]),
        );
      return;
    }
    if (four === APCI.memoryWrite && data.length >= 2) {
      const at = (data[0]! << 8) | data[1]!;
      // Written: no answer (ETS verifies by reading). Refused: a response with no octets;
      // so is a write without all the octets it announces, which changes nothing.
      const whole = data.length >= 2 + short;
      if (!(
        bcu &&
        whole &&
        sim.writeMemory(target, at, data.slice(2, 2 + short))
      ))
        reply(apdu(APCI.memoryResponse, [data[0]!, data[1]!]));
      return;
    }
    if (four === APCI.adcRead && data.length >= 1) {
      // ADC: bus voltage (channel 1) and PEI type (channel 4) of a BCU1.
      const channel = short;
      const value = channel === 4 ? 0 : channel === 1 ? 0x0bb8 : 0;
      reply(
        apdu(APCI.adcResponse | channel, [data[0]!, value >> 8, value & 0xff]),
      );
      return;
    }
    switch (apci) {
      // Memory with a 3-octet address (System B, for its large segments): the number of
      // octets, the address, then the octets written.
      case APCI.memoryExtendedWrite:
      case APCI.memoryExtendedRead: {
        if (data.length < 4) return;
        const n = data[0]!;
        const addr = data.slice(1, 4);
        const at = (addr[0]! << 16) | (addr[1]! << 8) | addr[2]!;
        if (apci === APCI.memoryExtendedWrite) {
          const bytes = data.slice(4, 4 + n);
          const done =
            !!bcu && bytes.length === n && sim.writeMemory(target, at, bytes);
          reply(
            apdu(APCI.memoryExtendedWriteResponse, [
              done ? EXTENDED_OK : EXTENDED_REFUSED,
              ...addr,
            ]),
          );
          return;
        }
        const read =
          n <= EXTENDED_READ_MAX
            ? (bcu?.profile.readMemory(bcu.state, at, n) ?? null)
            : null;
        reply(
          apdu(APCI.memoryExtendedReadResponse, [
            read ? EXTENDED_OK : EXTENDED_REFUSED,
            ...addr,
            ...(read ?? []),
          ]),
        );
        return;
      }
      case APCI.authorizeRequest:
        // Access level 0: full access, as a device without keys.
        reply(apdu(APCI.authorizeResponse, [0]));
        return;
      case APCI.keyWrite:
        reply(apdu(APCI.keyResponse, [0xff]));
        return;
      case APCI.propertyValueRead: {
        if (data.length < 4) return;
        const [obj, pid, c1, c2] = data as [number, number, number, number];
        const start = ((c1 & 0x0f) << 8) | c2;
        // The BCU of a manufacturer's device answers; its device object has the serial
        // number of the simulated devices.
        const value = bcu
          ? (bcu.profile.readProperty(bcu.state, obj, pid, start, c1 >> 4) ??
            (obj === 0 && pid === 11
              ? this.property(sim, target, obj, pid, start)
              : null))
          : this.property(sim, target, obj, pid, start);
        if (value)
          reply(apdu(APCI.propertyValueResponse, [obj, pid, c1, c2, ...value]));
        // Not supported: number of elements 0.
        else reply(apdu(APCI.propertyValueResponse, [obj, pid, c1 & 0x0f, c2]));
        return;
      }
      case APCI.propertyValueWrite: {
        if (data.length < 4) return;
        const [obj, pid, c1, c2] = data as [number, number, number, number];
        // The BCU of a manufacturer's device writes its properties (load controls of a
        // system 7); the others refuse: number of elements 0.
        const written = bcu?.profile.writeProperty?.(
          bcu.state,
          obj,
          pid,
          ((c1 & 0x0f) << 8) | c2,
          c1 >> 4,
          data.slice(4),
        );
        if (written) sim.propertyWritten(target);
        reply(
          written
            ? apdu(APCI.propertyValueResponse, [obj, pid, c1, c2, ...written])
            : apdu(APCI.propertyValueResponse, [obj, pid, c1 & 0x0f, c2]),
        );
        return;
      }
      case APCI.propertyDescriptionRead: {
        if (data.length < 3) return;
        // A property of the BCU: writable bit and type, maximum number of elements, access.
        const desc = bcu?.profile.describeProperty?.(
          bcu.state,
          data[0]!,
          data[1]!,
        );
        if (desc) {
          reply(
            apdu(APCI.propertyDescriptionResponse, [
              data[0]!,
              data[1]!,
              data[2]!,
              (desc.writable ? 0x80 : 0) | desc.type,
              (desc.max >> 8) & 0x0f,
              desc.max & 0xff,
              0x33,
            ]),
          );
          return;
        }
        // Not supported: type 0, no element.
        reply(
          apdu(APCI.propertyDescriptionResponse, [
            data[0]!,
            data[1]!,
            data[2]!,
            0,
            0,
            0,
            0,
          ]),
        );
        return;
      }
    }
  }

  /** Value of a property of the device object (object index 0), or null. */
  private property(
    sim: Simulation,
    target: string,
    obj: number,
    pid: number,
    start: number,
  ): number[] | null {
    if (obj !== 0) return null;
    if (start === 0) return [0, 1];
    switch (pid) {
      case 1: // PID_OBJECT_TYPE: device object
        return [0, 0];
      case 11: // PID_SERIAL_NUMBER
        return serialOf(target);
      case 12: // PID_MANUFACTURER_ID
        return [MANUFACTURER >> 8, MANUFACTURER & 0xff];
      case 54: // PID_PROGMODE
        return [sim.programmingMode(target) ? 1 : 0];
      case 83: // PID_DEVICE_DESCRIPTOR
        return [MASK_VERSION >> 8, MASK_VERSION & 0xff];
      default:
        return null;
    }
  }
}

/** Serial number of a simulated device: the manufacturer code, then a hash of its identifier. */
export function serialOf(target: string): number[] {
  let h = 2166136261;
  for (const ch of target) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return [
    MANUFACTURER >> 8,
    MANUFACTURER & 0xff,
    h >>> 24,
    (h >> 16) & 0xff,
    (h >> 8) & 0xff,
    h & 0xff,
  ];
}
