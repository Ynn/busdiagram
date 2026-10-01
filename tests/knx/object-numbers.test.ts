// Numbers of group objects in the designer: a fixed block per key and per output, as in the
// object table of an ETS application, so that a key keeps its numbers when another changes.
import { describe, expect, it } from "vitest";
import * as E from "../../site/designer/edit";
import { SNIPPETS } from "../../site/designer/snippets";
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
  const doc = SNIPPETS.find((s) => s.id === template)!.apply(empty(), {
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
  it("a key keeps its numbers when another key changes its gestures", () => {
    const { doc, d } = withDevice("pushButton2");
    expect(table(d())).toEqual(["1 Key 1", "3 Key 2"]);
    const [k1, k2] = d().buttons!;
    const key2 = d().objects.find((o) => o.id === k2!.press!.object)!.id;

    // Key 1 becomes short/long press: its two objects stay before Key 2.
    E.setKeyMode(doc, d().id, k1!.id, "shortlong");
    expect(table(d())).toEqual(["1 Key 1 short", "2 Key 1 long", "3 Key 2"]);
    expect(E.objectNumbers(d()).get(key2)).toBe(3);

    // Back to a single press: same numbers as at the start.
    E.setKeyMode(doc, d().id, k1!.id, "press");
    expect(E.objectNumbers(d()).get(key2)).toBe(3);
    expect(
      d()
        .objects.map((o) => o.id)
        .at(-1),
    ).toBe(key2);
    expect(buildScenario(doc)).toBeTruthy();
  });

  it("a new key takes the next block, after the existing keys", () => {
    const { doc, d } = withDevice("pushButton2");
    const id = E.addKey(doc, d().id);
    const b = d().buttons!.find((x) => x.id === id)!;
    expect(E.objectNumbers(d()).get(b.press!.object)).toBe(5);
    expect(d().objects.at(-1)!.id).toBe(b.press!.object);
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
    const { d } = withDevice("pushButton2");
    const dev = d();
    const before = E.objectNumbers(dev);
    dev.objects.reverse();
    expect(E.objectNumbers(dev)).toEqual(before);
    expect(E.objectsSorted(dev)).toBe(false);
    E.sortObjects(dev);
    expect(E.objectsSorted(dev)).toBe(true);
    expect(table(dev)).toEqual(["1 Key 1", "3 Key 2"]);
  });

  it("objects of a device without keys or outputs follow the order of its ports", () => {
    const { d } = withDevice("roomThermostat");
    const n = E.objectNumbers(d());
    const sorted = E.objectsInOrder(d()).map((o) => n.get(o.id));
    expect(sorted).toEqual(sorted.map((_, i) => i + 1));
  });
});
