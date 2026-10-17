// Device management of the simulated devices, as ETS uses it through a tunnel: the
// individual address in programming mode, connections, device descriptor, properties.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import {
  APCI,
  DeviceManagement,
  MASK_VERSION,
  decodeLData,
} from "../../src/knx/management";
import type { LDataFrame } from "../../src/knx/management";
import { flags, keypad, v2 } from "./helpers";

const ETS = 0xffff & ((15 << 12) | (15 << 8) | 251);
const ia = (a: number, l: number, d: number) => (a << 12) | (l << 8) | d;

const req = (
  destination: number,
  group: boolean,
  tpdu: number[],
): LDataFrame => ({
  messageCode: 0x11,
  ctrl1: 0xb0,
  source: ETS,
  destination,
  group,
  hopCount: 6,
  tpdu,
});
const apdu = (apci: number, data: number[] = []) => [
  (apci >> 8) & 3,
  apci & 0xff,
  ...data,
];

function setup() {
  const doc = {
    ...v2([
      keypad("bp", "1.1.1", [{ id: "b1", ga: "1/1/1" }]),
      {
        id: "sa",
        name: "Switch actuator",
        address: "1.1.2",
        kind: "switchActuator",
        behavior: "switchActuator/v1",
        objects: [
          {
            id: "c1",
            ga: "1/1/1",
            dpt: "1.001",
            port: "switch",
            channel: "s1",
            flags: flags(true, false),
          },
        ],
        channels: [{ id: "s1", equipment: { type: "lamp" } }],
      },
    ]),
    installation: {},
  };
  const sim = createSimulator(doc);
  const m = new DeviceManagement(() => sim);
  return { sim, m };
}

const decoded = (frames: Uint8Array[]) => frames.map((f) => decodeLData(f)!);

describe("individual address in programming mode", () => {
  it("devices in programming mode answer a read, and take a written address", () => {
    const { sim, m } = setup();
    const read = req(0, true, apdu(APCI.individualAddressRead));
    expect(DeviceManagement.concerns(read)).toBe(true);
    expect(m.handle(read)).toEqual([]);
    sim.pressProgrammingButton("bp");
    const [r] = decoded(m.handle(read));
    expect(r!.source).toBe(ia(15, 15, 255));
    expect(r!.group && r!.destination === 0).toBe(true);
    expect(r!.tpdu).toEqual(apdu(APCI.individualAddressResponse));
    m.handle(req(0, true, apdu(APCI.individualAddressWrite, [0x11, 0x01])));
    expect(sim.physicalAddress("bp")).toBe("1.1.1");
    expect(sim.programmingMode("bp")).toBe(true);
    const [again] = decoded(m.handle(read));
    expect(again!.source).toBe(ia(1, 1, 1));
  });

  it("a group telegram is not for device management", () => {
    expect(DeviceManagement.concerns(req(0x0901, true, [0, 0x81]))).toBe(false);
  });
});

