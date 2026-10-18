// Device management from ETS follows the topology: only the devices and couplers that its
// frames reach from the access point, through segments with bus voltage, answer. A main
// line without voltage stops them as it stops the group telegrams.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import { installationAsProject } from "../../src/knx/commissioning";
import {
  DeviceManagement,
  decodeLData,
  encodeLData,
} from "../../src/knx/management";
import type { AccessPoint } from "../../src/knx/sim";
import { raw } from "./helpers";

/** The USB interface of line 1.1 as access point; the actuator 1.2.1 behind main line 1.0. */
function setup() {
  const doc = raw("usb-interface.json");
  const sim = createSimulator({
    ...doc,
    installation: installationAsProject(doc),
  });
  const access: AccessPoint = { device: "usbInterface" };
  const management = new DeviceManagement(
    () => sim,
    undefined,
    undefined,
    undefined,
    undefined,
    () => access,
  );
  return { sim, management };
}

/** A_IndividualAddress_Read sent to all, from the tunnel of ETS (1.1.253). */
const read = encodeLData({
  source: 0x11fd,
  destination: 0,
  group: true,
  tpdu: [0x01, 0x00],
});
const answers = (frames: Uint8Array[]) =>
  frames.map((f) => decodeLData(f)!.source.toString(16));

describe("device management from an access point", () => {
  it("finds a device in programming mode on another line while the way has voltage", () => {
    const { sim, management } = setup();
    sim.setProgrammingMode("switchActuator", true);
    expect(answers(management.handle(decodeLData(read)!))).toEqual(["1201"]);
  });

  it("does not reach it across a main line without voltage, nor writes its address", () => {
    const { sim, management } = setup();
    sim.setProgrammingMode("switchActuator", true);
    sim.setBusVoltage("ML1", false);
    expect(management.handle(decodeLData(read)!)).toEqual([]);
    // A frame to its address is not acknowledged on the way.
    const connect = decodeLData(
      encodeLData({
        source: 0x11fd,
        destination: 0x1201,
        group: false,
        tpdu: [0x80],
      }),
    )!;
    expect(management.acknowledges(connect)).toBe(false);
    expect(
      sim.writeIndividualAddress("1.2.9", { device: "usbInterface" }),
    ).toEqual([]);
    // The voltage back: it is found again.
    sim.setBusVoltage("ML1", true);
    expect(answers(management.handle(decodeLData(read)!))).toEqual(["1201"]);
    expect(management.acknowledges(connect)).toBe(true);
  });

  it("reaches the devices of its own line whatever the other lines", () => {
    const { sim, management } = setup();
    sim.setProgrammingMode("pushButton", true);
    sim.setBusVoltage("ML1", false);
    expect(answers(management.handle(decodeLData(read)!))).toEqual(["1101"]);
    // Its own line without voltage: nothing at all.
    sim.setBusVoltage("L1.1", false);
    expect(management.handle(decodeLData(read)!)).toEqual([]);
  });
});
