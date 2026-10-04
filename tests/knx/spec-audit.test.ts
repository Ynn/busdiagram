// Points of the KNX specification checked by the audit of October 2026: object sizes on an
// address, standard DPT identifiers, flags C and I, transmission priority, power supplies.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import { configWarnings } from "../../src/knx/consistency";
import { isRepresentableDpt } from "../../src/knx/dpt";
import { buildFrame } from "../../src/knx/format";
import type { ScenarioError } from "../../src/knx/scenario";
import { buildScenario } from "../../src/knx/scenario";
import { en } from "../../src/i18n";
import * as E from "../../site/designer/edit";
import { flags, v2 } from "./helpers";

const codes = (raw: unknown) => {
  try {
    buildScenario(raw);
    return [];
  } catch (e) {
    return (e as ScenarioError).details.map((d) => `${d.path} [${d.code}]`);
  }
};

const passive = (id: string, address: string, objects: unknown[]) => ({
  id,
  address,
  kind: "generic",
  behavior: "passive/v1",
  objects,
});

describe("objects of different sizes on one address (Application Interface Layer)", () => {
  it("counts DPTs shown without simulation", () => {
    const raw = v2([
      passive("a", "1.1.1", [
        {
          id: "s",
          ga: "1/1/1",
          dpt: "1.001",
          port: "display",
          flags: flags(true, false),
        },
      ]),
      passive("b", "1.1.2", [
        {
          id: "t",
          ga: "1/1/1",
          dpt: "16.001",
          port: "display",
          flags: flags(true, false),
        },
      ]),
    ]);
    expect(codes(raw)).toContain("devices[1].objects[0].dpt [association]");
  });
});

describe("standard DPT identifiers", () => {
  it("accepts a five-digit sub-number of the catalog and refuses an invented one", () => {
    expect(isRepresentableDpt("1.1200")).toBe(true);
    expect(isRepresentableDpt("1.999")).toBe(false);
    expect(isRepresentableDpt("235.001")).toBe(true);
  });
});

/** A sender and a receiver on 1/1/1, with the receiver's flags given. */
function pair(
  receiver: Record<string, unknown>,
  sender: Record<string, unknown> = {},
) {
  return createSimulator(
    v2(
      [
        passive("s", "1.1.1", [
          {
            id: "o",
            ga: "1/1/1",
            dpt: "1.001",
            port: "input",
            flags: flags(true, true),
            ...sender,
          },
        ]),
        passive("r", "1.1.2", [
          {
            id: "o",
            ga: "1/1/1",
            dpt: "1.001",
            port: "display",
            value: 1,
            flags: { W: true, T: false, R: true, ...receiver },
          },
        ]),
        {
          id: "usb",
          address: "1.1.3",
          kind: "generic",
          behavior: "usbInterface/v1",
          objects: [],
        },
      ],
      { lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }] },
    ),
  );
}

describe("flag C (communication)", () => {
  it("off: the object handles no write and answers no read", () => {
    const sim = pair({ C: false });
    sim.groupWrite("usb", "1/1/1", 0);
    sim.advance(3000);
    expect(sim.objectValue("r", "o")).toBe(1);
    const responses: number[] = [];
    sim.onTelegram(
      (t) => t.service === "GroupValueResponse" && responses.push(t.value),
    );
    sim.groupRead("usb", "1/1/1");
    sim.advance(3000);
    expect(responses).toEqual([]);
  });

  it("off: the object does not send", () => {
    const sim = pair({}, { flags: { W: true, T: true, C: false } });
    sim.input("s", "x", "value", 1);
    const sent = sim.history.length;
    expect(sent).toBe(0);
  });
});

