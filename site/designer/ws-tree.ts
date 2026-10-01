// Trees of the workspace panels: topology, group addresses, catalog.
import { html, nothing } from "lit";
import type { TemplateResult } from "lit";
import type { Dev, Doc } from "./edit";
import * as E from "./edit";
import { t } from "./lang";
import { gaTarget, lineTarget, objTarget, startGa, startObj } from "./ws-dnd";
import { menuFor, openMenu } from "./ws-menu";
import { catalogGroups } from "./ws-catalog";
import { renamable } from "./ws-rename";
import { objLabel, parts, rangeName, select, startRename } from "./ws-state";
import type { Host, Panel } from "./ws-state";

// ── Tree ─────────────────────────────────────────────────────────────────────

export interface Node {
  key: string;
  label: TemplateResult | string;
  /** Plain text of the label, for the filter. */
  text: string;
  /** Name shown after the number or address, replaced by a field while renaming. */
  name?: string;
  /** Collapsed until opened (devices: their group objects). */
  closed?: boolean;
  icon: string;
  children?: Node[];
  drag?: (e: DragEvent) => void;
  drop?: {
    over: (e: DragEvent) => void;
    leave: (e: DragEvent) => void;
    drop: (e: DragEvent) => void;
  };
  title?: string;
}

/** Nodes whose text contains the filter, with their ancestors; null when nothing matches. */
export function filterNodes(nodes: Node[], q: string): Node[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return nodes;
  return nodes.flatMap((n) => {
    const kids = filterNodes(n.children ?? [], needle);
    if (n.text.toLowerCase().includes(needle))
      return [{ ...n, children: n.children }];
    return kids.length ? [{ ...n, children: kids }] : [];
  });
}

export function isOpen(host: Host, n: Node, filtering = false) {
  if (filtering) return true;
  return n.closed ? host.ws.expanded.has(n.key) : !host.ws.collapsed.has(n.key);
}

export function tree(
  host: Host,
  p: Panel,
  nodes: Node[],
  depth = 0,
): TemplateResult {
  const ws = host.ws;
  const filtering = !!p.filter?.trim();
  return html`${nodes.map((n) => {
    const open = isOpen(host, n, filtering);
    const kids = n.children?.length ? n.children : null;
    const toggle = () => {
      const set = n.closed ? ws.expanded : ws.collapsed;
      // Devices remember being opened, other nodes being closed.
      if (n.closed ? !open : open) set.add(n.key);
      else set.delete(n.key);
      host.requestUpdate();
    };
    const renaming = ws.renaming?.key === n.key && ws.renaming.where === "tree";
    return html`<div
        class="w-node ${p.sel === n.key ? "sel" : ""}"
        role="treeitem"
        aria-selected=${String(p.sel === n.key)}
        aria-expanded=${kids ? String(open) : nothing}
        tabindex=${p.sel === n.key ? 0 : -1}
        data-key=${n.key}
        style="padding-left:${6 + depth * 14}px"
        title=${n.title ?? nothing}
        draggable=${n.drag && !renaming ? "true" : "false"}
        @dragstart=${n.drag ?? nothing}
        @dragover=${n.drop?.over ?? nothing}
        @dragleave=${n.drop?.leave ?? nothing}
        @drop=${n.drop?.drop ?? nothing}
        @click=${() => select(host, p, n.key)}
        @contextmenu=${(e: MouseEvent) => {
          p.sel = n.key;
          openMenu(host, e, menuFor(host, p, n.key));
        }}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
            p.sel = n.key;
            openMenu(host, e, menuFor(host, p, n.key));
          } else if (e.key === "F2") {
            e.preventDefault();
            startRename(host, n.key, "tree");
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            select(host, p, n.key);
          } else if (kids && e.key === (open ? "ArrowLeft" : "ArrowRight")) {
            e.preventDefault();
            toggle();
          } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const all = [
              ...(e.currentTarget as HTMLElement)
                .closest(".w-tree")!
                .querySelectorAll<HTMLElement>(".w-node"),
            ];
            const i = all.indexOf(e.currentTarget as HTMLElement);
            all[i + (e.key === "ArrowDown" ? 1 : -1)]?.focus();
          }
        }}
      >
        ${
          kids
            ? html`<button
                class="w-tog"
                tabindex="-1"
                aria-label=${open ? t`Collapse` : t`Expand`}
                @click=${(e: Event) => {
                  e.stopPropagation();
                  toggle();
                }}
              >
                ${open ? "▾" : "▸"}
              </button>`
            : html`<span class="w-tog"></span>`
        }<span class="w-ico ${n.icon}" aria-hidden="true"></span
        ><span
          class="w-label"
          @dblclick=${(e: Event) => {
            e.stopPropagation();
            startRename(host, n.key, "tree");
          }}
          >${renaming ? renamable(host, n.key, "tree", "") : n.label}</span
        >
      </div>
      ${kids && open ? tree(host, p, kids, depth + 1) : nothing}`;
  })}`;
}

export function objectNode(
  host: Host,
  d: Dev,
  o: Dev["objects"][number],
): Node {
  const drop = gaTarget(host, d, o);
  return {
    key: `obj:${d.id}/${o.id}`,
    icon: "i-obj",
    label: html`${objLabel(d, o)} <small>${E.gasOf(o).join(", ")}</small>`,
    text: `${objLabel(d, o)} ${E.gasOf(o).join(" ")}`,
    title: t`Group object; drag it onto a group address, or drop an address on it`,
    drag: (e) => startObj(e, d, o),
    drop,
  };
}

