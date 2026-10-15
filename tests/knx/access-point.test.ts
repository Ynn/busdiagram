// Access point for an external tool (ETS through a bridge): telegrams enter at a bus
// interface of the scenario with their own bytes, and leave from there only when they
// reach it through the topology.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import type { ExternalTelegram, TapEvent } from "../../src/knx/sim";
import { raw } from "./helpers";

const ets = (e: Partial<ExternalTelegram>): ExternalTelegram => ({
  service: "GroupValueWrite",
  ga: "1/1/1",
  sourceAddress: "1.1.251",
  size: 0,
  raw: 1,
  priority: "low",
  hopCount: 6,
  ...e,
});

function setup() {
  const sim = createSimulator(raw("usb-interface.json"));
  sim.advance(3000);
  const out: TapEvent[] = [];
  sim.tap("usbInterface", (e) => out.push(e));
  return { sim, out };
}

describe("external telegrams (ingest)", () => {
  it("a write from ETS crosses the coupler and switches the actuator", () => {
    const { sim, out } = setup();
    const tel = sim.ingest("usbInterface", ets({}))!;
    expect(tel.sourceAddress).toBe("1.1.251");
    expect(tel.sourceDeviceId).toBe("usbInterface");
    expect(tel.value).toBe(1);
    sim.advance(15000);
    expect(sim.equipmentState("switchActuator", "s1")?.on).toBe(true);
    // The ingested write is not sent back; the status of the actuator is, after the
    // coupler (two line couplers: routing counter 6 → 4).
    expect(out.map((e) => e.telegram.id)).not.toContain(tel.id);
    const status = out.find((e) => e.telegram.ga === "1/4/1")!;
    expect(status.telegram.sourceAddress).toBe("1.2.1");
    expect(status.telegram.service).toBe("GroupValueWrite");
    expect(status.hopCount).toBe(4);
    expect(status.telegram.size).toBe(0);
    expect(status.telegram.raw).toBe(1);
  });

  it("keeps the routing counter of the external telegram", () => {
    const { sim } = setup();
    const tel = sim.ingest("usbInterface", ets({ hopCount: 1 }))!;
    const c = tel.plan.couplers[0]!;
    expect(c.rcBefore).toBe(1);
    expect(c.rcAfter).toBe(0);
    const zero = sim.ingest("usbInterface", ets({ hopCount: 0 }))!;
    expect(zero.plan.couplers[0]!.reason).toBe("rcZero");
  });

  it("a read from ETS gets the response of the object with R", () => {
    const { sim, out } = setup();
    sim.ingest("usbInterface", ets({}));
    sim.advance(15000);
    out.length = 0;
    sim.ingest(
      "usbInterface",
      ets({ service: "GroupValueRead", ga: "1/4/1", raw: 0 }),
    );
    sim.advance(15000);
    const responses = out.filter(
      (e) => e.telegram.service === "GroupValueResponse",
    );
    expect(responses).toHaveLength(1);
    expect(responses[0]!.telegram.sourceAddress).toBe("1.2.1");
    expect(responses[0]!.telegram.raw).toBe(1);
  });

  it("a payload of another size is shown raw and ignored by the receivers", () => {
    const { sim } = setup();
    const tel = sim.ingest("usbInterface", ets({ size: 2, raw: 0x0c33 }))!;
    expect(tel.dpt).toBe("raw.2");
    expect(tel.value).toBe(0x0c33);
    sim.advance(15000);
    expect(sim.equipmentState("switchActuator", "s1")?.on).toBe(false);
    const ignored = sim.journal.find(
      (e) =>
        e.kind === "object-write-ignored" && e.deviceId === "switchActuator",
    );
    expect(ignored?.message).toMatch(/length mismatch: 2 bytes received/);
  });

  it("a value invalid for the address's DPT is shown raw", () => {
    const sim = createSimulator(raw("room-heating.json"));
    expect(sim.gaDpt("3/1/1")).toBe("9.001");
    const bad = sim.ingest(
      "usbInterface",
      ets({ ga: "3/1/1", size: 2, raw: 0x7fff }),
    )!;
    expect(bad.dpt).toBe("raw.2");
    const good = sim.ingest(
      "usbInterface",
      ets({ ga: "3/1/1", size: 2, raw: 0x0c33 }),
    )!;
    expect(good.dpt).toBe("9.001");
    expect(good.value).toBe(21.5);
  });

  it("refuses without bus voltage, and payloads the simulation cannot hold", () => {
    const { sim } = setup();
    expect(sim.ingest("usbInterface", ets({ size: 14, raw: 0 }))).toBeNull();
    sim.setBusVoltage("L1.1", false);
    expect(sim.ingest("usbInterface", ets({}))).toBeNull();
    expect(
      sim.journal.filter(
        (e) => e.kind === "transmit-ignored" && e.deviceId === "usbInterface",
      ),
    ).toHaveLength(2);
  });

  it("refuses a device that is not a bus interface", () => {
    const { sim } = setup();
    expect(() => sim.ingest("switchActuator", ets({}))).toThrow(RangeError);
    expect(() => sim.tap("pushButton", () => undefined)).toThrow(RangeError);
  });
});

