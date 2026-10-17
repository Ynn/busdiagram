// Commissioning: devices hold an individual address and an application apart from the
// project; ETS programs the address with the programming button and downloads the
// application to the device that answers at the project's address.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import {
  downloadAll,
  downloadApplication,
  downloadStates,
  installationAsProject,
  programIndividualAddress,
  scanLine,
  unloadApplication,
} from "../../src/knx/commissioning";
import type { CommissioningResult } from "../../src/knx/commissioning";
import { toV2 } from "../../src/knx/export";
import { buildScenario } from "../../src/knx/scenario";
import type { ScenarioError } from "../../src/knx/scenario";
import type { Simulation } from "../../src/knx/sim";
import { activeScenarios, flags, keypad, lampOn, raw, v2 } from "./helpers";

type Rec = Record<string, unknown>;

const actuator = (id: string, address: string, ga: string) => ({
  id,
  name: "Switch actuator",
  address,
  kind: "switchActuator",
  behavior: "switchActuator/v1",
  objects: [
    {
      id: "c1",
      name: "Switching",
      ga,
      dpt: "1.001",
      port: "switch",
      channel: "s1",
      flags: flags(true, false),
    },
  ],
  channels: [{ id: "s1", label: "L1", equipment: { type: "lamp" } }],
});

/** One line: a push button and two switch actuators, all as delivered. */
const project = (...args: [unknown?]): Rec => {
  const installation = args.length ? args[0] : {};
  return {
    ...v2([
      keypad("bp", "1.1.1", [
        { id: "b1", object: "b", ga: "1/1/1", parameters: { onPress: "on" } },
      ]),
      actuator("sa", "1.1.2", "1/1/1"),
      actuator("sa2", "1.1.3", "1/1/2"),
    ]),
    ...(installation === undefined ? {} : { installation }),
  };
};

/** Apply a result to the scenario, as the designer does: a new simulation when needed. */
function apply(doc: Rec, sim: Simulation, r: CommissioningResult) {
  expect(r.status, r.message).toBe("done");
  if (r.status !== "done") return { doc, sim };
  const next = { ...doc, installation: r.installation };
  return { doc: next, sim: r.restart ? createSimulator(next) : sim };
}

const press = (sim: Simulation) => {
  sim.input("bp", "b1", "press");
  sim.advance(5000);
};

describe("installation section", () => {
  it("devices as delivered do nothing", () => {
    const sim = createSimulator(project());
    expect(sim.commissioning).toBe(true);
    expect(sim.physicalAddress("bp")).toBe("15.15.255");
    expect(sim.applicationLoaded("bp")).toBe(false);
    press(sim);
    expect(sim.history).toHaveLength(0);
    expect(lampOn(sim, "sa", "s1")).toBe(false);
    expect(
      sim.journal.some((e) => /no application program/.test(e.message ?? "")),
    ).toBe(true);
  });

  it("without the section, the scenario runs as the project", () => {
    const sim = createSimulator(project(undefined));
    expect(sim.commissioning).toBe(false);
    expect(sim.physicalAddress("bp")).toBe("1.1.1");
    press(sim);
    expect(lampOn(sim, "sa", "s1")).toBe(true);
  });

  it("an installation as the project works as the project, with its addresses", () => {
    const doc = project();
    doc.installation = installationAsProject(doc);
    const sim = createSimulator(doc);
    press(sim);
    expect(lampOn(sim, "sa", "s1")).toBe(true);
    expect(sim.history[0]!.sourceAddress).toBe("1.1.1");
    const states = downloadStates(doc);
    expect(states.get("bp")).toEqual({
      adr: true,
      prg: true,
      par: true,
      grp: true,
      cfg: true,
    });
  });

  it("a device runs the application it was downloaded with, not the project's", () => {
    const doc = project();
    doc.installation = installationAsProject(doc);
    // The project changes after the download: the actuator listens to 1/1/2 now.
    const devices = (doc.devices as Rec[]).map((d) =>
      d.id === "sa" ? actuator("sa", "1.1.2", "1/1/2") : d,
    );
    const changed = { ...doc, devices };
    const sim = createSimulator(changed);
    press(sim);
    expect(lampOn(sim, "sa", "s1")).toBe(true);
    expect(downloadStates(changed).get("sa")).toMatchObject({
      adr: true,
      prg: true,
      par: true,
      grp: false,
    });
  });

  it("rejects references to unknown devices or couplers", () => {
    const bad = project({
      devices: [{ device: "nope" }],
      couplers: [{ coupler: "9.9.0" }],
    });
    try {
      buildScenario(bad);
      expect.unreachable();
    } catch (e) {
      const paths = (e as ScenarioError).details.map((p) => p.path);
      expect(paths).toEqual([
        "installation.devices[0].device",
        "installation.couplers[0].coupler",
      ]);
    }
  });

  it("every example builds as delivered and as the project", () => {
    for (const f of activeScenarios()) {
      const doc = raw(f);
      expect(
        () => buildScenario({ ...doc, installation: {} }),
        f,
      ).not.toThrow();
      const asProject = { ...doc, installation: installationAsProject(doc) };
      expect(() => createSimulator(asProject), f).not.toThrow();
    }
  });
});

