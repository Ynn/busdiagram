// Guided editor: forms derive from the scenario and registered definitions.
// Each action applies a validated, undoable edit to the JSON source.
// Views cover the installation, a device, and a group address.
// Rejected edits show a reason and restore values from the JSON source.
import { LitElement, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { live } from "lit/directives/live.js";
import type {
  BehaviorDefinition,
  BehaviorPort,
  ParamProperty,
  ParamSchema,
} from "../../src/knx/contracts";
import { SUPPORTED_DPTS, dptBits, dptName } from "../../src/knx/dpt";
import { isStandardBehavior } from "../../src/knx/registry";
import { Network } from "../../src/knx/network";
import type { Registry } from "../../src/knx/registry";
import { buildScenario } from "../../src/knx/scenario";
import type { Chan, Dev, Doc, Gesture } from "./edit";
import * as E from "./edit";
import { t } from "./lang";
import { SNIPPETS, freeAddress } from "./snippets";

type Mutate = (doc: Doc) => void;
/** The installation, a device editor, and a group-address editor are the three views. A refusal appears in a banner; fields */
export interface Refusal {
  label: string;
  message: string;
  path?: string;
}

const tt = (text: string | undefined) => (text ? (t.s ? t.s(text) : text) : "");

export class GuidedEditor extends LitElement {
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
  /** Visited views ("← Back") and their scroll positions. */
  private history: { sel: string | null; scroll: number }[] = [];
  /** During back navigation, do not add the previous card to history. */
  private goingBack = false;
  private restoreScroll: number | null = null;
  /** Object to be shown after navigation (open, centered and highlighted line). */
  private focusObj: string | null = null;
  /** Last successful grouped operation; it can be undone from the banner. */
  private notice: string | null = null;
  /** Editing objects associated with an address (address form). */
  private members: {
    addr: string;
    wanted: Set<string>;
    filter: string;
  } | null = null;
  /** Copy settings from one output to others. */
  private copy: {
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
      // Sheet left, with its position: « ← Previous » takes it back.
      const prev = changed.get("selected") as string | null | undefined;
      if (prev !== undefined && prev !== this.selected && !this.goingBack) {
        this.history.push({
          sel: prev,
          scroll: this.closest(".pane")?.scrollTop ?? 0,
        });
        if (this.history.length > 50) this.history.shift();
      }
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
    const pane = this.closest(".pane");
    if (changed.has("selected") && changed.get("selected") !== undefined) {
      if (this.restoreScroll !== null)
        pane?.scrollTo({ top: this.restoreScroll });
      else if (!this.focusObj) pane?.scrollTo({ top: 0 });
      this.restoreScroll = null;
      this.goingBack = false;
    }
    if (this.focusObj) this.showObject(this.focusObj);
  }

  /** Center and highlight the line of an object; opens the advanced table if it does not have a line. */
  private showObject(id: string) {
    const el = [...this.querySelectorAll<HTMLElement>("[data-obj]")].find(
      (x) => x.dataset.obj === id && x.offsetParent !== null,
    );
    const dev = this.doc?.devices.find((d) => d.id === this.selected);
    if (!el) {
      const key = `${dev?.id}:expert`;
      if (dev && !this.opened.has(key)) {
        this.opened.add(key);
        this.requestUpdate();
        return;
      }
      this.focusObj = null;
      return;
    }
    this.focusObj = null;
    el.scrollIntoView({ block: "center" });
    el.classList.remove("g-flash");
    void el.offsetWidth;
    el.classList.add("g-flash");
    el.querySelector<HTMLElement>("select, input, button")?.focus({
      preventScroll: true,
    });
  }

  /** Map (output or key) that contains the object, to be unfolded to show it. */
  private cardOf(d: Dev, objectId: string): string | null {
    const o = d.objects.find((x) => x.id === objectId);
    if (!o) return null;
    if (o.channel) return `${d.id}:ch:${o.channel}`;
    const b = (d.buttons ?? []).find(
      (x) =>
        [x.press, x.short, x.long, x.release].some(
          (a) => a?.object === objectId,
        ) || x.led === objectId,
    );
    return b ? `${d.id}:key:${b.id}` : null;
  }

  private back() {
    const h = this.history.pop();
    if (!h) return;
    this.goingBack = true;
    this.restoreScroll = h.scroll;
    this.onSelect(h.sel);
  }

  /** Readable name of a card (for « ← Previous »). */
  private selLabel(sel: string | null) {
    if (!sel) return t`Installation`;
    if (sel.startsWith("ga:")) return sel.slice(3);
    const d = this.doc?.devices.find((x) => x.id === sel);
    return d?.name ?? sel;
  }

  private run(label: string, mutate: Mutate): boolean {
    const refusal = this.commit(label, mutate);
    this.alert = refusal;
    return !refusal;
  }

  /** Opens a sheet; with `objectId`, unfolds its map and shows the line of the object. */
  private go(id: string | null, objectId?: string) {
    if (objectId && id) {
      const d = this.doc?.devices.find((x) => x.id === id);
      const card = d ? this.cardOf(d, objectId) : null;
      if (card) this.opened.add(card);
      this.focusObj = objectId;
    }
    if (id === this.selected) this.requestUpdate();
    else this.onSelect(id);
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
    const dev = doc.devices.find((d) => d.id === this.selected) ?? null;
    const ga = this.selected?.startsWith("ga:")
      ? (doc.groupAddresses.find((g) => `ga:${g.address}` === this.selected) ??
        null)
      : null;
    const title = dev ? (dev.name ?? dev.id) : ga ? ga.address : null;
    return html`
      <div class="g-head">
        <nav class="g-crumb">
          ${
            this.history.length
              ? html`<button
                  class="g-prev"
                  title=${t`Back to: ${this.selLabel(this.history.at(-1)!.sel)}`}
                  @click=${() => this.back()}
                >
                  ← ${t`Back`}
                </button>`
              : nothing
          }
          ${
            title
              ? html`<button class="g-back" @click=${() => this.go(null)}>
                    ${t`Installation`}
                  </button>
                  <span>/</span> <b>${title}</b>`
              : html`<b>${t`Installation`}</b>`
          }
        </nav>
        <button
          class="g-icon"
          title=${t`Undo (Ctrl+Z)`}
          aria-label=${t`Undo`}
          @click=${() => this.undo()}
        >
          ↶
        </button>
        <button
          class="g-icon"
          title=${t`Redo (Ctrl+Y)`}
          aria-label=${t`Redo`}
          @click=${() => this.redo()}
        >
          ↷
        </button>
      </div>
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
      ${dev ? this.deviceView(doc, dev) : ga ? this.gaView(doc, ga) : this.home(doc)}
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
      ${this.draft ? this.draftView() : nothing}
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
      ${this.linesSection(doc)} ${this.clockSection(doc)}
      ${this.roomsSection(doc)} ${this.gaSection(doc)}
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
                .value=${live(name)}
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

  private lineBlock(doc: Doc, l: Doc["lines"][number], devs: Dev[]) {
    const line = String(l.address);
    return html`<div class="g-line">
      <div class="g-line-head">
        <code class="g-tag">${t`Line`} ${line}</code>
        <input
          class="g-inline"
          aria-label=${t`Name of line ${line}`}
          placeholder=${t`line name`}
          .value=${live(String(l.name ?? ""))}
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

  /** Line repeater or segment coupler attached to the main segment of the line. */
  private lineExtension(l: Doc["lines"][number], line: string) {
    const ext = l.extension as { address?: string; mode?: string } | undefined;
    return html`<div class="g-row g-ext">
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
          html`<li>
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

  private addDevice(line: string) {
    const extensions = [...this.registry.behaviors].filter(
      ([id]) => !isStandardBehavior(id),
    );
    return html`<select
      class="g-add"
      data-v=""
      aria-label=${t`Add a device on line ${line}`}
      @change=${(e: Event) => {
        const v = (e.target as HTMLSelectElement).value;
        if (!v) return;
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
            (e.target as HTMLSelectElement).value = "";
            this.requestUpdate();
            this.updateComplete.then(() =>
              this.querySelector(".g-draft")?.scrollIntoView({
                block: "nearest",
              }),
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
              SNIPPETS.find((s) => s.id === v.slice(8))!.apply(d, { line }),
            );
          else addGeneric(d, v.slice(4), this.registry, line);
        });
        if (!ok) this.selectAdded = null;
        this.requestUpdate();
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

  private gaSection(doc: Doc) {
    return html`<section class="g-sec">
      <h3>${t`Group addresses`}</h3>
      ${
        doc.groupAddresses.length
          ? html`<ul class="g-list">
              ${doc.groupAddresses.map((g) => {
                const u = E.gaUsage(doc, g.address);
                const dpt = E.gaDpt(doc, g.address);
                // An address read (R) and updated by response (U) is used, even without T or W.
                const warn =
                  !u.senders.length && !u.responders.length
                    ? t`nobody sends`
                    : !u.receivers.length && !u.updaters.length
                      ? t`nobody listens`
                      : "";
                return html`<li>
                  <button
                    class="g-item"
                    @click=${() => this.go(`ga:${g.address}`)}
                  >
                    <code>${g.address}</code>
                    <b>${g.name ?? ""}</b>
                    <small
                      >${dpt ? dptName(dpt, t) : ""}${
                        warn
                          ? html` · <em class="g-warn">${warn}</em>`
                          : nothing
                      }</small
                    >
                    <span class="g-chev">›</span>
                  </button>
                </li>`;
              })}
            </ul>`
          : html`<p class="g-empty">${t`No group address.`}</p>`
      }
      <div class="g-row g-end">
        <select
          class="g-add"
          data-v=""
          @change=${(e: Event) => {
            const v = (e.target as HTMLSelectElement).value;
            if (!v) return;
            let created = "";
            if (
              this.run(t`New group address`, (d) => {
                created = E.newGa(d, v, t`New function`);
              })
            )
              this.go(`ga:${created}`);
            this.requestUpdate();
          }}
        >
          <option value="">+ ${t`New group address…`}</option>
          ${SUPPORTED_DPTS.map((x) => html`<option value=${x}>${dptName(x, t)}</option>`)}
        </select>
      </div>
    </section>`;
  }

  // ── View 2: device ──

  private deviceView(doc: Doc, d: Dev) {
    const def = this.registry.behaviors.get(d.behavior);
    const lv = E.levelsOf(doc);
    const visu = d.kind === "supervisor";
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
    const ext = doc.lines.find((l) => String(l.address) === place)
      ?.extension as { address?: string } | undefined;
    return html`<section class="g-sec">
        <h3>${d.name ?? d.id} <code>${d.address ?? "IP"}</code></h3>
        <p class="g-hint">
          ${this.typeLabel(d)}${def?.description ? html` — ${tt(def.description)}` : nothing}
          ${def ? nothing : html`<br /><b>${t`Behavior not loaded in the designer: data kept, limited forms.`}</b>`}
        </p>
        <div class="g-row">
          ${this.text(t`Name`, d.name ?? "", (v) => this.run(t`Name`, (x) => E.setDeviceField(x, d.id, "name", v)))}
          ${this.select(visu ? t`Connection` : t`Line`, places, place, (v) =>
            this.run(t`Connection`, (x) => E.connectDevice(x, d.id, v)),
          )}
          ${
            place !== "IP" && d.address !== undefined
              ? html`${this.text(
                  t`Individual address`,
                  d.address,
                  (v) =>
                    this.run(t`Individual address`, (x) =>
                      E.setDeviceAddress(x, d.id, v),
                    ),
                  false,
                  "narrow",
                )}`
              : nothing
          }
          ${
            E.roomsOf(doc).length && !def?.output
              ? this.select(
                  t`Room`,
                  [
                    ["", t`none`],
                    ...E.roomsOf(doc).map(
                      (r) => [r.id, r.name ?? r.id] as [string, string],
                    ),
                  ],
                  d.room ?? "",
                  (v) => this.run(t`Room`, (x) => E.setDeviceRoom(x, d.id, v)),
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
                    this.run(t`Segment`, (x) =>
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
        ${this.text(
          t`Help text (shown in the diagram inspector)`,
          d.description ?? "",
          (v) =>
            this.run(t`Help text`, (x) =>
              E.setDeviceField(x, d.id, "description", v),
            ),
          true,
        )}
      </section>
      ${visu ? this.visualisation(d, place) : nothing}
      ${def?.acceptsInputs && def.ports.input ? this.keys(doc, d) : nothing}
      ${def?.ports.display && !def.acceptsInputs ? this.displays(doc, d) : nothing}
      ${def?.output ? this.channels(doc, d, def) : nothing}
      ${def ? this.devicePorts(doc, d, def) : nothing}
      ${
        def?.parameters
          ? html`<section class="g-sec">
              <h3>${t`Device settings`}</h3>
              ${this.params(def.parameters, d.parameters ?? {}, (k, v) =>
                this.run(t`Setting`, (x) => E.setParam(x, d.id, null, k, v)),
              )}
            </section>`
          : nothing
      }
      ${this.expert(d)}
      <section class="g-sec g-danger">
        ${this.dangerButton(
          `dev:${d.id}`,
          t`Delete device`,
          t`Delete “${d.name ?? d.id}”? Its group addresses remain declared.`,
          () => {
            if (this.run(t`Deletion`, (x) => E.removeDevice(x, d.id)))
              this.go(null);
          },
        )}
      </section>`;
  }

  /** Supervisor: how it sees the bus and whether the project declares its addresses through a dummy device. */
  private visualisation(d: Dev, place: string) {
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
            this.run(t`Declaration in the project`, (x) =>
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

  private typeLabel(d: Dev): string {
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

  private keys(doc: Doc, d: Dev) {
    const kinds = E.actionKinds();
    const gestureLabel: Record<Gesture, string> = {
      press: t`Press`,
      short: t`Short press`,
      long: t`Long press`,
    };
    const summary = (k: E.KeyView) =>
      (
        Object.entries(k.gestures) as [
          Gesture,
          NonNullable<E.KeyView["gestures"][Gesture]>,
        ][]
      )
        .map(([g, a]) => {
          const v =
            kinds[a.kind].values.find(([x]) => x === a.value)?.[1] ??
            String(a.value);
          return `${k.mode === "press" ? "" : `${gestureLabel[g]} : `}${v} → ${a.ga ?? "—"}`;
        })
        .join(" · ") + (k.led ? ` · ${t`LED`}` : "");
    return html`<section class="g-sec">
      <h3>${t`Keys`}</h3>
      ${E.keysOf(d).map((k) =>
        this.card(
          `${d.id}:key:${k.id}`,
          html`<b>${k.label}</b><span class="g-sum">${summary(k)}</span>`,
          () => html`
            <div class="g-row">
              ${this.text(t`Label`, k.label, (v) => this.run(t`Label`, (x) => E.setKeyLabel(x, d.id, k.id, v)))}
              ${this.select(
                t`Gesture`,
                [
                  ["press", t`single press`],
                  ["shortlong", t`short press + long press`],
                ],
                k.mode,
                (v) =>
                  this.run(t`Gesture`, (x) =>
                    E.setKeyMode(x, d.id, k.id, v as "press" | "shortlong"),
                  ),
              )}
            </div>
            ${(
              Object.entries(k.gestures) as [
                Gesture,
                NonNullable<E.KeyView["gestures"][Gesture]>,
              ][]
            ).map(([g, a]) => {
              const kind = kinds[a.kind];
              return html`<fieldset class="g-gesture" data-obj=${a.objectId}>
                <legend>${gestureLabel[g]}</legend>
                <div class="g-row">
                  ${this.select(
                    t`Function`,
                    Object.entries(kinds).map(([id, x]) => [id, x.label]),
                    a.kind,
                    (v) => {
                      const nk = kinds[v as E.ActionKind];
                      this.run(t`Function`, (x) =>
                        E.setGestureAction(
                          x,
                          d.id,
                          k.id,
                          g,
                          v as E.ActionKind,
                          nk.values[0]![0],
                        ),
                      );
                    },
                  )}
                  ${this.select(
                    t`Value sent`,
                    kind.values.map(([v, l]) => [String(v), l]),
                    String(a.value),
                    (v) =>
                      this.run(t`Value sent`, (x) =>
                        E.setGestureAction(
                          x,
                          d.id,
                          k.id,
                          g,
                          a.kind,
                          v === "toggle" ? "toggle" : Number(v),
                        ),
                      ),
                  )}
                  ${this.gaPicker(
                    doc,
                    t`Sending address`,
                    a.ga,
                    kind.dpt,
                    false,
                    `${d.name ?? d.id} ${k.label}`,
                    (ga, x) => E.setGestureGa(x, d.id, k.id, g, ga!),
                  )}
                </div>
              </fieldset>`;
            })}
            <div class="g-row">
              <label class="g-check"
                ><input
                  type="checkbox"
                  .checked=${live(k.led)}
                  @change=${(e: Event) => this.run(t`LED`, (x) => E.setKeyLed(x, d.id, k.id, (e.target as HTMLInputElement).checked))}
                />${t`LED`}</label
              >
              ${this.gaPicker(
                doc,
                t`Status feedback listened to (LED)`,
                k.feedback,
                "1.001",
                true,
                t`Status ${k.label}`,
                (ga, x) => E.setKeyFeedback(x, d.id, k.id, ga),
              )}
            </div>
            <div class="g-row g-end">
              ${this.dangerButton(
                `key:${d.id}:${k.id}`,
                t`Delete key`,
                t`Delete key ${k.label}?`,
                () => this.run(t`Deletion`, (x) => E.removeKey(x, d.id, k.id)),
                true,
              )}
            </div>
          `,
        ),
      )}
      <button
        class="g-btn"
        @click=${() => this.run(t`Key`, (x) => void E.addKey(x, d.id))}
      >
        + ${t`Add a key`}
      </button>
    </section>`;
  }

  // ── Afficheur ─────────────────────────────────────────────────────────────

  private displays(doc: Doc, d: Dev) {
    return html`<section class="g-sec">
      <h3>${t`Displayed values`}</h3>
      <div class="g-chips">
        ${d.objects
          .filter((o) => o.port === "display")
          .map(
            (o) =>
              html`<span class="g-chip"
                >${E.gasOf(o).join(", ") || "—"} · ${o.name ?? o.id}
                <button
                  title=${t`Remove`}
                  @click=${() => this.run(t`Removal`, (x) => E.removeObject(x, d.id, o.id))}
                >
                  ×
                </button></span
              >`,
          )}
        ${this.gaAdder(doc, null, [], "", (ga, x) => E.addDisplay(x, d.id, ga), t`Display an address`)}
      </div>
    </section>`;
  }

  // ── Actuator outputs ──────────────────────────────────────────────────

  private channels(doc: Doc, d: Dev, def: BehaviorDefinition<unknown>) {
    const equipments = [...this.registry.equipment]
      .filter(([, e]) => e.accepts === def.output)
      .map(([id, e]) => [id, e.title ? tt(e.title) : id] as [string, string]);
    const chPorts = Object.entries(def.ports).filter(
      ([, p]) => p.channel === "required",
    );
    const eqTitle = (type: string | undefined) =>
      type
        ? (equipments.find(([id]) => id === type)?.[1] ?? type)
        : t`free output`;
    return html`<section class="g-sec">
      <h3>${t`Outputs`}</h3>
      ${(d.channels ?? []).map((c) => {
        const eq = c.equipment?.type ?? "";
        const edef = eq ? this.registry.equipment.get(eq) : undefined;
        const portGas = (port: string) =>
          d.objects
            .filter((o) => o.port === port && o.channel === c.id)
            .flatMap(E.gasOf);
        const sum = chPorts
          .map(([port, p]) => [tt(p.title) || port, portGas(port)] as const)
          .filter(([, g]) => g.length)
          .map(([title, g]) => `${title} ${g.join(", ")}`)
          .join(" · ");
        return this.card(
          `${d.id}:ch:${c.id}`,
          html`<b>${c.label ?? c.id}</b
            ><span class="g-sum"
              >${eqTitle(eq)} · ${sum || t`no address`}</span
            >`,
          () => {
            const more = [
              ...(def.ports.scene
                ? [
                    this.text(
                      t`Scenes (number=value, e.g. 1=1, 2=0)`,
                      E.switchChannels(d).find((x) => x.id === c.id)?.scenes ??
                        "",
                      (v) =>
                        this.run(t`Scenes`, (x) =>
                          E.setChannelScenes(x, d.id, c.id, v),
                        ),
                    ),
                  ]
                : []),
              ...this.paramFields(
                def.channelParameters,
                c.parameters ?? {},
                (k, v) =>
                  this.run(t`Setting`, (x) => E.setParam(x, d.id, c.id, k, v)),
                true,
              ),
              ...this.paramFields(
                edef?.parameters,
                c.equipment?.parameters ?? {},
                (k, v) =>
                  this.run(t`Setting`, (x) =>
                    E.setParam(x, d.id, c.id, k, v, "equipment"),
                  ),
                true,
              ),
            ];
            const basic = [
              ...this.paramFields(
                def.channelParameters,
                c.parameters ?? {},
                (k, v) =>
                  this.run(t`Setting`, (x) => E.setParam(x, d.id, c.id, k, v)),
                false,
              ),
              ...this.paramFields(
                edef?.parameters,
                c.equipment?.parameters ?? {},
                (k, v) =>
                  this.run(t`Setting`, (x) =>
                    E.setParam(x, d.id, c.id, k, v, "equipment"),
                  ),
                false,
              ),
            ];
            return html`
              <div class="g-row">
                ${this.text(t`Label`, c.label ?? c.id, (v) => this.run(t`Label`, (x) => E.setChannelLabel(x, d.id, c.id, v)))}
                ${this.select(
                  t`Connected load`,
                  [["", t`none (unused output)`], ...equipments],
                  eq,
                  (v) =>
                    this.run(t`Connected load`, (x) =>
                      E.setChannelLoad(
                        x,
                        d.id,
                        c.id,
                        v
                          ? {
                              type: v,
                              ...(this.registry.equipment.get(v)?.heatOutput
                                ? { room: E.roomsOf(x)[0]?.id ?? E.addRoom(x) }
                                : {}),
                              ...defaultEquipmentParams(this.registry, v, c),
                            }
                          : null,
                      ),
                    ),
                )}
                ${
                  edef?.heatOutput
                    ? this.select(
                        t`Heated room`,
                        E.roomsOf(doc).map(
                          (r) => [r.id, r.name ?? r.id] as [string, string],
                        ),
                        c.equipment?.room ?? "",
                        (v) =>
                          this.run(t`Heated room`, (x) =>
                            E.setEquipmentRoom(x, d.id, c.id, v),
                          ),
                      )
                    : nothing
                }
              </div>
              <div class="g-ports">
                ${chPorts.map(([port, p]) =>
                  this.portRows(doc, d, port, p, c.id, c.label ?? c.id),
                )}
              </div>
              ${basic.length ? html`<div class="g-row">${basic}</div>` : nothing}
              ${
                more.length
                  ? html`<details class="g-more">
                      <summary>${t`More options`}</summary>
                      <div class="g-row">${more}</div>
                    </details>`
                  : nothing
              }
              ${this.copyPanel(doc, d, c)}
              <div class="g-row g-end">
                ${
                  this.copy?.dev === d.id && this.copy.ch === c.id
                    ? nothing
                    : html`<button
                        class="g-btn small"
                        ?disabled=${!E.copyTargets(doc, d.id, c.id).length}
                        @click=${() => {
                          this.copy = {
                            dev: d.id,
                            ch: c.id,
                            targets: new Set(),
                            what: {
                              parameters: true,
                              load: false,
                              scenes: false,
                            },
                          };
                          this.requestUpdate();
                        }}
                      >
                        ${t`Copy settings to…`}
                      </button>`
                }
                ${this.dangerButton(
                  `ch:${d.id}:${c.id}`,
                  t`Delete output`,
                  t`Delete output ${c.label ?? c.id} and its objects?`,
                  () =>
                    this.run(t`Deletion`, (x) =>
                      E.removeChannel(x, d.id, c.id),
                    ),
                  true,
                )}
              </div>
            `;
          },
        );
      })}
      <button
        class="g-btn"
        @click=${() =>
          this.run(t`Output`, (x) => {
            const e =
              d.channels?.[d.channels.length - 1]?.equipment?.type ??
              equipments[0]?.[0];
            E.addChannel(
              x,
              d.id,
              e
                ? { type: e, ...defaultEquipmentParams(this.registry, e) }
                : null,
            );
          })}
      >
        + ${t`Add an output`}
      </button>
    </section>`;
  }

  /** Ports without channel or "all channels" (e.g. common scene at all exits). */
  private devicePorts(doc: Doc, d: Dev, def: BehaviorDefinition<unknown>) {
    // Thermostat, contact, and sensor: no outputs, push-button keys, or display.
    const generic = !def.output && !def.ports.input && !def.ports.display;
    const ports = Object.entries(def.ports).filter(
      ([name, p]) =>
        (generic && p.channel !== "required") ||
        p.channel === "optional" ||
        (p.channel !== "required" &&
          !def.acceptsInputs &&
          !["display"].includes(name) &&
          def.output),
    );
    if (!ports.length) return nothing;
    return html`<section class="g-sec">
      <h3>${generic ? t`Group objects` : t`Objects shared by all outputs`}</h3>
      <div class="g-ports">
        ${ports.map(([port, p]) =>
          this.portRows(doc, d, port, p, undefined, d.name ?? d.id),
        )}
      </div>
    </section>`;
  }

  // ── Expert mode: object table ────────────────────────────────────────

  private expert(d: Dev) {
    const key = `${d.id}:expert`;
    return html`<details
      class="g-sec g-fold"
      ?open=${this.opened.has(key)}
      @toggle=${(e: Event) => {
        if ((e.target as HTMLDetailsElement).open) this.opened.add(key);
        else this.opened.delete(key);
      }}
    >
      <summary>${t`Communication objects and flags (advanced)`}</summary>
      <p class="g-hint">
        ${t`W: accepts received writes · T: can send · R: answers reads (sending address) · U: a received response updates it. C (communication) is always active.`}
      </p>
      <table class="g-table">
        <tr>
          <th>${t`Object`}</th>
          <th>${t`Port`}</th>
          <th>${t`Addresses`}</th>
          <th>W</th>
          <th>T</th>
          <th>R</th>
          <th>U</th>
          <th></th>
        </tr>
        ${d.objects.map(
          (o) =>
            html`<tr data-obj=${o.id}>
              <td>
                ${o.name ?? o.id}<small
                  >${o.channel ? ` · ${o.channel}` : ""}</small
                >
              </td>
              <td><code>${o.port}</code></td>
              <td><code>${E.gasOf(o).join(", ") || "—"}</code></td>
              ${(["W", "T", "R", "U"] as const).map(
                (f) =>
                  html`<td>
                    <input
                      type="checkbox"
                      aria-label=${`${o.name ?? o.id} ${f}`}
                      .checked=${live(E.flagOf(o, f))}
                      @change=${(e: Event) => this.run(t`Flag ${f}`, (x) => E.setObjectFlag(x, d.id, o.id, f, (e.target as HTMLInputElement).checked))}
                    />
                  </td>`,
              )}
              <td>
                <button
                  class="g-x"
                  title=${t`Delete object`}
                  @click=${() => this.run(t`Deleting the object`, (x) => E.removeObject(x, d.id, o.id))}
                >
                  ×
                </button>
              </td>
            </tr>`,
        )}
      </table>
    </details>`;
  }

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
        .value=${live(m.filter)}
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

  /**
   * Copy settings from one output to other outputs of the same behavior: categories
   * selected, balance before applying; objects and addresses of targets never changed.
   */
  private copyPanel(doc: Doc, d: Dev, c: Chan) {
    const cp = this.copy;
    if (!cp || cp.dev !== d.id || cp.ch !== c.id) return nothing;
    // Double-worded ("not used"): the output identifier distinguishes them.
    const raw = E.copyTargets(doc, d.id, c.id);
    const targets = raw.map((x) =>
      raw.filter((y) => y.dev === x.dev && y.label === x.label).length > 1
        ? { ...x, label: `${x.label} (${x.ch})` }
        : x,
    );
    const def = this.registry.behaviors.get(d.behavior);
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
                    this.requestUpdate();
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
                    this.requestUpdate();
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
          @click=${() => ((this.copy = null), this.requestUpdate())}
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
              this.run(label, (x) =>
                E.copyChannelSettings(
                  x,
                  d.id,
                  c.id,
                  chosen.map((y) => ({ dev: y.dev, ch: y.ch })),
                  whatSel,
                ),
              )
            ) {
              this.copy = null;
              this.notice = label;
            }
            this.requestUpdate();
          }}
        >
          ${t`Copy`}
        </button>
      </div>
    </fieldset>`;
  }

  // ── Controls ──

  /** Two-step delete button: the first click requests confirmation in place. */
  private dangerButton(
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

  private text(
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
              .value=${live(value)}
              @change=${(e: Event) => on((e.target as HTMLTextAreaElement).value)}
            ></textarea>`
          : html`<input
              .value=${live(value)}
              @change=${(e: Event) => on((e.target as HTMLInputElement).value.trim())}
            />`
      }
    </label>`;
  }

  private select(
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
  private compatible(doc: Doc, dpt: string | null) {
    return doc.groupAddresses.filter((g) => {
      const gd = E.gaDpt(doc, g.address);
      return !dpt || !gd || dptBits(gd) === dptBits(dpt);
    });
  }

  /** Choosing a unique address (emitting port, key), with creation on the fly. */
  private gaPicker(
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
  private gaAdder(
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

  /**
   * One line per port: a port that receives can listen to multiple addresses, a port that emits
   * has only one sending address.
   */
  /**
   * Association rows for a port, with or without a channel: one per object. Multiple
   * objects on the same port remain distinct; each keeps its addresses and flags.
   */
  private portRows(
    doc: Doc,
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
    const fallback = p.dpts === "any" ? "1.001" : p.dpts[0]!;
    const row = (o: E.Obj | undefined) => {
      const dpt = o?.dpt ?? fallback;
      return this.portRow(
        doc,
        objs.length > 1 ? `${title} · ${o!.name ?? o!.id}` : title,
        p.direction,
        o ? E.gasOf(o) : [],
        dpt,
        `${title} ${owner}`,
        (x, list) =>
          E.setPortGas(x, d.id, port, ch, list, {
            dpt,
            W: p.direction !== "out",
            T: p.direction === "out",
            name: ch === undefined ? title : `${title} ${owner}`,
            objectId: o?.id,
          }),
        o?.id,
      );
    };
    return objs.length ? objs.map(row) : [row(undefined)];
  }

  private portRow(
    doc: Doc,
    title: string,
    direction: "in" | "out" | undefined,
    gas: string[],
    dpt: string,
    newName: string,
    set: (doc: Doc, list: string[]) => void,
    objectId?: string,
  ) {
    const out = direction === "out";
    const compatible = this.compatible(doc, dpt);
    return html`<div class="g-port" data-obj=${objectId ?? ""}>
      <span class="g-plabel"
        >${title}<small>${out ? t`sends` : t`listens`}</small></span
      >
      ${
        out
          ? html`<div class="g-selgo">
              <select
                aria-label=${title}
                data-v=${gas[0] ?? ""}
                @change=${(e: Event) => {
                  const v = (e.target as HTMLSelectElement).value;
                  this.run(title, (x) =>
                    set(
                      x,
                      v === "__new" ? [E.newGa(x, dpt, newName)] : v ? [v] : [],
                    ),
                  );
                }}
              >
                <option value="">${t`— none —`}</option>
                ${gas[0] && !compatible.some((g) => g.address === gas[0]) ? html`<option value=${gas[0]}>${gas[0]}</option>` : nothing}
                ${compatible.map((g) => html`<option value=${g.address} ?selected=${g.address === gas[0]}>${g.address} · ${g.name ?? ""}</option>`)}
                <option value="__new">+ ${t`new address`}</option>
              </select>
              ${
                gas[0]
                  ? html`<button
                      class="g-go"
                      title=${t`Show address ${gas[0]}`}
                      aria-label=${t`Show address ${gas[0]}`}
                      @click=${() => this.go(`ga:${gas[0]}`)}
                    >
                      ›
                    </button>`
                  : nothing
              }
            </div>`
          : html`<div class="g-chips">
              ${gas.map(
                (g) =>
                  html`<span class="g-chip"
                    ><button
                      class="g-chip-go"
                      title=${t`Show address ${g}`}
                      @click=${() => this.go(`ga:${g}`)}
                    >
                      ${g}
                    </button>
                    <small
                      >${doc.groupAddresses.find((x) => x.address === g)?.name ?? ""}</small
                    >
                    <button
                      title=${t`Remove`}
                      aria-label=${t`Remove ${g}`}
                      @click=${() =>
                        this.run(title, (x) =>
                          set(
                            x,
                            gas.filter((y) => y !== g),
                          ),
                        )}
                    >
                      ×
                    </button></span
                  >`,
              )}
              ${this.gaAdder(doc, dpt, gas, newName, (ga, x) => set(x, [...gas, ga]), title)}
            </div>`
      }
    </div>`;
  }

  /** Parameters of a schema: current settings, or advanced settings (expert). */
  private params(
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

  private paramFields(
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
          .value=${live(String(shown))}
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
        .value=${live(isNull || value === undefined ? "" : String(value))}
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
function defaultEquipmentParams(registry: Registry, type: string, c?: Chan) {
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
