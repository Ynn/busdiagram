// Numbers of group objects in the designer: a fixed block per input and per output, as in
// the object table of a product, so that an input keeps its numbers when another changes.
import { describe, expect, it } from "vitest";
import * as E from "../../site/designer/edit";
import { TEMPLATES } from "../../site/designer/standard-designer";
import { buildScenario } from "../../src/knx/scenario";

const empty = () =>
  ({
    formatVersion: 2,
    lines: [{ address: "1.1" }],
    devices: [],
    groupAddresses: [],
  }) as unknown as E.Doc;

/** A document with one device made from a designer template. */
function withDevice(template: string) {
  const doc = TEMPLATES.find((s) => s.id === template)!.apply(empty(), {
    line: "1.1",
  }) as E.Doc;
  const d = doc.devices.at(-1)!;
  E.sortObjects(d);
  return { doc, d: () => doc.devices.find((x) => x.id === d.id)! };
}

/** Number and name of each object, in the order of the scenario. */
const table = (d: E.Dev) => {
  const n = E.objectNumbers(d);
  return d.objects.map((o) => `${n.get(o.id)} ${o.name}`);
};

describe("designer: numbers of group objects", () => {
  it("an input keeps its numbers when another input enables an object", () => {
    const { doc, d } = withDevice("buttonInterface4");
    // Blocks of seven: switching is the first port of each input.
    expect(table(d())).toEqual([
      "1 Switching 1",
      "8 Switching 2",
      "15 Switching 3",
      "22 Switching 4",
    ]);
    const [in1] = d().channels!;
    // Input 1 also dims: its dimming object stays in its block, before input 2.
    E.setPortGas(doc, d().id, "dim", in1!.id, [], {
      dpt: "3.007",
      W: false,
      T: true,
      name: "Dimming 1",
      keepEmpty: true,
    });
    expect(table(d()).slice(0, 3)).toEqual([
      "1 Switching 1",
      "2 Dimming 1",
      "8 Switching 2",
    ]);
    expect(buildScenario(doc)).toBeTruthy();
  });

  it("a new input takes the next block, after the existing inputs", () => {
    const { doc, d } = withDevice("buttonInterface4");
    const id = E.addChannel(doc, d().id, null);
    E.setPortGas(doc, d().id, "switch", id, [], {
      dpt: "1.001",
      W: true,
      T: true,
      name: "Switching 5",
      keepEmpty: true,
    });
    const o = d().objects.find((x) => x.channel === id)!;
    expect(E.objectNumbers(d()).get(o.id)).toBe(29);
    expect(d().objects.at(-1)!.id).toBe(o.id);
  });

  it("an output keeps its numbers when another output gains an object", () => {
    const { doc, d } = withDevice("switchActuator4");
    const numbers = () => E.objectNumbers(d());
    const [c1, c2] = d().channels!;
    const second = d().objects.filter((o) => o.channel === c2!.id);
    const before = second.map((o) => numbers().get(o.id));

    // Activate the forcing object of the first output, without address.
    E.setPortGas(doc, d().id, "forced", c1!.id, [], {
      dpt: "2.001",
      W: true,
      T: false,
      name: "Forcing L1",
      keepEmpty: true,
    });
    expect(second.map((o) => numbers().get(o.id))).toEqual(before);
    // The forcing object sits in the block of the first output, before the second output.
    const forced = d().objects.find(
      (o) => o.port === "forced" && o.channel === c1!.id,
    )!;
    const firstOfSecond = d().objects.findIndex((o) => o.channel === c2!.id);
    expect(d().objects.indexOf(forced)).toBeLessThan(firstOfSecond);
    expect(numbers().get(forced.id)).toBeLessThan(
      Math.min(...(before as number[])),
    );
  });

  it("in an output block, the place follows the ports declared by the behavior", () => {
    const { doc, d } = withDevice("switchActuator4");
    const c1 = d().channels![0]!.id;
    E.setPortGas(doc, d().id, "status", c1, [], {
      dpt: "1.001",
      W: false,
      T: true,
      name: "Status L1",
      keepEmpty: true,
    });
    const n = E.objectNumbers(d());
    const of = (port: string) =>
      n.get(d().objects.find((o) => o.channel === c1 && o.port === port)!.id)!;
    // switchActuator/v1 declares switch, then status.
    expect(of("status")).toBe(of("switch") + 1);
  });

  it("numbers do not depend on the order written in the scenario; sorting follows them", () => {
    const { d } = withDevice("buttonInterface4");
    const dev = d();
    const before = E.objectNumbers(dev);
    dev.objects.reverse();
    expect(E.objectNumbers(dev)).toEqual(before);
    expect(E.objectsSorted(dev)).toBe(false);
    E.sortObjects(dev);
    expect(E.objectsSorted(dev)).toBe(true);
    expect(table(dev)).toEqual([
      "1 Switching 1",
      "8 Switching 2",
      "15 Switching 3",
      "22 Switching 4",
    ]);
  });

  it("objects of a device without keys or outputs follow the order of its ports", () => {
    const { d } = withDevice("roomThermostat");
    const n = E.objectNumbers(d());
    const sorted = E.objectsInOrder(d()).map((o) => n.get(o.id));
    expect(sorted).toEqual(sorted.map((_, i) => i + 1));
  });
});
