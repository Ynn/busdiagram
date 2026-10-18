// Power supplies of the TP backbone and main lines (topology.powerSupplies): each TP line
// has its own, as the lines have theirs; read, written back, checked, drawn as a supply
// whose bus voltage can be cut, and kept in step with the levels by the designer.
import { describe, expect, it } from "vitest";
import { buildScenario, ScenarioError } from "../../src/knx/scenario";
import { configWarnings } from "../../src/knx/consistency";
import { toV2 } from "../../src/knx/export";
import { en } from "../../src/i18n";
import { createSimulator } from "../../src/core";
import * as E from "../../site/designer/edit";
import { raw } from "./helpers";

type Doc = Parameters<typeof E.addLine>[0];
const usb = () =>
  structuredClone(raw("usb-interface.json")) as Record<string, unknown>;
const psuWarnings = (data: unknown) =>
  configWarnings(buildScenario(data), en)
    .filter((w) => w.code === "config-no-power-supply")
    .map((w) => w.message);

describe("power supplies of the backbone and main lines", () => {
  it("are read by the address of their line, and written back", () => {
    const s = buildScenario(usb());
    expect(s.topology.powerSupplies.get("1.0")).toEqual({
      name: "",
      currentMa: 640,
    });
    const v2 = toV2(s) as { topology?: { powerSupplies?: unknown } };
    expect(v2.topology?.powerSupplies).toEqual({ "1.0": { currentMa: 640 } });
  });

  it("are refused for a line the installation does not have", () => {
    for (const key of ["0.0", "2.0", "1.1"]) {
      const data = usb();
      data.topology = { powerSupplies: { [key]: { currentMa: 640 } } };
      expect(() => buildScenario(data), key).toThrow(ScenarioError);
    }
  });

  it("are missed as a line's is", () => {
    expect(psuWarnings(usb())).toEqual([]);
    const data = usb();
    delete data.topology;
    expect(psuWarnings(data)).toEqual([
      "main line 1.0 has no bus power supply: a TP main line needs its own, with its choke",
    ]);
  });

  it("cut on a main line: the couplers forward nothing across it", () => {
    const sim = createSimulator(usb());
    const on = () =>
      (sim.output("switchActuator", "s1") as { on?: boolean } | null)?.on ??
      false;
    expect(sim.busVoltage("ML1")).toBe(true);
    sim.setBusVoltage("ML1", false);
    expect(sim.busVoltage("ML1")).toBe(false);
    sim.groupWrite("usbInterface", "1/1/1", 1);
    sim.advance(10000);
    expect(on()).toBe(false);
    sim.setBusVoltage("ML1", true);
    sim.groupWrite("usbInterface", "1/1/1", 1);
    sim.advance(10000);
    expect(on()).toBe(true);
  });

  it("follow the levels an edit of the designer makes appear or go", () => {
    const doc = {
      formatVersion: 2,
      lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }],
      devices: [],
      groupAddresses: [],
    } as unknown as Doc;
    // A second line: main line 1.0 appears, with its supply.
    let before = E.upperLines(doc);
    E.addLine(doc, 1);
    E.followUpperLines(doc, before);
    expect(doc.topology?.powerSupplies).toEqual({ "1.0": { currentMa: 640 } });
    // Set by the topology section; removed, it stays removed.
    E.setUpperPowerSupply(doc, "1.0", 320);
    expect(doc.topology?.powerSupplies).toEqual({ "1.0": { currentMa: 320 } });
    E.setUpperPowerSupply(doc, "1.0", null);
    before = E.upperLines(doc);
    E.followUpperLines(doc, before);
    expect(doc.topology?.powerSupplies).toBeUndefined();
    E.setUpperPowerSupply(doc, "1.0", 640);
    // The second line goes: so do the main line and its supply.
    before = E.upperLines(doc);
    E.removeLine(doc, "1.2");
    E.followUpperLines(doc, before);
    expect(doc.topology).toBeUndefined();
    expect(() => E.setUpperPowerSupply(doc, "1.0", 640)).toThrow();
    expect(() => buildScenario(doc)).not.toThrow();
  });
});
