// Guided Designer Operations: Each result remains a valid scenario, each
// impossibility is an explicit refusal (EditRefusal) without modification of the document.
import { describe, expect, it } from "vitest";
import { buildScenario } from "../../src/knx/scenario";
import { toV2 } from "../../src/knx/export";
import * as E from "../../site/designer/edit";
import { raw } from "./helpers";

const v2 = (name: string) => toV2(buildScenario(raw(name))) as unknown as E.Doc;
const valid = (doc: E.Doc) => expect(() => buildScenario(doc)).not.toThrow();

describe("guided designer: lines", () => {
  it("deleting a line removes its devices without changing other lines", () => {
    const doc = v2("full-topology.json");
    const on12 = doc.devices.filter((d) => E.lineOf(d) === "1.2").length;
    const total = doc.devices.length;
    expect(on12).toBeGreaterThan(0);
    expect(E.removeLine(doc, "1.2")).toBe(on12);
    expect(doc.lines.map((l) => String(l.address))).not.toContain("1.2");
    expect(doc.devices).toHaveLength(total - on12);
    valid(doc);
  });

  it("refuses to delete the last line; the IP network follows the remaining lines", () => {
    const one = v2("lighting-control.json");
    expect(() => E.removeLine(one, "1.1")).toThrow(E.EditRefusal);
    // Old writing: rewritten in "topology.ip" before deletion.
    const vol = v2("shutter-control.json");
    vol.lines.push({ address: "1.2" });
    delete vol.ipRouter;
    vol.topology = { ip: "lineCouplers" };
    expect(E.removeLine(vol, "1.2")).toBe(0);
    valid(vol);
  });

  it("names and renames a line", () => {
    const doc = v2("lighting-control.json");
    E.setLineName(doc, "1.1", "Tableau");
    expect(doc.lines[0]!.name).toBe("Tableau");
    E.setLineName(doc, "1.1", "");
    expect(doc.lines[0]!.name).toBeUndefined();
    valid(doc);
  });
});

describe("guided designer: DPT of a group address", () => {
  it("only suggests DPTs matching linked object sizes", () => {
    const doc = v2("lighting-control.json");
    const allowed = E.gaAllowedDpts(doc, "1/1/1");
    expect(allowed).toContain("1.001");
    expect(allowed).toContain("1.008");
    expect(allowed).not.toContain("5.001");
    expect(allowed).not.toContain("17.001");
  });

  it("refuses a DPT of different size, accepts a DPT of the same size", () => {
    const doc = v2("lighting-control.json");
    const before = JSON.stringify(doc);
    expect(() => E.setGaField(doc, "1/1/1", "dpt", "5.001")).toThrow(/size/);
    expect(JSON.stringify(doc)).toBe(before);
    E.setGaField(doc, "1/1/1", "dpt", "1.002");
    valid(doc);
  });

  it("an unlinked address accepts all supported DPTs", () => {
    const doc = v2("lighting-control.json");
    const ga = E.newGa(doc, "1.001", "Libre");
    E.setGaField(doc, ga, "dpt", "5.001");
    expect(doc.groupAddresses.find((g) => g.address === ga)!.dpt).toBe("5.001");
    valid(doc);
  });
});

