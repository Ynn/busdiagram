// State of the guided workspace: panels, selections, layout stored in the browser,
// and navigation to an element (reveal).
import type { TemplateResult } from "lit";
import { dptBits } from "../../src/knx/dpt";
import type { Registry } from "../../src/knx/registry";
import type { Dev, Doc } from "./edit";
import * as E from "./edit";
import { t } from "./lang";

export type PanelContent =
  "topology" | "addresses" | "building" | "catalog" | "installation";

export interface Panel {
  content: PanelContent;
  /** Width of the tree, in pixels. */
  treeWidth: number;
  /** Selected tree node: "topo", "area:1", "line:1.1", "seg:1.1/2", "dev:id",
   * "obj:id/obj", "gar", "main:1", "mid:1/2", "ga:1/2/3", "bld", "room:id", "free",
   * "out:id/channel/index", "cat", "cat:0". */
  sel: string | null;
  /** Tab of the list view for each kind of selection. */
  tabs: Record<string, string>;
  /** Text that filters the tree (address or name); not stored. */
  filter?: string;
}

export interface WorkspaceState {
  panels: Panel[];
  /** Share of the height given to the first panel (0.15–0.85). */
  split: number;
  /** Collapsed tree nodes (nodes are expanded by default, except devices). */
  collapsed: Set<string>;
  /** Expanded devices: their group objects are shown in the tree. */
  expanded: Set<string>;
  /** Element whose name is being edited, in the tree or in a list. */
  renaming: { key: string; where: string } | null;
  /** Explanation of the gesture in progress (drag and drop), shown in the status bar. */
  hint: string;
  catalogCount: number;
  catalogLine: string;
  catalogSel: string | null;
  /** Context menu open at a position of the window. */
  menu: { x: number; y: number; items: MenuItem[] } | null;
}

export interface MenuItem {
  label: string;
  run: () => void;
  /** Reason why the command is not available here. */
  disabled?: string;
}

/** What the workspace needs from the guided editor. */
export interface Host {
  doc: Doc | null;
  registry: Registry;
  ws: WorkspaceState;
  run(label: string, mutate: (d: Doc) => void): boolean;
  requestUpdate(): void;
  refuse(label: string, message: string): void;
  announce(text: string): void;
  insertDevice(line: string, value: string, downstream?: boolean): void;
  deviceParameters(doc: Doc, d: Dev): TemplateResult;
  gaProperties(doc: Doc, g: E.Ga): TemplateResult;
  installation(doc: Doc): TemplateResult;
  topologySettings(doc: Doc): TemplateResult;
  lineSettings(doc: Doc, l: Doc["lines"][number]): TemplateResult;
  typeLabel(d: Dev): string;
}

const STORE = "busdiagram.designer.panels";
export const CONTENTS: PanelContent[] = [
  "topology",
  "addresses",
  "building",
  "catalog",
  "installation",
];
export const contentLabel = (c: PanelContent) =>
  ({
    topology: t`Topology`,
    addresses: t`Group addresses`,
    building: t`Building`,
    catalog: t`Catalog`,
    installation: t`Installation`,
  })[c];

interface Stored {
  contents: PanelContent[];
  split: number;
  trees: number[];
}

export function initialWorkspace(): WorkspaceState {
  let stored: Stored = {
    contents: ["topology", "addresses"],
    split: 0.55,
    trees: [240, 240],
  };
  try {
    const v = JSON.parse(
      localStorage.getItem(STORE) ?? "null",
    ) as Stored | null;
    if (
      v &&
      Array.isArray(v.contents) &&
      v.contents.length >= 1 &&
      v.contents.length <= 2 &&
      v.contents.every((c) => CONTENTS.includes(c))
    )
      stored = {
        contents: v.contents,
        split: typeof v.split === "number" ? v.split : 0.55,
        trees: Array.isArray(v.trees) ? v.trees : [240, 240],
      };
  } catch {
    // Storage unavailable: default panels.
  }
  return {
    panels: stored.contents.map((content, i) => ({
      content,
      treeWidth: stored.trees[i] ?? 240,
      sel: null,
      tabs: {},
    })),
    split: stored.split,
    collapsed: new Set(),
    expanded: new Set(),
    renaming: null,
    hint: "",
    catalogCount: 1,
    catalogLine: "",
    catalogSel: null,
    menu: null,
  };
}

export function savePanels(ws: WorkspaceState) {
  try {
    const stored: Stored = {
      contents: ws.panels.map((p) => p.content),
      split: ws.split,
      trees: ws.panels.map((p) => p.treeWidth),
    };
    localStorage.setItem(STORE, JSON.stringify(stored));
  } catch {
    // Storage unavailable: the layout lasts for this visit.
  }
}

// ── Model helpers ────────────────────────────────────────────────────────────

export const devOf = (doc: Doc, id: string) =>
  doc.devices.find((d) => d.id === id);
/** Number of a group object, stable when other keys or outputs change (see objectNumbers). */
export const objNumber = (d: Dev, objectId: string) =>
  E.objectNumbers(d).get(objectId) ?? 0;
export const objLabel = (d: Dev, o: Dev["objects"][number]) =>
  `${objNumber(d, o.id)}: ${o.name ?? o.id}`;
