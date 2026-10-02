// Rules of a behavior on its own configuration: blocking errors (validate), derived data
// (normalize), and warnings, for an extension as for a delivered participant.
import { afterEach, describe, expect, it } from "vitest";
import { createSimulator } from "../../../src/core";
import { en } from "../../../src/i18n";
import { configWarnings } from "../../../src/knx/consistency";
import type { BehaviorDefinition } from "../../../src/knx/contracts";
import {
  captureRegistry,
  registerBehavior,
  restoreRegistry,
  saveRegistry,
} from "../../../src/knx/registry";
import type { ScenarioError } from "../../../src/knx/scenario";
import { buildScenario } from "../../../src/knx/scenario";
import { v2 } from "../helpers";

const before = saveRegistry();
afterEach(() => restoreRegistry(before));

const probe: BehaviorDefinition<null> = {
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: { level: { type: "integer", default: 1 } },
  },
  ports: {},
  createState: () => null,
  validate: (d) =>
    d.parameters.level === 0
      ? [{ path: "parameters.level", code: "range", message: "level 0" }]
      : [],
  normalize: () => ({ tableGroupAddresses: ["3/3/3"] }),
  warnings: (d) =>
    d.parameters.level === 2
      ? [{ code: "probe-level", message: `${d.id}: level 2` }]
      : [],
};

const doc = (level: number) =>
  v2([
    {
      id: "p",
      name: "Probe",
      address: "1.1.1",
      kind: "probe",
      behavior: "test.rules/v1",
      parameters: { level },
      objects: [],
    },
  ]);

describe("rules of a behavior", () => {
  it("validate refuses the scenario, with a path under the device", () => {
    registerBehavior("test.rules/v1", probe);
    try {
      buildScenario(doc(0));
      expect.unreachable();
    } catch (e) {
      expect((e as ScenarioError).details).toEqual([
        {
          path: "devices[0].parameters.level",
          code: "range",
          message: "level 0",
        },
      ]);
    }
  });

  it("normalize gives the addresses kept by the filter tables", () => {
    registerBehavior("test.rules/v1", probe);
    expect(buildScenario(doc(1)).devices[0]!.tableGAs).toEqual(["3/3/3"]);
  });

  it("warnings are reported for the device, and by the simulation", () => {
    registerBehavior("test.rules/v1", probe);
    const s = buildScenario(doc(2));
    expect(configWarnings(s, en)).toContainEqual({
      code: "probe-level",
      message: "p: level 2",
      deviceId: "p",
    });
    const codes = createSimulator(doc(2))
      .getState()
      .diagnostics.map((d) => d.code);
    expect(codes).toContain("probe-level");
  });

  it("a delivered behavior keeps its rules once registered", () => {
    const reg = captureRegistry();
    expect(reg.behaviors.get("daliGateway/v1")!.validate).toBeTypeOf(
      "function",
    );
    expect(reg.behaviors.get("usbInterface/v1")!.normalize).toBeTypeOf(
      "function",
    );
    expect(reg.behaviors.get("buttonInterface/v1")!.warnings).toBeTypeOf(
      "function",
    );
  });
});