describe("guided designer: devices and addresses", () => {
  it("rejects an individual address that is duplicate or malformed", () => {
    const doc = v2("lighting-control.json");
    const [a, b] = doc.devices;
    expect(() => E.setDeviceAddress(doc, b!.id, a!.address!)).toThrow(
      /already used/,
    );
    expect(() => E.setDeviceAddress(doc, b!.id, "1.1")).toThrow(E.EditRefusal);
  });

  it("group command links one address to several outputs", () => {
    const doc = v2("lighting-control.json");
    const act = doc.devices.find((d) => d.behavior === "switchActuator/v1")!;
    act.channels!.forEach((c) =>
      E.setPortGas(doc, act.id, "switch", c.id, ["1/1/1"], {
        dpt: "1.001",
        W: true,
        T: false,
        name: c.id,
      }),
    );
    const listeners = E.gaUsage(doc, "1/1/1").receivers.filter(
      (u) => u.deviceId === act.id,
    );
    expect(listeners).toHaveLength(act.channels!.length);
    valid(doc);
  });

  it("renames a group address wherever it is used", () => {
    const doc = v2("lighting-control.json");
    const users = E.gaUsage(doc, "1/1/1").receivers.length;
    E.renameGa(doc, "1/1/1", "1/1/9");
    expect(E.gaUsage(doc, "1/1/9").receivers).toHaveLength(users);
    expect(E.gaUsage(doc, "1/1/1").receivers).toHaveLength(0);
    valid(doc);
  });
});

describe("guided designer: topology", () => {
  it("adding and deleting an area updates its A.1 line, name, and devices", () => {
    const doc = v2("lighting-control.json");
    expect(E.addArea(doc)).toBe(2);
    expect(doc.lines.map((l) => l.address)).toEqual(["1.1", "2.1"]);
    E.setAreaName(doc, 2, "Building B");
    valid(doc);
    // With two areas, the backbone and area couplers appear.
    expect(E.couplersOf(doc).map((c) => c.address)).toEqual([
      "1.0.0",
      "2.0.0",
      "1.1.0",
      "2.1.0",
    ]);
    expect(E.addLine(doc, 2)).toBe("2.2");
    const n = doc.devices.length;
    expect(E.removeArea(doc, 1)).toBe(n);
    expect(doc.topology?.areas).toEqual([{ address: 2, name: "Building B" }]);
    expect(() => E.removeArea(doc, 2)).toThrow(E.EditRefusal);
    valid(doc);
  });

  it("create backbone and main lines on demand with a device on the main line", () => {
    const doc = v2("lighting-control.json");
    E.setTopologyFlag(doc, "mainLines", true);
    expect(E.levelsOf(doc).mainLines).toEqual([1]);
    E.connectDevice(doc, doc.devices[0]!.id, "1.0");
    expect(doc.devices[0]!.address).toBe("1.0.1");
    valid(doc);
    E.setTopologyFlag(doc, "backbone", true);
    expect(E.couplersOf(doc).map((c) => `${c.address}:${c.kind}`)).toEqual([
      "1.0.0:area",
      "1.1.0:line",
    ]);
    E.connectDevice(doc, doc.devices[1]!.id, "0.0");
    expect(doc.devices[1]!.address).toBe("0.0.1");
    valid(doc);
  });

  it("IP network roles, connected supervisor, and refusal to remove an in-use network", () => {
    const doc = v2("lighting-control.json");
    E.setIpRole(doc, "lineCouplers");
    expect(E.couplersOf(doc)).toEqual([{ address: "1.1.0", kind: "router" }]);
    doc.devices.push({
      id: "sup",
      kind: "supervisor",
      behavior: "display/v1",
      objects: [],
    });
    valid(doc);
    expect(() => E.setIpRole(doc, null)).toThrow(/IP network/);
    E.connectDevice(doc, "sup", "1.1");
    expect(doc.devices.at(-1)).toMatchObject({
      medium: "TP",
      address: "1.1.3",
    });
    E.setIpRole(doc, null);
    expect(doc.topology).toBeUndefined();
    valid(doc);
  });

  it("supervisor coupler parameters and project declaration reporting", () => {
    const doc = v2("full-topology.json");
    E.setCouplerRouting(doc, "1.1.0", "up", "route");
    E.setCouplerRouting(doc, "1.1.0", "down", "block");
    expect(doc.topology?.couplers).toEqual([
      { address: "1.1.0", up: "route", down: "block" },
    ]);
    E.setCouplerRouting(doc, "1.1.0", "up", "filter");
    E.setCouplerRouting(doc, "1.1.0", "down", "filter");
    expect(doc.topology?.couplers).toBeUndefined();
    expect(() => E.setCouplerRouting(doc, "9.9.0", "up", "route")).toThrow(
      E.EditRefusal,
    );
    E.setInFilterTables(doc, "sup", false);
    valid(doc);
    expect(buildScenario(doc).devicesById.get("sup")!.inFilterTables).toBe(
      false,
    );
  });
});

