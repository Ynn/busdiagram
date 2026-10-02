// Final demonstration of PLAN-SOC: a participant is added by its folder alone (here a
// fictional one, in tests/knx/participants/fixture-participant/) and removed again,
// without any other file of the engine, the diagram, or the designer.
import { afterEach, describe, expect, it } from "vitest";
import { translator } from "../../../src/i18n";
import { configWarnings } from "../../../src/knx/consistency";
import {
  captureRegistry,
  registerParticipant,
  restoreRegistry,
  saveRegistry,
} from "../../../src/knx/registry";
import type { ScenarioError } from "../../../src/knx/scenario";
import { buildScenario } from "../../../src/knx/scenario";
import { catalogGroups } from "../../../site/designer/ws-catalog";
import { DESIGNER } from "../../../site/designer/standard-designer";
import { beaconDesigner } from "./fixture-participant/designer";
import { beaconModel } from "./fixture-participant/model";
import { v2 } from "../helpers";

const before = saveRegistry();
afterEach(() => restoreRegistry(before));

const doc = () =>
  beaconDesigner.templates[0]!.apply(v2([]) as never, { line: "1.1" }) as {
    devices: { parameters?: object }[];
  } & Record<string, unknown>;

describe("a participant added by its folder alone", () => {
  it("works once its model and designer entries are composed", () => {
    registerParticipant(beaconModel);
    // Model: the template gives a valid device, its rules and texts apply.
    const d = doc();
    d.devices[0]!.parameters = { loud: true };
    const s = buildScenario(d);
    expect(s.devices[0]!.behavior).toBe("test.beacon/v1");
    expect(
      configWarnings(s, translator("fr")).filter(
        (w) => w.code === "beacon-loud",
      ),
    ).toEqual([
      {
        code: "beacon-loud",
        message: "Beacon : la balise est sonore",
        deviceId: "beacon",
      },
    ]);
    expect(translator("fr").s!("Beacon signal")).toBe("Signal de la balise");
    // Designer: its catalog entry, in its category, and its displayed type.
    const groups = catalogGroups(captureRegistry(), [
      ...DESIGNER,
      beaconDesigner,
    ]);
    const sensors = groups.find(([, entries]) =>
      entries.some((e) => e.value === "snippet:pir"),
    )!;
    expect(sensors[1].at(-1)).toMatchObject({
      value: "snippet:testBeacon",
      behavior: "test.beacon/v1",
    });
    expect(
      groups.flatMap(([, e]) => e).filter((e) => e.value.startsWith("ext:")),
    ).toEqual([]);
    expect(beaconDesigner.typeLabel!(d.devices[0] as never)).toBe(
      "Test beacon",
    );
  });

  it("removed from the composition, it is gone and a scenario citing it is refused", () => {
    const groups = catalogGroups(captureRegistry());
    expect(
      groups.flatMap(([, e]) => e).some((e) => e.behavior === "test.beacon/v1"),
    ).toBe(false);
    try {
      buildScenario(doc());
      expect.unreachable();
    } catch (e) {
      expect((e as ScenarioError).details.map((p) => p.code)).toContain(
        "unknown-behavior",
      );
    }
  });
});
