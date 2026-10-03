// Engine robustness: payloads invalid for the receiving DPT, canonical addresses, and
// telegrams in transit when a segment loses its bus voltage.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import { ScenarioError, buildScenario } from "../../src/knx/scenario";
import { raw, v2 } from "./helpers";

describe("payload invalid for the receiving DPT", () => {
  // Same size, different meanings (accepted with config-datatype): 32767 K in DPT 7.600 is
  // 0x7FFF, the code that DPT 9.xxx reserves for an invalid value.
  const sim = () =>
    createSimulator(
      v2(
        [
          {
            id: "sender",
            name: "Sender",
            address: "1.1.1",
            kind: "panel",
            behavior: "passive/v1",
            objects: [
              {
                id: "k",
                ga: "1/1/1",
                dpt: "7.600",
                port: "input",
                flags: { W: false, T: true },
              },
            ],
          },
          {
            id: "receiver",
            name: "Receiver",
            address: "1.1.2",
            kind: "panel",
            behavior: "passive/v1",
            objects: [
              {
                id: "t",
                ga: "1/1/1",
                dpt: "9.001",
                port: "display",
                flags: { W: true, T: false },
              },
            ],
          },
        ],
        { lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }] },
      ),
    );

  it("is ignored by the receiver and logged, without stopping the simulation", () => {
    const s = sim();
    s.groupWrite("sender", "1/1/1", 32767);
    expect(() => s.advance(3000)).not.toThrow();
    expect(s.fault).toBeNull();
    expect(s.objectValue("receiver", "t")).toBeNull();
    expect(
      s.journal.some(
        (e) => e.deviceId === "receiver" && e.kind === "object-write-ignored",
      ),
    ).toBe(true);
    // A valid value afterwards is received.
    s.groupWrite("sender", "1/1/1", 2700);
    s.advance(3000);
    expect(Number(s.objectValue("receiver", "t"))).toBeGreaterThan(0);
  });
});

describe("canonical addresses", () => {
  const withAddress = (
    edit: (doc: {
      devices: { address: string; objects: { ga: string }[] }[];
    }) => void,
  ) => {
    const doc = JSON.parse(JSON.stringify(raw("lighting-control.json")));
    edit(doc);
    return () => buildScenario(doc);
  };

  it("an individual address with a leading zero is refused", () => {
    const build = withAddress((doc) => (doc.devices[1]!.address = "01.1.1"));
    expect(build).toThrow(ScenarioError);
  });

  it("a group address with a leading zero is refused", () => {
    const build = withAddress(
      (doc) => (doc.devices[0]!.objects[0]!.ga = "01/1/1"),
    );
    expect(build).toThrow(ScenarioError);
  });
});

describe("bus voltage cut while a telegram is in transit", () => {
  // p1 (line 1.1) commands the shutter actuator behind the repeater of line 2.1.
  const run = (cutAtMs: number, segment: string) => {
    const sim = createSimulator(raw("full-topology.json"));
    sim.groupWrite("p1", "2/1/1", 1);
    sim.advance(cutAtMs);
    sim.setBusVoltage(segment, false);
    sim.advance(16000);
    return sim;
  };
  const moved = (sim: ReturnType<typeof createSimulator>) =>
    sim.journal.some(
      (e) =>
        e.deviceId === "shutterActuator" && e.kind === "object-write-accepted",
    );

  it("a segment cut before the telegram crosses it stops it there", () => {
    const sim = run(100, "L2.1");
    expect(moved(sim)).toBe(false);
    expect(
      sim.journal.some(
        (e) =>
          e.deviceId === "shutterActuator" &&
          e.kind === "telegram-received" &&
          /on the way/.test(e.message ?? ""),
      ),
    ).toBe(true);
  });

  it("a segment cut after the telegram has crossed it does not recall it", () => {
    // The telegram has left line 1.1 long before 6 s.
    const sim = run(6000, "L1.1");
    expect(moved(sim)).toBe(true);
  });
});