describe("guided designer: dimming and DALI", () => {
  const empty = (): E.Doc =>
    ({
      formatVersion: 2,
      lines: [{ address: "1.1" }],
      groupAddresses: [],
      devices: [],
    }) as unknown as E.Doc;

  it("dimmer actuator, DALI gateway, and push-button interface templates are valid", async () => {
    const { SNIPPETS } = await import("../../site/designer/snippets");
    for (const id of ["dim", "dali", "buttonInterface4"]) {
      const doc = SNIPPETS.find((s) => s.id === id)!.apply(empty()) as E.Doc;
      valid(doc);
    }
  });

});

describe("guided designer: rooms and heating", () => {
  it("thermostat templates, heating actuator and contact create a room in a valid scenario", async () => {
    const { SNIPPETS } = await import("../../site/designer/snippets");
    let doc = v2("lighting-control.json");
    for (const id of ["roomThermostat", "heatingActuator", "windowContact"])
      doc = SNIPPETS.find((s) => s.id === id)!.apply(doc) as E.Doc;
    expect(E.roomsOf(doc).map((r) => r.id)).toEqual(["room1"]);
    const s = buildScenario(doc);
    expect(s.rooms).toHaveLength(1);
    expect(s.devices.find((d) => d.kind === "thermostat")!.room).toBe("room1");
    expect(
      s.devices
        .find((d) => d.kind === "heatingActuator")!
        .channels.map((c) => c.equipmentConfigs[0]?.room),
    ).toEqual(["room1", "room1"]);
  });

  it("a room with a radiator cannot be removed; otherwise sensors lose their room link", () => {
    const doc = v2("room-heating.json");
    expect(() => E.removeRoom(doc, "livingRoom")).toThrow(/still feeds/);
    E.setEquipmentRoom(doc, "heatingActuator", "h1", "bedroom");
    E.removeRoom(doc, "livingRoom");
    expect(
      doc.devices.find((d) => d.id === "livingThermostat")!.room,
    ).toBeUndefined();
    valid(doc);
  });

  it("adds, renames a room; an off-range temperature is refused by validation", () => {
    const doc = v2("lighting-control.json");
    const id = E.addRoom(doc);
    E.setRoomField(doc, id, "name", "Bureau");
    E.setRoomField(doc, id, "outsideTemperatureC", -10);
    valid(doc);
    E.setRoomField(doc, id, "temperatureC", 99);
    expect(() => buildScenario(doc)).toThrow(/rooms\[0\]\.temperatureC/);
  });
});

