// Meaning of a port, declared by its behavior: default flags R and U, class of the
// telegrams, link to the loads, unknown initial value. Without declaration, neutral values:
// a port name means nothing by itself.
import { afterEach, describe, expect, it } from "vitest";
import { createSimulator } from "../../../src/core";
import { toV2 } from "../../../src/knx/export";
import type { BehaviorDefinition } from "../../../src/knx/contracts";
import {
  captureRegistry,
  registerBehavior,
  restoreRegistry,
  saveRegistry,
} from "../../../src/knx/registry";
import { buildScenario } from "../../../src/knx/scenario";
import { v2 } from "../helpers";

const before = saveRegistry();
afterEach(() => restoreRegistry(before));

const probe: BehaviorDefinition<null> = {
  ports: {
    // Named like a status port of the switch actuator, but declared as nothing.
    status: { dpts: ["1.001"], channel: "none" },
    feedback: {
      dpts: ["1.001"],
      channel: "none",
      defaultFlags: { R: true, U: true },
      telegram: "state",
      initialUnknown: true,
    },
  },
  createState: () => null,
  onInit: (ctx) => ctx.schedule("send", 10),
  onTimer: (ctx) => {
    ctx.setObject("status", 1);
    ctx.transmit("status");
    ctx.setObject("feedback", 1);
    ctx.transmit("feedback");
  },
};

const doc = () =>
  v2(
    [
      {
        id: "p",
        name: "Probe",
        address: "1.1.1",
        kind: "probe",
        behavior: "test.ports/v1",
        objects: ["status", "feedback"].map((port, i) => ({
          id: port,
          ga: [`1/1/${i + 1}`],
          dpt: "1.001",
          port,
          flags: { W: false, T: true },
        })),
      },
    ],
    {
      groupAddresses: [
        { address: "1/1/1", dpt: "1.001" },
        { address: "1/1/2", dpt: "1.001" },
      ],
    },
  );

describe("meaning of a port", () => {
  it("comes from its declaration, not from its name", () => {
    registerBehavior("test.ports/v1", probe);
    const [status, feedback] = buildScenario(doc()).devices[0]!.objects;
    expect(status).toMatchObject({
      flags: { R: false, U: false },
      telegram: "command",
      drivesLoad: false,
      initial: 0,
    });
    expect(feedback).toMatchObject({
      flags: { R: true, U: true },
      telegram: "state",
      initial: null,
    });
  });

  it("the export leaves out the flags equal to the declared defaults", () => {
    registerBehavior("test.ports/v1", probe);
    const out = toV2(buildScenario(doc()));
    const objects = out.devices[0]!.objects as { flags: object }[];
    expect(objects.map((o) => o.flags)).toEqual([
      { W: false, T: true },
      { W: false, T: true },
    ]);
  });

  it("the class of a telegram follows the port that sends it", () => {
    registerBehavior("test.ports/v1", probe);
    const sim = createSimulator(doc());
    sim.advance(100);
    const kinds = sim.history.map((tel) => [tel.ga, tel.kind]);
    expect(kinds).toContainEqual(["1/1/1", "cmd"]);
    expect(kinds).toContainEqual(["1/1/2", "state"]);
  });

  it("every port of a delivered behavior is described", () => {
    for (const [id, b] of captureRegistry().behaviors)
      for (const [name, port] of Object.entries(b.ports))
        expect(port.description, `${id} ${name}`).toBeTruthy();
  });
});