describe("connection to a device", () => {
  it("connects, reads the device descriptor, and restarts the device", () => {
    const { sim, m } = setup();
    sim.pressProgrammingButton("bp");
    m.handle(req(0, true, apdu(APCI.individualAddressWrite, [0x11, 0x01])));
    const at = ia(1, 1, 1);
    expect(m.handle(req(at, false, [0x80]))).toEqual([]);
    // Numbered data 0: A_DeviceDescriptor_Read type 0.
    const [ack, desc] = decoded(m.handle(req(at, false, [0x40 | 0x03, 0x00])));
    expect(ack!.tpdu).toEqual([0xc2]);
    expect(ack!.source).toBe(at);
    expect(ack!.destination).toBe(ETS);
    expect(desc!.tpdu).toEqual([
      0x43,
      0x40,
      MASK_VERSION >> 8,
      MASK_VERSION & 0xff,
    ]);
    // Numbered data 1: manufacturer property of the device object.
    const [, prop] = decoded(
      m.handle(req(at, false, [0x44 | 0x03, 0xd5, 0x00, 12, 0x10, 0x01])),
    );
    expect(prop!.tpdu).toEqual([0x47, 0xd6, 0x00, 12, 0x10, 0x01, 0x00, 0xfa]);
    // A repetition is acknowledged again without a second answer.
    expect(
      decoded(
        m.handle(req(at, false, [0x44 | 0x03, 0xd5, 0x00, 12, 0x10, 0x01])),
      ).map((f) => f.tpdu),
    ).toEqual([[0xc6]]);
    // Restart: programming mode ends.
    m.handle(req(at, false, [0x48 | 0x03, 0x80]));
    expect(sim.programmingMode("bp")).toBe(false);
    m.handle(req(at, false, [0x81]));
    // Numbered data without connection: T_Disconnect.
    expect(
      decoded(m.handle(req(at, false, [0x40 | 0x03, 0x00]))).map((f) => f.tpdu),
    ).toEqual([[0x81]]);
  });

  it("ends its connections with the simulation they were opened with", () => {
    const { sim } = setup();
    const other = setup().sim;
    let current = sim;
    const m = new DeviceManagement(() => current);
    const at = ia(1, 1, 1);
    for (const s of [sim, other]) {
      current = s;
      s.pressProgrammingButton("bp");
      m.handle(req(0, true, apdu(APCI.individualAddressWrite, [0x11, 0x01])));
    }
    current = sim;
    m.handle(req(at, false, [0x80]));
    // Another simulation, with the same devices: ETS is not connected to them.
    current = other;
    expect(
      decoded(m.handle(req(at, false, [0x40 | 0x03, 0x00]))).map((f) => f.tpdu),
    ).toEqual([[0x81]]);
  });

  it("is disconnected by its peer only", () => {
    const { sim, m } = setup();
    sim.pressProgrammingButton("bp");
    m.handle(req(0, true, apdu(APCI.individualAddressWrite, [0x11, 0x01])));
    const at = ia(1, 1, 1);
    m.handle(req(at, false, [0x80]));
    m.handle({ ...req(at, false, [0x81]), source: ia(1, 1, 99) });
    const [ack] = decoded(m.handle(req(at, false, [0x40 | 0x03, 0x00])));
    expect(ack!.tpdu).toEqual([0xc2]);
  });

  it("no device answers at a free address", () => {
    const { m } = setup();
    expect(m.handle(req(ia(1, 1, 9), false, [0x80]))).toEqual([]);
    expect(m.handle(req(ia(1, 1, 9), false, [0x03, 0x00]))).toEqual([]);
  });

  it("answers a connectionless descriptor read", () => {
    const { sim, m } = setup();
    sim.pressProgrammingButton("sa");
    m.handle(req(0, true, apdu(APCI.individualAddressWrite, [0x11, 0x02])));
    const [d] = decoded(m.handle(req(ia(1, 1, 2), false, [0x03, 0x00])));
    expect(d!.tpdu).toEqual([
      0x03,
      0x40,
      MASK_VERSION >> 8,
      MASK_VERSION & 0xff,
    ]);
  });
});

describe("memory reads larger than a frame", () => {
  it("are refused with a response that a frame holds", () => {
    const { sim, m } = setup();
    sim.pressProgrammingButton("sa");
    m.handle(req(0, true, apdu(APCI.individualAddressWrite, [0x11, 0x02])));
    const at = ia(1, 1, 2);
    m.handle(req(at, false, [0x80]));
    // 63 octets at 0000h: more than the 12 a response carries.
    const [, refused] = decoded(
      m.handle(req(at, false, [0x42, 0x3f, 0x00, 0x00])),
    );
    expect(refused!.tpdu).toEqual([0x42, 0x40, 0x00, 0x00]);
    // 12: the most a frame holds.
    const [, full] = decoded(
      m.handle(req(at, false, [0x46, 0x0c, 0x00, 0x00])),
    );
    expect(full!.tpdu.length).toBe(16);
  });
});
