// Pages of parameters declared by the standard behaviors: every reference exists.
import { describe, expect, it } from "vitest";
import type { ParameterItem } from "../../src/knx/contracts";
import type { Doc as EditDoc } from "../../site/designer/edit";
import { captureRegistry } from "../../src/knx/registry";

const walk = (items: readonly ParameterItem[]): ParameterItem[] =>
  items.flatMap((i) => ("when" in i ? [i, ...walk(i.items)] : [i]));

describe("parameter layouts of the standard behaviors", () => {
  const layouts = [...captureRegistry().behaviors].filter(
    ([, d]) => d.parameterLayout,
  );

  it("are declared by the actuators, the thermostat, the push-button interface, and the alarm module", () => {
    expect(layouts.map(([id]) => id).sort()).toEqual([
      "alarmModule/v1",
      "buttonInterface/v1",
      "daliGateway/v1",
      "dimmerActuator/v1",
      "heatingActuator/v1",
      "roomThermostat/v1",
      "shutterActuator/v1",
      "switchActuator/v1",
    ]);
  });

  it.each(layouts)("%s refers only to its parameters and ports", (_id, def) => {
    const check = (scope: "device" | "channel") => {
      const pages = def.parameterLayout![scope] ?? [];
      const params = Object.keys(
        (scope === "device" ? def.parameters : def.channelParameters)
          ?.properties ?? {},
      );
      const state = Object.keys(def.channelInitialState?.properties ?? {});
      const ports = Object.entries(def.ports)
        .filter(([, p]) =>
          scope === "channel"
            ? p.channel === "required" || p.channel === "optional"
            : p.channel !== "required",
        )
        .map(([k]) => k);
      const ids = pages.map((p) => p.id);
      expect(new Set(ids).size, `${scope} page ids`).toBe(ids.length);
      for (const page of pages)
        for (const item of walk(page.items)) {
          if ("parameter" in item) expect(params).toContain(item.parameter);
          if ("initialState" in item) {
            expect(scope).toBe("channel");
            expect(state).toContain(item.initialState);
          }
          if ("groupObject" in item) expect(ports).toContain(item.groupObject);
          if ("when" in item) {
            const c = item.when;
            if ("parameter" in c) expect(params).toContain(c.parameter);
            else expect(ports).toContain(c.groupObject);
          }
        }
    };
    check("device");
    check("channel");
  });
});

describe("pages of parameters in the designer", () => {
  it.each([...captureRegistry().behaviors])(
    "%s: every parameter and initial state has a place",
    async (_id, def) => {
      const { layoutOf } = await import("../../site/designer/params");
      const layout = layoutOf(def);
      const keys = (pages: typeof layout.device, kind: string) =>
        new Set(
          pages.flatMap((p) =>
            walk(p.items).flatMap((i) =>
              kind in i ? [(i as Record<string, string>)[kind]!] : [],
            ),
          ),
        );
      const devParams = keys(layout.device, "parameter");
      Object.keys(def.parameters?.properties ?? {}).forEach((k) =>
        expect(devParams, k).toContain(k),
      );
      if (def.output) {
        const chParams = keys(layout.channel, "parameter");
        Object.keys(def.channelParameters?.properties ?? {}).forEach((k) =>
          expect(chParams, k).toContain(k),
        );
        const state = keys(layout.channel, "initialState");
        Object.keys(def.channelInitialState?.properties ?? {}).forEach((k) =>
          expect(state, k).toContain(k),
        );
        // Every port of a channel can be enabled from the channel pages.
        const ports = keys(layout.channel, "groupObject");
        Object.entries(def.ports)
          .filter(([, p]) => p.channel === "required")
          .forEach(([k]) => expect(ports, k).toContain(k));
      }
    },
  );
});