describe("designer settings", () => {
  it("null and empty string are values; only undefined removes property", () => {
    const doc = v2("lighting-control.json");
    const switchActuator = doc.devices.find(
      (d) => d.behavior === "switchActuator/v1",
    )!;
    const ch = switchActuator.channels![0]!.id;
    E.setParam(doc, switchActuator.id, ch, "timerMs", null);
    expect(switchActuator.channels![0]!.parameters).toHaveProperty(
      "timerMs",
      null,
    );
    E.setParam(doc, switchActuator.id, null, "label", "");
    expect(switchActuator.parameters).toHaveProperty("label", "");
    E.setParam(doc, switchActuator.id, null, "label", undefined);
    expect(switchActuator.parameters).toBeUndefined();
    E.setParam(doc, switchActuator.id, ch, "timerMs", undefined);
    expect(switchActuator.channels![0]!.parameters).not.toHaveProperty(
      "timerMs",
    );
  });

  it("two objects on the same port: only the object concerned changes", () => {
    const doc = v2("dali-gateway.json");
    const gw = doc.devices.find((d) => d.id === "gw")!;
    const g1s = gw.objects.find((o) => o.id === "g1s")!;
    gw.objects.push({ ...structuredClone(g1s), id: "g1s2", ga: "1/1/2" });
    valid(doc);
    const opts = { dpt: "1.001", W: true, T: false, name: "Commutation" };
    E.setPortGas(doc, "gw", "switch", "g1", [], { ...opts, objectId: "g1s2" });
    expect(gw.objects.some((o) => o.id === "g1s2")).toBe(false);
    expect(E.gasOf(gw.objects.find((o) => o.id === "g1s")!)).toEqual(["1/1/1"]);
    gw.objects.push({ ...structuredClone(g1s), id: "g1s2", ga: "1/1/2" });
    E.setPortGas(doc, "gw", "switch", "g1", ["1/1/1", "1/1/0"], {
      ...opts,
      objectId: "g1s",
    });
    expect(E.gasOf(gw.objects.find((o) => o.id === "g1s2")!)).toEqual([
      "1/1/2",
    ]);
    expect(E.gasOf(gw.objects.find((o) => o.id === "g1s")!)).toEqual([
      "1/1/1",
      "1/1/0",
    ]);
    valid(doc);
  });

  it("an R-only object is a responder, not a sender; an object with no flags has no role", () => {
    const doc = v2("dali-gateway.json");
    const gw = doc.devices.find((d) => d.id === "gw")!;
    gw.objects.find((o) => o.id === "g1e")!.flags = {
      W: false,
      T: false,
      R: true,
      U: false,
    };
    const u = E.gaUsage(doc, "1/4/1");
    expect(u.senders.map((x) => x.objectId)).not.toContain("g1e");
    expect(u.responders.map((x) => x.objectId)).toContain("g1e");
    // An associated object without any enabled flag appears nowhere.
    gw.objects.find((o) => o.id === "g1e")!.flags = {
      W: false,
      T: false,
      R: false,
      U: false,
    };
    const none = E.gaUsage(doc, "1/4/1");
    expect(
      [
        ...none.senders,
        ...none.responders,
        ...none.receivers,
        ...none.updaters,
      ].map((x) => x.objectId),
    ).not.toContain("g1e");
  });
});

