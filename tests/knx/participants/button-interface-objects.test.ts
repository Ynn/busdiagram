// Objects of a push-button interface input follow its function in the designer, as the
// objects that a product's parameter dialog shows for the chosen function.
import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import * as E from "../../../site/designer/edit";
import { buildScenario } from "../../../src/knx/scenario";
import { readJson } from "../helpers";

const doc = () =>
  structuredClone(
    readJson(
      resolve(
        import.meta.dirname,
        "../fixtures/button-interface-designer.json",
      ),
    ),
  ) as E.Doc;
const ports = (d: E.Doc, ch: string) =>
  d.devices[0]!.objects.filter((o) => o.channel === ch)
    .map((o) => `${o.port}:${o.dpt}`)
    .sort();

describe("designer: objects of a push-button interface input", () => {
  it("a blind input has up/down and stop/step, no switching object", () => {
    const d = doc();
    E.setParam(d, "buttonInterface", "in2", "function", "blind");
    expect(ports(d, "in2")).toEqual(["move:1.008", "stopStep:1.007"]);
    expect(buildScenario(d)).toBeTruthy();
  });

  it("changing the function replaces the objects; a kept object keeps its address", () => {
    const d = doc();
    E.setParam(d, "buttonInterface", "in1", "function", "dim");
    expect(ports(d, "in1")).toEqual(["dim:3.007", "switch:1.001"]);
    expect(
      E.gasOf(
        d.devices[0]!.objects.find(
          (o) => o.channel === "in1" && o.port === "switch",
        )!,
      ),
    ).toEqual(["0/0/1"]);
    E.setParam(d, "buttonInterface", "in1", "function", "value");
    expect(ports(d, "in1")).toEqual(["value:5.001"]);
    E.setGaMembers(
      d,
      "1/0/1",
      [
        {
          dev: "buttonInterface",
          obj: d.devices[0]!.objects.find((o) => o.channel === "in1")!.id,
        },
      ],
      [],
    );
    // Value (5.001) to scene (18.001): same size, the address stays.
    E.setParam(d, "buttonInterface", "in1", "function", "scene");
    const scene = d.devices[0]!.objects.find((o) => o.channel === "in1")!;
    expect([scene.port, scene.dpt, E.gasOf(scene)]).toEqual([
      "value",
      "18.001",
      ["1/0/1"],
    ]);
    expect(buildScenario(d)).toBeTruthy();
  });

  it("lock and LED objects are kept when the function changes", () => {
    const d = doc();
    E.setPortGas(d, "buttonInterface", "lock", "in3", [], {
      dpt: "1.001",
      W: true,
      T: false,
      name: "Lock",
      keepEmpty: true,
    });
    E.setParam(d, "buttonInterface", "in3", "function", "blind");
    expect(ports(d, "in3")).toEqual([
      "lock:1.001",
      "move:1.008",
      "stopStep:1.007",
    ]);
  });

  it("a new input gets the objects of its function", () => {
    const d = doc();
    const id = E.addChannel(d, "buttonInterface", null);
    // The new input repeats the settings of the last one: switching.
    expect(ports(d, id)).toEqual(["switch:1.001"]);
    E.setOutputCount(d, "buttonInterface", 6, null);
    expect(d.devices[0]!.channels).toHaveLength(6);
    expect(buildScenario(d)).toBeTruthy();
  });
});

describe("designer: text on the key of an input", () => {
  it("changes the key, not the name of the input; export keeps it", async () => {
    const { toV2 } = await import("../../../src/knx/export");
    const d = doc();
    E.setKeyLabel(d, "buttonInterface", "in1", "Office · brighter");
    const ch = d.devices[0]!.channels!.find((c) => c.id === "in1")!;
    expect([ch.label, ch.keyLabel]).toEqual(["Input 1", "Office · brighter"]);
    const s = buildScenario(d);
    const dev = s.devicesById.get("buttonInterface")!;
    expect(dev.buttons[0]!.label).toBe("Office · brighter");
    expect(dev.channels[0]!.label).toBe("Input 1");
    const out = toV2(s) as {
      devices: { channels?: { keyLabel?: string }[] }[];
    };
    expect(out.devices[0]!.channels![0]!.keyLabel).toBe("Office · brighter");
    // Empty: the key shows the name of the input again.
    E.setKeyLabel(d, "buttonInterface", "in1", " ");
    expect(
      buildScenario(d).devicesById.get("buttonInterface")!.buttons[0]!.label,
    ).toBe("Input 1");
  });
});