describe("telegrams at the access point (tap)", () => {
  it("includes the diagram's own writes from the interface, once", () => {
    const { sim, out } = setup();
    const tel = sim.groupWrite("usbInterface", "1/1/1", 1)!;
    expect(out.filter((e) => e.telegram.id === tel.id)).toHaveLength(1);
    expect(out[0]!.hopCount).toBe(6);
  });

  it("includes a key press on the same line", () => {
    const { sim, out } = setup();
    sim.input("pushButton", "key1", "short");
    sim.advance(15000);
    const press = out.find((e) => e.telegram.sourceDeviceId === "pushButton");
    expect(press?.telegram.ga).toBe("1/1/1");
    expect(press?.hopCount).toBe(6);
  });

  it("stops after unsubscribing", () => {
    const sim = createSimulator(raw("usb-interface.json"));
    const out: TapEvent[] = [];
    const off = sim.tap("usbInterface", (e) => out.push(e));
    off();
    sim.groupWrite("usbInterface", "1/1/1", 1);
    expect(out).toHaveLength(0);
  });
});

describe("access on the main line, without bus interface", () => {
  it("chooses the IP network, the backbone, a main line, or the line", () => {
    expect(
      createSimulator(raw("lighting-control.json")).network.accessSegment(),
    ).toBe("L1.1");
    expect(
      createSimulator(raw("full-topology.json")).network.accessSegment(),
    ).toBe("IP");
  });

  it("a write from ETS on a single line reaches the actuator; key presses reach ETS", () => {
    const sim = createSimulator(raw("lighting-control.json"));
    sim.advance(3000);
    const out: TapEvent[] = [];
    sim.tap({ segment: "L1.1" }, (e) => out.push(e));
    const tel = sim.ingest({ segment: "L1.1" }, ets({}))!;
    expect(tel.sourceDeviceId).toBe("");
    expect(tel.sourceAddress).toBe("1.1.251");
    sim.advance(5000);
    expect(sim.objectValue("switchActuator", "c1")).toBe(1);
    // The ingested write is not sent back.
    expect(out.map((e) => e.telegram.id)).not.toContain(tel.id);
    sim.input("pushButton", "in1", "short");
    sim.advance(5000);
    const press = out.find((e) => e.telegram.sourceDeviceId === "pushButton");
    expect(press?.hopCount).toBe(6);
  });

  it("every group address crosses the couplers to and from ETS", () => {
    const sim = createSimulator(raw("full-topology.json"));
    sim.advance(3000);
    // 1/3/1 is used on line 2.1 only: its line coupler filters it.
    const lc = sim.network.coupler("LC2.1")!;
    expect(sim.network.filterTable(lc)).not.toContain("1/3/1");
    const out: TapEvent[] = [];
    const off = sim.tap({ segment: "IP" }, (e) => out.push(e));
    expect(sim.network.filterTable(lc)).toContain("1/3/1");
    sim.ingest({ segment: "IP" }, ets({ ga: "1/3/1" }));
    sim.advance(15000);
    expect(sim.objectValue("c2", "cmd")).toBe(1);
    // The status of the actuator comes back up to the IP network.
    const status = out.find((e) => e.telegram.ga === "1/4/2");
    expect(status?.telegram.sourceAddress).toBe("2.1.6");
    off();
    expect(sim.network.filterTable(lc)).not.toContain("1/3/1");
  });

  it("refuses an unknown segment", () => {
    const sim = createSimulator(raw("lighting-control.json"));
    expect(() => sim.ingest({ segment: "L9.9" }, ets({}))).toThrow(RangeError);
  });
});