describe("parameter layout of an extension", () => {
  it("is checked when the behavior is registered", async () => {
    const { checkBehavior } = await import("../../src/knx/definition-check");
    const base = {
      ports: { out: { dpts: ["1.001"], channel: "none" as const } },
      createState: () => ({}),
      parameters: {
        type: "object" as const,
        properties: { delay: { type: "integer" as const } },
      },
    };
    expect(() =>
      checkBehavior("ok/v1", {
        ...base,
        parameterLayout: {
          device: [
            {
              id: "main",
              title: "Main",
              items: [
                { parameter: "delay" },
                { when: { groupObject: "out" }, items: [{ note: "Sent." }] },
              ],
            },
          ],
        },
      }),
    ).not.toThrow();
    expect(() =>
      checkBehavior("bad/v1", {
        ...base,
        parameterLayout: {
          device: [
            {
              id: "main",
              title: "Main",
              items: [{ parameter: "speed" }, { groupObject: "in" }],
            },
          ],
        },
      }),
    ).toThrow(/parameter: unknown “speed”[\s\S]*groupObject: unknown “in”/);
  });
});

describe("audit 2026-10-01: pages and loads", () => {
  const ext = {
    ports: { out: { dpts: ["1.001"], channel: "required" as const } },
    output: "switch" as const,
    createState: () => ({}),
    channelParameters: {
      type: "object" as const,
      properties: {
        delay: { type: "integer" as const },
        extra: { type: "integer" as const },
      },
    },
  };

  it("a condition whose values are not a list is refused at registration", async () => {
    const { checkBehavior } = await import("../../src/knx/definition-check");
    expect(() =>
      checkBehavior("faulty/v1", {
        ...ext,
        parameterLayout: {
          channel: [
            {
              id: "main",
              title: "Main",
              items: [
                {
                  when: { parameter: "delay", is: "foo" as never },
                  items: [{ note: "x" }],
                },
              ],
            },
          ],
        },
      }),
    ).toThrow(/when\.is: list of values expected/);
  });

  it("pages named like the designer's own pages do not collide with them", async () => {
    const { checkBehavior } = await import("../../src/knx/definition-check");
    const { layoutOf } = await import("../../site/designer/params");
    const def = checkBehavior("named/v1", {
      ...ext,
      parameterLayout: {
        channel: [
          { id: "loads", title: "Loads", items: [{ parameter: "delay" }] },
          { id: "settings", title: "Settings", items: [] },
        ],
      },
    });
    const ids = layoutOf(def).channel.map((p) => p.id);
    // The automatic page (for "extra" and the port) has an identifier of its own.
    expect(ids).toEqual(["loads", "settings", "#auto"]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(() =>
      checkBehavior("bad-id/v1", {
        ...ext,
        parameterLayout: {
          channel: [{ id: "#auto", title: "Auto", items: [] }],
        },
      }),
    ).toThrow(/id: letters, digits/);
  });

  it("a radiator changed into a lamp no longer keeps its room, which can be deleted", async () => {
    const E = await import("../../site/designer/edit");
    const doc = {
      formatVersion: 2,
      lines: [{ address: "1.1" }],
      groupAddresses: [],
      rooms: [{ id: "room1", name: "Room" }],
      devices: [
        {
          id: "d",
          address: "1.1.1",
          kind: "heatingActuator",
          behavior: "heatingActuator/v1",
          objects: [],
          channels: [
            { id: "c", equipment: { type: "radiator", room: "room1" } },
          ],
        },
      ],
    } as unknown as EditDoc;
    E.setLoadType(doc, "d", "c", 0, { type: "lamp" });
    expect(doc.devices[0]!.channels![0]!.equipment).toEqual({ type: "lamp" });
    expect(() => E.removeRoom(doc, "room1")).not.toThrow();
    // Another radiator keeps the room it heated.
    const doc2 = structuredClone(doc);
    doc2.rooms = [{ id: "room1", name: "Room" }];
    doc2.devices[0]!.channels![0]!.equipment = {
      type: "radiator",
      room: "room1",
    };
    E.setLoadType(doc2, "d", "c", 0, { type: "radiator", room: "room2" });
    expect(doc2.devices[0]!.channels![0]!.equipment).toMatchObject({
      room: "room1",
    });
  });
});