export function deviceNode(host: Host, d: Dev): Node {
  return {
    key: `dev:${d.id}`,
    icon: "i-dev",
    label: html`<code>${d.address ?? "IP"}</code> ${d.name ?? d.id}`,
    text: `${d.address ?? "IP"} ${d.name ?? d.id}`,
    title: t`Drag the device onto another line to move it`,
    closed: true,
    drag: (e) => {
      e.dataTransfer?.setData("application/x-bd-move", d.id);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    },
    children: E.objectsInOrder(d).map((o) => objectNode(host, d, o)),
  };
}

export function topologyTree(host: Host, doc: Doc): Node[] {
  const lv = E.levelsOf(doc);
  const at = (line: string) =>
    doc.devices.filter((d) => (E.lineOf(d) ?? "") === line);
  const lineNode = (line: string, label: string): Node => {
    const ext = doc.lines.find((l) => String(l.address) === line)?.extension as
      { address?: string; mode?: string } | undefined;
    const devs = at(line);
    // With a line extension, the devices are grouped by segment, as in ETS.
    const children: Node[] = ext
      ? ([1, 2] as const).map((seg) => {
          const label =
            seg === 1
              ? t`Segment 1 (main)`
              : t`Segment 2 · ${ext.mode === "segmentCoupler" ? t`segment coupler` : t`line repeater`} ${ext.address ?? ""}`;
          return {
            key: `seg:${line}/${seg}`,
            icon: "i-seg",
            label,
            text: label,
            drop: lineTarget(host, line, seg),
            children: devs
              .filter((d) => (d.downstream === true) === (seg === 2))
              .map((d) => deviceNode(host, d)),
          };
        })
      : devs.map((d) => deviceNode(host, d));
    return {
      key: `line:${line}`,
      icon: "i-line",
      label,
      text: label,
      drop: lineTarget(host, line),
      children,
    };
  };
  const areas = E.areasOf(doc);
  const declared = new Set([
    "IP",
    ...(lv.backbone ? ["0.0"] : []),
    ...lv.mainLines.map((a) => `${a}.0`),
    ...doc.lines.map((l) => String(l.address)),
  ]);
  const lost = doc.devices.filter((d) => !declared.has(E.lineOf(d) ?? ""));
  return [
    {
      key: "topo",
      icon: "i-topo",
      label: t`Topology`,
      text: t`Topology`,
      children: [
        ...(lv.ip || at("IP").length
          ? [lineNode("IP", t`IP network · KNXnet/IP`)]
          : []),
        ...(lv.backbone ? [lineNode("0.0", t`0.0 Backbone`)] : []),
        ...areas.map((a): Node => {
          const label = `${a} ${(doc.topology?.areas ?? []).find((x) => x.address === a)?.name ?? t`Area`}`;
          return {
            key: `area:${a}`,
            icon: "i-area",
            label,
            text: label,
            children: [
              ...(lv.mainLines.includes(a)
                ? [lineNode(`${a}.0`, `${a}.0 ${t`Main line`}`)]
                : []),
              ...doc.lines
                .filter((l) => String(l.address).startsWith(`${a}.`))
                .map((l) =>
                  lineNode(String(l.address), `${l.address} ${l.name ?? ""}`),
                ),
            ],
          };
        }),
        ...(lost.length
          ? [
              {
                key: "line:?",
                icon: "i-line",
                label: t`Devices outside the topology`,
                text: t`Devices outside the topology`,
                children: lost.map((d) => deviceNode(host, d)),
              } as Node,
            ]
          : []),
      ],
    },
  ];
}

export function addressTree(host: Host, doc: Doc): Node[] {
  const { mains, middles } = E.groupRangesOf(doc);
  return [
    {
      key: "gar",
      icon: "i-gar",
      label: t`Group addresses`,
      text: t`Group addresses`,
      children: mains.map((m): Node => ({
        key: `main:${m}`,
        icon: "i-main",
        label: `${m} ${rangeName(doc, String(m))}`,
        text: `${m} ${rangeName(doc, String(m))}`,
        children: middles
          .filter((x) => parts(x)[0] === m)
          .map((mid): Node => ({
            key: `mid:${mid}`,
            icon: "i-mid",
            label: `${mid} ${rangeName(doc, mid)}`,
            text: `${mid} ${rangeName(doc, mid)}`,
            drop: objTarget(host, null, mid),
            children: doc.groupAddresses
              .filter((g) => g.address.startsWith(`${mid}/`))
              .sort((a, b) => parts(a.address)[2]! - parts(b.address)[2]!)
              .map((g) => ({
                key: `ga:${g.address}`,
                icon: "i-ga",
                label: html`<code>${g.address}</code> ${g.name ?? ""}`,
                text: `${g.address} ${g.name ?? ""}`,
                title: t`Group address; drag it onto a group object, or drop an object on it`,
                drag: (e: DragEvent) => startGa(host, e, g.address),
                drop: objTarget(host, g.address),
              })),
          })),
      })),
    },
  ];
}

export function catalogTree(host: Host): Node[] {
  return [
    {
      key: "cat",
      icon: "i-cat",
      label: t`Catalog`,
      text: t`Catalog`,
      children: catalogGroups(host.registry).map(([label, entries], i) => ({
        key: `cat:${i}`,
        icon: "i-catg",
        label,
        text: `${label} ${entries.map((e) => e.label).join(" ")}`,
      })),
    },
  ];
}