export const sizeText = (dpt: string | undefined) => {
  if (!dpt) return "";
  const b = dptBits(dpt);
  return b < 8 ? t`${b} bit` : t`${b / 8} byte`;
};
export const rangeName = (doc: Doc, address: string) =>
  (doc.groupRanges ?? []).find((r) => r.address === address)?.name ?? "";
export const parts = (a: string) => a.split("/").map(Number);

export function select(host: Host, p: Panel, key: string) {
  p.sel = key;
  host.requestUpdate();
}

/** Show a panel with a given content (the other panel when there are two). */
export function showIn(host: Host, from: Panel, content: PanelContent): Panel {
  const ws = host.ws;
  let p = ws.panels.find((x) => x.content === content);
  if (!p) {
    if (ws.panels.length < 2)
      ws.panels.push({ content, treeWidth: 240, sel: null, tabs: {} });
    p = ws.panels.find((x) => x !== from) ?? ws.panels[0]!;
    p.content = content;
    p.sel = null;
    savePanels(ws);
  }
  return p;
}

/**
 * Show an element in the workspace: a device, a group object, or a group address,
 * with its ancestors expanded; opens a suitable panel if none shows that content.
 */
export function reveal(host: Host, key: string | null) {
  const doc = host.doc;
  const ws = host.ws;
  if (!doc || !key) return;
  const content: PanelContent = key.startsWith("ga:")
    ? "addresses"
    : "topology";
  let p = ws.panels.find((x) => x.content === content);
  if (!p) {
    p = ws.panels[ws.panels.length > 1 && content === "addresses" ? 1 : 0]!;
    p.content = content;
    savePanels(ws);
  }
  p.sel = key;
  // Expand the ancestors of the node.
  if (content === "addresses") {
    const [m, mm] = parts(key.slice(3));
    ws.collapsed.delete("gar");
    ws.collapsed.delete(`main:${m}`);
    ws.collapsed.delete(`mid:${m}/${mm}`);
  } else {
    const devId = key.slice(key.indexOf(":") + 1).split("/")[0]!;
    const d = devOf(doc, devId);
    const line = d ? (E.lineOf(d) ?? "?") : "?";
    ws.collapsed.delete("topo");
    ws.collapsed.delete(`area:${line.split(".")[0]}`);
    ws.collapsed.delete(`line:${line}`);
    if (d) ws.collapsed.delete(`seg:${line}/${d.downstream === true ? 2 : 1}`);
    if (key.startsWith("obj:")) ws.expanded.add(`dev:${devId}`);
  }
  host.requestUpdate();
}

/** Name of a renamable element and how to change it; null when it has no name. */
export function nameOf(
  doc: Doc,
  key: string,
): {
  value: string;
  placeholder: string;
  apply: (d: Doc, v: string) => void;
} | null {
  const [kind, rest] = [key.split(":")[0]!, key.slice(key.indexOf(":") + 1)];
  switch (kind) {
    case "area": {
      const a = Number(rest);
      return {
        value:
          (doc.topology?.areas ?? []).find((x) => x.address === a)?.name ?? "",
        placeholder: t`Area`,
        apply: (d, v) => E.setAreaName(d, a, v.trim()),
      };
    }
    case "line": {
      const l = doc.lines.find((x) => String(x.address) === rest);
      if (!l) return null;
      return {
        value: typeof l.name === "string" ? l.name : "",
        placeholder: rest,
        apply: (d, v) => E.setLineName(d, rest, v.trim()),
      };
    }
    case "dev": {
      const dv = devOf(doc, rest);
      if (!dv) return null;
      return {
        value: dv.name ?? "",
        placeholder: dv.id,
        apply: (d, v) => E.setDeviceField(d, rest, "name", v),
      };
    }
    case "obj": {
      const [devId, objectId] = rest.split("/") as [string, string];
      const o = devOf(doc, devId)?.objects.find((x) => x.id === objectId);
      if (!o) return null;
      return {
        value: o.name ?? "",
        placeholder: o.id,
        apply: (d, v) => E.setObjectName(d, devId, objectId, v),
      };
    }
    case "room": {
      const r = E.roomsOf(doc).find((x) => x.id === rest);
      if (!r) return null;
      return {
        value: r.name ?? "",
        placeholder: r.id,
        apply: (d, v) => E.setRoomField(d, rest, "name", v.trim()),
      };
    }
    case "main":
    case "mid":
      return {
        value: rangeName(doc, rest),
        placeholder: rest,
        apply: (d, v) => E.setGroupRangeName(d, rest, v),
      };
    case "ga": {
      const g = E.gasIn(doc).find((x) => x.address === rest);
      if (!g) return null;
      return {
        value: g.name ?? "",
        placeholder: rest,
        apply: (d, v) => E.setGaField(d, rest, "name", v),
      };
    }
    default:
      return null;
  }
}

/** Start renaming an element where it was chosen (tree node or list row). */
export function startRename(host: Host, key: string, where: string) {
  if (!host.doc || !nameOf(host.doc, key)) return;
  host.ws.renaming = { key, where };
  host.requestUpdate();
}