describe("ergonomics: grouped operations", () => {
  it("link an address to several objects without changing flags or other addresses", () => {
    const doc = v2("object-flags.json");
    const switchActuator = doc.devices.find((d) => d.id === "switchActuator")!;
    // Two new command objects without addresses (channels 4 and 5).
    ["s4", "s5"].forEach((ch) =>
      E.setPortGas(doc, "switchActuator", "switch", ch, [], {
        dpt: "1.001",
        W: true,
        T: false,
        name: `Command ${ch}`,
        keepEmpty: true,
      }),
    );
    const ids = switchActuator.objects
      .filter((o) => ["s4", "s5"].includes(o.channel!))
      .map((o) => o.id);
    const before = structuredClone(
      switchActuator.objects.find((o) => o.id === "c3")!,
    );
    const wanted = new Set(
      E.gaMemberCandidates(doc, "1/1/1")
        .filter((c) => c.member)
        .map((c) => `${c.dev}/${c.obj}`),
    );
    ids.forEach((id) => wanted.add(`switchActuator/${id}`));
    wanted.delete("switchActuator/c2");
    const plan = E.planGaMembers(doc, "1/1/1", wanted);
    expect(plan.filter((x) => x.kind === "add")).toHaveLength(2);
    // c2 had only 1/1/1; the result reports it will have no addresses.
    expect(plan.find((x) => x.obj === "c2")).toMatchObject({
      kind: "remove",
      sendingAfter: null,
    });
    // New objects receive 1/1/1 as their sending address (they had none).
    expect(plan.find((x) => x.obj === ids[0])!.sendingAfter).toBe("1/1/1");
    E.setGaMembers(
      doc,
      "1/1/1",
      plan.filter((x) => x.kind === "add"),
      plan.filter((x) => x.kind === "remove"),
    );
    ids.forEach((id) =>
      expect(E.gasOf(switchActuator.objects.find((o) => o.id === id)!)).toEqual(
        ["1/1/1"],
      ),
    );
    expect(E.gasOf(switchActuator.objects.find((o) => o.id === "c2")!)).toEqual(
      [],
    );
    expect(switchActuator.objects.find((o) => o.id === "c3")).toEqual(before);
    valid(doc);
  });

  it("add a listening address while keeping the sending address first", () => {
    const doc = v2("object-flags.json");
    E.setGaMembers(doc, "1/1/3", [{ dev: "switchActuator", obj: "c1" }], []);
    const c1 = doc.devices
      .find((d) => d.id === "switchActuator")!
      .objects.find((o) => o.id === "c1")!;
    expect(E.gasOf(c1)).toEqual(["1/1/1", "1/1/3"]);
  });

  it("reject incompatible data size", () => {
    const doc = v2("dali-gateway.json");
    expect(() =>
      E.setGaMembers(doc, "1/3/1", [{ dev: "gw", obj: "g1s" }], []),
    ).toThrow(E.EditRefusal);
  });

  it("copy output settings and load without copying objects or addresses", () => {
    const doc = v2("object-flags.json");
    const switchActuator = doc.devices.find((d) => d.id === "switchActuator")!;
    const objects = structuredClone(switchActuator.objects);
    E.setParam(doc, "switchActuator", "s1", "timerMs", 15000);
    const s1 = switchActuator.channels!.find((c) => c.id === "s1")!;
    const targets = ["s2", "s3", "s4", "s5", "s6"].map((ch) => ({
      dev: "switchActuator",
      ch,
    }));
    expect(E.copyTargets(doc, "switchActuator", "s1").map((x) => x.ch)).toEqual(
      targets.map((x) => x.ch),
    );
    E.copyChannelSettings(doc, "switchActuator", "s1", targets, {
      parameters: true,
      load: true,
      scenes: false,
    });
    switchActuator.channels!.slice(1).forEach((c) => {
      expect(c.parameters).toEqual(s1.parameters);
      expect(c.equipment).toEqual(s1.equipment);
    });
    expect(switchActuator.objects).toEqual(objects);
    expect(switchActuator.channels!.map((c) => c.label)).toEqual(
      v2("object-flags.json")
        .devices.find((d) => d.id === "switchActuator")!
        .channels!.map((c) => c.label),
    );
    valid(doc);
    // Another behavior is not a target.
    expect(() =>
      E.copyChannelSettings(
        doc,
        "switchActuator",
        "s1",
        [{ dev: "pushButton", ch: "x" }],
        {
          parameters: true,
          load: false,
          scenes: false,
        },
      ),
    ).toThrow(E.EditRefusal);
  });
});

describe("guided designer: outputs", () => {
  it("a new shutter output repeats the required travel time and the load", () => {
    const doc = v2("shutter-calibrated.json");
    E.addChannel(doc, "shutterActuator", { type: "shutter" });
    E.addChannel(doc, "shutterActuator", { type: "shutter" });
    const channels = doc.devices.find(
      (d) => d.id === "shutterActuator",
    )!.channels!;
    expect(channels.map((c) => c.label)).toEqual([
      "Shutter S1",
      "Shutter S2",
      "Shutter S3",
    ]);
    expect(channels[2]!.parameters).toEqual(channels[0]!.parameters);
    expect(channels[2]!.equipment).toEqual(channels[0]!.equipment);
    valid(doc);
  });
});