describe("programming the individual address", () => {
  it("waits for the programming button, then writes the address and ends programming mode", () => {
    let doc = project();
    let sim = createSimulator(doc);
    expect(programIndividualAddress(doc, sim, "bp").status).toBe("waiting");
    sim.pressProgrammingButton("bp");
    expect(sim.programmingMode("bp")).toBe(true);
    ({ doc, sim } = apply(doc, sim, programIndividualAddress(doc, sim, "bp")));
    expect(sim.physicalAddress("bp")).toBe("1.1.1");
    expect(sim.programmingMode("bp")).toBe(false);
    expect(downloadStates(doc).get("bp")).toMatchObject({
      adr: true,
      prg: false,
    });
  });

  it("ends programming mode with a bus voltage failure, as at power-up", () => {
    const doc = project();
    const sim = createSimulator(doc);
    sim.pressProgrammingButton("bp");
    expect(sim.programmingMode("bp")).toBe(true);
    const line = [...sim.network.topology.segments.keys()][0]!;
    sim.setBusVoltage(line, false);
    sim.setBusVoltage(line, true);
    expect(sim.programmingMode("bp")).toBe(false);
    expect(sim.readAddressInProgrammingMode()).toEqual([]);
  });

  it("refuses with two programming LEDs on", () => {
    const doc = project();
    const sim = createSimulator(doc);
    sim.pressProgrammingButton("bp");
    sim.pressProgrammingButton("sa");
    const r = programIndividualAddress(doc, sim, "bp");
    expect(r.status).toBe("failed");
    expect(r.message).toMatch(/Several devices are in programming mode/);
    expect(sim.physicalAddress("bp")).toBe("15.15.255");
  });

  it("refuses an address already held by another device", () => {
    // The actuator still holds 1.1.1 from an earlier project (another group's board).
    const doc = project({ devices: [{ device: "sa2", address: "1.1.1" }] });
    const sim = createSimulator(doc);
    sim.pressProgrammingButton("bp");
    const r = programIndividualAddress(doc, sim, "bp");
    expect(r.status).toBe("failed");
    expect(r.message).toMatch(/already used on the bus/);
    expect(scanLine(sim, "1.1").map((x) => [x.address, x.target])).toEqual([
      ["1.1.1", "sa2"],
    ]);
  });

  it("the wrong button gives the address to the wrong device", () => {
    let doc = project();
    let sim = createSimulator(doc);
    sim.pressProgrammingButton("sa2");
    ({ doc, sim } = apply(doc, sim, programIndividualAddress(doc, sim, "sa")));
    expect(sim.physicalAddress("sa2")).toBe("1.1.2");
    // Same application program: the download goes to sa2, which then follows 1/1/1.
    const r = downloadApplication(doc, sim, "sa");
    expect(r.message).toMatch(/not the one of the project/);
    ({ doc, sim } = apply(doc, sim, r));
    sim.pressProgrammingButton("bp");
    ({ sim } = apply(doc, sim, downloadAll(doc, sim, "bp")));
    press(sim);
    expect(lampOn(sim, "sa2", "s1")).toBe(true);
    expect(lampOn(sim, "sa", "s1")).toBe(false);
  });
});