describe("flag I (read on initialisation)", () => {
  it("reads the value when the device starts: at the start of the simulation and after a bus voltage failure", () => {
    const sim = createSimulator(
      v2(
        [
          passive("r", "1.1.1", [
            {
              id: "o",
              ga: "1/1/1",
              dpt: "1.001",
              port: "display",
              flags: { W: true, T: false, U: true, I: true },
            },
          ]),
          passive("a", "1.2.1", [
            {
              id: "o",
              ga: "1/1/1",
              dpt: "1.001",
              port: "display",
              value: 1,
              flags: { W: true, T: false, R: true },
            },
          ]),
        ],
        {
          lines: [
            { address: "1.1", powerSupply: { currentMa: 640 } },
            { address: "1.2", powerSupply: { currentMa: 640 } },
          ],
        },
      ),
    );
    // The devices start with the simulation: the I object reads its value. Read and
    // response cross two line couplers, at the slowed timing of the diagram.
    sim.advance(15000);
    expect(sim.history.map((t) => t.service)).toEqual([
      "GroupValueRead",
      "GroupValueResponse",
    ]);
    expect(sim.objectValue("r", "o")).toBe(1);
    // It reads again when its device starts after a bus voltage failure.
    sim.setBusVoltage("L1.1", false);
    sim.setBusVoltage("L1.1", true);
    sim.advance(15000);
    expect(sim.history.map((t) => t.service)).toEqual([
      "GroupValueRead",
      "GroupValueResponse",
      "GroupValueRead",
      "GroupValueResponse",
    ]);
  });
});

describe("transmission priority", () => {
  it("is carried by the telegram and by the control field of the frame", () => {
    const sim = pair({}, { priority: "normal" });
    const tel = sim.groupWrite("usb", "1/1/1", 1)!;
    expect(tel.priority).toBe("low");
    expect(buildFrame("1.1.1", "1/1/1", 1, "1.001")[0]!.bytes).toEqual([0xbc]);
    expect(
      buildFrame(
        "1.1.1",
        "1/1/1",
        1,
        "1.001",
        6,
        en,
        "GroupValueWrite",
        "normal",
      )[0]!.bytes,
    ).toEqual([0xb4]);
    expect(
      buildFrame(
        "1.1.1",
        "1/1/1",
        1,
        "1.001",
        6,
        en,
        "GroupValueWrite",
        "urgent",
      )[0]!.bytes,
    ).toEqual([0xb8]);
    expect(sim.scenario.devicesById.get("s")!.objects[0]!.priority).toBe(
      "normal",
    );
  });

  it("refuses the system priority on an object", () => {
    const raw = v2([
      passive("a", "1.1.1", [
        {
          id: "o",
          ga: "1/1/1",
          dpt: "1.001",
          port: "input",
          priority: "system",
          flags: flags(false, true),
        },
      ]),
    ]);
    expect(codes(raw)).toContain("devices[0].objects[0].priority [enum]");
  });
});

describe("bus power supplies (TP1)", () => {
  it("warns about each TP segment without one", () => {
    const warn = (lines: unknown[]) =>
      configWarnings(buildScenario(v2([], { lines })), en).map((w) => w.code);
    expect(warn([{ address: "1.1" }])).toContain("config-no-power-supply");
    expect(
      warn([{ address: "1.1", powerSupply: { currentMa: 320 } }]),
    ).not.toContain("config-no-power-supply");
    expect(
      warn([
        {
          address: "1.1",
          powerSupply: { currentMa: 320 },
          extension: { address: "1.1.64", mode: "repeater" },
        },
      ]),
    ).toContain("config-no-power-supply");
  });
});

describe("designer: DPTs of the same size but different meaning", () => {
  it("are found on an address", () => {
    const doc = {
      formatVersion: 2,
      lines: [{ address: "1.1" }],
      groupAddresses: [{ address: "1/3/1", dpt: "5.001" }],
      devices: [
        {
          id: "a",
          objects: [
            {
              id: "x",
              ga: "1/3/1",
              dpt: "5.010",
              port: "display",
              flags: flags(true, false),
            },
          ],
        },
      ],
    } as unknown as E.Doc;
    expect(E.dptMixes(doc).get("1/3/1")?.sort()).toEqual(["5.001", "5.010"]);
  });
});