describe("guided designer: line extension", () => {
  it("adds a repeater at a conventional address and places a device behind it", () => {
    const doc = v2("lighting-control.json");
    E.setLineExtension(doc, "1.1", "repeater");
    // The segment behind the extension gets its own power supply.
    expect(doc.lines[0]!.extension).toEqual({
      address: "1.1.64",
      mode: "repeater",
      powerSupply: { currentMa: 640 },
    });
    E.setDownstream(doc, "switchActuator", true);
    valid(doc);
    E.setLineExtension(doc, "1.1", "segmentCoupler");
    expect((doc.lines[0]!.extension as { mode: string }).mode).toBe(
      "segmentCoupler",
    );
    valid(doc);
  });

  it("removing the extension moves devices back to the main segment", () => {
    const doc = v2("lighting-control.json");
    E.setLineExtension(doc, "1.1", "repeater");
    E.setDownstream(doc, "switchActuator", true);
    E.setLineExtension(doc, "1.1", null);
    expect(doc.lines[0]!.extension).toBeUndefined();
    expect(
      doc.devices.find((d) => d.id === "switchActuator")!.downstream,
    ).toBeUndefined();
    valid(doc);
  });

  it("refuses an extension address outside the line or already used", () => {
    const doc = v2("lighting-control.json");
    E.setLineExtension(doc, "1.1", "repeater");
    expect(() => E.setLineExtensionAddress(doc, "1.1", "1.2.64")).toThrow(
      E.EditRefusal,
    );
    expect(() => E.setLineExtensionAddress(doc, "1.1", "1.1.1")).toThrow(
      E.EditRefusal,
    );
    expect(() =>
      E.setDownstream(v2("lighting-control.json"), "switchActuator", true),
    ).toThrow(E.EditRefusal);
  });
});

describe("guided designer: simulated clock", () => {
  it("adds, changes, and removes the clock", () => {
    const doc = v2("lighting-control.json");
    E.setClock(doc, "2026-01-05T06:55:00", 60);
    expect(doc.clock).toEqual({ start: "2026-01-05T06:55:00", speed: 60 });
    valid(doc);
    E.setClock(doc, "2026-01-05T06:55:00", 1);
    expect(doc.clock).toEqual({ start: "2026-01-05T06:55:00" });
    expect(() => E.setClock(doc, "05/01/2026 06:55")).toThrow(E.EditRefusal);
    E.setClock(doc, null);
    expect(doc.clock).toBeUndefined();
  });
});

describe("communication object names", () => {
  it("renames an object and falls back to its ID when the name is cleared", () => {
    const doc = v2("lighting-control.json");
    const dev = doc.devices[0]!;
    const id = dev.objects[0]!.id;
    E.setObjectName(doc, dev.id, id, "  Ceiling light  ");
    expect(dev.objects[0]!.name).toBe("Ceiling light");
    expect(() => buildScenario(doc)).not.toThrow();
    E.setObjectName(doc, dev.id, id, "");
    expect(dev.objects[0]!.name).toBeUndefined();
    expect(() => E.setObjectName(doc, dev.id, "missing", "x")).toThrow(
      E.EditRefusal,
    );
  });
});

describe("line power supply in the designer", () => {
  it("sets, clears the current of, and removes the supply of a line and of its segment", () => {
    const doc = v2("full-topology.json");
    E.setLinePowerSupply(doc, "1.1", 320);
    expect(doc.lines[0]!.powerSupply).toEqual({ currentMa: 320 });
    E.setLinePowerSupply(doc, "1.1", 0);
    expect(doc.lines[0]!.powerSupply).toEqual({});
    E.setLinePowerSupply(doc, "1.1", null);
    expect(doc.lines[0]!.powerSupply).toBeUndefined();
    E.setLinePowerSupply(doc, "2.1", 160, true);
    const l21 = doc.lines.find((l) => String(l.address) === "2.1")!;
    expect((l21.extension as { powerSupply?: unknown }).powerSupply).toEqual({
      currentMa: 160,
    });
    expect(() => E.setLinePowerSupply(doc, "1.1", 160, true)).toThrow(
      E.EditRefusal,
    );
    valid(doc);
  });
});

