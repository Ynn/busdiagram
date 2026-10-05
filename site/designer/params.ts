// Parameters of a device, as the parameters tab of a product: the general page, one page per
// key or output, and the objects shared by all outputs, with their port rows.
import { html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { live } from "lit/directives/live.js";
import type {
  BehaviorDefinition,
  BehaviorPort,
  ParameterCondition,
  ParameterItem,
  ParameterPage,
} from "../../src/knx/contracts";
import { fieldValue } from "./field-value";
import { dptInfo } from "../../src/knx/dpt";
import type { Registry } from "../../src/knx/registry";
import type { Chan, Dev, Doc } from "./edit";
import * as E from "./edit";
import { t } from "./lang";
import type { GuidedEditor } from "./guided";
import { openMenu } from "./ws-menu";
import { dataTable } from "./ws-table";
import type { MenuItem } from "./ws-state";

export const tt = (text: string | undefined) =>
  text ? (t.s ? t.s(text) : text) : "";

/** A page of device parameters, or a group of pages, in the tree on the left. */
export interface Page {
  key: string;
  label: string;
  sum?: string;
  body?: () => TemplateResult;
  /** Pages of a group (an output: its settings, its connected loads). */
  children?: Page[];
  /** Commands of its context menu. */
  menu?: () => MenuItem[];
  /**
   * The page describes the installation simulated around the device (wired push-button,
   * connected loads, values entered in the diagram), not a parameter of the device.
   */
  installation?: boolean;
}

/** Plug icon of the pages that describe the installation. */
const PLUG = html`<svg
  class="w-plug"
  viewBox="0 0 16 16"
  aria-hidden="true"
  width="13"
  height="13"
>
  <path
    d="M5 1.5v3.5M11 1.5v3.5M3.5 5h9v2.5a4.5 4.5 0 0 1-9 0V5zM8 12v2.5"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>`;

/** Divider above the installation pages of a group of pages, in the tree. */
const installationDivider = () =>
  html`<div
    class="w-pdiv"
    title=${t`Installation simulated around the device: wiring, loads, values entered in the diagram. These are not parameters of the device.`}
  >
    ${PLUG} ${t`Installation`}
  </div>`;

/** General page of a device: identity, place on the bus, device settings. */
export function generalPage(ed: GuidedEditor, doc: Doc, d: Dev) {
  const def = ed.registry.behaviors.get(d.behavior);
  const lv = E.levelsOf(doc);
  // A supervision software can sit on the IP network (as declared by its behavior).
  const visu =
    d.medium === "IP" ||
    !!def?.presentation?.({
      kind: d.kind ?? "",
      objects: d.objects.map((o) => ({
        id: o.id,
        port: o.port ?? "",
        channel: o.channel ?? null,
      })),
      channels: d.channels ?? [],
    }).supervisor;
  const places: [string, string][] = [
    ...(visu && lv.ip
      ? [["IP", t`IP network (KNXnet/IP routing)`] as [string, string]]
      : []),
    ...(lv.backbone ? [["0.0", t`backbone 0.0`] as [string, string]] : []),
    ...E.areasOf(doc).flatMap((a) => [
      ...(lv.mainLines.includes(a)
        ? [[`${a}.0`, t`main line ${a}.0`] as [string, string]]
        : []),
      ...doc.lines
        .filter((l) => String(l.address).startsWith(`${a}.`))
        .map(
          (l) =>
            [String(l.address), t`line ${String(l.address)}`] as [
              string,
              string,
            ],
        ),
    ]),
  ];
  const place = E.lineOf(d) ?? "";
  const ext = doc.lines.find((l) => String(l.address) === place)?.extension as
    { address?: string } | undefined;
  return html`<section class="g-sec">
      <h3>${d.name ?? d.id} <code>${d.address ?? "IP"}</code></h3>
      <p class="g-hint">
        ${ed.typeLabel(d)}${def?.description ? html` — ${tt(def.description)}` : nothing}
        ${def ? nothing : html`<br /><b>${t`Behavior not loaded in the designer: data kept, limited forms.`}</b>`}
      </p>
      <div class="g-row">
        ${ed.text(t`Name`, d.name ?? "", (v) => ed.run(t`Name`, (x) => E.setDeviceField(x, d.id, "name", v)))}
        ${ed.select(visu ? t`Connection` : t`Line`, places, place, (v) =>
          ed.run(t`Connection`, (x) => E.connectDevice(x, d.id, v)),
        )}
        ${
          place !== "IP" && d.address !== undefined
            ? html`${ed.text(
                t`Individual address`,
                d.address,
                (v) =>
                  ed.run(t`Individual address`, (x) =>
                    E.setDeviceAddress(x, d.id, v),
                  ),
                false,
                "narrow",
              )}`
            : nothing
        }
        ${
          E.roomsOf(doc).length && !def?.output
            ? ed.select(
                t`Room`,
                [
                  ["", t`none`],
                  ...E.roomsOf(doc).map(
                    (r) => [r.id, r.name ?? r.id] as [string, string],
                  ),
                ],
                d.room ?? "",
                (v) => ed.run(t`Room`, (x) => E.setDeviceRoom(x, d.id, v)),
              )
            : nothing
        }
      </div>
      ${
        ext && place !== "IP"
          ? html`<label class="g-check">
              <input
                type="checkbox"
                .checked=${live(d.downstream === true)}
                @change=${(e: Event) =>
                  ed.run(t`Segment`, (x) =>
                    E.setDownstream(
                      x,
                      d.id,
                      (e.target as HTMLInputElement).checked,
                    ),
                  )}
              />
              ${t`On the segment behind the line extension (${String(ext.address ?? "")})`}
            </label>`
          : nothing
      }
      ${ed.text(
        t`Help text (shown in the diagram inspector)`,
        d.description ?? "",
        (v) =>
          ed.run(t`Help text`, (x) =>
            E.setDeviceField(x, d.id, "description", v),
          ),
        true,
      )}
    </section>
    ${visu ? visualisation(ed, d, place) : nothing}

    <section class="g-sec g-danger">
      ${ed.dangerButton(
        `dev:${d.id}`,
        t`Delete device`,
        t`Delete “${d.name ?? d.id}”? Its group addresses remain declared.`,
        () => {
          if (ed.run(t`Deletion`, (x) => E.removeDevice(x, d.id))) ed.go(null);
        },
      )}
    </section>`;
}

/** Supervisor: how it sees the bus and whether the project declares its addresses through a dummy device. */
export function visualisation(ed: GuidedEditor, d: Dev, place: string) {
  const known = d.inFilterTables !== false;
  return html`<section class="g-sec">
    <h3>${t`What reaches the supervisor`}</h3>
    <p class="g-hint">
      ${
        place === "IP"
          ? t`On the IP network, the supervisor receives what the KNXnet/IP routers let through: their filter table decides.`
          : t`Connected to a line through an interface, the supervisor receives what travels on that line: the couplers decide what gets there.`
      }
    </p>
    <label class="g-check">
      <input
        type="checkbox"
        .checked=${live(known)}
        @change=${(e: Event) =>
          ed.run(t`Declaration in the project`, (x) =>
            E.setInFilterTables(
              x,
              d.id,
              (e.target as HTMLInputElement).checked,
            ),
          )}
      />
      ${t`Declared in the project (dummy device with its addresses)`}
    </label>
    <p class="g-hint">
      ${
        known
          ? t`The project knows its addresses: the filter tables let them through to it.`
          : t`This supervisor is not declared in the project: couplers block the addresses only it uses. Remedies: declare it (dummy device), or set the couplers to “route everything”.`
      }
    </p>
  </section>`;
}

// ── Parameter tree ───────────────────────────────────────────────────────────

/**
 * Parameters of a device, organized as the parameter dialog of a product: a tree of pages on
 * the left, the selected page on the right with one parameter per row. The pages come
 * from the layout declared by the behavior (or derived from its schemas): pages of the
 * device, then a group per output with its pages and its connected loads.
 * Parameter pages show no group address: a parameter enables a group object, which is
 * linked in the Group objects tab. Loads wired to the outputs (specific to the
 * simulation) have their own page.
 */
export function deviceParameters(ed: GuidedEditor, doc: Doc, d: Dev) {
  const def = ed.registry.behaviors.get(d.behavior);
  const layout = def ? layoutOf(def) : { device: [], channel: [] };
  const pages: Page[] = [
    {
      key: "general",
      label: t`General`,
      body: () => generalPage(ed, doc, d),
    },
  ];
  if (def?.ports.display && !(def.acceptsKeys ?? def.acceptsInputs))
    pages.push(displayPage(ed, doc, d));
  if (def && hasChannels(def))
    pages.push(
      outputsConfigPage(ed, doc, d, def, layout.channel[0]?.id ?? LOADS),
    );
  if (def)
    layout.device.forEach((page) =>
      pages.push({
        key: `dev:${page.id}`,
        label: tt(page.title),
        body: () => layoutItems(ed, doc, d, def, undefined, page.items),
      }),
    );
  if (def && hasChannels(def))
    pages.push(...outputPages(ed, doc, d, def, layout.channel));
  const inputs = def ? inputsPage(ed, d, def) : null;
  if (inputs) pages.push(inputs);

  const leaves = pages.flatMap((p) => p.children ?? [p]);
  const cur = leaves.find((p) => p.key === ed.pageOf.get(d.id)) ?? leaves[0]!;
  const group = pages.find((p) => p.children?.includes(cur));
  const open = (key: string) => {
    ed.pageOf.set(d.id, key);
    ed.requestUpdate();
  };
  const isOpen = (p: Page) =>
    p === group || ed.pageGroups.has(`${d.id}|${p.key}`);
  const toggle = (p: Page) => {
    const k = `${d.id}|${p.key}`;
    if (ed.pageGroups.has(k)) ed.pageGroups.delete(k);
    else ed.pageGroups.add(k);
    ed.requestUpdate();
  };
  const item = (p: Page, sub: boolean) =>
    html`<button
      class="w-pitem ${sub ? "sub" : ""} ${p.installation ? "inst" : ""}"
      aria-current=${p === cur ? "page" : "false"}
      title=${p.sum ?? p.label}
      data-page=${p.key}
      @click=${() => open(p.key)}
      @contextmenu=${(e: MouseEvent) =>
        p.menu ? openMenu(ed, e, p.menu()) : undefined}
    >
      ${p.installation ? PLUG : nothing}${p.label}
    </button>`;
  /** Pages of a list, with the divider before the first installation page. */
  const items = (list: Page[], sub: boolean) =>
    list.map(
      (p, i) =>
        html`${p.installation && !list[i - 1]?.installation ? installationDivider() : nothing}${item(p, sub)}`,
    );
  return html`<div class="w-params">
    <nav class="w-pmenu" aria-label=${t`Parameter pages`}>
      ${pages.map((p) =>
        p.children
          ? html`<div
                class="w-pgroup ${isOpen(p) ? "open" : ""}"
                data-page=${p.key}
              >
                <button
                  class="w-ptog"
                  aria-expanded=${String(isOpen(p))}
                  aria-label=${isOpen(p) ? t`Collapse` : t`Expand`}
                  @click=${() => toggle(p)}
                >
                  ${isOpen(p) ? "−" : "+"}
                </button>
                <button
                  class="w-pitem"
                  title=${p.sum ?? p.label}
                  @click=${() => {
                    ed.pageGroups.add(`${d.id}|${p.key}`);
                    open(p.children![0]!.key);
                  }}
                  @contextmenu=${(e: MouseEvent) =>
                    p.menu ? openMenu(ed, e, p.menu()) : undefined}
                >
                  ${p.label}
                </button>
              </div>
              ${isOpen(p) ? items(p.children, true) : nothing}`
          : items([p], false),
      )}
    </nav>
    ${keyed(
      `${d.id}/${cur.key}`,
      html`<div class="w-ppage" data-page=${cur.key}>
        ${
          cur.key === "general"
            ? cur.body!()
            : html`<section class="g-sec ${cur.installation ? "inst" : ""}">
                <h3>
                  ${cur.installation ? html`<span class="w-inst-tag">${PLUG} ${t`Installation`}</span>` : nothing}
                  ${group ? html`${group.label} › ` : nothing}${cur.label}
                  ${cur.sum ? html`<small>${cur.sum}</small>` : nothing}
                </h3>
                ${cur.body!()}
              </section>`
        }
      </div>`,
    )}
  </div>`;
}

/**
 * Values that the reader enters in the diagram (a measurement, a power, a setpoint):
 * this level belongs to the simulation, like the loads, not to the device configuration.
 */
function inputsPage(
  ed: GuidedEditor,
  d: Dev,
  def: BehaviorDefinition<unknown>,
): Page | null {
  if (!def.acceptsInputs) return null;
  const candidates = E.objectsInOrder(d).filter(
    (o) => o.port === "input" || def.ports[o.port]?.direction === "out",
  );
  if (!candidates.length) return null;
  const n = E.objectNumbers(d);
  type O = E.Obj;
  const set = (o: O, patch: Record<string, unknown> | null) =>
    ed.run(t`Value entered in the diagram`, (x) => {
      const cur = E.inputOf(d, o.id);
      E.setInput(
        x,
        d.id,
        o.id,
        patch === null ? null : { ...(cur ?? {}), ...patch },
      );
    });
  const numberField = (o: O, k: "min" | "max" | "step", label: string) => {
    const cur = E.inputOf(d, o.id);
    const range = dptInfo(o.dpt ?? "");
    const placeholder = k === "min" ? range?.min : k === "max" ? range?.max : 1;
    return html`<input
      type="number"
      class="w-num"
      aria-label=${t`${label} of ${o.name ?? o.id}`}
      placeholder=${placeholder ?? ""}
      ?disabled=${!cur}
      .value=${fieldValue(cur?.[k] === undefined ? "" : String(cur[k]))}
      @change=${(e: Event) => {
        const v = (e.target as HTMLInputElement).value;
        set(o, { [k]: v === "" ? undefined : Number(v) });
      }}
    />`;
  };
  return {
    key: "inputs",
    label: t`Inputs in the diagram`,
    installation: true,
    body: () =>
      html`<p class="w-info">
          ${t`Values that the reader types in the diagram (a measured wind speed, the power of a circuit…): the value is written to the object and sent on its group address. This belongs to the simulation, not to the device configuration.`}
        </p>
        ${dataTable<O>(
          ed,
          "inputs",
          [
            {
              id: "object",
              label: t`Group object`,
              sort: (o) => n.get(o.id) ?? 0,
              cell: (o) => `${n.get(o.id)}: ${o.name ?? o.id}`,
            },
            {
              id: "on",
              label: t`Entered`,
              sort: (o) => (E.inputOf(d, o.id) ? 0 : 1),
              td: (o) =>
                html`<td class="w-flag">
                  <input
                    type="checkbox"
                    aria-label=${t`Value of ${o.name ?? o.id} entered in the diagram`}
                    .checked=${live(!!E.inputOf(d, o.id))}
                    @change=${(e: Event) =>
                      set(
                        o,
                        (e.target as HTMLInputElement).checked
                          ? { label: o.name ?? o.id }
                          : null,
                      )}
                  />
                </td>`,
            },
            {
              id: "label",
              label: t`Label`,
              cell: (o) => {
                const cur = E.inputOf(d, o.id);
                return html`<input
                  class="w-txt"
                  aria-label=${t`Label of the input of ${o.name ?? o.id}`}
                  ?disabled=${!cur}
                  .value=${fieldValue(cur?.label ?? "")}
                  @change=${(e: Event) =>
                    set(o, { label: (e.target as HTMLInputElement).value })}
                />`;
              },
            },
            {
              id: "min",
              label: t`Minimum`,
              cell: (o) => numberField(o, "min", t`Minimum`),
            },
            {
              id: "max",
              label: t`Maximum`,
              cell: (o) => numberField(o, "max", t`Maximum`),
            },
            {
              id: "step",
              label: t`Step`,
              cell: (o) => numberField(o, "step", t`Step`),
            },
          ],
          candidates,
          (o, cells) =>
            html`<tr data-obj=${o.id}>
              ${cells}
            </tr>`,
        )}`,
  };
}

/** Commands to open a page from a context menu or a row. */
const openPage = (ed: GuidedEditor, d: Dev, key: string) => () => {
  ed.pageOf.set(d.id, key);
  ed.requestUpdate();
};

/** Focus a field of the page just opened (rename an output or a key). */
const focusField = (selector: string) =>
  setTimeout(() =>
    document.querySelector<HTMLInputElement>(selector)?.select(),
  );

// ── Layout of the parameters ────────────────────────────────────────────────

/**
 * A behavior has channels when it drives outputs, or when some of its ports belong to a
 * channel (the measured circuits of an energy meter).
 */
export const hasChannels = (def: BehaviorDefinition<unknown>) =>
  !!def.output ||
  Object.values(def.ports).some((p) => p.channel === "required");

/**
 * Words for the channels of a behavior: the outputs of an actuator, the inputs of a
 * push-button interface, the channels of other devices (the circuits of a meter).
 */
function channelWords(def: BehaviorDefinition<unknown>) {
  if (def.output)
    return {
      count: t`Number of outputs`,
      one: t`Output`,
      add: t`Add an output`,
      remove: t`Delete output`,
      group: (label: string) => t`Output ${label}`,
      removed: (label: string) => t`Output ${label} deleted, with its objects.`,
    };
  if (def.contactInputs)
    return {
      count: t`Number of inputs`,
      one: t`Input`,
      add: t`Add an input`,
      remove: t`Delete input`,
      group: (label: string) => label,
      removed: (label: string) => t`Input ${label} deleted, with its objects.`,
    };
  return {
    count: t`Number of channels`,
    one: t`Channel`,
    add: t`Add a channel`,
    remove: t`Delete channel`,
    group: (label: string) => t`Channel ${label}`,
    removed: (label: string) => t`Channel ${label} deleted, with its objects.`,
  };
}

/**
 * Pages added by the designer have identifiers that a declared page cannot take
 * (declared identifiers are letters, digits, “-”, and “_”).
 */
const AUTO = "#auto";
const LOADS = "#loads";
/** Page of the key wired to an input (contact inputs): the label drawn on the diagram. */
const KEY = "#key";

/** Ports whose objects the generic pages enable (keys and displays have their pages). */
function enabledPorts(
  def: BehaviorDefinition<unknown>,
  scope: "device" | "channel",
) {
  const generic = !def.output && !def.ports.input && !def.ports.display;
  return Object.entries(def.ports)
    .filter(([name, p]) =>
      scope === "channel"
        ? p.channel === "required" || p.channel === "optional"
        : p.channel !== "required" &&
          (generic ||
            p.channel === "optional" ||
            (!def.acceptsInputs && name !== "display" && !!def.output)),
    )
    .map(([name]) => name);
}

const itemsOf = (items: readonly ParameterItem[]): ParameterItem[] =>
  items.flatMap((i) => ("when" in i ? [i, ...itemsOf(i.items)] : [i]));

/**
 * Pages of a behavior: its declared layout, or one page derived from its schemas; then
 * an automatic page for what no page places, so that every setting stays reachable.
 */
/** Ports whose objects follow a parameter (channelObjects): they have no box to enable. */
const managedPorts = (def: BehaviorDefinition<unknown>) =>
  new Set(
    Object.values(def.channelObjects?.values ?? {}).flatMap((list) =>
      list.map((x) => x.port),
    ),
  );

export function layoutOf(def: BehaviorDefinition<unknown>): {
  device: ParameterPage[];
  channel: ParameterPage[];
} {
  const props = (s?: { properties: Record<string, { expert?: boolean }> }) =>
    Object.entries(s?.properties ?? {});
  const derive = (
    params: [string, { expert?: boolean }][],
    state: string[],
    ports: string[],
    scenes: boolean,
  ): ParameterItem[] => [
    ...params.filter(([, p]) => !p.expert).map(([k]) => ({ parameter: k })),
    ...state.map((k) => ({ initialState: k })),
    ...(params.some(([, p]) => p.expert)
      ? [
          { heading: "Advanced settings" },
          ...params
            .filter(([, p]) => p.expert)
            .map(([k]) => ({ parameter: k })),
        ]
      : []),
    ...(ports.length
      ? [
          { heading: "Group objects" },
          ...ports.map((k) => ({ groupObject: k })),
        ]
      : []),
    ...(scenes
      ? [{ when: { groupObject: "scene" }, items: [{ scenes: true as const }] }]
      : []),
  ];
  const declared = def.parameterLayout;
  const device: ParameterPage[] = [...(declared?.device ?? [])];
  const channel: ParameterPage[] = hasChannels(def)
    ? [...(declared?.channel ?? [])]
    : [];
  // What the declared pages leave out.
  const placed = (pages: ParameterPage[]) => {
    const all = pages.flatMap((p) => itemsOf(p.items));
    return {
      params: new Set(
        all.flatMap((i) => ("parameter" in i ? [i.parameter] : [])),
      ),
      state: new Set(
        all.flatMap((i) => ("initialState" in i ? [i.initialState] : [])),
      ),
      ports: new Set(
        all.flatMap((i) => ("groupObject" in i ? [i.groupObject] : [])),
      ),
      scenes: all.some((i) => "scenes" in i),
    };
  };
  const pd = placed(device);
  const devItems = derive(
    props(def.parameters).filter(([k]) => !pd.params.has(k)),
    [],
    enabledPorts(def, "device").filter((k) => !pd.ports.has(k)),
    false,
  );
  if (devItems.length) {
    const onlyObjects = devItems.every(
      (i) => "groupObject" in i || "heading" in i,
    );
    device.push({
      id: AUTO,
      title:
        onlyObjects && def.output
          ? "Objects shared by all outputs"
          : device.length
            ? "Other settings"
            : "Parameters",
      // A page of objects only needs no heading.
      items: onlyObjects ? devItems.filter((i) => !("heading" in i)) : devItems,
    });
  }
  if (hasChannels(def)) {
    const pc = placed(channel);
    const chItems = derive(
      props(def.channelParameters).filter(([k]) => !pc.params.has(k)),
      Object.keys(def.channelInitialState?.properties ?? {}).filter(
        (k) => !pc.state.has(k),
      ),
      enabledPorts(def, "channel").filter(
        (k) => !pc.ports.has(k) && !managedPorts(def).has(k),
      ),
      !pc.scenes && !!def.ports.scene,
    );
    if (chItems.length)
      channel.push({
        id: AUTO,
        title: channel.length ? "Other settings" : "Settings",
        items: chItems,
      });
  }
  return { device, channel };
}

/**
 * Rows of a page: parameters (of the device, or of channel `c`), initial states, boxes
 * that enable group objects, headings, notes, scenes, and conditional items.
 */
function layoutItems(
  ed: GuidedEditor,
  _doc: Doc,
  d: Dev,
  def: BehaviorDefinition<unknown>,
  c: Chan | undefined,
  items: readonly ParameterItem[],
): TemplateResult {
  const schema = c ? def.channelParameters : def.parameters;
  const values = (c ? c.parameters : d.parameters) ?? {};
  const valueOf = (k: string) =>
    values[k] !== undefined ? values[k] : schema?.properties[k]?.default;
  const enabled = (port: string) =>
    d.objects.some(
      (o) =>
        o.port === port && (c ? o.channel === c.id : o.channel === undefined),
    );
  const shown = (w: ParameterCondition) =>
    "groupObject" in w
      ? enabled(w.groupObject)
      : // Guarded: a faulty extension must not break the page.
        (!Array.isArray(w.is) ||
          w.is.some((v) => v === valueOf(w.parameter))) &&
        (!Array.isArray(w.not) ||
          !w.not.some((v) => v === valueOf(w.parameter)));
  const row = (i: ParameterItem): TemplateResult | typeof nothing => {
    if ("parameter" in i) {
      const p = schema?.properties[i.parameter];
      if (!p) return nothing;
      return ed.paramField(
        i.parameter,
        p,
        values[i.parameter],
        (v) =>
          ed.run(t`Setting`, (x) =>
            E.setParam(x, d.id, c?.id ?? null, i.parameter, v),
          ),
        !!schema?.required?.includes(i.parameter),
      );
    }
    if ("initialState" in i) {
      const p = def.channelInitialState?.properties[i.initialState];
      if (!p || !c) return nothing;
      return ed.paramField(
        i.initialState,
        p,
        c.initialState?.[i.initialState],
        (v) =>
          ed.run(t`Setting`, (x) =>
            E.setParam(x, d.id, c.id, i.initialState, v, "state"),
          ),
        false,
      );
    }
    if ("groupObject" in i) {
      const p = def.ports[i.groupObject];
      return p
        ? html`${portRows(ed, d, i.groupObject, p, c?.id, c ? (c.label ?? c.id) : (d.name ?? d.id))}`
        : nothing;
    }
    if ("heading" in i) return html`<h4 class="w-psep">${tt(i.heading)}</h4>`;
    if ("note" in i) return html`<p class="w-info">${tt(i.note)}</p>`;
    if ("scenes" in i) return c ? scenesTable(ed, d, def, c) : nothing;
    return shown(i.when) ? html`${i.items.map(row)}` : nothing;
  };
  return html`<div class="g-row">${items.map(row)}</div>`;
}

// ── Scene assignments ───────────────────────────────────────────────────────

/** Assignment rows shown at least, as the scene table of a product. */
const SCENE_ROWS = 8;

/**
 * Scene assignments of an output, as the scene table of an actuator: per row, whether the
 * output takes part in a scene, its number (1–64), and the state the output takes (on or
 * off, a level, a position). A scene telegram reaches the output through its own scene
 * object or through the central scene object of the device.
 */
function scenesTable(
  ed: GuidedEditor,
  d: Dev,
  def: BehaviorDefinition<unknown>,
  c: Chan,
): TemplateResult {
  // Scene objects that serve this output: its own, and the central one of the device.
  const sceneObjects = d.objects.filter(
    (o) =>
      o.port === "scene" && (o.channel === c.id || o.channel === undefined),
  );
  const receiving = sceneObjects.filter(
    (o) => E.gasOf(o).length > 0 && E.flagOf(d, o, "C") && E.flagOf(d, o, "W"),
  );
  const help = receiving.length
    ? null
    : !sceneObjects.length
      ? t`No scene object serves this output yet: enable its scene object above, or the central scene object of the device (Scenes page of the device).`
      : sceneObjects.some((o) => E.gasOf(o).length)
        ? t`The scene object of this output is not linked with C and W set: it does not accept scene telegrams.`
        : t`The scene object of this output has no group address yet: link it to the scene address in the Group objects tab.`;
  // A DALI gateway maps KNX scenes 1–16 to the 16 DALI scenes.
  const maxScene = d.behavior.startsWith("daliGateway/") ? 16 : 64;
  const entries = E.channelScenes(d, c.id);
  const kind = def.output;
  const fallback = kind === "switch" ? 1 : 100;
  const valueLabel =
    kind === "switch"
      ? t`State`
      : kind === "motor"
        ? t`Position (%)`
        : t`Level (%)`;
  const run = (label: string, fn: (x: Doc) => void) => ed.run(label, fn);
  const value = (n: number, v: number) =>
    kind === "switch"
      ? html`<select
          aria-label=${t`State in scene ${n}`}
          @change=${(e: Event) =>
            run(t`Scenes`, (x) =>
              E.setScene(
                x,
                d.id,
                c.id,
                n,
                Number((e.target as HTMLSelectElement).value),
              ),
            )}
        >
          <option value="1" ?selected=${v === 1}>${t`On`}</option>
          <option value="0" ?selected=${v === 0}>${t`Off`}</option>
        </select>`
      : html`<input
          type="number"
          min="0"
          max="100"
          step="1"
          class="w-num"
          aria-label=${`${valueLabel} · ${t`scene ${n}`}`}
          .value=${live(String(v))}
          @change=${(e: Event) =>
            run(t`Scenes`, (x) =>
              E.setScene(
                x,
                d.id,
                c.id,
                n,
                Number((e.target as HTMLInputElement).value),
              ),
            )}
        />`;
  // Always one free row, up to the number of scenes of the model.
  const rows = Array.from(
    {
      length: Math.min(maxScene, Math.max(SCENE_ROWS, entries.length + 1)),
    },
    (_, i) => entries[i],
  );
  return html`<div class="w-scenes">
    ${help ? html`<p class="w-info">${help}</p>` : nothing}
    <table class="w-table w-scene-table">
      <thead>
        <tr>
          <th>${t`Assignment`}</th>
          <th>${t`Active`}</th>
          <th>${t`Scene number`}</th>
          <th>${valueLabel}</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(
          (e, i) =>
            html`<tr data-scene=${e ? e[0] : ""}>
              <td>${i + 1}</td>
              <td>
                <input
                  type="checkbox"
                  aria-label=${t`Assignment ${i + 1} active`}
                  .checked=${live(!!e)}
                  @change=${(ev: Event) =>
                    run(t`Scenes`, (x) =>
                      (ev.target as HTMLInputElement).checked
                        ? void E.addScene(x, d.id, c.id, fallback, maxScene)
                        : e && E.removeScene(x, d.id, c.id, e[0]),
                    )}
                />
              </td>
              <td>
                ${
                  e
                    ? html`<input
                        type="number"
                        min="1"
                        max=${maxScene}
                        step="1"
                        class="w-num"
                        aria-label=${t`Scene number of assignment ${i + 1}`}
                        .value=${live(String(e[0]))}
                        @change=${(ev: Event) =>
                          run(t`Scenes`, (x) =>
                            E.renumberScene(
                              x,
                              d.id,
                              c.id,
                              e[0],
                              Number((ev.target as HTMLInputElement).value),
                            ),
                          )}
                      />`
                    : nothing
                }
              </td>
              <td>${e ? value(e[0], e[1]) : nothing}</td>
            </tr>`,
        )}
      </tbody>
    </table>
    <p class="g-hint">
      ${maxScene === 16 ? t`DALI scenes go from 1 to 16.` : nothing}
      ${
        kind === "motor"
          ? t`A scene recall moves the shutter to its position (0 % top, 100 % bottom); the slat angle is not part of a scene. With storing allowed, a scene control telegram with the learn bit (DPT 18.001) stores the current position of an active assignment instead of the value set here, until the simulation restarts; an output does not learn a scene it does not take part in.`
          : kind === "switch"
            ? t`A scene recall switches the output to its state. With storing allowed, a scene control telegram with the learn bit (DPT 18.001) stores the current state of an active assignment instead of the value set here, until the simulation restarts; an output does not learn a scene it does not take part in.`
            : t`A scene recall dims the output to its level, within the minimum and maximum levels; 0 % switches off. With storing allowed, a scene control telegram with the learn bit (DPT 18.001) stores the current level of an active assignment instead of the value set here, until the simulation restarts; an output does not learn a scene it does not take part in.`
      }
    </p>
  </div>`;
}

// ── Group objects enabled by parameters ─────────────────────────────────────

/**
 * “Enable group object” rows, one per port,: ticking the box creates the
 * object, without a group address; unticking it deletes the object. Group addresses are
 * linked in the Group objects tab, never on a parameter page.
 */
export function portRows(
  ed: GuidedEditor,
  d: Dev,
  port: string,
  p: BehaviorPort,
  ch: string | undefined,
  owner: string,
) {
  const objs = d.objects.filter(
    (o) =>
      o.port === port && (ch === undefined ? !o.channel : o.channel === ch),
  );
  const title = tt(p.title) || port;
  const dpt = p.dpts === "any" ? "1.001" : p.dpts[0]!;
  const opts = {
    dpt,
    W: p.direction !== "out",
    T: p.direction === "out" || p.direction === "both",
    name: ch === undefined ? title : `${title} ${owner}`,
  };
  const row = (o: E.Obj | undefined) => {
    const label =
      objs.length > 1
        ? t`Enable group object “${title}” (${o!.name ?? o!.id})`
        : t`Enable group object “${title}”`;
    return html`<label class="g-check g-enable" data-obj=${o?.id ?? ""}>
      <input
        type="checkbox"
        aria-label=${label}
        .checked=${!!o}
        @change=${(e: Event) => {
          const on = (e.target as HTMLInputElement).checked;
          ed.run(on ? t`Activate ${title}` : t`Deactivate ${title}`, (x) =>
            E.setPortGas(x, d.id, port, ch, [], {
              ...opts,
              objectId: o?.id,
              keepEmpty: on,
            }),
          );
        }}
      />
      <span>${label}</span>
    </label>`;
  };
  return objs.length ? objs.map(row) : [row(undefined)];
}

// ── Displays ─────────────────────────────────────────────────────────────────

export function displayPage(ed: GuidedEditor, doc: Doc, d: Dev): Page {
  return {
    key: "display",
    label: t`Displayed values`,
    body: () =>
      html`<div class="g-chips">
        ${d.objects
          .filter((o) => o.port === "display")
          .map(
            (o) =>
              html`<span class="g-chip"
                >${E.gasOf(o).join(", ") || "—"} · ${o.name ?? o.id}
                <button
                  title=${t`Remove`}
                  @click=${() => ed.run(t`Removal`, (x) => E.removeObject(x, d.id, o.id))}
                >
                  ×
                </button></span
              >`,
          )}
        ${ed.gaAdder(doc, null, [], "", (ga, x) => E.addDisplay(x, d.id, ga), t`Display an address`)}
      </div>`,
  };
}

export function equipmentChoices(
  ed: GuidedEditor,
  def: BehaviorDefinition<unknown>,
) {
  return [...ed.registry.equipment]
    .filter(([, e]) => e.accepts === def.output)
    .map(([id, e]) => [id, e.title ? tt(e.title) : id] as [string, string]);
}

export function addOutput(
  ed: GuidedEditor,
  d: Dev,
  def: BehaviorDefinition<unknown>,
) {
  const equipments = equipmentChoices(ed, def);
  ed.run(t`Output`, (x) => {
    const last = d.channels?.[d.channels.length - 1];
    const e = (last && E.loadsOf(last)[0]?.type) ?? equipments[0]?.[0];
    E.addChannel(
      x,
      d.id,
      e ? { type: e, ...defaultEquipmentParams(ed.registry, e) } : null,
    );
  });
}

// ── Outputs ──────────────────────────────────────────────────────────────────

/** A new load of a given type, with its required parameters and a heated room. */
function newLoad(ed: GuidedEditor, doc: Doc, type: string, c?: Chan): E.Load {
  return {
    type,
    ...(ed.registry.equipment.get(type)?.heatOutput
      ? { room: E.roomsOf(doc)[0]?.id ?? E.addRoom(doc) }
      : {}),
    ...defaultEquipmentParams(ed.registry, type, c),
  };
}

/** Names of the loads of an output, for summaries. */
function loadsText(
  ed: GuidedEditor,
  def: BehaviorDefinition<unknown>,
  c: Chan,
) {
  const titles = new Map(equipmentChoices(ed, def));
  const loads = E.loadsOf(c);
  return loads.length
    ? loads.map((l) => l.name ?? titles.get(l.type) ?? l.type).join(", ")
    : t`no load`;
}

function outputMenu(
  ed: GuidedEditor,
  doc: Doc,
  d: Dev,
  def: BehaviorDefinition<unknown>,
  c: Chan,
  /** First page of an output (its settings). */
  first: string,
): MenuItem[] {
  return [
    { label: t`Settings`, run: openPage(ed, d, `ch:${c.id}:${first}`) },
    ...(def.output
      ? [
          {
            label: t`Connected loads`,
            run: openPage(ed, d, `ch:${c.id}:${LOADS}`),
          },
        ]
      : []),
    // An input keeps its name, as in the configuration; the text of its key is on the Key page.
    ...(def.contactInputs
      ? []
      : [
          {
            label: t`Rename`,
            run: () => {
              openPage(ed, d, `ch:${c.id}:${first}`)();
              focusField(".w-ppage .g-field input");
            },
          },
        ]),
    {
      label: t`Copy settings to…`,
      run: () => {
        openPage(ed, d, `ch:${c.id}:${first}`)();
        ed.copy = {
          dev: d.id,
          ch: c.id,
          targets: new Set(),
          what: { parameters: true, load: false, scenes: false },
        };
        ed.requestUpdate();
      },
      disabled: E.copyTargets(doc, d.id, c.id).length
        ? undefined
        : t`No other output of the same type.`,
    },
    {
      label: channelWords(def).add,
      run: () => addOutput(ed, d, def),
    },
    {
      label: channelWords(def).remove,
      run: () => {
        const words = channelWords(def);
        if (ed.run(words.remove, (x) => E.removeChannel(x, d.id, c.id)))
          ed.announce(words.removed(c.label ?? c.id));
      },
    },
  ];
}

/**
 * Configuration of an actuator, as the configuration page of a product: the number of outputs,
 * then one row per output with its connected loads and the functions it enables.
 */
function outputsConfigPage(
  ed: GuidedEditor,
  doc: Doc,
  d: Dev,
  def: BehaviorDefinition<unknown>,
  first: string,
): Page {
  const titles = Object.fromEntries(
    Object.entries(def.ports).map(([k, p]) => [k, tt(p.title) || k]),
  );
  const count = d.channels?.length ?? 0;
  // An actuator has outputs with loads; an energy meter has measured channels (circuits).
  const outputs = !!def.output;
  const words = channelWords(def);
  const countLabel = words.count;
  const functions = (c: Chan) =>
    [
      ...new Set(
        E.objectsInOrder(d)
          .filter((o) => o.channel === c.id)
          .map((o) => titles[o.port] ?? o.port),
      ),
    ].join(", ") || "—";
  return {
    key: "config",
    label: t`Configuration`,
    menu: () => [
      {
        label: words.add,
        run: () => addOutput(ed, d, def),
      },
    ],
    body: () =>
      html`<div class="g-row">
          <label class="g-field narrow"
            ><span>${countLabel}</span>
            <input
              type="number"
              min="1"
              max="64"
              .value=${fieldValue(String(count))}
              @change=${(e: Event) => {
                const n = Number((e.target as HTMLInputElement).value);
                const last = d.channels?.at(-1);
                const type =
                  (last && E.loadsOf(last)[0]?.type) ??
                  equipmentChoices(ed, def)[0]?.[0];
                ed.run(countLabel, (x) =>
                  E.setOutputCount(
                    x,
                    d.id,
                    n,
                    type ? newLoad(ed, x, type) : null,
                  ),
                );
              }}
          /></label>
        </div>
        ${
          outputs
            ? html`<p class="w-info">
                ${t`An output is a relay or a channel of the actuator: it has its own settings and group objects, and is controlled on its own. The loads connected to one output are wired in parallel: they always switch together.`}
              </p>`
            : def.contactInputs
              ? html`<p class="w-info">
                  ${t`An input is a contact of the interface, wired to a conventional push-button; on the diagram it is a key. Its function, chosen on its Function page, decides its group objects.`}
                </p>`
              : nothing
        }
        ${dataTable<Chan>(
          ed,
          "outputs",
          [
            {
              id: "output",
              label: words.one,
              sort: (c) => (d.channels ?? []).indexOf(c),
              cell: (c) =>
                html`<button
                  class="w-link"
                  @click=${openPage(ed, d, `ch:${c.id}:${first}`)}
                >
                  ${c.label ?? c.id}
                </button>`,
            },
            ...(outputs
              ? [
                  {
                    id: "loads",
                    label: t`Connected loads`,
                    sort: (c: Chan) => loadsText(ed, def, c),
                    cell: (c: Chan) =>
                      html`<button
                        class="w-link"
                        @click=${openPage(ed, d, `ch:${c.id}:${LOADS}`)}
                      >
                        ${loadsText(ed, def, c)}
                      </button>`,
                  },
                ]
              : []),
            {
              id: "functions",
              label: t`Enabled functions`,
              sort: (c) => functions(c),
              cell: (c) => functions(c),
            },
          ],
          d.channels ?? [],
          (c, cells) =>
            html`<tr
              data-ch=${c.id}
              @dblclick=${openPage(ed, d, `ch:${c.id}:${first}`)}
              @contextmenu=${(e: MouseEvent) =>
                openMenu(ed, e, outputMenu(ed, doc, d, def, c, first))}
            >
              ${cells}
            </tr>`,
        )}`,
  };
}

/** A group per output: the pages of the channel layout, then its connected loads. */
export function outputPages(
  ed: GuidedEditor,
  doc: Doc,
  d: Dev,
  def: BehaviorDefinition<unknown>,
  layout: ParameterPage[],
): Page[] {
  return (d.channels ?? []).map((c): Page => {
    const menu = () => outputMenu(ed, doc, d, def, c, layout[0]?.id ?? LOADS);
    return {
      key: `ch:${c.id}`,
      label: channelWords(def).group(c.label ?? c.id),
      sum: def.output ? loadsText(ed, def, c) : undefined,
      menu,
      children: [
        ...layout.map((page, i) => ({
          key: `ch:${c.id}:${page.id}`,
          label: tt(page.title),
          menu,
          body: () =>
            html`${
              i === 0 && !def.contactInputs
                ? html`<div class="g-row">
                    ${ed.text(t`Label`, c.label ?? c.id, (v) => ed.run(t`Label`, (x) => E.setChannelLabel(x, d.id, c.id, v)))}
                  </div>`
                : nothing
            }
            ${layoutItems(ed, doc, d, def, c, page.items)}
            ${i === 0 ? copyPanel(ed, doc, d, c) : nothing}
            ${
              i === 0
                ? html`<div class="g-row g-end">
                    ${
                      ed.copy?.dev === d.id && ed.copy.ch === c.id
                        ? nothing
                        : html`<button
                            class="g-btn small"
                            ?disabled=${!E.copyTargets(doc, d.id, c.id).length}
                            @click=${() => {
                              ed.copy = {
                                dev: d.id,
                                ch: c.id,
                                targets: new Set(),
                                what: {
                                  parameters: true,
                                  load: false,
                                  scenes: false,
                                },
                              };
                              ed.requestUpdate();
                            }}
                          >
                            ${t`Copy settings to…`}
                          </button>`
                    }
                  </div>`
                : nothing
            }`,
        })),
        ...(def.output
          ? [
              {
                key: `ch:${c.id}:${LOADS}`,
                label: t`Connected loads`,
                installation: true,
                sum: loadsText(ed, def, c),
                menu,
                body: () => connectedLoads(ed, doc, d, def, c),
              },
            ]
          : []),
        ...(def.contactInputs
          ? [
              {
                key: `ch:${c.id}:${KEY}`,
                label: t`Wired push-button`,
                installation: true,
                menu,
                body: () => keyPage(ed, d, c),
              },
            ]
          : []),
      ],
    };
  });
}

/**
 * The conventional push-button wired to an input, drawn as a key on the diagram: its
 * label. It belongs to the installation, like the loads of an actuator, not to the
 * parameters of the device.
 */
function keyPage(ed: GuidedEditor, d: Dev, c: Chan) {
  return html`<p class="w-info">
      ${t`The push-button wired to this input, drawn as a key on the diagram. The text written on it belongs to the installation; the name of the input does not change.`}
    </p>
    <div class="g-row">
      <label class="g-field"
        ><span>${t`Text on the key`}</span>
        <input
          placeholder=${c.label ?? c.id}
          .value=${fieldValue(c.keyLabel ?? "")}
          @change=${(e: Event) =>
            ed.run(t`Text on the key`, (x) =>
              E.setKeyLabel(
                x,
                d.id,
                c.id,
                (e.target as HTMLInputElement).value,
              ),
            )}
      /></label>
      ${ed.select(
        t`Contact of the push-button`,
        [
          ["normallyOpen", t`Normally open (closes when pressed)`],
          ["normallyClosed", t`Normally closed (opens when pressed)`],
        ],
        c.keyContact ?? "normallyOpen",
        (v) =>
          ed.run(t`Contact of the push-button`, (x) =>
            E.setKeyContact(
              x,
              d.id,
              c.id,
              v as "normallyOpen" | "normallyClosed",
            ),
          ),
      )}
    </div>`;
}

/**
 * Loads wired to an output: this level belongs to the simulation, not to the device configuration. The loads of an output are
 * wired in parallel: its relay or dimmer drives them all.
 */
function connectedLoads(
  ed: GuidedEditor,
  doc: Doc,
  d: Dev,
  def: BehaviorDefinition<unknown>,
  c: Chan,
) {
  const choices = equipmentChoices(ed, def);
  const loads = E.loadsOf(c);
  const single = def.output === "motor";
  const watts = loads
    .map((l) => {
      const p = ed.registry.equipment.get(l.type)?.parameters?.properties
        .powerW;
      const w = l.parameters?.powerW ?? p?.default;
      return typeof w === "number" ? w : null;
    })
    .filter((w): w is number => w !== null);
  const add = (type: string) =>
    ed.run(
      t`Connect a load`,
      (x) => void E.addLoad(x, d.id, c.id, newLoad(ed, x, type, c)),
    );
  return html`
    <p class="w-info">
      ${
        single
          ? t`Wiring of the installation, simulated by BusDiagram. A shutter output drives one motor.`
          : t`Wiring of the installation, simulated by BusDiagram. The loads below are wired in parallel on output ${c.label ?? c.id}: it switches them all together.`
      }
    </p>
    ${loads.map((l, i) => loadSection(ed, doc, d, c, l, i, loads.length, choices))}
    ${loads.length ? nothing : html`<p class="w-empty">${t`No load: the output is free.`}</p>`}
    <div class="g-row g-end">
      ${
        watts.length > 1
          ? html`<span class="w-total"
              >${t`Rated power of the output: ${watts.reduce((a, b) => a + b, 0)} W`}</span
            >`
          : nothing
      }
      ${
        single && loads.length
          ? nothing
          : html`<select
              class="g-add w-addload"
              data-v=""
              aria-label=${t`Connect a load to ${c.label ?? c.id}`}
              @change=${(e: Event) => {
                const sel = e.target as HTMLSelectElement;
                const v = sel.value;
                sel.value = "";
                if (v) add(v);
              }}
            >
              <option value="">+ ${t`Connect a load…`}</option>
              ${choices.map(([id, label]) => html`<option value=${id}>${label}</option>`)}
            </select>`
      }
    </div>
  `;
}

function loadSection(
  ed: GuidedEditor,
  doc: Doc,
  d: Dev,
  c: Chan,
  l: E.Load,
  i: number,
  count: number,
  choices: [string, string][],
) {
  const edef = ed.registry.equipment.get(l.type);
  const on =
    (scope: "equipment" | "equipmentState") => (k: string, v: unknown) =>
      ed.run(t`Setting`, (x) => E.setParam(x, d.id, c.id, k, v, scope, i));
  const menu = (): MenuItem[] => [
    {
      label: t`Move up`,
      run: () =>
        ed.run(t`Move a load`, (x) => E.moveLoad(x, d.id, c.id, i, -1)),
      disabled: i > 0 ? undefined : t`This is the first load.`,
    },
    {
      label: t`Move down`,
      run: () => ed.run(t`Move a load`, (x) => E.moveLoad(x, d.id, c.id, i, 1)),
      disabled: i < count - 1 ? undefined : t`This is the last load.`,
    },
    {
      label: t`Disconnect`,
      run: () =>
        ed.run(t`Disconnect a load`, (x) => E.removeLoad(x, d.id, c.id, i)),
    },
  ];
  const more = [
    ...ed.paramFields(
      edef?.parameters,
      l.parameters ?? {},
      on("equipment"),
      true,
    ),
    ...ed.paramFields(
      edef?.initialState,
      l.initialState ?? {},
      on("equipmentState"),
      true,
    ),
  ];
  return html`<fieldset
    class="w-load"
    data-load=${i}
    @contextmenu=${(e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("input, select, textarea")) return;
      openMenu(ed, e, menu());
    }}
  >
    <legend>
      ${t`Load ${i + 1}`}
      <button
        class="w-small"
        title=${t`Disconnect`}
        aria-label=${t`Disconnect load ${i + 1}`}
        @click=${() =>
          ed.run(t`Disconnect a load`, (x) => E.removeLoad(x, d.id, c.id, i))}
      >
        ×
      </button>
    </legend>
    <div class="g-row">
      ${ed.select(t`Type`, choices, l.type, (v) =>
        ed.run(t`Type of load`, (x) =>
          E.setLoadType(x, d.id, c.id, i, newLoad(ed, x, v, c)),
        ),
      )}
      ${ed.text(t`Name`, l.name ?? "", (v) =>
        ed.run(t`Name`, (x) => E.setLoadName(x, d.id, c.id, i, v)),
      )}
      ${
        edef?.heatOutput
          ? ed.select(
              t`Heated room`,
              E.roomsOf(doc).map(
                (r) => [r.id, r.name ?? r.id] as [string, string],
              ),
              l.room ?? "",
              (v) =>
                ed.run(t`Heated room`, (x) =>
                  E.setEquipmentRoom(x, d.id, c.id, v, i),
                ),
            )
          : nothing
      }
      ${ed.paramFields(edef?.parameters, l.parameters ?? {}, on("equipment"), false)}
      ${ed.paramFields(
        edef?.initialState,
        l.initialState ?? {},
        on("equipmentState"),
        false,
      )}
    </div>
    ${
      more.length
        ? html`<details class="g-more">
            <summary>${t`More options`}</summary>
            <div class="g-row">${more}</div>
          </details>`
        : nothing
    }
  </fieldset>`;
}

/**
 * Copy settings from one output to other outputs of the same behavior: categories
 * selected, balance before applying; objects and addresses of targets never changed.
 */
export function copyPanel(ed: GuidedEditor, doc: Doc, d: Dev, c: Chan) {
  const cp = ed.copy;
  if (!cp || cp.dev !== d.id || cp.ch !== c.id) return nothing;
  // Double-worded ("not used"): the output identifier distinguishes them.
  const raw = E.copyTargets(doc, d.id, c.id);
  const targets = raw.map((x) =>
    raw.filter((y) => y.dev === x.dev && y.label === x.label).length > 1
      ? { ...x, label: `${x.label} (${x.ch})` }
      : x,
  );
  const def = ed.registry.behaviors.get(d.behavior);
  const cats: [keyof E.CopyWhat, string, boolean][] = [
    ["parameters", t`Output settings`, true],
    ["load", t`Connected load (type, room, settings)`, !!def?.output],
    ["scenes", t`Scenes`, !!def?.ports.scene],
  ];
  const chosen = targets.filter((x) => cp.targets.has(`${x.dev}/${x.ch}`));
  const what = cats.filter(([k, , ok]) => ok && cp.what[k]);
  const byDev = new Map<string, typeof targets>();
  targets.forEach((x) =>
    byDev.set(x.deviceName, [...(byDev.get(x.deviceName) ?? []), x]),
  );
  return html`<fieldset class="g-gesture g-copy">
    <legend>${t`Copy settings of ${c.label ?? c.id}`}</legend>
    <div class="g-row">
      ${cats
        .filter(([, , ok]) => ok)
        .map(
          ([k, label]) =>
            html`<label class="g-check"
              ><input
                type="checkbox"
                .checked=${live(cp.what[k])}
                @change=${(e: Event) => {
                  cp.what[k] = (e.target as HTMLInputElement).checked;
                  ed.requestUpdate();
                }}
              />${label}</label
            >`,
        )}
    </div>
    <p class="g-hint">
      ${t`To (same device type) — objects and group addresses of the chosen outputs are not changed:`}
    </p>
    ${[...byDev].map(
      ([name, list]) =>
        html`<div class="g-row">
          <small class="g-cdev">${name}</small>
          ${list.map((x) => {
            const key = `${x.dev}/${x.ch}`;
            return html`<label class="g-check"
              ><input
                type="checkbox"
                .checked=${live(cp.targets.has(key))}
                @change=${(e: Event) => {
                  if ((e.target as HTMLInputElement).checked)
                    cp.targets.add(key);
                  else cp.targets.delete(key);
                  ed.requestUpdate();
                }}
              />${x.label}</label
            >`;
          })}
        </div>`,
    )}
    <p class="g-plan-line">
      ${
        chosen.length && what.length
          ? t`Summary: ${what.map(([, l]) => l.toLowerCase()).join(", ")} of ${c.label ?? c.id} → ${chosen.map((x) => x.label).join(", ")}.`
          : t`Choose at least one output and one category.`
      }
    </p>
    <div class="g-row g-end">
      <button
        class="g-btn"
        @click=${() => ((ed.copy = null), ed.requestUpdate())}
      >
        ${t`Undo`}
      </button>
      <button
        class="g-btn solid"
        ?disabled=${!chosen.length || !what.length}
        @click=${() => {
          const label = t`Settings of ${c.label ?? c.id} copied to ${chosen.length} output(s)`;
          const whatSel: E.CopyWhat = {
            parameters: cp.what.parameters,
            load: cp.what.load && !!def?.output,
            scenes: cp.what.scenes && !!def?.ports.scene,
          };
          if (
            ed.run(label, (x) =>
              E.copyChannelSettings(
                x,
                d.id,
                c.id,
                chosen.map((y) => ({ dev: y.dev, ch: y.ch })),
                whatSel,
              ),
            )
          ) {
            ed.copy = null;
            ed.notice = label;
          }
          ed.requestUpdate();
        }}
      >
        ${t`Copy`}
      </button>
    </div>
  </fieldset>`;
}

/** Required parameters of a new equipment, with usable default values. */
export function defaultEquipmentParams(
  registry: Registry,
  type: string,
  c?: Chan,
) {
  const def = registry.equipment.get(type);
  const params: Record<string, unknown> = {};
  (def?.parameters?.required ?? []).forEach((k) => {
    const p = def!.parameters!.properties[k]!;
    const fromChannel = c?.parameters?.estimatedTravelTimeMs;
    params[k] =
      p.default ??
      (k === "actualTravelTimeMs" && typeof fromChannel === "number"
        ? fromChannel
        : p.unit === "ms"
          ? 20000
          : (p.minimum ?? 1));
  });
  return Object.keys(params).length ? { parameters: params } : {};
}
