// Guided workspace organized in panels as in commissioning software, so that students keep their bearings:
// two stacked panels, each with a content (Topology, Group addresses, Catalog,
// Installation), a tree on the left, and a list on the right with tabs at its bottom.
// Programming gestures follow the usual commissioning workflow: a catalog entry is dropped onto a line; a group address
// is dropped onto a group object, or a group object onto a group address; the first
// address of an object is its sending address. Every gesture calls the same edit
// operation as the equivalent button, with the same checks and one undo step.
import { html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { live } from "lit/directives/live.js";
import { dptBits, dptName } from "../../src/knx/dpt";
import type { Dev, Doc } from "./edit";
import * as E from "./edit";
import { fieldValue } from "./field-value";
import { t } from "./lang";
import { catalogGroups } from "./ws-catalog";
import { gaTarget, lineTarget, objTarget, startGa, startObj } from "./ws-dnd";
import { menuFor, menuView, openMenu } from "./ws-menu";
import { renamable } from "./ws-rename";
import { dataTable } from "./ws-table";
import type { Column } from "./ws-table";
import { tt } from "./params";
import {
  addressTree,
  catalogTree,
  filterNodes,
  topologyTree,
  tree,
} from "./ws-tree";
import {
  CONTENTS,
  contentLabel,
  devOf,
  objLabel,
  objNumber,
  parts,
  rangeName,
  reveal,
  savePanels,
  select,
  sizeText,
  startRename,
} from "./ws-state";
import type { Host, Panel, PanelContent } from "./ws-state";

export { initialWorkspace, reveal } from "./ws-state";
export type {
  Host,
  MenuItem,
  Panel,
  PanelContent,
  WorkspaceState,
} from "./ws-state";

// ── List views ───────────────────────────────────────────────────────────────

function tabs(host: Host, p: Panel, kind: string, list: [string, string][]) {
  const cur = p.tabs[kind] ?? list[0]![0];
  return html`<nav class="w-tabs" role="tablist">
    ${list.map(
      ([k, label]) =>
        html`<button
          role="tab"
          aria-selected=${String(k === cur)}
          @click=${() => {
            p.tabs[kind] = k;
            host.requestUpdate();
          }}
        >
          ${label}
        </button>`,
    )}
  </nav>`;
}

/** Context menu of a list row: the commands of its element, as in the tree. */
const rowMenu = (host: Host, p: Panel, key: string) => (e: MouseEvent) =>
  openMenu(host, e, menuFor(host, p, key, `list:${p.content}`));

/** Name cell of a row: double-click renames in place (or Rename in the context menu). */
function nameCell(
  host: Host,
  p: Panel,
  key: string,
  display: TemplateResult | string,
) {
  return html`<td
    class="w-name"
    title=${t`Double-click to rename`}
    @dblclick=${(e: Event) => {
      e.stopPropagation();
      startRename(host, key, `list:${p.content}`);
    }}
  >
    ${renamable(host, key, `list:${p.content}`, display)}
  </td>`;
}

/**
 * Drop target of the whole list of a panel, from its selection: a group object (drop an
 * address), a line or segment (drop a device), a group address (drop an object), a middle
 * group (drop an object: new address). Rows inside the list keep their own, more precise target.
 */
function listTarget(host: Host, doc: Doc, p: Panel) {
  const sel = p.sel ?? "";
  const [kind, rest] = [sel.split(":")[0]!, sel.slice(sel.indexOf(":") + 1)];
  if (p.content === "topology") {
    if (kind === "obj") {
      const [devId, objectId] = rest.split("/") as [string, string];
      const d = devOf(doc, devId);
      const o = d?.objects.find((x) => x.id === objectId);
      return d && o ? gaTarget(host, d, o) : null;
    }
    if (kind === "line") return lineTarget(host, rest);
    if (kind === "seg") {
      const [line, seg] = rest.split("/") as [string, string];
      return lineTarget(host, line, Number(seg) as 1 | 2);
    }
  }
  if (p.content === "addresses") {
    if (kind === "ga") return objTarget(host, rest);
    if (kind === "mid") return objTarget(host, null, rest);
  }
  return null;
}

/** Flags of a group object, in the usual order of the object tables. */
const FLAGS: readonly E.Flag[] = ["C", "R", "W", "T", "U", "I"];

/** One flag of an object, as a check box. */
const flagCell = (host: Host, d: Dev, o: Dev["objects"][number], f: E.Flag) =>
  html`<td class="w-flag">
    <input
      type="checkbox"
      aria-label=${`${o.name ?? o.id} ${f}`}
      .checked=${live(E.flagOf(d, o, f))}
      @change=${(e: Event) =>
        host.run(t`Flag ${f}`, (x) =>
          E.setObjectFlag(
            x,
            d.id,
            o.id,
            f,
            (e.target as HTMLInputElement).checked,
          ),
        )}
    />
  </td>`;

/** Columns of the six flags, in the usual order. */
function flagColumns<R>(
  host: Host,
  of: (r: R) => [Dev, Dev["objects"][number]],
): Column<R>[] {
  const titles = {
    C: t`Communication`,
    R: t`Read`,
    W: t`Write`,
    T: t`Transmit`,
    U: t`Update`,
    I: t`Read on initialisation`,
  };
  return [
    ...FLAGS.map((f): Column<R> => ({
      id: f,
      label: f,
      title: titles[f],
      sort: (r) => (E.flagOf(...of(r), f) ? 0 : 1),
      td: (r) => flagCell(host, ...of(r), f),
    })),
  ];
}

/** Output (channel) or key of an object, as its channel in the object table. */
function channelOf(d: Dev, o: Dev["objects"][number]) {
  const c = o.channel ? d.channels?.find((x) => x.id === o.channel) : undefined;
  if (c) return c.label ?? c.id;
  const b = d.buttons?.find((x) =>
    [x.press, x.short, x.long].some((a) => a?.object === o.id),
  );
  return b ? (b.label ?? b.id) : "";
}

/** Group objects of a device, as a Group objects tab. */
function objectTable(host: Host, p: Panel, d: Dev) {
  const objects = E.objectsInOrder(d);
  const ports = host.registry.behaviors.get(d.behavior)?.ports ?? {};
  const fn = (o: Dev["objects"][number]) => tt(ports[o.port]?.title) || o.port;
  type O = Dev["objects"][number];
  return html`${dataTable<O>(
    host,
    "objects",
    [
      {
        id: "number",
        label: t`Number`,
        sort: (o) => objNumber(d, o.id),
        cell: (o) => objNumber(d, o.id),
      },
      {
        id: "name",
        label: t`Name`,
        sort: (o) => o.name ?? o.id,
        td: (o) => nameCell(host, p, `obj:${d.id}/${o.id}`, o.name ?? o.id),
      },
      {
        id: "channel",
        label: t`Channel`,
        sort: (o) => channelOf(d, o),
        cell: (o) => channelOf(d, o),
      },
      {
        id: "function",
        label: t`Object function`,
        sort: fn,
        cell: fn,
      },
      {
        id: "gas",
        label: t`Group addresses`,
        sort: (o) => E.gasOf(o)[0] ?? "~",
        className: "w-gas",
        cell: (o) =>
          html`${E.gasOf(o).map(
            (ga, i) =>
              html`<span class="w-chip ${i === 0 ? "send" : ""}"
                >${ga}${i === 0 ? html`<small title=${t`Sending address`}>S</small>` : nothing}</span
              >`,
          )}`,
      },
      {
        id: "length",
        label: t`Length`,
        sort: (o) => (o.dpt ? dptBits(o.dpt) : 0),
        cell: (o) => sizeText(o.dpt),
      },
      {
        id: "dpt",
        label: t`DPT`,
        sort: (o) => o.dpt ?? "",
        cell: (o) =>
          html`<code title=${o.dpt ? dptName(o.dpt, t) : ""}
            >${o.dpt ?? ""}</code
          >`,
      },
      ...flagColumns<O>(host, (o) => [d, o]),
    ],
    objects,
    (o, cells) => {
      const drop = gaTarget(host, d, o);
      return html`<tr
        draggable="true"
        data-obj=${o.id}
        @contextmenu=${rowMenu(host, p, `obj:${d.id}/${o.id}`)}
        title=${t`Drag onto a group address to link it`}
        @dragstart=${(e: DragEvent) => startObj(e, d, o)}
        @dragover=${drop.over}
        @dragleave=${drop.leave}
        @drop=${drop.drop}
        @dblclick=${() => reveal(host, `obj:${d.id}/${o.id}`)}
      >
        ${cells}
      </tr>`;
    },
  )}
  ${objects.length ? nothing : html`<p class="w-empty">${t`No group object.`}</p>`}`;
}

/** Group addresses of one group object, as an Associations tab. */
function objectAssociations(
  host: Host,
  doc: Doc,
  p: Panel,
  d: Dev,
  o: Dev["objects"][number],
) {
  const gas = E.gasOf(o);
  const linked = new Set(gas);
  const candidates = doc.groupAddresses.filter((g) => {
    const gd = E.gaDpt(doc, g.address);
    return (
      !linked.has(g.address) &&
      (!o.dpt || !gd || dptBits(gd) === dptBits(o.dpt))
    );
  });
  const ref = [{ dev: d.id, obj: o.id }];
  return html`<div>
    ${dataTable<string>(
      host,
      "object-associations",
      [
        {
          id: "address",
          label: t`Group address`,
          sort: (ga) => ga,
          cell: (ga) => html`<code>${ga}</code>`,
        },
        {
          id: "name",
          label: t`Name`,
          sort: (ga) =>
            doc.groupAddresses.find((x) => x.address === ga)?.name ?? "",
          td: (ga) =>
            nameCell(
              host,
              p,
              `ga:${ga}`,
              doc.groupAddresses.find((x) => x.address === ga)?.name ?? "",
            ),
        },
        {
          id: "dpt",
          label: t`DPT`,
          sort: (ga) => E.gaDpt(doc, ga) ?? "",
          cell: (ga) => E.gaDpt(doc, ga) ?? "",
        },
        {
          id: "sending",
          label: t`Sending`,
          sort: (ga) => gas.indexOf(ga),
          cell: (ga) =>
            gas[0] === ga
              ? html`<b title=${t`Sending address`}>S</b>`
              : html`<button
                  class="w-small"
                  @click=${() => host.run(t`Sending address`, (x) => E.setSendingGa(x, d.id, o.id, ga))}
                >
                  ${t`Set as sending`}
                </button>`,
        },
        {
          id: "actions",
          label: "",
          cell: (ga) =>
            html`<button
              class="w-small"
              title=${t`Remove ${ga} from this object`}
              aria-label=${t`Remove ${ga} from this object`}
              @click=${() => host.run(t`Remove an address`, (x) => E.setGaMembers(x, ga, [], ref))}
            >
              ${t`Delete`}
            </button>`,
        },
      ],
      gas,
      (ga, cells) =>
        html`<tr
          draggable="true"
          @dragstart=${(e: DragEvent) => startGa(host, e, ga)}
          @dblclick=${() => reveal(host, `ga:${ga}`)}
          @contextmenu=${rowMenu(host, p, `ga:${ga}`)}
        >
          ${cells}
        </tr>`,
    )}
    ${gas.length ? nothing : html`<p class="w-empty">${t`No group address: drop one here from the Group addresses panel.`}</p>`}
    <div class="w-bar">
      <select
        class="g-add w-link-with"
        data-v=""
        aria-label=${t`Associate an address with ${o.name ?? o.id}`}
        @change=${(e: Event) => {
          const sel = e.target as HTMLSelectElement;
          const v = sel.value;
          sel.value = "";
          if (v) host.run(t`Link`, (x) => E.setGaMembers(x, v, ref, []));
        }}
      >
        <option value="">+ ${t`Link with…`}</option>
        ${candidates.map((g) => html`<option value=${g.address}>${g.address} ${g.name ?? ""}</option>`)}
      </select>
    </div>
  </div>`;
}

/** Properties of a group object: name, flags, DPT (properties sidebar). */
function objectProperties(host: Host, d: Dev, o: Dev["objects"][number]) {
  return html`<div class="w-props">
    <label class="g-field"
      ><span>${t`Name`}</span>
      <input
        .value=${fieldValue(o.name ?? "")}
        placeholder=${o.id}
        @change=${(e: Event) =>
          host.run(t`Object name`, (x) =>
            E.setObjectName(
              x,
              d.id,
              o.id,
              (e.target as HTMLInputElement).value,
            ),
          )}
    /></label>
    <p>
      ${t`Function`}:
      <code>${o.port}</code>${o.channel ? ` · ${o.channel}` : ""} · ${t`DPT`}:
      <code>${o.dpt ?? "—"}</code> ${o.dpt ? dptName(o.dpt, t) : ""} ·
      ${sizeText(o.dpt)}
    </p>
    <table class="w-table w-flags">
      <tr>
        ${FLAGS.map((f) => html`<th>${f}</th>`)}
      </tr>
      <tr>
        ${FLAGS.map((f) => flagCell(host, d, o, f))}
      </tr>
    </table>
    <p class="g-hint">
      ${t`C: communication (off: the object neither sends nor handles messages) · R: answers reads, on its sending address · W: accepts received writes · T: can send · U: a received response updates it · I: reads its value when the device starts again after a bus voltage failure.`}
    </p>
    <label class="g-field narrow"
      ><span>${t`Priority`}</span>
      <select
        aria-label=${t`Priority`}
        @change=${(e: Event) =>
          host.run(t`Priority`, (x) =>
            E.setObjectPriority(
              x,
              d.id,
              o.id,
              (e.target as HTMLSelectElement).value as
                "low" | "normal" | "urgent",
            ),
          )}
      >
        ${(
          [
            ["low", t`Low`],
            ["normal", t`Normal`],
            ["urgent", t`Urgent`],
          ] as const
        ).map(
          ([v, l]) =>
            html`<option value=${v} ?selected=${(o.priority ?? "low") === v}>
              ${l}
            </option>`,
        )}
      </select></label
    >
  </div>`;
}

/** Objects linked to a group address, as the Associations tab of the group addresses panel. */
function addressAssociations(host: Host, doc: Doc, p: Panel, g: E.Ga) {
  const all = E.gaMemberCandidates(doc, g.address);
  const members = all.filter((c) => c.member);
  const candidates = all.filter((c) => !c.member && c.compatible);
  type M = (typeof members)[number];
  const dev = (c: M) => devOf(doc, c.dev)!;
  const obj = (c: M) => dev(c).objects.find((x) => x.id === c.obj)!;
  return html`<div>
    ${dataTable<M>(
      host,
      "address-associations",
      [
        {
          id: "object",
          label: t`Object`,
          sort: (c) => objLabel(dev(c), obj(c)),
          td: (c) =>
            nameCell(
              host,
              p,
              `obj:${c.dev}/${c.obj}`,
              objLabel(dev(c), obj(c)),
            ),
        },
        {
          id: "channel",
          label: t`Channel`,
          sort: (c) => channelOf(dev(c), obj(c)),
          cell: (c) => channelOf(dev(c), obj(c)),
        },
        {
          id: "device",
          label: t`Device`,
          sort: (c) => dev(c).address ?? "IP",
          cell: (c) =>
            html`<code>${dev(c).address ?? "IP"}</code>
              ${dev(c).name ?? dev(c).id}`,
        },
        {
          id: "sending",
          label: t`Sending`,
          sort: (c) => (c.sending === g.address ? 0 : 1),
          cell: (c) => (c.sending === g.address ? html`<b>S</b>` : ""),
        },
        {
          id: "dpt",
          label: t`DPT`,
          sort: (c) => c.dpt,
          cell: (c) => c.dpt,
        },
        ...flagColumns<M>(host, (c) => [dev(c), obj(c)]),
        {
          id: "actions",
          label: "",
          cell: (c) =>
            html`<button
              class="w-small"
              @click=${() =>
                host.run(t`Remove an address`, (x) =>
                  E.setGaMembers(
                    x,
                    g.address,
                    [],
                    [{ dev: c.dev, obj: c.obj }],
                  ),
                )}
            >
              ${t`Delete`}
            </button>`,
        },
      ],
      members,
      (c, cells) =>
        html`<tr
          draggable="true"
          @dragstart=${(e: DragEvent) => startObj(e, dev(c), obj(c))}
          @dblclick=${() => reveal(host, `obj:${c.dev}/${c.obj}`)}
          @contextmenu=${rowMenu(host, p, `obj:${c.dev}/${c.obj}`)}
        >
          ${cells}
        </tr>`,
    )}
    ${members.length ? nothing : html`<p class="w-empty">${t`No linked object: drop a group object here.`}</p>`}
    <div class="w-bar">
      <select
        class="g-add w-link-with"
        data-v=""
        aria-label=${t`Link a group object with ${g.address}`}
        @change=${(e: Event) => {
          const sel = e.target as HTMLSelectElement;
          const [dev, obj] = sel.value.split("/") as [string, string];
          sel.value = "";
          if (dev && obj)
            host.run(t`Link`, (x) =>
              E.setGaMembers(x, g.address, [{ dev, obj }], []),
            );
        }}
      >
        <option value="">+ ${t`Link with…`}</option>
        ${candidates.map(
          (c) =>
            html`<option value=${`${c.dev}/${c.obj}`}>
              ${devOf(doc, c.dev)?.address ?? "IP"} ${c.deviceName} ·
              ${c.objectName} (${c.dpt})
            </option>`,
        )}
      </select>
    </div>
  </div>`;
}

function topologyList(host: Host, doc: Doc, p: Panel): TemplateResult {
  const sel = p.sel ?? "topo";
  const [kind, rest] = [sel.split(":")[0]!, sel.slice(sel.indexOf(":") + 1)];
  if (kind === "dev" || kind === "obj") {
    const [devId, sub] = rest.split("/") as [string, string | undefined];
    const d = devOf(doc, devId);
    if (!d)
      return html`<p class="w-empty">${t`This device no longer exists.`}</p>`;
    if (kind === "obj") {
      const o = d.objects.find((x) => x.id === sub);
      if (!o)
        return html`<p class="w-empty">${t`This object no longer exists.`}</p>`;
      const tab = p.tabs.obj ?? "associations";
      return html`<div class="w-content">
          ${tab === "associations" ? objectAssociations(host, doc, p, d, o) : objectProperties(host, d, o)}
        </div>
        ${tabs(host, p, "obj", [
          ["associations", t`Associations`],
          ["properties", t`Properties`],
        ])}`;
    }
    const tab = p.tabs.dev ?? "objects";
    return html`<div class="w-content">
        ${tab === "objects" ? objectTable(host, p, d) : host.deviceParameters(doc, d)}
      </div>
      ${tabs(host, p, "dev", [
        ["objects", t`Group objects`],
        ["parameters", t`Parameters`],
      ])}`;
  }
  if (kind === "line" || kind === "seg") {
    // A segment ("seg:1.1/2") lists the devices of that segment of the line.
    const [line, segText] = (kind === "seg" ? rest.split("/") : [rest]) as [
      string,
      string | undefined,
    ];
    const seg = segText ? (Number(segText) as 1 | 2) : undefined;
    const l = doc.lines.find((x) => String(x.address) === line);
    const devs = doc.devices.filter(
      (d) =>
        (E.lineOf(d) ?? "") === line &&
        (!seg || (d.downstream === true) === (seg === 2)),
    );
    return html`<div class="w-content">
        ${l && !seg ? host.lineSettings(doc, l) : nothing}
        <div>
          ${dataTable<Dev>(
            host,
            "line-devices",
            [
              {
                id: "address",
                label: t`Address`,
                sort: (d) => Number(d.address?.split(".")[2] ?? 0),
                cell: (d) => html`<code>${d.address ?? "IP"}</code>`,
              },
              {
                id: "name",
                label: t`Name`,
                sort: (d) => d.name ?? d.id,
                td: (d) => nameCell(host, p, `dev:${d.id}`, d.name ?? d.id),
              },
              {
                id: "application",
                label: t`Application`,
                sort: (d) => host.typeLabel(d),
                cell: (d) => host.typeLabel(d),
              },
            ],
            devs,
            (d, cells) =>
              html`<tr
                draggable="true"
                title=${t`Drag onto another line to move it`}
                @dragstart=${(e: DragEvent) => {
                  e.dataTransfer?.setData("application/x-bd-move", d.id);
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                }}
                @dblclick=${() => select(host, p, `dev:${d.id}`)}
                @contextmenu=${rowMenu(host, p, `dev:${d.id}`)}
              >
                ${cells}
              </tr>`,
          )}
          ${devs.length ? nothing : html`<p class="w-empty">${t`No device on this line: drop one from the Catalog panel.`}</p>`}
        </div>
      </div>
      ${tabs(host, p, "line", [["devices", t`Devices`]])}`;
  }
  if (kind === "area") {
    const a = Number(rest);
    const name =
      (doc.topology?.areas ?? []).find((x) => x.address === a)?.name ?? "";
    const lines = doc.lines.filter((l) =>
      String(l.address).startsWith(`${a}.`),
    );
    return html`<div class="w-content">
        <div class="w-bar">
          <label class="g-field"
            ><span>${t`Name of area ${a}`}</span>
            <input
              .value=${fieldValue(name)}
              @change=${(e: Event) =>
                host.run(t`Area name`, (d) =>
                  E.setAreaName(
                    d,
                    a,
                    (e.target as HTMLInputElement).value.trim(),
                  ),
                )}
          /></label>
          <button
            class="g-btn"
            @click=${() => host.run(t`New line`, (d) => void E.addLine(d, a))}
          >
            + ${t`Add line`}
          </button>
        </div>
        ${dataTable<Doc["lines"][number]>(
          host,
          "area-lines",
          [
            {
              id: "line",
              label: t`Line`,
              sort: (l) => Number(String(l.address).split(".")[1]),
              cell: (l) =>
                html`<button
                  class="w-link"
                  @click=${() => select(host, p, `line:${l.address}`)}
                >
                  ${l.address}
                </button>`,
            },
            {
              id: "name",
              label: t`Name`,
              sort: (l) => (typeof l.name === "string" ? l.name : ""),
              td: (l) =>
                nameCell(
                  host,
                  p,
                  `line:${l.address}`,
                  typeof l.name === "string" ? l.name : "",
                ),
            },
            {
              id: "devices",
              label: t`Devices`,
              sort: (l) =>
                doc.devices.filter((d) => E.lineOf(d) === String(l.address))
                  .length,
              cell: (l) =>
                doc.devices.filter((d) => E.lineOf(d) === String(l.address))
                  .length,
            },
          ],
          lines,
          (l, cells) =>
            html`<tr
              @dblclick=${() => select(host, p, `line:${l.address}`)}
              @contextmenu=${rowMenu(host, p, `line:${l.address}`)}
            >
              ${cells}
            </tr>`,
        )}
      </div>
      ${tabs(host, p, "area", [["lines", t`Lines`]])}`;
  }
  return html`<div class="w-content">${host.topologySettings(doc)}</div>
    ${tabs(host, p, "topo", [["topology", t`Topology`]])}`;
}

function addressList(host: Host, doc: Doc, p: Panel): TemplateResult {
  const sel = p.sel ?? "gar";
  /** Number of addresses under a prefix ("1/" or "1/2/"). */
  const count = (prefix: string) =>
    doc.groupAddresses.filter((g) => g.address.startsWith(prefix)).length;
  const [kind, rest] = [sel.split(":")[0]!, sel.slice(sel.indexOf(":") + 1)];
  const nameField = (address: string, label: string) =>
    html`<label class="g-field"
      ><span>${label}</span>
      <input
        .value=${fieldValue(rangeName(doc, address))}
        @change=${(e: Event) =>
          host.run(t`Group name`, (x) =>
            E.setGroupRangeName(
              x,
              address,
              (e.target as HTMLInputElement).value,
            ),
          )}
    /></label>`;
  if (kind === "ga") {
    const g = doc.groupAddresses.find((x) => x.address === rest);
    if (!g)
      return html`<p class="w-empty">
        ${t`This group address no longer exists.`}
      </p>`;
    const tab = p.tabs.ga ?? "associations";
    return html`<div class="w-content">
        ${tab === "associations" ? addressAssociations(host, doc, p, g) : host.gaProperties(doc, g)}
      </div>
      ${tabs(host, p, "ga", [
        ["associations", t`Associations`],
        ["properties", t`Properties`],
      ])}`;
  }
  if (kind === "mid") {
    const [m, mm] = parts(rest);
    const gas = doc.groupAddresses
      .filter((g) => g.address.startsWith(`${rest}/`))
      .sort((a, b) => parts(a.address)[2]! - parts(b.address)[2]!);
    const links = (g: E.Ga) =>
      E.gaMemberCandidates(doc, g.address).filter((c) => c.member).length;
    return html`<div class="w-content">
        <div class="w-bar">
          ${nameField(rest, t`Name of middle group ${rest}`)}
          <button
            class="g-btn"
            @click=${() => {
              let created = "";
              if (
                host.run(t`New group address`, (x) => {
                  created = E.newGaIn(x, m!, mm!, t`New group address`);
                })
              )
                select(host, p, `ga:${created}`);
            }}
          >
            + ${t`Add group address`}
          </button>
        </div>
        ${dataTable<E.Ga>(
          host,
          "middle-addresses",
          [
            {
              id: "address",
              label: t`Address`,
              sort: (g) => parts(g.address)[2]!,
              cell: (g) =>
                html`<button
                  class="w-link"
                  @click=${() => select(host, p, `ga:${g.address}`)}
                >
                  ${g.address}
                </button>`,
            },
            {
              id: "name",
              label: t`Name`,
              sort: (g) => g.name ?? "",
              td: (g) => nameCell(host, p, `ga:${g.address}`, g.name ?? ""),
            },
            {
              id: "dpt",
              label: t`DPT`,
              sort: (g) => E.gaDpt(doc, g.address) ?? "",
              cell: (g) => E.gaDpt(doc, g.address) ?? "",
            },
            {
              id: "links",
              label: t`Links`,
              sort: (g) => links(g),
              cell: (g) => links(g),
            },
          ],
          gas,
          (g, cells) => {
            const drop = objTarget(host, g.address);
            return html`<tr
              draggable="true"
              title=${t`Drag onto a group object to link it`}
              @dragstart=${(e: DragEvent) => startGa(host, e, g.address)}
              @dragover=${drop.over}
              @dragleave=${drop.leave}
              @drop=${drop.drop}
              @dblclick=${() => select(host, p, `ga:${g.address}`)}
              @contextmenu=${rowMenu(host, p, `ga:${g.address}`)}
            >
              ${cells}
            </tr>`;
          },
        )}
        ${gas.length ? nothing : html`<p class="w-empty">${t`No group address in this middle group.`}</p>`}
      </div>
      ${tabs(host, p, "mid", [["addresses", t`Group addresses`]])}`;
  }
  if (kind === "main") {
    const m = Number(rest);
    const { middles } = E.groupRangesOf(doc);
    return html`<div class="w-content">
        <div class="w-bar">
          ${nameField(rest, t`Name of main group ${rest}`)}
          <button
            class="g-btn"
            @click=${() => {
              let created = "";
              if (
                host.run(t`New middle group`, (x) => {
                  created = E.addMiddleGroup(x, m, t`New middle group`);
                })
              )
                select(host, p, `mid:${created}`);
            }}
          >
            + ${t`Add middle group`}
          </button>
        </div>
        ${dataTable<string>(
          host,
          "main-middles",
          [
            {
              id: "middle",
              label: t`Middle group`,
              sort: (mid) => parts(mid)[1]!,
              cell: (mid) =>
                html`<button
                  class="w-link"
                  @click=${() => select(host, p, `mid:${mid}`)}
                >
                  ${mid}
                </button>`,
            },
            {
              id: "name",
              label: t`Name`,
              sort: (mid) => rangeName(doc, mid),
              td: (mid) => nameCell(host, p, `mid:${mid}`, rangeName(doc, mid)),
            },
            {
              id: "addresses",
              label: t`Addresses`,
              sort: (mid) => count(`${mid}/`),
              cell: (mid) => count(`${mid}/`),
            },
          ],
          middles.filter((x) => parts(x)[0] === m),
          (mid, cells) =>
            html`<tr
              @dblclick=${() => select(host, p, `mid:${mid}`)}
              @contextmenu=${rowMenu(host, p, `mid:${mid}`)}
            >
              ${cells}
            </tr>`,
        )}
      </div>
      ${tabs(host, p, "main", [["middle", t`Middle groups`]])}`;
  }
  const { mains } = E.groupRangesOf(doc);
  return html`<div class="w-content">
      <div class="w-bar">
        <button
          class="g-btn"
          @click=${() => {
            let created = "";
            if (
              host.run(t`New main group`, (x) => {
                created = E.addMainGroup(x, t`New main group`);
              })
            )
              select(host, p, `main:${created}`);
          }}
        >
          + ${t`Add main group`}
        </button>
      </div>
      ${dataTable<number>(
        host,
        "main-groups",
        [
          {
            id: "main",
            label: t`Main group`,
            sort: (m) => m,
            cell: (m) =>
              html`<button
                class="w-link"
                @click=${() => select(host, p, `main:${m}`)}
              >
                ${m}
              </button>`,
          },
          {
            id: "name",
            label: t`Name`,
            sort: (m) => rangeName(doc, String(m)),
            td: (m) =>
              nameCell(host, p, `main:${m}`, rangeName(doc, String(m))),
          },
          {
            id: "addresses",
            label: t`Addresses`,
            sort: (m) => count(`${m}/`),
            cell: (m) => count(`${m}/`),
          },
        ],
        mains,
        (m, cells) =>
          html`<tr
            @dblclick=${() => select(host, p, `main:${m}`)}
            @contextmenu=${rowMenu(host, p, `main:${m}`)}
          >
            ${cells}
          </tr>`,
      )}
    </div>
    ${tabs(host, p, "gar", [["main", t`Main groups`]])}`;
}

function catalogList(host: Host, doc: Doc, p: Panel): TemplateResult {
  const ws = host.ws;
  const groups = catalogGroups(host.registry);
  const sel = p.sel ?? "cat";
  const shown =
    sel === "cat"
      ? groups.flatMap(([, list]) => list)
      : (groups[Number(sel.slice(4))]?.[1] ?? []);
  const lines = doc.lines.map((l) => String(l.address));
  const line = lines.includes(ws.catalogLine) ? ws.catalogLine : lines[0];
  const add = (value: string) => {
    if (!line) return;
    for (let i = 0; i < Math.max(1, ws.catalogCount); i++)
      host.insertDevice(line, value);
  };
  const current = shown.find((e) => e.value === ws.catalogSel);
  return html`<div class="w-content">
      ${dataTable<(typeof shown)[number]>(
        host,
        "catalog",
        [
          {
            id: "name",
            label: t`Name`,
            sort: (e) => e.label,
            cell: (e) => e.label,
          },
          {
            id: "application",
            label: t`Application`,
            sort: (e) => e.behavior,
            cell: (e) => html`<code>${e.behavior}</code>`,
          },
          {
            id: "objects",
            label: t`Group objects`,
            sort: (e) => e.objects.length,
            cell: (e) => e.objects.length || "",
          },
          {
            id: "channels",
            label: t`Channels`,
            sort: (e) => e.channels,
            cell: (e) => e.channels || "",
          },
        ],
        shown,
        (e, cells) =>
          html`<tr
            class=${e.value === ws.catalogSel ? "sel" : ""}
            draggable="true"
            title=${e.hint}
            @dragstart=${(ev: DragEvent) => {
              ev.dataTransfer?.setData("application/x-bd-device", e.value);
              if (ev.dataTransfer) ev.dataTransfer.effectAllowed = "copy";
            }}
            @click=${() => {
              ws.catalogSel = e.value;
              host.requestUpdate();
            }}
            @dblclick=${() => add(e.value)}
            @contextmenu=${rowMenu(host, p, `entry:${e.value}`)}
          >
            ${cells}
          </tr>`,
      )}
      ${
        current
          ? html`<div class="w-detail">
              <b>${current.label}</b>
              <p>${current.hint}</p>
              ${
                current.objects.length
                  ? html`<ul>
                      ${current.objects.map((o) => html`<li>${o.name} <code>${o.dpt}</code></li>`)}
                    </ul>`
                  : nothing
              }
            </div>`
          : nothing
      }
    </div>
    <div class="w-status w-catbar">
      <label
        >${t`Items`}
        <input
          type="number"
          min="1"
          max="20"
          .value=${String(ws.catalogCount)}
          @change=${(e: Event) => {
            ws.catalogCount = Math.min(
              20,
              Math.max(1, Number((e.target as HTMLInputElement).value) || 1),
            );
            host.requestUpdate();
          }}
      /></label>
      <label
        >${t`in line`}
        <select
          data-v=${line ?? ""}
          @change=${(e: Event) => {
            ws.catalogLine = (e.target as HTMLSelectElement).value;
            host.requestUpdate();
          }}
        >
          ${lines.map((l) => html`<option value=${l} ?selected=${l === line}>${l}</option>`)}
        </select></label
      >
      <button
        class="g-btn"
        ?disabled=${!current || !line}
        @click=${() => current && add(current.value)}
      >
        ${t`Add`}
      </button>
      <small
        >${t`Double-click an entry, or drag it onto a line of the Topology panel.`}</small
      >
    </div>`;
}

// ── Panels ───────────────────────────────────────────────────────────────────

/**
 * Separator dragged with the mouse (or moved with the arrow keys when focused);
 * `apply` receives the pointer position and the element's container box.
 */
function gutter(
  host: Host,
  dir: "col" | "row",
  label: string,
  apply: (pos: number, box: DOMRect) => void,
  step: (delta: number) => void,
) {
  return html`<div
    class="w-gutter w-gutter-${dir}"
    role="separator"
    aria-orientation=${dir === "col" ? "vertical" : "horizontal"}
    aria-label=${label}
    tabindex="0"
    @pointerdown=${(e: PointerEvent) => {
      const el = e.currentTarget as HTMLElement;
      const box = el.parentElement!.getBoundingClientRect();
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        apply(dir === "col" ? ev.clientX : ev.clientY, box);
        host.requestUpdate();
      };
      const up = () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        savePanels(host.ws);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
    }}
    @keydown=${(e: KeyboardEvent) => {
      const k =
        dir === "col"
          ? { ArrowLeft: -1, ArrowRight: 1 }[e.key]
          : { ArrowUp: -1, ArrowDown: 1 }[e.key];
      if (!k) return;
      e.preventDefault();
      step(k * (e.shiftKey ? 5 : 1));
      savePanels(host.ws);
      host.requestUpdate();
    }}
  ></div>`;
}

function panel(host: Host, doc: Doc, p: Panel, i: number): TemplateResult {
  const ws = host.ws;
  const nodes =
    p.content === "topology"
      ? topologyTree(host, doc)
      : p.content === "addresses"
        ? addressTree(host, doc)
        : p.content === "catalog"
          ? catalogTree(host)
          : [];
  const list =
    p.content === "topology"
      ? topologyList(host, doc, p)
      : p.content === "addresses"
        ? addressList(host, doc, p)
        : p.content === "catalog"
          ? catalogList(host, doc, p)
          : html`<div class="w-content">${host.installation(doc)}</div>`;
  const shown = filterNodes(nodes, p.filter ?? "");
  const drop = listTarget(host, doc, p);
  const share = ws.panels.length > 1 ? (i === 0 ? ws.split : 1 - ws.split) : 1;
  return html`<section
    class="w-panel"
    data-content=${p.content}
    style="flex:${share} 1 0"
  >
    <header class="w-head">
      <select
        class="w-select"
        aria-label=${t`Content of panel ${i + 1}`}
        data-v=${p.content}
        @change=${(e: Event) => {
          p.content = (e.target as HTMLSelectElement).value as PanelContent;
          p.sel = null;
          savePanels(ws);
          host.requestUpdate();
        }}
      >
        ${CONTENTS.map((c) => html`<option value=${c} ?selected=${c === p.content}>${contentLabel(c)}</option>`)}
      </select>
      ${
        ws.panels.length > 1
          ? html`<button
              class="w-small"
              title=${t`Close this panel`}
              aria-label=${t`Close this panel`}
              @click=${() => {
                ws.panels.splice(i, 1);
                savePanels(ws);
                host.requestUpdate();
              }}
            >
              ×
            </button>`
          : html`<button
              class="w-small"
              title=${t`Open a second panel below`}
              @click=${() => {
                ws.panels.push({
                  content: p.content === "addresses" ? "topology" : "addresses",
                  treeWidth: 240,
                  sel: null,
                  tabs: {},
                });
                savePanels(ws);
                host.requestUpdate();
              }}
            >
              + ${t`Panel`}
            </button>`
      }
    </header>
    <div
      class="w-body ${nodes.length ? "" : "w-single"}"
      style=${nodes.length ? `grid-template-columns:${p.treeWidth}px 5px minmax(0,1fr)` : ""}
    >
      ${
        nodes.length
          ? html`<div class="w-treebox">
                <input
                  class="w-filter"
                  type="search"
                  placeholder=${t`Filter`}
                  aria-label=${t`Filter the tree of panel ${i + 1}`}
                  .value=${p.filter ?? ""}
                  @input=${(e: Event) => {
                    p.filter = (e.target as HTMLInputElement).value;
                    host.requestUpdate();
                  }}
                />
                <div
                  class="w-tree"
                  role="tree"
                  aria-label=${contentLabel(p.content)}
                  @contextmenu=${(e: MouseEvent) =>
                    openMenu(host, e, menuFor(host, p, nodes[0]!.key))}
                >
                  ${shown.length ? tree(host, p, shown) : html`<p class="w-empty">${t`Nothing matches the filter.`}</p>`}
                </div>
              </div>
              ${gutter(
                host,
                "col",
                t`Resize the tree`,
                (x, box) =>
                  (p.treeWidth = Math.round(
                    Math.min(box.width - 220, Math.max(120, x - box.left)),
                  )),
                (d) => (p.treeWidth = Math.max(120, p.treeWidth + d * 10)),
              )}`
          : nothing
      }
      <div
        class="w-list"
        @dragover=${drop?.over ?? nothing}
        @dragleave=${drop?.leave ?? nothing}
        @drop=${drop?.drop ?? nothing}
        @contextmenu=${(e: MouseEvent) => {
          if (
            (e.target as HTMLElement).closest("input, select, textarea, button")
          )
            return;
          openMenu(host, e, menuFor(host, p, p.sel ?? nodes[0]?.key ?? ""));
        }}
      >
        ${list}
      </div>
    </div>
  </section>`;
}

export function renderWorkspace(host: Host, doc: Doc): TemplateResult {
  const ws = host.ws;
  return html`<div
    class="w-workspace"
    @dragstart=${(e: DragEvent) =>
      (e.target as HTMLElement)
        .closest?.("tr, .w-node")
        ?.classList.add("dragging")}
    @dragend=${(e: DragEvent) => {
      (e.currentTarget as HTMLElement)
        .querySelectorAll(".dragging")
        .forEach((el) => el.classList.remove("dragging"));
      if (ws.hint) {
        ws.hint = "";
        host.requestUpdate();
      }
    }}
  >
    ${ws.panels.map(
      (p, i) =>
        html`${
          i
            ? gutter(
                host,
                "row",
                t`Resize the panels`,
                (y, box) =>
                  (ws.split = Math.min(
                    0.85,
                    Math.max(0.15, (y - box.top) / box.height),
                  )),
                (d) =>
                  (ws.split = Math.min(
                    0.85,
                    Math.max(0.15, ws.split + d * 0.03),
                  )),
              )
            : nothing
        }${panel(host, doc, p, i)}`,
    )}
    ${ws.hint ? html`<div class="w-hint" role="status">${ws.hint}</div>` : nothing}
    ${menuView(host)}
  </div>`;
}
