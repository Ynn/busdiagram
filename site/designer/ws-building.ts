// Building panel: the rooms of the installation, with the devices placed in each one and
// the outputs that heat or cool it. Unlike a plain filing of devices, a room acts on the
// simulation: thermostats, temperature sensors, and window contacts read their room, and
// radiators and fan coils change its temperature. A device is dropped on a room from this
// tree or from the Topology panel; an output, from this tree.
import { html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { live } from "lit/directives/live.js";
import type { Dev, Doc } from "./edit";
import * as E from "./edit";
import { fieldValue } from "./field-value";
import { t } from "./lang";
import { tt } from "./params";
import { has } from "./ws-dnd";
import { renamable } from "./ws-rename";
import { dataTable } from "./ws-table";
import { deviceNode } from "./ws-tree";
import type { Node } from "./ws-tree";
import { devOf, select, startRename } from "./ws-state";
import type { Host, Panel } from "./ws-state";

/** Drag data of an output that heats or cools a room: "device/channel/load index". */
export const OUTPUT_TYPE = "application/x-bd-output";
const MOVE_TYPE = "application/x-bd-move";

/** An output load that heats or cools a room (radiator, fan coil, heat pump). */
export interface RoomOutput {
  d: Dev;
  c: NonNullable<Dev["channels"]>[number];
  index: number;
  load: E.Load;
}

/** Devices with outputs are not placed in a room: their heating and cooling loads are. */
const hasOutputs = (host: Host, d: Dev) =>
  !!host.registry.behaviors.get(d.behavior)?.output;

export const readsRoom = (host: Host, d: Dev) =>
  host.registry.behaviors.get(d.behavior)?.readsRoom === true;

/** Every load of the installation that heats or cools a room. */
export function roomOutputs(host: Host, doc: Doc): RoomOutput[] {
  return doc.devices.flatMap((d) =>
    (d.channels ?? []).flatMap((c) =>
      E.loadsOf(c).flatMap((load, index) =>
        host.registry.equipment.get(load.type)?.heatOutput
          ? [{ d, c, index, load }]
          : [],
      ),
    ),
  );
}

const outKey = (o: RoomOutput) => `out:${o.d.id}/${o.c.id}/${o.index}`;
const outLabel = (host: Host, o: RoomOutput) => {
  const eq = host.registry.equipment.get(o.load.type);
  return `${o.d.name ?? o.d.id} · ${o.c.label ?? o.c.id} · ${o.load.name ?? (eq?.title ? tt(eq.title) : o.load.type)}`;
};

/** The output of a key "out:device/channel/index", if it still exists. */
export function outputOf(host: Host, doc: Doc, key: string) {
  return roomOutputs(host, doc).find((o) => outKey(o) === key) ?? null;
}

/**
 * Drop target of a room (or of the devices outside any room, with `room` null): a device
 * moves into it, an output heats it. A device with outputs is refused, with the reason.
 */
export function roomTarget(host: Host, room: string | null) {
  const el = (e: DragEvent) => e.currentTarget as HTMLElement;
  const name = () =>
    room ? (E.roomsOf(host.doc!).find((r) => r.id === room)?.name ?? room) : "";
  const hint = (text: string) => {
    if (host.ws.hint !== text) {
      host.ws.hint = text;
      host.requestUpdate();
    }
  };
  const kind = (e: DragEvent) =>
    has(e, MOVE_TYPE)
      ? "device"
      : room && has(e, OUTPUT_TYPE)
        ? "output"
        : null;
  return {
    over: (e: DragEvent) => {
      const k = kind(e);
      if (!k) return;
      e.stopPropagation();
      e.preventDefault();
      el(e).classList.add("drop-ok");
      hint(
        k === "output"
          ? t`Heat or cool ${name()} with this output`
          : room
            ? t`Place in ${name()}`
            : t`Take out of its room`,
      );
    },
    leave: (e: DragEvent) => el(e).classList.remove("drop-ok"),
    drop: (e: DragEvent) => {
      el(e).classList.remove("drop-ok");
      const k = kind(e);
      if (!k) return;
      e.preventDefault();
      e.stopPropagation();
      host.ws.hint = "";
      if (k === "output") {
        const [devId, ch, index] = e
          .dataTransfer!.getData(OUTPUT_TYPE)
          .split("/") as [string, string, string];
        host.run(t`Heated room`, (d) =>
          E.setEquipmentRoom(d, devId, ch, room!, Number(index)),
        );
        return;
      }
      const id = e.dataTransfer!.getData(MOVE_TYPE);
      const d = host.doc && devOf(host.doc, id);
      if (!d) return;
      if (hasOutputs(host, d)) {
        host.refuse(
          t`Room`,
          t`${d.name ?? d.id} has outputs: it is not placed in a room, but its heating and cooling outputs are, each in the room it heats.`,
        );
        return;
      }
      if ((d.room ?? "") === (room ?? "")) return;
      if (host.run(t`Room`, (x) => E.setDeviceRoom(x, id, room ?? "")))
        host.announce(
          room
            ? t`${d.name ?? id} placed in ${name()}.`
            : t`${d.name ?? id} taken out of its room.`,
        );
    },
  };
}

function outputNode(host: Host, o: RoomOutput): Node {
  const label = outLabel(host, o);
  return {
    key: outKey(o),
    icon: "i-out",
    label,
    text: label,
    title: t`Output that heats or cools this room; drag it onto another room`,
    drag: (e) => {
      e.dataTransfer?.setData(OUTPUT_TYPE, `${o.d.id}/${o.c.id}/${o.index}`);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    },
  };
}

/** A device in the building tree: its icon tells whether it reads its room. */
function placedNode(host: Host, d: Dev): Node {
  const n = deviceNode(host, d);
  return readsRoom(host, d)
    ? {
        ...n,
        icon: "i-dev i-reads",
        title: t`Can read its room (temperature, window); drag it onto another room`,
      }
    : { ...n, title: t`Drag it onto another room` };
}

export function buildingTree(host: Host, doc: Doc): Node[] {
  const outputs = roomOutputs(host, doc);
  const free = doc.devices.filter((d) => !d.room && !hasOutputs(host, d));
  return [
    {
      key: "bld",
      icon: "i-bld",
      label: t`Building`,
      text: t`Building`,
      children: [
        ...E.roomsOf(doc).map((r): Node => ({
          key: `room:${r.id}`,
          icon: "i-room",
          label: r.name ?? r.id,
          text: r.name ?? r.id,
          title: t`Room; drop a device or an output on it`,
          drop: roomTarget(host, r.id),
          children: [
            ...doc.devices
              .filter((d) => d.room === r.id)
              .map((d) => placedNode(host, d)),
            ...outputs
              .filter((o) => o.load.room === r.id)
              .map((o) => outputNode(host, o)),
          ],
        })),
        {
          key: "free",
          icon: "i-free",
          label: t`Not in a room`,
          text: t`Not in a room`,
          title: t`Devices without outputs that are in no room; drop a device here to take it out of its room`,
          drop: roomTarget(host, null),
          children: free.map((d) => placedNode(host, d)),
        },
      ],
    },
  ];
}

/** Rename in place (double-click), as the name cells of the other lists. */
function nameCell(host: Host, p: Panel, key: string, display: string) {
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

/** What a room changes for a device or an output, in the list of a room. */
type Row = { key: string; dev: Dev; output: RoomOutput | null };

function contentsTable(host: Host, p: Panel, rows: Row[], id: string) {
  const effect = (r: Row) =>
    r.output
      ? t`heats or cools the room`
      : readsRoom(host, r.dev)
        ? t`can read the room (temperature, window)`
        : t`none: filed in the room`;
  return dataTable<Row>(
    host,
    id,
    [
      {
        id: "address",
        label: t`Address`,
        sort: (r) => r.dev.address ?? "",
        cell: (r) => html`<code>${r.dev.address ?? "IP"}</code>`,
      },
      {
        id: "name",
        label: t`Name`,
        sort: (r) =>
          r.output ? outLabel(host, r.output) : (r.dev.name ?? r.dev.id),
        td: (r) =>
          r.output
            ? html`<td>${outLabel(host, r.output)}</td>`
            : nameCell(host, p, `dev:${r.dev.id}`, r.dev.name ?? r.dev.id),
      },
      {
        id: "application",
        label: t`Application`,
        sort: (r) => host.typeLabel(r.dev),
        cell: (r) => host.typeLabel(r.dev),
      },
      {
        id: "effect",
        label: t`Effect of the room`,
        sort: effect,
        cell: effect,
      },
    ],
    rows,
    (r, cells) =>
      html`<tr
        draggable="true"
        title=${r.output ? t`Drag onto another room` : t`Drag onto another room, or onto Not in a room`}
        @dragstart=${(e: DragEvent) => {
          if (r.output)
            e.dataTransfer?.setData(
              OUTPUT_TYPE,
              `${r.dev.id}/${r.output.c.id}/${r.output.index}`,
            );
          else e.dataTransfer?.setData(MOVE_TYPE, r.dev.id);
          if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
        }}
        @dblclick=${() => select(host, p, r.key)}
      >
        ${cells}
      </tr>`,
  );
}

function roomProperties(host: Host, r: E.RoomDoc) {
  const num = (
    label: string,
    key: "temperatureC" | "outsideTemperatureC",
    def: number,
  ) =>
    html`<label class="g-field narrow"
      ><span>${label}</span>
      <input
        inputmode="decimal"
        .value=${fieldValue(String(r[key] ?? def))}
        @change=${(e: Event) => {
          const v = (e.target as HTMLInputElement).value.trim();
          const n = Number(v.replace(",", "."));
          host.run(label, (x) =>
            E.setRoomField(
              x,
              r.id,
              key,
              v === "" ? undefined : Number.isFinite(n) ? n : NaN,
            ),
          );
        }}
    /></label>`;
  return html`<div class="w-bar">
    <label class="g-field"
      ><span>${t`Name`}</span>
      <input
        .value=${fieldValue(r.name ?? "")}
        placeholder=${r.id}
        @change=${(e: Event) =>
          host.run(t`Name`, (x) =>
            E.setRoomField(
              x,
              r.id,
              "name",
              (e.target as HTMLInputElement).value.trim(),
            ),
          )}
    /></label>
    ${num(t`Initial temperature (°C)`, "temperatureC", 20)}
    ${num(t`Outside temperature (°C)`, "outsideTemperatureC", 5)}
    <label class="g-check"
      ><input
        type="checkbox"
        .checked=${live(r.windowOpen === true)}
        @change=${(e: Event) =>
          host.run(t`Window`, (x) =>
            E.setRoomField(
              x,
              r.id,
              "windowOpen",
              (e.target as HTMLInputElement).checked,
            ),
          )}
      />${t`Window open at start`}</label
    >
  </div>`;
}

const tabBar = (label: string) =>
  html`<nav class="w-tabs" role="tablist">
    <button role="tab" aria-selected="true">${label}</button>
  </nav>`;

/** List of the Building panel, from its selection (devices and objects: see the Topology list). */
export function buildingList(
  host: Host,
  doc: Doc,
  p: Panel,
): TemplateResult | null {
  const sel = p.sel ?? "bld";
  const outputs = roomOutputs(host, doc);
  if (sel.startsWith("room:")) {
    const id = sel.slice(5);
    const r = E.roomsOf(doc).find((x) => x.id === id);
    if (!r)
      return html`<p class="w-empty">${t`This room no longer exists.`}</p>`;
    const rows: Row[] = [
      ...doc.devices
        .filter((d) => d.room === id)
        .map((d) => ({ key: `dev:${d.id}`, dev: d, output: null })),
      ...outputs
        .filter((o) => o.load.room === id)
        .map((o) => ({ key: outKey(o), dev: o.d, output: o })),
    ];
    const heated = E.roomHeaters(doc, id).length > 0;
    return html`<div class="w-content">
        ${roomProperties(host, r)}
        <div class="w-bar">
          <button
            class="g-btn"
            ?disabled=${heated}
            title=${heated ? t`An output still heats or cools this room: move it to another room first.` : ""}
            @click=${() => {
              if (host.run(t`Deletion`, (d) => E.removeRoom(d, id)))
                select(host, p, "bld");
            }}
          >
            ${t`Delete room`}
          </button>
        </div>
        ${contentsTable(host, p, rows, "room-contents")}
        ${rows.length ? nothing : html`<p class="w-empty">${t`Nothing in this room: drop a device here from the Topology panel, or an output from another room.`}</p>`}
      </div>
      ${tabBar(t`Room`)}`;
  }
  if (sel === "free") {
    const rows = doc.devices
      .filter((d) => !d.room && !hasOutputs(host, d))
      .map((d) => ({ key: `dev:${d.id}`, dev: d, output: null }));
    return html`<div class="w-content">
        ${contentsTable(host, p, rows, "free-devices")}
        ${rows.length ? nothing : html`<p class="w-empty">${t`Every device without outputs is in a room.`}</p>`}
      </div>
      ${tabBar(t`Devices`)}`;
  }
  if (sel.startsWith("out:")) {
    const o = outputOf(host, doc, sel);
    if (!o)
      return html`<p class="w-empty">${t`This output no longer exists.`}</p>`;
    return html`<div class="w-content">${host.deviceParameters(doc, o.d)}</div>
      ${tabBar(t`Parameters`)}`;
  }
  if (sel.startsWith("dev:") || sel.startsWith("obj:")) return null;
  // The building: its rooms.
  type R = E.RoomDoc;
  const count = (r: R) =>
    doc.devices.filter((d) => d.room === r.id).length +
    outputs.filter((o) => o.load.room === r.id).length;
  return html`<div class="w-content">
      <p class="g-hint">
        ${t`A room acts on the simulation: thermostats, temperature sensors, and window contacts can read the room they are in, and radiators and fan coils heat or cool the room of their output. Drag devices from the Topology panel onto a room.`}
      </p>
      <div class="w-bar">
        <button
          class="g-btn"
          @click=${() => {
            let id = "";
            if (host.run(t`Room`, (d) => void (id = E.addRoom(d))))
              select(host, p, `room:${id}`);
          }}
        >
          + ${t`Add a room`}
        </button>
      </div>
      ${dataTable<R>(
        host,
        "building-rooms",
        [
          {
            id: "name",
            label: t`Name`,
            sort: (r) => r.name ?? r.id,
            td: (r) => nameCell(host, p, `room:${r.id}`, r.name ?? r.id),
          },
          {
            id: "temperature",
            label: t`Initial temperature (°C)`,
            sort: (r) => r.temperatureC ?? 20,
            cell: (r) => String(r.temperatureC ?? 20),
          },
          {
            id: "outside",
            label: t`Outside temperature (°C)`,
            sort: (r) => r.outsideTemperatureC ?? 5,
            cell: (r) => String(r.outsideTemperatureC ?? 5),
          },
          {
            id: "contents",
            label: t`Devices and outputs`,
            sort: count,
            cell: count,
          },
        ],
        E.roomsOf(doc),
        (r, cells) =>
          html`<tr @dblclick=${() => select(host, p, `room:${r.id}`)}>
            ${cells}
          </tr>`,
      )}
      ${E.roomsOf(doc).length ? nothing : html`<p class="w-empty">${t`No room yet.`}</p>`}
    </div>
    ${tabBar(t`Rooms`)}`;
}