describe("group objects: linking and sending address", () => {
  it("adds a listened address, promotes it to sending address, and removes it", () => {
    const doc = v2("status-feedback.json");
    const dev = doc.devices.find((d) => d.id === "pushButton")!;
    const key1 = dev.objects.find((o) => o.id === "key1")!;
    E.setGaMembers(doc, "1/4/1", [{ dev: "pushButton", obj: "key1" }], []);
    expect(E.gasOf(key1)).toEqual(["1/1/1", "1/4/1"]);
    E.setSendingGa(doc, "pushButton", "key1", "1/4/1");
    expect(E.gasOf(key1)).toEqual(["1/4/1", "1/1/1"]);
    E.setSendingGa(doc, "pushButton", "key1", "1/1/1");
    E.setGaMembers(doc, "1/4/1", [], [{ dev: "pushButton", obj: "key1" }]);
    expect(E.gasOf(key1)).toEqual(["1/1/1"]);
    expect(() => E.setSendingGa(doc, "pushButton", "key1", "1/9/9")).toThrow(
      E.EditRefusal,
    );
    valid(doc);
  });
});

describe("group names in the designer", () => {
  it("names, orders, and removes main and middle groups", () => {
    const doc = v2("status-feedback.json");
    E.setGroupRangeName(doc, "1/4", "Status");
    E.setGroupRangeName(doc, "1", "Lighting");
    expect(doc.groupRanges).toEqual([
      { address: "1", name: "Lighting" },
      { address: "1/4", name: "Status" },
    ]);
    E.setGroupRangeName(doc, "1/4", "  ");
    E.setGroupRangeName(doc, "1", "");
    expect(doc.groupRanges).toBeUndefined();
    valid(doc);
  });
});

describe("guided designer: values entered in the diagram", () => {
  it("an input is added, changed, and removed; it needs a group address", () => {
    const doc = v2("boiler-room.json");
    const meter = doc.devices.find((d) => d.behavior === "energyMeter/v1")!;
    const energy = meter.objects.find((o) => o.port === "energy")!;
    expect(E.inputOf(meter, energy.id)).toBeUndefined();
    E.setInput(doc, meter.id, energy.id, {
      label: "Index",
      min: 0,
      max: 100000,
    });
    const added = E.inputOf(meter, energy.id)!;
    expect(added).toMatchObject({
      type: "number",
      label: "Index",
      max: 100000,
    });
    valid(doc);
    E.setInput(doc, meter.id, energy.id, { ...added, max: 50000, step: 10 });
    expect(E.inputOf(meter, energy.id)).toMatchObject({ max: 50000, step: 10 });
    E.setInput(doc, meter.id, energy.id, null);
    expect(E.inputOf(meter, energy.id)).toBeUndefined();
    valid(doc);
    // Without a group address, an entered value could not be sent.
    const free = { ...energy, id: "free", ga: [] };
    meter.objects.push(free);
    expect(() => E.setInput(doc, meter.id, "free", {})).toThrow(E.EditRefusal);
  });

  it("deleting an object deletes its input", () => {
    const doc = v2("boiler-room.json");
    const meter = doc.devices.find((d) => d.behavior === "energyMeter/v1")!;
    const input = meter.inputs![0]!;
    E.removeObject(doc, meter.id, input.object);
    expect(meter.inputs?.some((n) => n.object === input.object)).toBeFalsy();
    valid(doc);
  });

  it("an energy meter has channels in the designer, without connected loads", async () => {
    const { hasChannels, layoutOf } =
      await import("../../site/designer/params");
    const { captureRegistry } = await import("../../src/knx/registry");
    const def = captureRegistry().behaviors.get("energyMeter/v1")!;
    expect(hasChannels(def)).toBe(true);
    const ports = layoutOf(def).channel.flatMap((p) =>
      p.items.flatMap((i) => ("groupObject" in i ? [i.groupObject] : [])),
    );
    expect(ports).toEqual(expect.arrayContaining(["power", "energy"]));
  });
});