describe("downloading the application", () => {
  it("needs a device at the project's address", () => {
    const doc = project();
    const sim = createSimulator(doc);
    const r = downloadApplication(doc, sim, "sa");
    expect(r.status).toBe("failed");
    expect(r.message).toMatch(/No device answers at 1\.1\.2/);
  });

  it("refuses a device with another application program", () => {
    let doc = project();
    let sim = createSimulator(doc);
    // The push button's programming button is pressed for the actuator's address.
    sim.pressProgrammingButton("bp");
    ({ doc, sim } = apply(doc, sim, programIndividualAddress(doc, sim, "sa")));
    const r = downloadApplication(doc, sim, "sa");
    expect(r.status).toBe("failed");
    expect(r.message).toMatch(/does not have the application program/);
  });

  it("download all commissions the line: the push button switches the lamp", () => {
    let doc = project();
    let sim = createSimulator(doc);
    for (const id of ["bp", "sa"]) {
      expect(downloadAll(doc, sim, id).status).toBe("waiting");
      sim.pressProgrammingButton(id);
      ({ doc, sim } = apply(doc, sim, downloadAll(doc, sim, id)));
    }
    press(sim);
    expect(lampOn(sim, "sa", "s1")).toBe(true);
    // Download all on a device at its address downloads the application only.
    expect(downloadAll(doc, sim, "sa").status).toBe("done");
    ({ sim } = apply(doc, sim, unloadApplication(doc, sim, "sa")));
    expect(sim.applicationLoaded("sa")).toBe(false);
  });
});

describe("couplers", () => {
  /** Push button on line 1.1, actuator on line 1.2, behind two line couplers. */
  const twoLines = (installation: unknown = {}): Rec => ({
    ...v2(
      [
        keypad("bp", "1.1.1", [
          { id: "b1", object: "b", ga: "1/1/1", parameters: { onPress: "on" } },
        ]),
        actuator("sa", "1.2.1", "1/1/1"),
      ],
      { lines: [{ address: "1.1" }, { address: "1.2" }] },
    ),
    installation,
  });

  it("a coupler without application forwards no group telegram", () => {
    const doc = twoLines();
    const all = installationAsProject(doc) as unknown as {
      devices: unknown[];
      couplers: unknown[];
    };
    const sim = createSimulator({
      ...doc,
      installation: { devices: all.devices },
    });
    expect(sim.physicalAddress("coupler:1.1.0")).toBe("15.15.0");
    press(sim);
    const tel = sim.history[0]!;
    expect(tel.plan.couplers[0]!.reason).toBe("unprogrammed");
    expect(lampOn(sim, "sa", "s1")).toBe(false);
  });

  it("keeps the filter table of its download", () => {
    let doc = twoLines();
    doc.installation = installationAsProject(doc);
    let sim = createSimulator(doc);
    press(sim);
    expect(lampOn(sim, "sa", "s1")).toBe(true);
    // A new link across the couplers, downloaded to the devices but not to the couplers.
    const kp = keypad("bp", "1.1.1", [
      { id: "b1", object: "b", ga: "1/1/3", parameters: { onPress: "on" } },
    ]);
    doc = {
      ...doc,
      devices: [kp, actuator("sa", "1.2.1", "1/1/3")],
    };
    sim = createSimulator(doc);
    ({ doc, sim } = apply(doc, sim, downloadApplication(doc, sim, "bp")));
    ({ doc, sim } = apply(doc, sim, downloadApplication(doc, sim, "sa")));
    press(sim);
    expect(sim.history[0]!.plan.couplers[0]!.reason).toBe("notInTable");
    expect(downloadStates(doc).get("coupler:1.1.0")).toMatchObject({
      prg: true,
      grp: false,
    });
    ({ doc, sim } = apply(
      doc,
      sim,
      downloadApplication(doc, sim, "coupler:1.1.0"),
    ));
    ({ sim } = apply(doc, sim, downloadApplication(doc, sim, "coupler:1.2.0")));
    press(sim);
    expect(lampOn(sim, "sa", "s1")).toBe(true);
  });
});

describe("export", () => {
  it("writes the project and its installation section, not the installed devices", () => {
    const doc = project();
    doc.installation = installationAsProject(doc);
    const devices = (doc.devices as Rec[]).map((d) =>
      d.id === "sa" ? actuator("sa", "1.1.2", "1/1/2") : d,
    );
    const v2 = toV2(buildScenario({ ...doc, devices })) as unknown as Rec;
    const sa = (v2.devices as Rec[]).find((d) => d.id === "sa")!;
    expect((sa.objects as Rec[])[0]!.ga).toBe("1/1/2");
    const held = (v2.installation as { devices: Rec[] }).devices.find(
      (d) => d.device === "sa",
    )!;
    expect(((held.application as Rec).objects as Rec[])[0]!.ga).toBe("1/1/1");
    expect(() => buildScenario(v2)).not.toThrow();
  });
});
