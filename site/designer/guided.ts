// Guided editor: forms derive from the scenario and registered definitions.
// Each action applies a validated, undoable edit to the JSON source.
// Views cover the installation, a device, and a group address.
// Rejected edits show a reason and restore values from the JSON source.
import { fieldValue } from "./field-value";
import { LitElement, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { live } from "lit/directives/live.js";
import type { ParamProperty, ParamSchema } from "../../src/knx/contracts";
import { SUPPORTED_DPTS, dptBits, dptName } from "../../src/knx/dpt";
import { isStandardBehavior } from "../../src/knx/registry";
import { Network } from "../../src/knx/network";
import type { Registry } from "../../src/knx/registry";
import { buildScenario } from "../../src/knx/scenario";
import type { Dev, Doc } from "./edit";
import * as E from "./edit";
import { t } from "./lang";
import { SNIPPETS, freeAddress } from "./snippets";
import type { Host, WorkspaceState } from "./workspace";
import { initialWorkspace, renderWorkspace, reveal } from "./workspace";
import * as P from "./params";
import { defaultEquipmentParams, tt } from "./params";
import type { Page } from "./params";

type Mutate = (doc: Doc) => void;
/** The installation, a device editor, and a group-address editor are the three views. A refusal appears in a banner; fields */
export interface Refusal {
  label: string;
  message: string;
  path?: string;
}

export class GuidedEditor extends LitElement implements Host {
  static override properties = {
    doc: { attribute: false },
    selected: { attribute: false },
    format: { attribute: false },
    alert: { state: true },
    confirming: { state: true },
  };

  declare doc: Doc | null;
  /** Selected device ID, "ga:1/1/1" for a group address, or null for the scenario overview. */
  declare selected: string | null;
  /** "v2", "v1", "invalid": what the editor contains. */
  declare format: "v2" | "v1" | "invalid";
  declare alert: Refusal | null;
  /** Removal pending confirmation (button key). */
  declare confirming: string | null;
  registry!: Registry;
  commit: (label: string, mutate: Mutate) => Refusal | null = () => null;
  convert: () => void = () => {};
  undo: () => void = () => {};
  redo: () => void = () => {};
  onSelect: (id: string | null) => void = () => {};
  /** Track existing devices so a newly added one opens immediately. */
  private selectAdded: Set<string> | null = null;
  /** Expanded cards (keys and outputs), preserved across renders. */
  private opened = new Set<string>();
  /** Selected parameter page of each device. */
  private pageOf = new Map<string, string>();
  /** Panels of the ETS-like workspace (contents, selections, expanded nodes). */
  ws: WorkspaceState = initialWorkspace();
  /** Last successful grouped operation; it can be undone from the banner. */
  notice: string | null = null;
  /** Editing objects associated with an address (address form). */
  private members: {
    addr: string;
    wanted: Set<string>;
    filter: string;
  } | null = null;
  /** Copy settings from one output to others. */
  copy: {
    dev: string;
    ch: string;
    targets: Set<string>;
    what: E.CopyWhat;
  } | null = null;
  /**
   * Prepare an extension device: request its required parameters before
   * the insertion, which takes place only if the result is valid (otherwise nothing is changed).
   */
  private draft: {
    line: string;
    behavior: string;
    values: Record<Scope, Record<string, unknown>>;
  } | null = null;

  constructor() {
    super();
    this.doc = null;
    this.selected = null;
    this.format = "v2";
    this.alert = null;
    this.confirming = null;
  }

  protected override createRenderRoot() {
    return this; // designer styles (designer.css)
  }

  protected override willUpdate(changed: Map<string, unknown>) {
    if (changed.has("selected")) {
      this.alert = null;
      this.confirming = null;
      this.notice = null;
      this.members = null;
      this.copy = null;
      // A device or an address selected elsewhere (diagram, problems list) is shown in its
      // panel, unless the panel already shows it or one of its channels or objects.
      const id = this.selected;
      const shown = this.ws.panels.some(
        (p) =>
          p.sel === id ||
          p.sel === `dev:${id}` ||
          p.sel?.startsWith(`obj:${id}/`) ||
          p.sel?.startsWith(`chan:${id}/`),
      );
      if (id && !shown) reveal(this, id.startsWith("ga:") ? id : `dev:${id}`);
    }
    if (changed.has("doc")) this.confirming = null;
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has("doc") && this.selectAdded && this.doc) {
      const added = this.doc.devices.find((x) => !this.selectAdded!.has(x.id));
      this.selectAdded = null;
      if (added) this.onSelect(added.id);
    }
    // The lists display the value of the scenario, including after a refusal.
    this.querySelectorAll<HTMLSelectElement>("select[data-v]").forEach((s) => {
      if (s.value !== s.dataset.v) s.value = s.dataset.v!;
    });
  }

  run(label: string, mutate: Mutate): boolean {
    const refusal = this.commit(label, mutate);
    this.alert = refusal;
    return !refusal;
  }

  refuse(label: string, message: string) {
    this.alert = { label, message };
  }

  announce(text: string) {
    this.notice = text;
    this.requestUpdate();
  }

  /** Shows a device, an address (“ga:…”), or with `objectId` a group object, in its panel. */
  go(id: string | null, objectId?: string) {
    if (!id) return;
    reveal(
      this,
      id.startsWith("ga:")
        ? id
        : objectId
          ? `obj:${id}/${objectId}`
          : `dev:${id}`,
    );
    this.onSelect(id);
  }

  // ── Views used by the workspace ──

  /** Parameters as in ETS: pages listed on the left, the selected page on the right. */
  deviceParameters(doc: Doc, d: Dev) {
    const def = this.registry.behaviors.get(d.behavior);
    const keys = def?.acceptsInputs && def.ports.input;
    const groups: {
      title: string | null;
      pages: Page[];
      add?: TemplateResult;
    }[] = [
      {
        title: null,
        pages: [
          {
            key: "general",
            label: t`General`,
            body: () => P.generalPage(this, doc, d),
          },
          ...(def?.ports.display && !def.acceptsInputs
            ? [P.displayPage(this, doc, d)]
            : []),
        ],
      },
      ...(keys
        ? [
            {
              title: t`Keys`,
              pages: P.keyPages(this, doc, d),
              add: html`<button
                class="w-padd"
                @click=${() => this.run(t`Key`, (x) => void E.addKey(x, d.id))}
              >
                + ${t`Add a key`}
              </button>`,
            },
          ]
        : []),
      ...(def?.output
        ? [
            {
              title: t`Outputs`,
              pages: P.outputPages(this, doc, d, def),
              add: html`<button
                class="w-padd"
                @click=${() => P.addOutput(this, d, def)}
              >
                + ${t`Add an output`}
              </button>`,
            },
          ]
        : []),
    ];
    const ports = def ? P.portsPage(this, doc, d, def) : null;
    if (ports) groups.push({ title: null, pages: [ports] });
    const all = groups.flatMap((g) => g.pages);
    const cur = all.find((p) => p.key === this.pageOf.get(d.id)) ?? all[0]!;
    const open = (key: string) => {
      this.pageOf.set(d.id, key);
      this.requestUpdate();
    };
    const g0 = (p: Page) =>
      groups.find((g) => g.pages.includes(p))?.title === t`Outputs`
        ? t`Output ${p.label}`
        : p.label;
    // As in ETS: a flat list of pages on the left, the parameters of the page on the
    // right, one per row, with the label on the left and the value on the right.
    return html`<div class="w-params">
      <nav class="w-pmenu" aria-label=${t`Parameter pages`}>
        ${groups.map(
          (g) =>
            html`${g.pages.map(
              (p) =>
                html`<button
                  class="w-pitem"
                  aria-current=${p === cur ? "page" : "false"}
                  title=${p.sum ?? p.label}
                  @click=${() => open(p.key)}
                >
                  ${g.title === t`Outputs` ? t`Output ${p.label}` : p.label}
                </button>`,
            )}
            ${g.add ?? nothing}`,
        )}
      </nav>
      <div class="w-ppage" data-page=${cur.key}>
        ${
          cur.key === "general"
            ? cur.body()
            : html`<section class="g-sec">
                <h3>
                  ${g0(cur)}
                  ${cur.sum ? html`<small>${cur.sum}</small>` : nothing}
                </h3>
                ${cur.body()}
              </section>`
        }
      </div>
    </div>`;
  }

  gaProperties(doc: Doc, g: E.Ga) {
    return this.gaView(doc, g);
  }

  topologySettings(doc: Doc) {
    return this.linesSection(doc);
  }

  lineSettings(_doc: Doc, l: Doc["lines"][number]) {
    const line = String(l.address);
    return html`<div class="w-bar w-linebar">
        <label class="g-field"
          ><span>${t`Name of line ${line}`}</span>
          <input
            .value=${fieldValue(String(l.name ?? ""))}
            @change=${(e: Event) =>
              this.run(t`Line name`, (d) =>
                E.setLineName(
                  d,
                  line,
                  (e.target as HTMLInputElement).value.trim(),
                ),
              )}
        /></label>
      </div>
      ${this.lineExtension(l, line)}`;
  }

  installation(doc: Doc) {
    return this.home(doc);
  }

  override render() {
    if (this.format === "invalid")
      return html`<p class="g-note">
        ${t`The JSON has a syntax error: fix it in the JSON tab (errors are listed below) to resume guided editing.`}
      </p>`;
    if (this.format === "v1")
      return html`<p class="g-note">
        ${t`This scenario uses format 1. The guided designer works on format 2:`}
        <button class="g-btn" @click=${() => this.convert()}>
          ${t`Convert to format 2`}
        </button>
      </p>`;
    const doc = this.doc;
    if (!doc) return nothing;
    return html`
      ${
        this.notice
          ? html`<div class="g-notice" role="status">
              <span>${this.notice}</span>
              <button
                class="g-btn"
                @click=${() => {
                  this.notice = null;
                  this.undo();
                }}
              >
                ${t`Undo`}
              </button>
              <button
                class="g-x"
                aria-label=${t`Close`}
                @click=${() => ((this.notice = null), this.requestUpdate())}
              >
                ×
              </button>
            </div>`
          : nothing
      }
      ${
        this.alert
          ? html`<div class="g-alert" role="alert">
              <div>
                <b>${t`Change rejected`} — ${this.alert.label}</b>
                <p>${this.alert.message}</p>
                <small
                  >${t`Nothing was changed: the form shows the current scenario again.`}</small
                >
              </div>
              <button
                class="g-x"
                aria-label=${t`Close`}
                @click=${() => (this.alert = null)}
              >
                ×
              </button>
            </div>`
          : nothing
      }
      ${this.draft ? this.draftView() : nothing} ${renderWorkspace(this, doc)}
    `;
  }

  // ── View 1: installation ──

  /** Required parameters of an extension device: device, output, equipment. */
  private draftNeeds(behavior: string) {
    const def = this.registry.behaviors.get(behavior);
    const eq = def?.output
      ? equipmentFor(this.registry, def.output)
      : undefined;
    const edef = eq ? this.registry.equipment.get(eq) : undefined;
    const req = (sc: ParamSchema | undefined) =>
      (sc?.required ?? []).map((k) => [k, sc!.properties[k]!] as const);
    // Parameters and initial states are separate staves: each has its own form.
    return {
      device: req(def?.parameters),
      channel: def?.output ? req(def.channelParameters) : [],
      channelState: def?.output ? req(def.channelInitialState) : [],
      equipment: req(edef?.parameters),
      equipmentState: req(edef?.initialState),
    };
  }

  private draftView() {
    const dr = this.draft!;
    const needs = this.draftNeeds(dr.behavior);
    const group = (scope: Scope, title: string) =>
      needs[scope].length
        ? html`<fieldset class="g-gesture">
            <legend>${title}</legend>
            <div class="g-row">
              ${needs[scope].map(([k, p]) =>
                this.paramField(
                  k,
                  p,
                  dr.values[scope][k],
                  (v) => {
                    if (v === undefined) delete dr.values[scope][k];
                    else dr.values[scope][k] = v;
                    this.requestUpdate();
                  },
                  true,
                ),
              )}
            </div>
          </fieldset>`
        : nothing;
    return html`<section class="g-sec g-draft">
      <h3>${t`New device`} <code>${dr.behavior}</code></h3>
      <p class="g-hint">
        ${t`This behaviour requires settings (*): fill them in, then add the device on line ${dr.line}.`}
      </p>
      ${group("device", t`Device settings`)}
      ${group("channel", t`Output settings`)}
      ${group("channelState", t`Output initial state`)}
      ${group("equipment", t`Load settings`)}
      ${group("equipmentState", t`Load initial state`)}
      <div class="g-row g-end">
        <button
          class="g-btn"
          @click=${() => ((this.draft = null), this.requestUpdate())}
        >
          ${t`Undo`}
        </button>
        <button
          class="g-btn solid"
          @click=${() => {
            const d0 = this.draft!;
            this.selectAdded = null;
            const ok = this.run(t`Adding a device`, (d) => {
              this.selectAdded = new Set(d.devices.map((x) => x.id));
              addGeneric(d, d0.behavior, this.registry, d0.line, d0.values);
            });
            if (ok) this.draft = null;
            else this.selectAdded = null;
            this.requestUpdate();
          }}
        >
          ${t`Add device`}
        </button>
      </div>
    </section>`;
  }

  private home(doc: Doc) {
    return html`
      <section class="g-sec">
        <h3>${t`Title and instructions`}</h3>
        ${this.text(t`Title`, doc.title ?? "", (v) =>
          this.run(t`Title`, (d) => (v ? (d.title = v) : delete d.title)),
        )}
        ${this.text(
          t`Instructions shown above the diagram`,
          doc.description ?? "",
          (v) =>
            this.run(t`Instructions`, (d) =>
              v ? (d.description = v) : delete d.description,
            ),
          true,
        )}
      </section>
      ${this.clockSection(doc)} ${this.roomsSection(doc)}
    `;
  }

  /** Simulated clock used by clock masters, time switches, and time windows. */
  private clockSection(doc: Doc) {
    const clock = doc.clock as { start?: string; speed?: number } | undefined;
    return html`<section class="g-sec">
      <h3>${t`Simulated clock`}</h3>
      ${
        clock
          ? html`<div class="g-row">
                ${this.text(
                  t`Start (YYYY-MM-DDTHH:MM)`,
                  String(clock.start ?? ""),
                  (v) => this.run(t`Simulated clock`, (d) => E.setClock(d, v)),
                )}
                ${this.text(
                  t`Speed (clock seconds per second)`,
                  String(clock.speed ?? 1),
                  (v) =>
                    this.run(t`Simulated clock`, (d) =>
                      E.setClock(d, String(clock.start), Number(v)),
                    ),
                  false,
                  "narrow",
                )}
              </div>
              <button
                class="g-btn danger small"
                @click=${() =>
                  this.run(t`Simulated clock`, (d) => E.setClock(d, null))}
              >
                ${t`Remove the clock`}
              </button>`
          : html`<p class="g-hint">
                ${t`Clock masters, time switches, and time windows need a simulated clock.`}
              </p>
              <button
                class="g-btn"
                @click=${() =>
                  this.run(t`Simulated clock`, (d) =>
                    E.setClock(d, "2026-01-05T06:55:00", 60),
                  )}
              >
                + ${t`Add a simulated clock`}
              </button>`
      }
    </section>`;
  }

  /** Rooms: the thermal model shared by thermostats, contacts, and radiators. */
  private roomsSection(doc: Doc) {
    const rooms = E.roomsOf(doc);
    const numField = (
      label: string,
      r: E.RoomDoc,
      key: "temperatureC" | "outsideTemperatureC",
      def: number,
    ) =>
      this.text(
        label,
        String(r[key] ?? def),
        (v) => {
          const n = Number(v.replace(",", "."));
          this.run(label, (x) =>
            E.setRoomField(
              x,
              r.id,
              key,
              v === "" || !Number.isFinite(n)
                ? v === ""
                  ? undefined
                  : NaN
                : n,
            ),
          );
        },
        false,
        "narrow",
      );
    return html`<section class="g-sec">
      <h3>${t`Rooms (heating)`}</h3>
      <p class="g-hint">
        ${t`A room's temperature evolves with its radiators, the outside temperature and its window. Its thermostats and window contacts measure it.`}
      </p>
      ${rooms.map((r) =>
        this.card(
          `room:${r.id}`,
          html`<b>${r.name ?? r.id}</b
            ><span class="g-sum"
              >${t`${String(r.temperatureC ?? 20)} °C at start · outside ${String(r.outsideTemperatureC ?? 5)} °C`}</span
            >`,
          () => html`
            <div class="g-row">
              ${this.text(t`Name`, r.name ?? r.id, (v) => this.run(t`Name`, (x) => E.setRoomField(x, r.id, "name", v)))}
              ${numField(t`Initial temperature (°C)`, r, "temperatureC", 20)}
              ${numField(t`Outside temperature (°C)`, r, "outsideTemperatureC", 5)}
              <label class="g-check"
                ><input
                  type="checkbox"
                  .checked=${live(r.windowOpen === true)}
                  @change=${(e: Event) => this.run(t`Window`, (x) => E.setRoomField(x, r.id, "windowOpen", (e.target as HTMLInputElement).checked))}
                />${t`Window open at start`}</label
              >
            </div>
            <div class="g-row g-end">
              ${this.dangerButton(
                `room:${r.id}`,
                t`Delete room`,
                t`Delete room ${r.name ?? r.id}?`,
                () => this.run(t`Deletion`, (x) => E.removeRoom(x, r.id)),
                true,
              )}
            </div>
          `,
        ),
      )}
      <button
        class="g-btn"
        @click=${() => this.run(t`Room`, (x) => void E.addRoom(x))}
      >
        + ${t`Add a room`}
      </button>
    </section>`;
  }

  private linesSection(doc: Doc) {
    const lv = E.levelsOf(doc);
    const topo = doc.topology ?? {};
    const areas = E.areasOf(doc);
    const byPlace = new Map<string, Dev[]>();
    doc.devices.forEach((d) => {
      const k = E.lineOf(d) ?? "";
      byPlace.set(k, [...(byPlace.get(k) ?? []), d]);
    });
    const at = (k: string) => byPlace.get(k) ?? [];
    const declared = new Set([
      "IP",
      ...(lv.backbone ? ["0.0"] : []),
      ...lv.mainLines.map((a) => `${a}.0`),
      ...doc.lines.map((l) => String(l.address)),
    ]);
    const lost = doc.devices.filter((d) => !declared.has(E.lineOf(d) ?? ""));
    const autoBackbone = areas.length > 1 && lv.ip !== "lineCouplers";
    const autoMain =
      lv.ip !== "lineCouplers" &&
      areas.every(
        (a) =>
          lv.backbone ||
          lv.ip === "areaCouplers" ||
          doc.lines.filter((l) => String(l.address).startsWith(`${a}.`))
            .length > 1,
      );
    const level = (
      key: string,
      tag: string,
      title: string,
      cls: string,
      addTo: string | null,
    ) =>
      html`<div class="g-line ${cls}">
        <div class="g-line-head">
          <code class="g-tag">${tag}</code> <b>${title}</b>
        </div>
        ${this.deviceList(at(key))} ${addTo ? this.addDevice(addTo) : nothing}
      </div>`;
    return html`<section class="g-sec">
        <h3>${t`Topology`}</h3>
        <p class="g-hint">
          ${t`Areas, lines and levels of the installation. Click a device — here or in the diagram — to open its sheet.`}
        </p>
        <div class="g-topo">
          ${this.select(
            t`IP network`,
            [
              ["", t`none (TP installation only)`],
              [
                "areaCouplers",
                t`KNXnet/IP routers as area couplers (Z.0.0): IP acts as the backbone`,
              ],
              [
                "lineCouplers",
                t`KNXnet/IP routers as line couplers (Z.L.0): IP acts as main lines and backbone`,
              ],
            ],
            lv.ip ?? "",
            (v) =>
              this.run(t`IP network`, (d) =>
                E.setIpRole(d, (v || null) as E.IpRole | null),
              ),
          )}
          <label
            class="g-check"
            title=${autoBackbone ? t`Always present: the installation has several areas.` : ""}
          >
            <input
              type="checkbox"
              .checked=${live(lv.backbone || (autoBackbone && lv.ip !== "areaCouplers"))}
              ?disabled=${autoBackbone || lv.ip !== null}
              @change=${(e: Event) =>
                this.run(t`Backbone`, (d) =>
                  E.setTopologyFlag(
                    d,
                    "backbone",
                    (e.target as HTMLInputElement).checked,
                  ),
                )}
            />
            ${t`Backbone 0.0 and area couplers`}
            ${
              lv.ip === "areaCouplers"
                ? html`<small>(${t`the IP network acts as it`})</small>`
                : autoBackbone
                  ? html`<small>(${t`several areas`})</small>`
                  : nothing
            }
          </label>
          <label
            class="g-check"
            title=${autoMain ? t`Always present: several lines per area, or a backbone.` : ""}
          >
            <input
              type="checkbox"
              .checked=${live(lv.mainLines.length === areas.length && lv.ip !== "lineCouplers")}
              ?disabled=${autoMain || lv.ip === "lineCouplers"}
              @change=${(e: Event) =>
                this.run(t`Main lines`, (d) =>
                  E.setTopologyFlag(
                    d,
                    "mainLines",
                    (e.target as HTMLInputElement).checked,
                  ),
                )}
            />
            ${t`Main lines Z.0 and line couplers`}
            ${autoMain && lv.ip !== "lineCouplers" ? html`<small>(${t`required by the topology`})</small>` : nothing}
          </label>
          ${
            topo.ip === "lineCouplers"
              ? html`<p class="g-hint">
                  ${t`With routers as line couplers, the IP network replaces main lines and backbone.`}
                </p>`
              : nothing
          }
        </div>
        ${
          lv.ip
            ? html`<div class="g-line g-ip">
                <div class="g-line-head">
                  <code class="g-tag">IP</code>
                  <b>${t`IP network · KNXnet/IP`}</b>
                </div>
                ${this.deviceList(at("IP"))}
                <button
                  class="g-btn"
                  @click=${() => {
                    const ok = this.run(t`Supervisor`, (d) => {
                      this.selectAdded = new Set(d.devices.map((x) => x.id));
                      Object.assign(
                        d,
                        SNIPPETS.find((x) => x.id === "sup")!.apply(d),
                      );
                    });
                    if (!ok) this.selectAdded = null;
                  }}
                >
                  + ${t`Supervisor on the IP network`}
                </button>
              </div>`
            : nothing
        }
        ${lv.backbone ? level("0.0", "0.0", t`Backbone`, "g-level", "0.0") : nothing}
        ${areas.map((a) => {
          const name =
            (topo.areas ?? []).find((x) => x.address === a)?.name ?? "";
          const zoneLines = doc.lines.filter((l) =>
            String(l.address).startsWith(`${a}.`),
          );
          const count = doc.devices.filter(
            (d) =>
              E.lineOf(d) !== "IP" && (E.lineOf(d) ?? "").startsWith(`${a}.`),
          ).length;
          return html`<div class="g-zone">
            <div class="g-line-head">
              <code class="g-tag">${t`Area`} ${a}</code>
              <input
                class="g-inline"
                aria-label=${t`Name of area ${a}`}
                placeholder=${t`area name`}
                .value=${fieldValue(name)}
                @change=${(e: Event) =>
                  this.run(t`Area name`, (d) =>
                    E.setAreaName(
                      d,
                      a,
                      (e.target as HTMLInputElement).value.trim(),
                    ),
                  )}
              />
              ${
                areas.length > 1
                  ? this.dangerButton(
                      `area:${a}`,
                      t`Delete area`,
                      count
                        ? t`Delete area ${a}, its lines and its ${count} device(s)?`
                        : t`Delete area ${a} and its lines?`,
                      () =>
                        this.run(
                          t`Deleting area ${a}`,
                          (d) => void E.removeArea(d, a),
                        ),
                      true,
                    )
                  : nothing
              }
            </div>
            ${
              lv.mainLines.includes(a)
                ? level(`${a}.0`, `${a}.0`, t`Main line`, "g-level", `${a}.0`)
                : nothing
            }
            ${zoneLines.map((l) => this.lineBlock(doc, l, at(String(l.address))))}
            <button
              class="g-btn"
              @click=${() => this.run(t`New line`, (d) => void E.addLine(d, a))}
            >
              + ${t`New line in area ${a}`}
            </button>
          </div>`;
        })}
        ${
          lost.length
            ? html`<div class="g-line">
                <div class="g-line-head">
                  <b class="g-warn">${t`Devices outside the topology`}</b>
                </div>
                ${this.deviceList(lost)}
              </div>`
            : nothing
        }
        <div class="g-row g-end">
          <button
            class="g-btn"
            @click=${() => this.run(t`New area`, (d) => void E.addArea(d))}
          >
            + ${t`New area`}
          </button>
        </div>
      </section>
      ${this.couplersSection(doc)}`;
  }

  /**
   * Drop on a line: a catalog entry adds a device there; a device of another line moves
   * there with a free address of that line (objects and addresses are kept).
   */
  private lineDrop(line: string) {
    const kind = (e: DragEvent) =>
      e.dataTransfer?.types.includes("application/x-bd-device")
        ? "device"
        : e.dataTransfer?.types.includes("application/x-bd-move")
          ? "move"
          : null;
    const box = (e: DragEvent) => e.currentTarget as HTMLElement;
    return {
      over: (e: DragEvent) => {
        if (!kind(e)) return;
        e.preventDefault();
        box(e).classList.add("drop-ok");
      },
      leave: (e: DragEvent) => box(e).classList.remove("drop-ok"),
      drop: (e: DragEvent) => {
        box(e).classList.remove("drop-ok");
        const k = kind(e);
        if (!k) return;
        e.preventDefault();
        if (k === "device") {
          const v = e.dataTransfer!.getData("application/x-bd-device");
          if (v) this.insertDevice(line, v);
          return;
        }
        const id = e.dataTransfer!.getData("application/x-bd-move");
        const before = this.doc?.devices.find((d) => d.id === id);
        if (!before || before.address?.startsWith(`${line}.`)) return;
        const from = before.address;
        if (this.run(t`Moving a device`, (d) => E.moveDevice(d, id, line))) {
          const after = this.doc?.devices.find((d) => d.id === id);
          this.notice = t`${before.name ?? id} moved from ${from ?? "—"} to ${after?.address ?? "—"}; its objects and addresses are kept.`;
          this.requestUpdate();
        }
      },
    };
  }

  private lineBlock(doc: Doc, l: Doc["lines"][number], devs: Dev[]) {
    const line = String(l.address);
    const drop = this.lineDrop(line);
    return html`<div
      class="g-line"
      @dragover=${drop.over}
      @dragleave=${drop.leave}
      @drop=${drop.drop}
    >
      <div class="g-line-head">
        <code class="g-tag">${t`Line`} ${line}</code>
        <input
          class="g-inline"
          aria-label=${t`Name of line ${line}`}
          placeholder=${t`line name`}
          .value=${fieldValue(String(l.name ?? ""))}
          @change=${(e: Event) =>
            this.run(t`Line name`, (d) =>
              E.setLineName(
                d,
                line,
                (e.target as HTMLInputElement).value.trim(),
              ),
            )}
        />
        ${
          doc.lines.length > 1
            ? this.dangerButton(
                `line:${line}`,
                t`Delete line`,
                devs.length
                  ? devs.length > 1
                    ? t`Delete the line and its ${devs.length} devices?`
                    : t`Delete the line and its device?`
                  : t`Delete the line?`,
                () =>
                  this.run(
                    t`Deleting line ${line}`,
                    (d) => void E.removeLine(d, line),
                  ),
                true,
              )
            : html`<button
                class="g-btn danger small"
                disabled
                title=${t`An installation keeps at least one line: add another one before deleting this one.`}
              >
                ${t`Delete line`}
              </button>`
        }
      </div>
      ${this.lineExtension(l, line)} ${this.deviceList(devs)}
      ${this.addDevice(line)}
    </div>`;
  }

  /** Power supply selector of a line or of its downstream segment. */
  private psuSelect(
    label: string,
    psu: { currentMa?: number } | undefined,
    line: string,
    downstream: boolean,
  ) {
    const currents = [160, 320, 640, 1280];
    const cur = psu ? String(psu.currentMa ?? "") : "none";
    return this.select(
      label,
      [
        ["none", t`not shown`],
        ["", t`shown, current not given`],
        ...currents.map((c) => [String(c), `${c} mA`] as [string, string]),
      ],
      cur,
      (v) =>
        this.run(label, (d) =>
          E.setLinePowerSupply(
            d,
            line,
            v === "none" ? null : v ? Number(v) : 0,
            downstream,
          ),
        ),
    );
  }

  private lineExtension(l: Doc["lines"][number], line: string) {
    const ext = l.extension as
      | {
          address?: string;
          mode?: string;
          powerSupply?: { currentMa?: number };
        }
      | undefined;
    const lp = (l as { powerSupply?: { currentMa?: number } }).powerSupply;
    return html`<div class="g-row g-ext">
      ${this.psuSelect(t`Power supply`, lp, line, false)}
      ${this.select(
        t`Line extension`,
        [
          ["", t`none`],
          ["repeater", t`Line repeater`],
          ["segmentCoupler", t`Segment coupler`],
        ],
        ext ? (ext.mode ?? "repeater") : "",
        (v) =>
          this.run(t`Line extension`, (d) =>
            E.setLineExtension(d, line, (v || null) as E.ExtensionMode | null),
          ),
      )}
      ${
        ext
          ? this.text(
              t`Extension address`,
              String(ext.address ?? ""),
              (v) =>
                this.run(t`Extension address`, (d) =>
                  E.setLineExtensionAddress(d, line, v),
                ),
              false,
              "narrow",
            )
          : nothing
      }
      ${ext ? this.psuSelect(t`Power supply of the segment`, ext.powerSupply, line, true) : nothing}
      <p class="g-hint">
        ${
          ext
            ? t`The extension connects a second segment to the main segment of the line. Place devices behind it from their own form. A line has at most one extension in this model; real installations allow up to three repeaters, each connected to the main segment, never in series.`
            : t`Add a line repeater or a segment coupler to show a second segment on this line.`
        }
      </p>
    </div>`;
  }

  /** Couplers derived from topology: filtering table (derived from the project) and parameters per direction. */
  private couplersSection(doc: Doc) {
    let net: Network | null = null;
    try {
      net = new Network(buildScenario(doc, this.registry, t), undefined, t);
    } catch {
      net = null;
    }
    const key = "couplers";
    const modes: [string, string][] = [
      ["filter", t`filter (filter table)`],
      ["route", t`route everything`],
      ["block", t`block everything`],
    ];
    const list = net?.topology.couplers ?? [];
    return html`<details
      class="g-sec g-fold"
      ?open=${this.opened.has(key)}
      @toggle=${(e: Event) => {
        if ((e.target as HTMLDetailsElement).open) this.opened.add(key);
        else this.opened.delete(key);
        this.requestUpdate();
      }}
    >
      <summary>${t`Couplers and filter tables`} (${list.length})</summary>
      ${
        !net
          ? html`<p class="g-hint">
              ${t`Tables unavailable while the scenario contains errors.`}
            </p>`
          : !list.length
            ? html`<p class="g-empty">
                ${t`No coupler: a single line, without main line or IP network.`}
              </p>`
            : html`<p class="g-hint">
                  ${t`As in the project, a coupler's table lists the addresses used on both sides. “Route everything” is for diagnosis, or for a visualization not declared in the project.`}
                </p>
                ${list.map((c) => {
                  const table = net!.filterTable(c);
                  const rep = net!.isRepeater(c);
                  return html`<div class="g-coupler">
                    <div class="g-line-head">
                      <code class="g-tag">${c.address}</code>
                      <b>${net!.couplerName(c)}</b>
                    </div>
                    <p class="g-hint">
                      ${
                        rep
                          ? t`Repeater: copies every telegram, without a filter table.`
                          : table!.length
                            ? html`${t`Filter table`} :
                                <code>${table!.join(" · ")}</code>`
                            : t`Empty filter table: no address is used on both sides.`
                      }
                    </p>
                    ${
                      rep || c.kind === "extension"
                        ? nothing
                        : html`<div class="g-row">
                            ${(["down", "up"] as const).map((dir) =>
                              this.select(
                                dir === "down"
                                  ? t`Downwards (primary → secondary line)`
                                  : t`Upwards (secondary → primary line)`,
                                modes,
                                net!.routing(c, dir === "down" ? "B" : "A"),
                                (v) =>
                                  this.run(
                                    t`Parameter of coupler ${c.address}`,
                                    (d) =>
                                      E.setCouplerRouting(
                                        d,
                                        c.address,
                                        dir,
                                        v as E.Routing,
                                      ),
                                  ),
                              ),
                            )}
                          </div>`
                    }
                  </div>`;
                })}`
      }
    </details>`;
  }

  private deviceList(devs: Dev[]) {
    if (!devs.length)
      return html`<p class="g-empty">${t`No device on this line.`}</p>`;
    return html`<ul class="g-list">
      ${devs.map(
        (d) =>
          html`<li class="g-dragrow">
            <span
              class="g-grip"
              draggable="true"
              title=${t`Drag the device onto another line to move it`}
              @dragstart=${(e: DragEvent) => {
                e.dataTransfer?.setData("application/x-bd-move", d.id);
                if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
              }}
              >⠿</span
            >
            <button class="g-item" @click=${() => this.go(d.id)}>
              <code>${d.address ?? "IP"}</code>
              <b>${d.name ?? d.id}</b>
              <small>${this.typeLabel(d)}</small>
              <span class="g-chev">›</span>
            </button>
          </li>`,
      )}
    </ul>`;
  }

  /**
   * Insert a device on a line: `snippet:<id>` for a template, `ext:<behavior>` for an
   * extension. An extension with required values opens a draft form first.
   */
  insertDevice(line: string, v: string, downstream = false) {
    if (v.startsWith("ext:")) {
      const needs = this.draftNeeds(v.slice(4));
      if (Object.values(needs).some((n) => n.length)) {
        // Required values use defaults when available; otherwise the user must enter them.
        const pre = (list: typeof needs.device) =>
          Object.fromEntries(
            list
              .filter(([, p]) => p.default !== undefined)
              .map(([k, p]) => [k, p.default]),
          );
        this.draft = {
          line,
          behavior: v.slice(4),
          values: {
            device: pre(needs.device),
            channel: pre(needs.channel),
            channelState: pre(needs.channelState),
            equipment: pre(needs.equipment),
            equipmentState: pre(needs.equipmentState),
          },
        };
        this.requestUpdate();
        this.updateComplete.then(() =>
          this.querySelector(".g-draft")?.scrollIntoView({ block: "nearest" }),
        );
        return;
      }
    }
    const ok = this.run(t`Adding a device`, (d) => {
      // Statement on the actual document (editor's), not on the current display.
      this.selectAdded = new Set(d.devices.map((x) => x.id));
      if (v.startsWith("snippet:"))
        Object.assign(
          d,
          SNIPPETS.find((x) => x.id === v.slice(8))!.apply(d, { line }),
        );
      else addGeneric(d, v.slice(4), this.registry, line);
      const added = d.devices.filter((x) => !this.selectAdded!.has(x.id));
      // Group objects in the order of their numbers, as edits keep them.
      added.forEach(E.sortObjects);
      // Dropped on the segment behind a line extension.
      if (downstream) added.forEach((x) => E.setDownstream(d, x.id, true));
    });
    if (!ok) this.selectAdded = null;
    this.requestUpdate();
  }

  private addDevice(line: string) {
    const extensions = [...this.registry.behaviors].filter(
      ([id]) => !isStandardBehavior(id),
    );
    return html`<select
      class="g-add"
      data-v=""
      aria-label=${t`Add a device on line ${line}`}
      @change=${(e: Event) => {
        const sel = e.target as HTMLSelectElement;
        const v = sel.value;
        sel.value = "";
        if (v) this.insertDevice(line, v);
      }}
    >
      <option value="">+ ${t`Add a device…`}</option>
      ${SNIPPETS.filter((s) => !["ga", "line"].includes(s.id)).map((s) => html`<option value="snippet:${s.id}" title=${s.hint}>${s.label}</option>`)}
      ${
        extensions.length
          ? html`<optgroup label=${t`Loaded extensions`}>
              ${extensions.map(([id, d]) => html`<option value="ext:${id}">${id}${d.description ? ` — ${tt(d.description)}` : ""}</option>`)}
            </optgroup>`
          : nothing
      }
    </select>`;
  }

  // ── View 2: device ──

  typeLabel(d: Dev): string {
    const n = (d.channels ?? []).length;
    const k = (d.buttons ?? []).length;
    switch (d.behavior) {
      case "pushButton/v1":
        return k === 1 ? t`Push-button · 1 key` : t`Push-button · ${k} keys`;
      case "switchActuator/v1":
        return n === 1
          ? t`Switch actuator · 1 output`
          : t`Switch actuator · ${n} outputs`;
      case "shutterActuator/v1":
        return n === 1
          ? t`Shutter actuator · 1 output`
          : t`Shutter actuator · ${n} outputs`;
      case "display/v1":
        return d.kind === "supervisor" ? t`IP supervisor` : t`Display`;
      case "dimmerActuator/v1":
        return n === 1 ? t`Dimmer · 1 output` : t`Dimmer · ${n} outputs`;
      case "daliGateway/v1":
        return n === 1
          ? t`DALI gateway · 1 group`
          : t`DALI gateway · ${n} groups`;
      case "usbInterface/v1":
        return t`USB interface`;
      case "presenceDetector/v1":
        return t`Presence detector`;
      case "roomThermostat/v1":
        return t`Room thermostat`;
      case "heatingActuator/v1":
        return n === 1
          ? t`Heating actuator · 1 output`
          : t`Heating actuator · ${n} outputs`;
      case "windowContact/v1":
        return t`Window contact`;
      case "temperatureSensor/v1":
        return t`Temperature sensor`;
      case "passive/v1":
        return t`Device without logic`;
      default:
        return t`Extension ${d.behavior}`;
    }
  }

  /** Foldable map: a summary of a line, detail at click. */
  private card(key: string, head: TemplateResult, body: () => TemplateResult) {
    const open = this.opened.has(key);
    return html`<details
      class="g-card"
      ?open=${open}
      @toggle=${(e: Event) => {
        const o = (e.target as HTMLDetailsElement).open;
        if (o === this.opened.has(key)) return;
        if (o) this.opened.add(key);
        else this.opened.delete(key);
        this.requestUpdate();
      }}
    >
      <summary>${head}</summary>
      ${open ? html`<div class="g-card-body">${body()}</div>` : nothing}
    </details>`;
  }

  // ── Touches ───────────────────────────────────────────────────────────────

  // ── Afficheur ─────────────────────────────────────────────────────────────

  // ── Actuator outputs ──────────────────────────────────────────────────

  // ── Expert mode: object table ────────────────────────────────────────

  // ── View 3: group address ──

  private gaView(doc: Doc, g: E.Ga) {
    const u = E.gaUsage(doc, g.address);
    const allowed = E.gaAllowedDpts(doc, g.address);
    const current = g.dpt ?? E.gaDpt(doc, g.address) ?? "";
    const size =
      allowed.length && allowed.length < SUPPORTED_DPTS.length
        ? sizeLabel(dptBits(allowed[0]!))
        : "";
    const list = (items: E.Usage[], none: string) =>
      items.length
        ? html`<ul class="g-list">
            ${items.map(
              (x) =>
                html`<li>
                  <button
                    class="g-item"
                    title=${t`Open ${x.objectName} in ${x.deviceName}`}
                    @click=${() => this.go(x.deviceId, x.objectId)}
                  >
                    <b>${x.deviceName}</b><small>${x.objectName}</small
                    ><span class="g-chev">›</span>
                  </button>
                </li>`,
            )}
          </ul>`
        : html`<p class="g-empty">${none}</p>`;
    return html`<section class="g-sec">
        <h3>${g.address} <small>${g.name ?? ""}</small></h3>
        <div class="g-row">
          ${this.text(
            t`Address`,
            g.address,
            (v) => {
              if (
                this.run(t`Group address`, (x) => E.renameGa(x, g.address, v))
              )
                this.go(`ga:${v}`);
            },
            false,
            "narrow",
          )}
          ${this.text(t`Name`, g.name ?? "", (v) => this.run(t`Name`, (x) => E.setGaField(x, g.address, "name", v)))}
        </div>
        <label class="g-field"
          ><span>${t`Data type (DPT)`}</span>
          <select
            data-v=${current}
            @change=${(e: Event) => this.run(t`DPT`, (x) => E.setGaField(x, g.address, "dpt", (e.target as HTMLSelectElement).value))}
          >
            ${current ? nothing : html`<option value="">—</option>`}
            ${SUPPORTED_DPTS.map(
              (x) =>
                html`<option
                  value=${x}
                  ?selected=${x === current}
                  ?disabled=${!allowed.includes(x)}
                >
                  ${dptName(x, t)}
                </option>`,
            )}
          </select>
        </label>
        ${
          size
            ? html`<p class="g-hint">
                ${t`Only ${size} DPTs are offered: that is the size of the objects linked to this address.`}
              </p>`
            : nothing
        }
      </section>
      <section class="g-sec">
        <h3>${t`Who sends on this address`}</h3>
        ${list(u.senders, u.responders.length ? t`No spontaneous transmission (T flag and object's first address): the address is only read on request.` : t`Nobody: no object sends on this address (T flag and first address of the object).`)}
        ${
          u.responders.length
            ? html`<h3>${t`Who answers reads (R flag)`}</h3>
                ${list(u.responders, "")}`
            : nothing
        }
        <h3>${t`Who listens to this address`}</h3>
        ${list(u.receivers, u.updaters.length ? t`No object takes writes (W flag); read responses are taken into account below.` : t`Nobody: no object listens to this address (W flag).`)}
        ${
          u.updaters.length
            ? html`<h3>${t`Who takes responses (U flag)`}</h3>
                ${list(u.updaters, "")}`
            : nothing
        }
      </section>
      ${this.membersSection(doc, g.address)}
      <section class="g-sec g-danger">
        ${this.dangerButton(
          `ga:${g.address}`,
          t`Delete address`,
          (() => {
            const users = E.gaMemberCandidates(doc, g.address).filter(
              (c) => c.member,
            );
            const devs = new Set(users.map((c) => c.dev)).size;
            return users.length
              ? t`Delete ${g.address} and remove it from ${users.length} object(s) on ${devs} device(s): ${users.map((c) => `${c.deviceName} · ${c.objectName}`).join(", ")}?`
              : t`Delete ${g.address}? No object uses it.`;
          })(),
          () => {
            if (
              this.run(
                t`Deleting the address`,
                (x) => void E.removeGa(x, g.address),
              )
            )
              this.go(null);
          },
        )}
      </section>`;
  }

  /**
   * Show address associations as a checklist grouped by device, with a
   * summary of additions and removals before one undoable operation.
   */
  private membersSection(doc: Doc, addr: string) {
    const m = this.members?.addr === addr ? this.members : null;
    const all = E.gaMemberCandidates(doc, addr);
    if (!m)
      return html`<section class="g-sec">
        <button
          class="g-btn"
          @click=${() => {
            this.members = {
              addr,
              wanted: new Set(
                all.filter((c) => c.member).map((c) => `${c.dev}/${c.obj}`),
              ),
              filter: "",
            };
            this.requestUpdate();
          }}
        >
          ${t`Edit linked objects…`}
        </button>
      </section>`;
    const f = m.filter.trim().toLowerCase();
    const shown = all.filter(
      (c) =>
        c.member ||
        !f ||
        `${c.deviceName} ${c.objectName} ${c.port} ${c.channel ?? ""}`
          .toLowerCase()
          .includes(f),
    );
    const byDev = new Map<string, E.MemberCandidate[]>();
    shown.forEach((c) => byDev.set(c.dev, [...(byDev.get(c.dev) ?? []), c]));
    const plan = E.planGaMembers(doc, addr, m.wanted);
    const chLabel = (dev: string, ch: string | null) =>
      ch
        ? (doc.devices
            .find((d) => d.id === dev)
            ?.channels?.find((c) => c.id === ch)?.label ?? ch)
        : "";
    const flags = (c: E.MemberCandidate) =>
      (["W", "T", "R", "U"] as const).filter((k) => c.flags[k]).join("");
    return html`<section class="g-sec g-members">
      <h3>${t`Objects linked to ${addr}`}</h3>
      <p class="g-hint">
        ${t`Tick the objects that use this address. Adding puts it at the end of the object's list (listened to); it only becomes its sending address if it had none. Flags and other addresses do not change.`}
      </p>
      <input
        class="g-filter"
        type="search"
        placeholder=${t`Filter: device, object, output…`}
        .value=${fieldValue(m.filter)}
        @input=${(e: Event) => {
          m.filter = (e.target as HTMLInputElement).value;
          this.requestUpdate();
        }}
      />
      <div class="g-mlist">
        ${[...byDev].map(
          ([, list]) =>
            html`<fieldset>
              <legend>${list[0]!.deviceName}</legend>
              ${list.map((c) => {
                const key = `${c.dev}/${c.obj}`;
                return html`<label
                  class="g-mrow ${c.compatible ? "" : "off"}"
                  title=${c.compatible ? "" : t`${c.dpt}: data size differs from ${addr}`}
                >
                  <input
                    type="checkbox"
                    ?disabled=${!c.compatible}
                    .checked=${live(m.wanted.has(key))}
                    @change=${(e: Event) => {
                      if ((e.target as HTMLInputElement).checked)
                        m.wanted.add(key);
                      else m.wanted.delete(key);
                      this.requestUpdate();
                    }}
                  />
                  <span class="g-mname"
                    >${c.objectName}<small
                      >${[chLabel(c.dev, c.channel), c.port].filter(Boolean).join(" · ")}</small
                    ></span
                  >
                  <code>${c.dpt}</code>
                  <code title=${t`Active flags`}>${flags(c) || "—"}</code>
                  ${
                    c.sending === addr
                      ? html`<small class="g-badge">${t`sending`}</small>`
                      : nothing
                  }
                </label>`;
              })}
            </fieldset>`,
        )}
      </div>
      ${
        plan.length
          ? html`<div class="g-plan">
              <b>${t`Summary`}</b>
              <ul>
                ${plan.map(
                  (x) =>
                    html`<li class=${x.kind}>
                      ${x.kind === "add" ? "+" : "−"} ${x.label}
                      ${
                        x.keeps
                          ? html`<small
                              >${t`listened to as well; it still sends on ${x.keeps}`}</small
                            >`
                          : nothing
                      }
                      ${
                        x.sendingAfter === undefined
                          ? nothing
                          : x.sendingAfter === null
                            ? html`<small
                                >${t`will have no group address`}</small
                              >`
                            : x.sendingAfter === addr
                              ? html`<small
                                  >${t`${addr} becomes its sending address`}</small
                                >`
                              : html`<small
                                  >${t`its sending address becomes ${x.sendingAfter}`}</small
                                >`
                      }
                    </li>`,
                )}
              </ul>
            </div>`
          : html`<p class="g-empty">${t`No change.`}</p>`
      }
      <div class="g-row g-end">
        <button
          class="g-btn"
          @click=${() => ((this.members = null), this.requestUpdate())}
        >
          ${t`Undo`}
        </button>
        <button
          class="g-btn solid"
          ?disabled=${!plan.length}
          @click=${() => {
            const add = plan.filter((x) => x.kind === "add");
            const remove = plan.filter((x) => x.kind === "remove");
            const label = t`Links of ${addr}: ${add.length} added, ${remove.length} removed`;
            if (this.run(label, (x) => E.setGaMembers(x, addr, add, remove))) {
              this.members = null;
              this.notice = label;
            }
            this.requestUpdate();
          }}
        >
          ${t`Apply`}
        </button>
      </div>
    </section>`;
  }

  // ── Controls ──

  /** Two-step delete button: the first click requests confirmation in place. */
  dangerButton(
    key: string,
    label: string,
    question: string,
    action: () => void,
    small = false,
  ) {
    if (this.confirming !== key)
      return html`<button
        class="g-btn danger${small ? " small" : ""}"
        @click=${() => (this.confirming = key)}
      >
        ${label}
      </button>`;
    return html`<span class="g-confirm" role="group">
      <span>${question}</span>
      <button
        class="g-btn danger solid"
        @click=${() => {
          this.confirming = null;
          action();
        }}
      >
        ${t`Delete`}
      </button>
      <button class="g-btn" @click=${() => (this.confirming = null)}>
        ${t`Undo`}
      </button>
    </span>`;
  }

  text(
    label: string,
    value: string,
    on: (v: string) => void,
    area = false,
    cls = "",
  ) {
    return html`<label class="g-field ${cls}"
      ><span>${label}</span>
      ${
        area
          ? html`<textarea
              rows="2"
              .value=${fieldValue(value)}
              @change=${(e: Event) => on((e.target as HTMLTextAreaElement).value)}
            ></textarea>`
          : html`<input
              .value=${fieldValue(value)}
              @change=${(e: Event) => on((e.target as HTMLInputElement).value.trim())}
            />`
      }
    </label>`;
  }

  select(
    label: string,
    options: [string, string][],
    value: string,
    on: (v: string) => void,
    cls = "",
  ) {
    return html`<label class="g-field ${cls}"
      ><span>${label}</span>
      <select
        data-v=${value}
        @change=${(e: Event) => on((e.target as HTMLSelectElement).value)}
      >
        ${options.map(([v, l]) => html`<option value=${v} ?selected=${v === value}>${l}</option>`)}
      </select>
    </label>`;
  }

  /** Available group addresses for a DPT: matching data size; created on demand if needed. */
  compatible(doc: Doc, dpt: string | null) {
    return doc.groupAddresses.filter((g) => {
      const gd = E.gaDpt(doc, g.address);
      return !dpt || !gd || dptBits(gd) === dptBits(dpt);
    });
  }

  /** Choosing a unique address (emitting port, key), with creation on the fly. */
  gaPicker(
    doc: Doc,
    label: string,
    value: string | null,
    dpt: string | null,
    allowNone: boolean,
    newName: string,
    apply: (ga: string | null, doc: Doc) => void,
  ): TemplateResult {
    const compatible = this.compatible(doc, dpt);
    return html`<label class="g-field"
      ><span>${label}</span>
      <select
        data-v=${value ?? ""}
        @change=${(e: Event) => {
          const v = (e.target as HTMLSelectElement).value;
          this.run(label, (x) => {
            if (v === "__new")
              apply(E.newGa(x, dpt ?? "1.001", newName || label), x);
            else apply(v || null, x);
          });
        }}
      >
        ${allowNone ? html`<option value="" ?selected=${!value}>${t`— none —`}</option>` : nothing}
        ${value && !compatible.some((g) => g.address === value) ? html`<option value=${value} selected>${value}</option>` : nothing}
        ${compatible.map((g) => html`<option value=${g.address} ?selected=${g.address === value}>${g.address} · ${g.name ?? ""}</option>`)}
        <option value="__new">+ ${t`new address`}</option>
      </select>
    </label>`;
  }

  /** "+" menu that adds an address to a list. */
  gaAdder(
    doc: Doc,
    dpt: string | null,
    present: string[],
    newName: string,
    add: (ga: string, doc: Doc) => void,
    label: string,
  ) {
    const choices = this.compatible(doc, dpt).filter(
      (g) => !present.includes(g.address),
    );
    return html`<select
      class="g-plus"
      data-v=""
      aria-label=${label}
      @change=${(e: Event) => {
        const v = (e.target as HTMLSelectElement).value;
        if (!v) return;
        this.run(label, (x) =>
          add(
            v === "__new" ? E.newGa(x, dpt ?? "1.001", newName || label) : v,
            x,
          ),
        );
        this.requestUpdate();
      }}
    >
      <option value="">+ ${t`add`}</option>
      ${choices.map((g) => html`<option value=${g.address}>${g.address} · ${g.name ?? ""}</option>`)}
      <option value="__new">+ ${t`new address`}</option>
    </select>`;
  }

  /** Parameters of a schema: current settings, or advanced settings (expert). */
  params(
    schema: ParamSchema,
    values: Record<string, unknown>,
    on: (key: string, v: unknown) => void,
  ) {
    const basic = this.paramFields(schema, values, on, false);
    const expert = this.paramFields(schema, values, on, true);
    return html`<div class="g-row">${basic}</div>
      ${
        expert.length
          ? html`<details class="g-more">
              <summary>${t`Advanced settings`}</summary>
              <div class="g-row">${expert}</div>
            </details>`
          : nothing
      }`;
  }

  paramFields(
    schema: ParamSchema | undefined,
    values: Record<string, unknown>,
    on: (key: string, v: unknown) => void,
    expert: boolean,
  ): TemplateResult[] {
    if (!schema) return [];
    return Object.entries(schema.properties)
      .filter(([, p]) => !!p.expert === expert)
      .map(([key, p]) =>
        this.paramField(
          key,
          p,
          values[key],
          (v) => on(key, v),
          !!schema.required?.includes(key),
        ),
      );
  }

  private paramField(
    key: string,
    p: ParamProperty,
    raw: unknown,
    on: (v: unknown) => void,
    required: boolean,
  ) {
    const types = Array.isArray(p.type) ? p.type : [p.type];
    const label = tt(p.title) || key;
    const help = tt(p.description);
    // null is an explicit setting, such as no timer; only an absent property uses the default.
    const value = raw === undefined ? p.default : raw;
    const reset =
      raw !== undefined && !required
        ? html`<button
            class="g-reset"
            type="button"
            title=${p.default === undefined ? t`Remove value` : t`Back to default value (${JSON.stringify(p.default)})`}
            aria-label=${t`Back to default value`}
            @click=${() => on(undefined)}
          >
            ↺
          </button>`
        : nothing;
    const nullable = types.includes("null");
    const nullLabel = p.nullTitle ? tt(p.nullTitle) : t`none`;
    // Boolean null: three named choices (a check box would confuse false and null).
    if (types.includes("boolean") && nullable)
      return html`<label class="g-field narrow" title=${help}
        ><span>${label}${required ? " *" : ""}${reset}</span>
        <select
          data-v=${JSON.stringify(value ?? null)}
          @change=${(e: Event) => on(JSON.parse((e.target as HTMLSelectElement).value))}
        >
          <option value="true" ?selected=${value === true}>${t`Yes`}</option>
          <option value="false" ?selected=${value === false}>${t`No`}</option>
          <option
            value="null"
            ?selected=${value === null || value === undefined}
          >
            ${nullLabel}
          </option>
        </select>
      </label>`;
    if (types.includes("boolean"))
      return html`<label class="g-check" title=${help}
        ><input
          type="checkbox"
          .checked=${live(value === true)}
          @change=${(e: Event) => on((e.target as HTMLInputElement).checked)}
        />${label}${reset}</label
      >`;
    if (p.enum)
      return html`<label class="g-field" title=${help}
        ><span>${label}${reset}</span>
        <select
          data-v=${JSON.stringify(value)}
          @change=${(e: Event) => on(JSON.parse((e.target as HTMLSelectElement).value))}
        >
          ${p.enum.map((v, i) => html`<option value=${JSON.stringify(v)} ?selected=${v === value}>${p.enumTitles?.[i] ? tt(p.enumTitles[i]) : String(v)}</option>`)}
        </select>
      </label>`;
    if (types.includes("number") || types.includes("integer")) {
      const ms = p.unit === "ms";
      const shown =
        typeof value === "number" ? (ms ? value / 1000 : value) : "";
      return html`<label class="g-field narrow" title=${help}
        ><span
          >${label}${ms ? " (s)" : p.unit === "%" ? " (%)" : ""}${required ? " *" : ""}${reset}</span
        >
        <input
          type="number"
          step=${ms ? "0.1" : "any"}
          placeholder=${nullable ? nullLabel : ""}
          .value=${fieldValue(String(shown))}
          @change=${(e: Event) => {
            const s = (e.target as HTMLInputElement).value.trim();
            // An empty field becomes null if allowed by the schema; otherwise it returns to the default (as ↺ does).
            if (s === "") return on(nullable ? null : undefined);
            const n = Number(s.replace(",", "."));
            if (!Number.isFinite(n)) return on(s);
            on(
              ms
                ? Math.round(n * 1000)
                : types.includes("integer")
                  ? Math.round(n)
                  : n,
            );
          }}
        />
      </label>`;
    }
    // Text: the empty string is a value; null is explicitly chosen (
    const isNull = value === null;
    return html`<label class="g-field" title=${help}
      ><span
        >${label}${required ? " *" : ""}${reset}${
          nullable
            ? html`<button
                class="g-reset ${isNull ? "on" : ""}"
                type="button"
                aria-pressed=${isNull ? "true" : "false"}
                title=${nullLabel}
                aria-label=${nullLabel}
                @click=${() => on(isNull ? "" : null)}
              >
                ∅
              </button>`
            : nothing
        }</span
      ><input
        placeholder=${isNull ? nullLabel : ""}
        .value=${fieldValue(isNull || value === undefined ? "" : String(value))}
        @change=${(e: Event) => {
          const s = (e.target as HTMLInputElement).value;
          on(s === "" && nullable && !types.includes("string") ? null : s);
        }}
    /></label>`;
  }
}

const sizeLabel = (bits: number) =>
  bits === 1
    ? t`1 bit`
    : bits === 2
      ? t`2 bits`
      : bits === 4
        ? t`4 bits`
        : bits === 32
          ? t`4 bytes`
          : bits === 24
            ? t`3 bytes`
            : bits === 16
              ? t`2 bytes`
              : t`1 byte`;

/** Required values of equipment (e.g. actual travel of a shutter), recapture of the channel if possible. */
/** Extension device: chosen behavior, with one output if the behavior controls one. */
type Scope =
  "device" | "channel" | "channelState" | "equipment" | "equipmentState";

/** First equipment that accepts the commands of this output. */
const equipmentFor = (registry: Registry, output: string) =>
  [...registry.equipment].find(([, e]) => e.accepts === output)?.[0];

function addGeneric(
  doc: Doc,
  behavior: string,
  registry: Registry,
  line?: string,
  values?: Record<Scope, Record<string, unknown>>,
) {
  const def = registry.behaviors.get(behavior);
  if (!def) throw new E.EditRefusal(t`behavior “${behavior}” not loaded`);
  const base = behavior.split("/")[0]!.replace(/[^\w]/g, "") || "dev";
  const used = new Set(doc.devices.map((d) => d.id));
  let id = base;
  for (let i = 2; used.has(id); i++) id = `${base}${i}`;
  const d: Dev = {
    id,
    name: behavior,
    kind:
      def.output === "motor"
        ? "shutterActuator"
        : def.output
          ? "switchActuator"
          : "generic",
    behavior,
    objects: [],
    ...(values && Object.keys(values.device).length
      ? { parameters: { ...values.device } }
      : {}),
  };
  d.address = freeAddress(doc, line);
  const eq = def.output ? equipmentFor(registry, def.output) : undefined;
  const some = (o: Record<string, unknown>) => Object.keys(o).length > 0;
  const eqParams = (): {
    parameters?: Record<string, unknown>;
    initialState?: Record<string, unknown>;
  } =>
    // Creation form: the required settings come from the author, not from an invented value.
    values
      ? {
          ...(some(values.equipment)
            ? { parameters: { ...values.equipment } }
            : {}),
          ...(some(values.equipmentState)
            ? { initialState: { ...values.equipmentState } }
            : {}),
        }
      : eq
        ? defaultEquipmentParams(registry, eq)
        : {};
  if (def.output)
    d.channels = [
      {
        id: "s1",
        label: "L1",
        ...(values && some(values.channel)
          ? { parameters: { ...values.channel } }
          : {}),
        ...(values && some(values.channelState)
          ? { initialState: { ...values.channelState } }
          : {}),
        equipment: eq ? { type: eq, ...eqParams() } : null,
      },
    ];
  doc.devices.push(d);
}

if (!customElements.get("bd-guided"))
  customElements.define("bd-guided", GuidedEditor);
