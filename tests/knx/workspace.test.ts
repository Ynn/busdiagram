// Guided workspace of the designer: trees, filter, context menus, and renaming, without a browser.
import { describe, expect, it } from "vitest";
import { buildScenario } from "../../src/knx/scenario";
import { toV2 } from "../../src/knx/export";
import { captureRegistry } from "../../src/knx/registry";
import * as E from "../../site/designer/edit";
import { menuFor } from "../../site/designer/ws-menu";
import {
  initialWorkspace,
  nameOf,
  reveal,
  startRename,
} from "../../site/designer/ws-state";
import type { Host } from "../../site/designer/ws-state";
import {
  addressTree,
  filterNodes,
  isOpen,
  topologyTree,
} from "../../site/designer/ws-tree";
import type { Node } from "../../site/designer/ws-tree";
import { raw } from "./helpers";

const v2 = (name: string) => toV2(buildScenario(raw(name))) as unknown as E.Doc;

/** A host that applies edits to its document, as the guided editor does. */
function host(doc: E.Doc) {
  const h = {
    doc,
    registry: captureRegistry(),
    ws: initialWorkspace(),
    refused: [] as string[],
    run(_label: string, mutate: (d: E.Doc) => void) {
      const copy = structuredClone(h.doc);
      try {
        mutate(copy);
      } catch (e) {
        if (!(e instanceof E.EditRefusal)) throw e;
        h.refused.push(e.message);
        return false;
      }
      h.doc = copy;
      return true;
    },
    requestUpdate() {},
    refuse(_label: string, message: string) {
      h.refused.push(message);
    },
    announce() {},
    insertDevice() {},
    deviceParameters: () => null,
    gaProperties: () => null,
    installation: () => null,
    topologySettings: () => null,
    lineSettings: () => null,
    typeLabel: () => "",
  };
  return h as unknown as Host & { refused: string[] };
}

const keys = (nodes: Node[]): string[] =>
  nodes.flatMap((n) => [n.key, ...keys(n.children ?? [])]);
const find = (nodes: Node[], key: string): Node | undefined => {
  for (const n of nodes) {
    if (n.key === key) return n;
    const k = find(n.children ?? [], key);
    if (k) return k;
  }
  return undefined;
};
const labels = (h: Host, key: string, where = "tree") =>
  menuFor(h, h.ws.panels[0]!, key, where).map((m) => m.label);

describe("guided workspace: trees", () => {
  it("devices are collapsed and list their group objects without a channel level", () => {
    const h = host(v2("dimming.json"));
    const nodes = topologyTree(h, h.doc!);
    const dev = find(nodes, "dev:pushButton")!;
    expect(dev.closed).toBe(true);
    expect(isOpen(h, dev)).toBe(false);
    expect(dev.children!.map((n) => n.key)).toContain("obj:pushButton/on");
    expect(keys(nodes).some((k) => k.startsWith("chan:"))).toBe(false);
    // Revealing an object opens its device.
    reveal(h, "obj:pushButton/on");
    expect(isOpen(h, dev)).toBe(true);
  });

  it("a line with an extension shows its two segments", () => {
    const doc = v2("dimming.json");
    const line = String(doc.lines[0]!.address);
    E.setLineExtension(doc, line, "repeater");
    const h = host(doc);
    const all = keys(topologyTree(h, doc));
    expect(all).toContain(`seg:${line}/1`);
    expect(all).toContain(`seg:${line}/2`);
  });

  it("the filter keeps matching nodes with their ancestors", () => {
    const h = host(v2("dimming.json"));
    const tree = addressTree(h, h.doc!);
    const shown = keys(filterNodes(tree, "1/3/1"));
    expect(shown).toEqual(["gar", "main:1", "mid:1/3", "ga:1/3/1"]);
    expect(filterNodes(tree, "no such text")).toEqual([]);
    expect(filterNodes(tree, "  ")).toBe(tree);
  });
});

describe("guided workspace: context menus", () => {
  it("every kind of element has commands; a list row can also be opened", () => {
    const h = host(v2("dimming.json"));
    for (const key of [
      "topo",
      "area:1",
      "line:1.1",
      "dev:pushButton",
      "obj:pushButton/on",
      "gar",
      "main:1",
      "mid:1/3",
      "ga:1/3/1",
    ])
      expect(labels(h, key).length, key).toBeGreaterThan(0);
    expect(labels(h, "obj:pushButton/on")).toEqual([
      "Associations",
      "Properties",
      "Link with…",
      "Rename",
      "Unlink all group addresses",
      "Delete object",
    ]);
    expect(labels(h, "ga:1/3/1", "list:addresses")[0]).toBe("Open");
    expect(labels(h, "ga:1/3/1")).toContain("Rename");
    // An element without commands still answers, with a disabled entry.
    const none = menuFor(h, h.ws.panels[0]!, "cat:0");
    expect(none).toHaveLength(1);
    expect(none[0]!.disabled).toBeTruthy();
  });

  it("a menu command runs the same edit as the equivalent button", () => {
    const h = host(v2("dimming.json"));
    const unlink = (key: string) =>
      menuFor(h, h.ws.panels[0]!, key)
        .find((m) => m.label === "Unlink all group addresses")!
        .run();
    const gas = (dev: string, obj: string) =>
      E.gasOf(
        h
          .doc!.devices.find((d) => d.id === dev)!
          .objects.find((o) => o.id === obj)!,
      );
    // A key object can lose its addresses, as any other object.
    unlink("obj:pushButton/on");
    expect(h.refused).toHaveLength(0);
    expect(gas("pushButton", "on")).toEqual([]);
    // An actuator object can lose all its addresses.
    const sw = h.doc!.devices.find((d) => d.id === "dimmerActuator")!
      .objects[0]!;
    expect(E.gasOf(sw).length).toBeGreaterThan(0);
    unlink(`obj:dimmerActuator/${sw.id}`);
    expect(gas("dimmerActuator", sw.id)).toEqual([]);
  });
});

describe("guided workspace: renaming", () => {
  it("names of areas, lines, devices, objects, groups, and addresses can be renamed", () => {
    const doc = v2("dimming.json");
    for (const key of [
      "area:1",
      "line:1.1",
      "dev:pushButton",
      "obj:pushButton/on",
      "main:1",
      "mid:1/3",
      "ga:1/3/1",
    ]) {
      const target = nameOf(doc, key);
      expect(target, key).not.toBeNull();
      target!.apply(doc, `Renamed ${key}`);
      expect(nameOf(doc, key)!.value, key).toBe(`Renamed ${key}`);
    }
    expect(buildScenario(doc)).toBeTruthy();
    expect(nameOf(doc, "topo")).toBeNull();
  });

  it("starts renaming only an element that has a name", () => {
    const h = host(v2("dimming.json"));
    startRename(h, "topo", "tree");
    expect(h.ws.renaming).toBeNull();
    startRename(h, "ga:1/3/1", "list:addresses");
    expect(h.ws.renaming).toEqual({ key: "ga:1/3/1", where: "list:addresses" });
  });
});
