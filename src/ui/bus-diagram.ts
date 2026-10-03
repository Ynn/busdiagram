import { LitElement, html, nothing, svg } from "lit";
import type { PropertyValues, TemplateResult } from "lit";
import type {
  JournalEvent,
  JsonObject,
  OutputCommand,
  SimSnapshot,
} from "../knx/contracts";
import {
  checkValue,
  dptBits,
  dptName,
  formatValue,
  hvacModeName,
  preciseValue,
  shortValue,
} from "../knx/dpt";
import { buildFrame, hex } from "../knx/format";
import {
  CARD_W,
  KEY_GAP,
  PLATE_W,
  ROW,
  gaCell,
  layout,
  rowCenter,
} from "../knx/layout";
import type { CouplerG, DevG, Geometry, KeyG, LoadG, Pt } from "../knx/layout";
import { buildTopology } from "../knx/network";
import type { TopoCoupler, Topology } from "../knx/network";
import type { Button, Device, NumberInput, Scenario } from "../knx/scenario";
import {
  ScenarioError,
  buildScenario,
  gaName,
  parseClockStart,
} from "../knx/scenario";
import { LONG_MS, Simulation, describeCommand } from "../knx/sim";
import type { StepStop, Telegram } from "../knx/sim";
import { animate, easeOut } from "./animation";
import type { Glow } from "./animation";
import { equipmentView } from "./equipment";
import type { Translate } from "../i18n";
import { translator } from "../i18n";
import { resolveOptions } from "./options";
import { toV2 } from "../knx/export";
import { encodeShare } from "../share";
import type { ViewOptions } from "./options";
import { C, hexA, styles } from "./styles";

const win = (t: number, a: number, b: number, fi = 250, fo = 400) =>
  Math.min(easeOut((t - a) / fi), 1 - easeOut((t - b) / fo));

/** Maximum real-time step per frame; do not catch up after suspension. */
const MAX_FRAME_MS = 100;

interface Hold {
  dev: string;
  button: string;
  start: number;
  fired: boolean;
  hasLong: boolean;
  /** A long press was sent; release sends the stop-dimming action. */
  longFired?: boolean;
  /** Contact input: release sends "up"; the device measures the press itself. */
  contact?: boolean;
  pointerId: number | null;
}

const ICON: Record<string, string> = {
  on: "I",
  off: "O",
  toggle: "I/O",
  up: "▲",
  down: "▼",
  updown: "▲▼",
  scene: "☰",
  presence: "◉",
  clock: "◷",
  dimUp: "☼+",
  dimDown: "☼−",
};

const couplerInfo = (key: string, t: Translate): string =>
  ({
    line: t`Connects a line to the main line. It only forwards the group addresses of its filter table (used on both sides) and decrements the routing counter.`,
    area: t`Connects the main line of an area to the backbone. Same filter-table principle, at area level.`,
    router: t`Gateway between the TP bus and the IP network (KNXnet/IP). Its filter table only lets through addresses used on the other side.`,
    repeater: t`Extends the line electrically (new segment of 64 devices). No filtering: everything is repeated, and the routing counter is decremented.`,
    segmentCoupler: t`Splits the line into segments with a filter table: local traffic of one segment no longer reaches the other.`,
  })[key] ?? "";

const speeds = (t: Translate): [string, string][] => [
  ["0.35", t`Slow`],
  ["1", t`Normal`],
  ["2", t`Fast`],
  ["5", "×5"],
];

/** Classic extension scripts: they run before DOMContentLoaded. */
const domReady: Promise<void> =
  typeof document === "undefined" || document.readyState === "complete"
    ? Promise.resolve()
    : new Promise((r) => {
        document.addEventListener("DOMContentLoaded", () => r(), {
          once: true,
        });
        window.addEventListener("load", () => r(), { once: true });
      });

/** JSON.parse with a message that places the error (line, column). */
function parseJson(text: string, where: string, t: Translate): unknown {
  try {
    return JSON.parse(text);
  } catch (e) {
    const msg = String((e as Error).message);
    const m = /position (\d+)/.exec(msg);
    let at = "";
    if (m) {
      const before = text.slice(0, Number(m[1]));
      const line = before.split("\n").length;
      at = t` (line ${line}, column ${before.length - before.lastIndexOf("\n")})`;
    }
    throw new Error(t`Invalid JSON in ${where}${at}: ${msg}`, { cause: e });
  }
}

const pct = (v: unknown) =>
  typeof v === "number" ? `${Math.round(v)} %` : "—";

export class BusDiagram extends LitElement {
  static override styles = styles;
  static override properties = {
    scenario: { type: String },
    src: { type: String },
    options: { attribute: false },
    // Option attributes are read by resolveOptions and declared here to trigger rendering.
    toolbar: { type: String },
    monitor: { type: String },
    description: { type: String },
    hints: { type: String },
    fit: { type: String },
    maxScaleAttr: { type: String, attribute: "max-scale" },
    minScaleAttr: { type: String, attribute: "min-scale" },
    speedAttr: { type: String, attribute: "speed" },
    stepModeAttr: { type: String, attribute: "step-mode" },
    designerAttr: { type: String, attribute: "designer" },
  };

  declare scenario: string;
  declare src: string;
  /** Display options (take precedence over HTML attributes). */
  declare options: Partial<ViewOptions> | null;

  constructor() {
    super();
    this.scenario = "";
    this.src = "";
    this.options = null;
  }

  /**
   * Language: component `lang`, then nearest ancestor `lang`, otherwise English.
   * Scenario titles and names remain as authored content.
   */
  get language(): string {
    const own = this.closest("[lang]")?.getAttribute("lang");
    return own || "en";
  }

  private get tr(): Translate {
    return translator(this.language);
  }

  /** Effective options from the `options` property, attributes, and defaults. */
  get view(): ViewOptions {
    return resolveOptions((n) => this.getAttribute(n), this.options);
  }

  private model: Scenario | null = null;
  private topo: Topology | null = null;
  private geo: Geometry | null = null;
  private sim: Simulation | null = null;
  private unsubscribe: (() => void) | null = null;
  private error = "";
  private width = 900;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private hold: Hold | null = null;
  private speed = 1;
  private stepMode = false;
  private showTables = false;
  /** The simulated clock is being set from its badge. */
  private clockEdit = false;
  /** Group monitor temporarily shown in a larger modal dialog. */
  private monitorExpanded = false;
  private info: string | null = null;
  private selId: number | null = null;
  private seenTels = 0;
  private loadToken = 0;
  /** Link to the scenario in the designer, prepared when the scenario loads. */
  private designerLink: string | null = null;
  private ro: ResizeObserver | null = null;
  private stageRo: ResizeObserver | null = null;
  private stageBox = { w: 0, h: 0 };
  private drafts = new Map<string, string>();
  /** USB interface panel: interface, address, value, and most recent read request. */
  private usbPanel: {
    dev: string | null;
    ga: string;
    value: string;
    read: { id: number; ga: string } | null;
  } = { dev: null, ga: "", value: "1", read: null };

  override connectedCallback() {
    super.connectedCallback();
    this.ro = new ResizeObserver((e) => {
      const w = e[0]?.contentRect.width ?? 0;
      if (w && Math.abs(w - this.width) > 1) {
        this.width = w;
        this.requestUpdate();
      }
    });
    this.ro.observe(this);
    document.addEventListener("visibilitychange", this.onVisibility);
    document.addEventListener("fullscreenchange", this.onFullscreen);
    if (this.sim) this.kick();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.ro?.disconnect();
    this.ro = null;
    this.stageRo?.disconnect();
    this.stageRo = null;
    this.stopLoop();
    this.hold = null;
    document.removeEventListener("visibilitychange", this.onVisibility);
    document.removeEventListener("fullscreenchange", this.onFullscreen);
  }

  /** The diagram area is shown full screen (Fullscreen API on .stage-wrap). */
  private fullscreen = false;
  private onFullscreen = () => {
    const on = !!this.shadowRoot?.fullscreenElement;
    if (on !== this.fullscreen) {
      this.fullscreen = on;
      this.requestUpdate();
    }
  };
  private toggleFullscreen() {
    if (this.fullscreen) void document.exitFullscreen?.();
    else
      void this.renderRoot
        .querySelector<HTMLElement>(".stage-wrap")
        ?.requestFullscreen?.()
        .catch(() => undefined);
  }

  private onVisibility = () => {
    // When the tab is hidden, suspend simulation without catching up on return.
    if (document.hidden) this.stopLoop();
    else this.kick();
  };

  protected override willUpdate(changed: PropertyValues) {
    const v = this.view;
    // Reflected for the stylesheet (:host([data-fit="contain"])).
    if (this.getAttribute("data-fit") !== v.fit)
      this.setAttribute("data-fit", v.fit);
    if (
      changed.has("options") ||
      changed.has("speedAttr") ||
      changed.has("stepModeAttr")
    ) {
      if (v.speed !== null) this.speed = v.speed;
      if (changed.has("stepModeAttr") || this.options?.stepMode !== undefined)
        this.stepMode = v.stepMode;
    }
    if (changed.has("scenario") || changed.has("src") || !this.initialized) {
      this.initialized = true;
      void this.loadFromAttributes();
    }
  }

  private initialized = false;

  /** JSON directly in the element: child <script type="application/json"> or text content. */
  private inlineScenario(): string | null {
    const script = this.querySelector(
      ':scope > script[type="application/json"]',
    );
    if (script) return script.textContent ?? "";
    const text = [...this.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent ?? "")
      .join("")
      .trim();
    return text.startsWith("{") ? text : null;
  }

  private async loadFromAttributes() {
    const token = ++this.loadToken;
    try {
      await domReady;
      if (token !== this.loadToken) return;
      if (this.scenario) {
        const el = document.querySelector(this.scenario);
        if (!el)
          throw new Error(
            this.tr`Element ${this.scenario} not found in the page.`,
          );
        this.load(parseJson(el.textContent ?? "", this.scenario, this.tr));
      } else if (this.src) {
        const url = this.src;
        const r = await fetch(url);
        if (token !== this.loadToken) return;
        if (!r.ok)
          throw new Error(this.tr`Could not load ${url} (${r.status}).`);
        const data = await r.json();
        // A newer load was requested meanwhile; discard this stale response.
        if (token !== this.loadToken) return;
        this.load(data);
      } else if (!this.model && !this.sim) {
        const inline = this.inlineScenario();
        if (inline !== null)
          this.load(
            parseJson(inline, this.tr`the content of <bus-diagram>`, this.tr),
          );
      }
    } catch (e) {
      if (token === this.loadToken) this.fail(e);
    }
  }

  // ── API publique ────────────────────────────────────────────────────────

  /** Load a parsed JSON scenario and stop the previous instance. */
  load(data: unknown) {
    this.loadToken++;
    this.teardown();
    try {
      const model = buildScenario(data, undefined, this.tr);
      const topo = buildTopology(model);
      const geo = layout(model, topo, {
        equipmentSize: (v) => equipmentView(v)?.size,
        t: this.tr,
      });
      this.model = model;
      this.topo = topo;
      this.geo = geo;
      this.speed = this.view.speed ?? model.options.speed;
      this.stepMode = this.view.stepMode;
      this.showTables = model.options.filterTables;
      this.error = "";
      this.sim = new Simulation(model, { lang: this.language });
      this.attach(this.sim);
      this.prepareDesignerLink(model);
      this.clearUi();
      this.requestUpdate();
      // A simulated clock runs without waiting for an input.
      if (this.isConnected && model.clock) this.kick();
      this.dispatchEvent(
        new CustomEvent("bd-ready", { bubbles: true, composed: true }),
      );
    } catch (e) {
      this.fail(e);
    }
  }

  /** Reset to initial state at t = 0, retaining speed and display settings. */
  reset() {
    if (!this.sim) return;
    this.sim.reset();
    this.clearUi();
    this.stopLoop();
    this.requestUpdate();
    if (this.sim.clock()) this.kick();
  }

  play() {
    this.sim?.play();
    this.kick();
  }

  pause() {
    this.sim?.pause();
    this.requestUpdate();
  }

  /** Manually advance by an integer number of milliseconds, including while paused. */
  advance(dtMs: number) {
    this.sim?.advance(dtMs);
    this.requestUpdate();
  }

  stepToNextEvent(): StepStop | null {
    const stop = this.sim?.stepToNextEvent() ?? null;
    this.requestUpdate();
    return stop;
  }

  /**
   * Group write from the scenario's USB interface (or `deviceId`); return the telegram,
   * or null if there is no interface.
   */
  groupWrite(ga: string, value: number, deviceId?: string): Telegram | null {
    const dev = deviceId ?? this.interfaces()[0]?.id;
    const tel = dev ? (this.sim?.groupWrite(dev, ga, value) ?? null) : null;
    if (tel && this.stepMode) this.sim?.pause();
    this.afterInput();
    return tel;
  }

  /** Group read from the USB interface; responses appear in the monitor. */
  groupRead(ga: string, deviceId?: string): Telegram | null {
    const dev = deviceId ?? this.interfaces()[0]?.id;
    const tel = dev ? (this.sim?.groupRead(dev, ga) ?? null) : null;
    if (tel) this.usbPanel.read = { id: tel.id, ga };
    if (tel && this.stepMode) this.sim?.pause();
    this.afterInput();
    return tel;
  }

  private interfaces(): Device[] {
    return (this.model?.devices ?? []).filter(
      (d) => d.presentation.busInterface,
    );
  }

  getState(): SimSnapshot | null {
    return this.sim?.getState() ?? null;
  }

  setSpeed(n: number) {
    if (typeof n !== "number" || !Number.isFinite(n) || n <= 0)
      throw new RangeError(
        this.tr`setSpeed: finite positive number expected (got ${n})`,
      );
    this.speed = n;
    this.requestUpdate();
  }

  get simulation(): Simulation | null {
    return this.sim;
  }

  /**
   * Simplified subscription: `el.on("telegram", (detail) => …)` for bd-telegram,
   * bd-ready, and bd-error; returns an unsubscribe function.
   */
  on(
    name: "telegram" | "ready" | "error",
    fn: (detail: unknown) => void,
  ): () => void {
    const type = `bd-${name}`;
    const h = (e: Event) => fn((e as CustomEvent).detail);
    this.addEventListener(type, h);
    return () => this.removeEventListener(type, h);
  }

  // ── Internal lifecycle ─────────────────────────────────────────────────

  private attach(sim: Simulation) {
    const offTel = sim.onTelegram((tel) => this.announce(tel));
    const offJournal = sim.subscribe((e) => {
      if (e.kind === "diagnostic" && sim.fault) this.requestUpdate();
    });
    this.unsubscribe = () => {
      offTel();
      offJournal();
    };
  }

  /**
   * Link of the toolbar icon: the scenario, compressed into the fragment of the designer's
   * address. Prepared in advance, so that the click is a plain link (new tab, no pop-up
   * blocking, middle click).
   */
  private prepareDesignerLink(model: Scenario) {
    this.designerLink = null;
    const token = this.loadToken;
    let scenario: unknown;
    try {
      scenario = toV2(model);
    } catch {
      return;
    }
    void encodeShare(scenario, {}, this.language)
      .then((fragment) => {
        if (token !== this.loadToken) return;
        this.designerLink = fragment;
        this.requestUpdate();
      })
      .catch(() => {
        // No link: the icon stays hidden.
      });
  }

  /** Address opened by the icon, or null when it is hidden. */
  private designerHref(): string | null {
    const base = this.view.designer;
    if (!this.designerLink || !base || base === "none") return null;
    // The language, readable without decompressing, opens the designer in that language.
    return `${base.split("#")[0]}#${this.designerLink}&lang=${encodeURIComponent(this.language)}`;
  }

  private designerIcon(cls: string) {
    const href = this.designerHref();
    if (!href) return nothing;
    const label = this.tr`Open in the designer`;
    return html`<a
      class=${cls}
      href=${href}
      target="_blank"
      rel="noopener"
      title=${label}
      aria-label=${label}
      ><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          d="M9.5 2.5h4v4M13.5 2.5 8 8M12 9.5v3.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        /></svg
    ></a>`;
  }

  private teardown() {
    this.stopLoop();
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.sim = null;
    this.model = null;
    this.hold = null;
  }

  private clearUi() {
    this.selId = null;
    this.info = null;
    this.seenTels = 0;
    this.hold = null;
    this.acc = 0;
    this.drafts.clear();
  }

  private fail(e: unknown) {
    this.teardown();
    this.geo = null;
    this.topo = null;
    const details = e instanceof ScenarioError ? e.details : [];
    this.error =
      e instanceof ScenarioError
        ? this.tr`Invalid scenario:` + "\n• " + e.problems.join("\n• ")
        : String((e as Error)?.message ?? e);
    const message = this.error;
    this.dispatchEvent(
      new CustomEvent("bd-error", {
        detail: { message, details, toString: () => message },
        bubbles: true,
        composed: true,
      }),
    );
    this.requestUpdate();
  }

  private announce(tel: Telegram) {
    this.dispatchEvent(
      new CustomEvent("bd-telegram", {
        detail: {
          id: tel.id,
          timeMs: tel.timeMs,
          source: tel.sourceAddress,
          destination: tel.ga,
          value: tel.value,
          raw: tel.raw,
          dpt: tel.dpt,
          service: tel.service,
          causeId: tel.causeId,
          kind: tel.kind,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ── Animation loop: real time drives the simulated clock ──

  private stopLoop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private kick() {
    this.requestUpdate();
    if (
      this.raf ||
      !this.isConnected ||
      (typeof document !== "undefined" && document.hidden)
    )
      return;
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = 0;
      const sim = this.sim;
      if (!sim) return;
      const real = Math.min(MAX_FRAME_MS, Math.max(0, now - this.last));
      this.last = now;
      const h = this.hold;
      if (
        h &&
        h.hasLong &&
        !(h.contact ? h.longFired : h.fired) &&
        now - h.start >= this.holdMs(h)
      ) {
        h.fired = true;
        h.longFired = true;
        this.gesture(h.dev, h.button, h.contact ? "hold" : "long");
      }
      if (!sim.paused) {
        this.acc += real * this.speed;
        const step = Math.floor(this.acc);
        this.acc -= step;
        if (step > 0) {
          if (this.stepMode) {
            const stop = sim.advanceUntilExplained(step);
            if (stop) {
              sim.pause();
              this.acc = 0;
            }
          } else sim.advance(step);
        }
      }
      this.requestUpdate();
      const animating = sim.visibleTelegrams().length > 0;
      // With a simulated clock, time keeps running even when the bus is idle.
      if (
        this.hold ||
        (!sim.paused && (sim.busy() || animating || sim.clock() !== null))
      )
        this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** Local gesture; in step mode, its transmission is the first stop. */
  private gesture(
    dev: string,
    id: string,
    g:
      "press" | "short" | "long" | "release" | "value" | "down" | "up" | "hold",
    value?: number,
  ) {
    const sim = this.sim;
    if (!sim) return;
    const sent = sim.input(dev, id, g, value);
    if (this.stepMode && sent.length) sim.pause();
    this.afterInput();
  }

  private afterInput() {
    this.selId = null;
    this.kick();
  }

  // ── Gestes ──────────────────────────────────────────────────────────────

  private onDown(e: PointerEvent, d: Device, b: Button) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.sim || this.hold) return;
    const el = e.currentTarget as HTMLElement;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // If pointer capture is unavailable, handle release on the key itself.
    }
    this.hold = {
      dev: d.id,
      button: b.id,
      start: performance.now(),
      fired: false,
      hasLong: b.contact ? typeof b.longPressMs === "number" : !!b.long,
      contact: !!b.contact,
      pointerId: e.pointerId,
    };
    if (b.contact) {
      this.hold.fired = true;
      this.gesture(d.id, b.id, "down");
    } else if (b.press) {
      this.hold.fired = true;
      this.gesture(d.id, b.id, "press");
    } else this.afterInput();
  }

  private onUp(e: PointerEvent) {
    const h = this.hold;
    if (
      !h ||
      !this.sim ||
      (h.pointerId !== null && e.pointerId !== h.pointerId)
    )
      return;
    this.hold = null;
    if (h.contact) this.gesture(h.dev, h.button, "up");
    else if (!h.fired) this.gesture(h.dev, h.button, "short");
    else if (h.longFired && this.hasRelease(h.dev, h.button))
      this.gesture(h.dev, h.button, "release");
    else this.afterInput();
  }

  /**
   * On pointercancel or lost capture, do not invent a short press; stop any dimming
   * already started by a long press.
   */
  private onCancel(e: PointerEvent) {
    const h = this.hold;
    if (!h || (h.pointerId !== null && e.pointerId !== h.pointerId)) return;
    this.hold = null;
    // A contact key releases only after a long press, to stop a dimming or a movement.
    if (h.contact && h.longFired) this.gesture(h.dev, h.button, "up");
    else if (!h.contact && h.longFired && this.hasRelease(h.dev, h.button))
      this.gesture(h.dev, h.button, "release");
    else this.requestUpdate();
  }

  private hasRelease(dev: string, button: string) {
    return !!this.model?.devicesById
      .get(dev)
      ?.buttons.find((x) => x.id === button)?.release;
  }

  /** Keyboard: Shift+Enter starts a long press held until key release. */
  private keyLong: { dev: string; button: string } | null = null;

  private onKeyUp(e: KeyboardEvent, d: Device, b: Button) {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (b.contact) {
      e.preventDefault();
      e.stopPropagation();
      if (this.hold?.dev === d.id && this.hold.button === b.id) {
        this.hold = null;
        this.gesture(d.id, b.id, "up");
      }
      return;
    }
    const k = this.keyLong;
    if (!k || k.dev !== d.id || k.button !== b.id) return;
    this.keyLong = null;
    e.preventDefault();
    e.stopPropagation();
    this.gesture(d.id, b.id, "release");
  }

  private onKey(e: KeyboardEvent, d: Device, b: Button) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    // Inside a reveal.js slide, Space and Enter must not advance the slide.
    e.stopPropagation();
    if (e.repeat || !this.sim) return;
    // A contact key stays pressed while the key is held down.
    if (b.contact) {
      if (this.hold) return;
      this.hold = {
        dev: d.id,
        button: b.id,
        start: performance.now(),
        fired: true,
        hasLong: typeof b.longPressMs === "number",
        contact: true,
        pointerId: null,
      };
      this.gesture(d.id, b.id, "down");
      // Shift+Enter: a long press at once, held until the key is released.
      if (e.shiftKey && this.hold?.hasLong) {
        this.hold.longFired = true;
        this.gesture(d.id, b.id, "hold");
      }
      return;
    }
    const g = b.press
      ? "press"
      : e.shiftKey && b.long
        ? "long"
        : b.short
          ? "short"
          : "long";
    this.gesture(d.id, b.id, g);
    if (g === "long" && b.release) this.keyLong = { dev: d.id, button: b.id };
  }

  private submitNumber(d: Device, n: NumberInput, raw: string) {
    const v = Number(raw.replace(",", "."));
    if (!this.sim || raw.trim() === "" || !Number.isFinite(v)) return;
    const clamped = Math.min(n.max, Math.max(n.min, v));
    this.drafts.set(`${d.id}/${n.id}`, String(clamped));
    this.gesture(d.id, n.id, "value", clamped);
  }

  protected override updated() {
    const n = this.sim?.history.length
      ? this.sim.history[this.sim.history.length - 1]!.id
      : 0;
    if (n !== this.seenTels) {
      this.seenTels = n;
      this.renderRoot
        .querySelectorAll(".mon")
        .forEach((m) => (m.scrollTop = m.scrollHeight));
    }
    const dialog =
      this.renderRoot.querySelector<HTMLDialogElement>("dialog.enlarged");
    if (dialog && !dialog.open) {
      dialog.showModal();
      const m = dialog.querySelector(".mon");
      if (m) m.scrollTop = m.scrollHeight;
    }
    // In contain mode, scale depends on available diagram space.
    // The scroller is the space left for the diagram (below the clock bar, if any).
    const wrap = this.renderRoot.querySelector(".scroller");
    if (wrap && wrap !== this.observedWrap) {
      this.stageRo?.disconnect();
      this.observedWrap = wrap;
      this.stageRo = new ResizeObserver((e) => {
        const r = e[0]?.contentRect;
        if (!r) return;
        if (
          Math.abs(r.width - this.stageBox.w) > 1 ||
          Math.abs(r.height - this.stageBox.h) > 1
        ) {
          this.stageBox = { w: r.width, h: r.height };
          if (this.view.fit === "contain" || this.fullscreen)
            this.requestUpdate();
        }
      });
      this.stageRo.observe(wrap);
    }
  }

  private observedWrap: Element | null = null;

  // ── Rendu ───────────────────────────────────────────────────────────────
  override render() {
    if (this.error) return html`<div class="err">${this.error}</div>`;
    const s = this.model;
    const g = this.geo;
    const topo = this.topo;
    const sim = this.sim;
    if (!s || !g || !sim || !topo)
      return html`<div class="empty">${this.tr`Loading KNX scenario…`}</div>`;
    const t = sim.timeMs;
    const v = this.view;
    const contain =
      (v.fit === "contain" || this.fullscreen) &&
      this.stageBox.w > 0 &&
      this.stageBox.h > 0;
    // In width mode, scroll below minScale rather than making the diagram unreadable.
    // Full screen may enlarge a small diagram beyond maxScale.
    const maxScale = this.fullscreen ? Math.max(v.maxScale, 2.5) : v.maxScale;
    const scale = contain
      ? Math.min(maxScale, this.stageBox.w / g.W, this.stageBox.h / g.H)
      : Math.min(v.maxScale, Math.max(v.minScale, this.width / g.W));
    const live = sim.visibleTelegrams();
    const anims = live.map((tel) => ({
      tel,
      ...this.animTel(tel, s, g, topo, t),
    }));
    const hasLong = s.devices.some((d) =>
      d.buttons.some((b) => b.long || b.contact),
    );
    const exts = s.lines.filter((l) => l.extension?.switchable);
    const stop = sim.paused && this.stepMode ? sim.lastStop : null;

    const toolbar =
      v.toolbar === "full" ? this.renderToolbar(s, g, sim, exts) : nothing;
    return html`<div class="kv ${v.fit === "contain" ? "contain" : ""}">
      ${toolbar}
      ${v.description && s.description ? html`<p class="desc">${s.description}</p>` : nothing}
      ${this.renderConfigWarnings(sim)}

      <div
        class="stage-wrap"
        @click=${() => ((this.info = null), this.requestUpdate())}
      >
        ${this.renderClock(sim)}
        <div class="scroller">
          <div
            class="stage-size"
            style="width:${g.W * scale}px;height:${g.H * scale}px;background-size:${24 * scale}px ${24 * scale}px"
          >
            <div
              class="stage"
              style="width:${g.W}px;height:${g.H}px;transform:scale(${scale})"
            >
              ${g.zones.map((z) => html`<div class="zone" style="left:${z.x}px;top:${z.y}px;width:${z.w}px;height:${z.h}px"><span>${z.label}</span></div>`)}
              ${this.renderWires(s, g, sim, anims)}
              ${this.renderSegLabels(g, s)}
              ${s.devices.map((d) => this.renderDevice(d, g.devices.get(d.id)!, sim))}
              ${g.couplers.map((c) => this.renderCoupler(c, sim, live, t))}
              ${this.renderTags(g, live, t)}
              ${anims.map((a) => a.pills.map((p) => this.renderPill(a.tel, p)))}
              ${this.renderHold(s, g)}
            </div>
          </div>
        </div>
        ${v.toolbar === "compact" ? this.renderCompactControls(sim) : nothing}
        ${
          typeof document !== "undefined" && document.fullscreenEnabled
            ? html`<button
                class="fsbtn"
                title=${this.fullscreen ? this.tr`Exit full screen` : this.tr`Full screen`}
                aria-label=${this.fullscreen ? this.tr`Exit full screen` : this.tr`Full screen`}
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this.toggleFullscreen();
                }}
              >
                ${
                  this.fullscreen
                    ? html`<svg
                        viewBox="0 0 16 16"
                        width="15"
                        height="15"
                        aria-hidden="true"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4" />
                      </svg>`
                    : html`<svg
                        viewBox="0 0 16 16"
                        width="15"
                        height="15"
                        aria-hidden="true"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
                      </svg>`
                }
              </button>`
            : nothing
        }
        ${
          sim.fault
            ? html`<div
                class="banner fault"
                @click=${(e: Event) => e.stopPropagation()}
              >
                <span
                  >${this.tr`Simulation stopped:`} ${sim.fault.message}</span
                >
                <button class="btn" @click=${() => this.reset()}>
                  ${this.tr`Reset`}
                </button>
              </div>`
            : stop
              ? html`<div
                  class="banner"
                  @click=${(e: Event) => e.stopPropagation()}
                >
                  <span>❚❚ ${this.stopText(stop, s, sim)}</span>
                  <button class="btn primary" @click=${() => this.play()}>
                    ${this.tr`Next ▶`}
                  </button>
                </div>`
              : nothing
        }
        ${this.renderInfo(s, g, sim)}
      </div>
      ${v.hints && hasLong ? html`<div class="hint">${this.tr`Click = short press · hold 0.5 s = long press (keyboard: Enter / Shift+Enter)`}</div>` : nothing}
      ${
        v.monitor || this.interfaces().length || s.rooms.length
          ? html`<div class="bottom">
              ${s.rooms.length ? this.renderRooms(s, sim) : nothing}
              ${this.interfaces().length ? this.renderUsbPanel(s, sim) : nothing}
              ${v.monitor ? html`${this.renderMonitor(s, sim)} ${this.renderDetail(s, g, sim)}` : nothing}
            </div>`
          : nothing
      }
      ${v.monitor && this.monitorExpanded ? this.renderEnlargedMonitor(s, g, sim) : nothing}
    </div>`;
  }

  /** Parameters that disagree with the load they compensate (see consistency.ts). */
  private renderConfigWarnings(sim: Simulation) {
    const list = sim.diagnostics.filter((d) => d.code.startsWith("config-"));
    if (!list.length) return nothing;
    return html`<div class="cfgwarn" role="note">
      <b>${this.tr`Configuration check`}</b>
      <ul>
        ${list.map((d) => html`<li>${d.message}</li>`)}
      </ul>
    </div>`;
  }

  private renderCompactControls(sim: Simulation) {
    return html`<div class="mini" @click=${(e: Event) => e.stopPropagation()}>
      <button
        title=${sim.paused ? this.tr`Resume` : this.tr`Pause`}
        aria-label=${sim.paused ? this.tr`Resume` : this.tr`Pause`}
        ?disabled=${!!sim.fault}
        @click=${() => (sim.paused ? this.play() : this.pause())}
      >
        ${sim.paused ? "▶" : "❚❚"}
      </button>
      <button
        class=${this.stepMode ? "on" : ""}
        title=${this.tr`Step by step`}
        aria-label=${this.tr`Step by step`}
        aria-pressed=${this.stepMode ? "true" : "false"}
        @click=${() => this.toggleStepMode(sim)}
      >
        ⇥
      </button>
      <button
        title=${this.tr`Reset`}
        aria-label=${this.tr`Reset`}
        @click=${() => this.reset()}
      >
        ↺
      </button>
      ${this.designerIcon("ico")}
    </div>`;
  }

  private toggleStepMode(sim: Simulation) {
    this.stepMode = !this.stepMode;
    if (!this.stepMode) sim.play();
    this.kick();
  }

  private renderToolbar(
    s: Scenario,
    g: Geometry,
    sim: Simulation,
    exts: Scenario["lines"],
  ) {
    return html`<div class="bar">
      <h2>${s.title}</h2>
      ${exts.map(
        (l) =>
          html`<div class="grp">
            <span class="lbl">${this.tr`Extension`} ${l.address}</span>
            ${this.segCtl(
              [
                ["repeater", this.tr`Repeater`],
                ["segmentCoupler", this.tr`Segment coupler`],
              ],
              sim.network.extMode(l.address),
              (v) => {
                sim.network.setExtMode(l.address, v as "repeater");
                this.requestUpdate();
              },
            )}
          </div>`,
      )}
      <div class="grp">
        <span class="lbl">${this.tr`Speed`}</span>
        ${this.segCtl(speeds(this.tr), String(this.speed), (v) => this.setSpeed(Number(v)))}
      </div>
      ${
        g.couplers.length
          ? html`<button
              class="btn ${this.showTables ? "on" : ""}"
              @click=${() => ((this.showTables = !this.showTables), this.requestUpdate())}
            >
              ${this.tr`Filter tables`}
            </button>`
          : nothing
      }
      <button
        class="btn ${this.stepMode ? "on" : ""}"
        title=${this.tr`Stop at every transmission, coupler, reception, output change and timer`}
        @click=${() => {
          this.stepMode = !this.stepMode;
          if (!this.stepMode) sim.play();
          this.kick();
        }}
      >
        ${this.tr`Step by step`}
      </button>
      <button
        class="btn"
        ?disabled=${!!sim.fault}
        @click=${() => (sim.paused ? this.play() : this.pause())}
      >
        ${sim.paused ? `▶ ${this.tr`Resume`}` : `❚❚ ${this.tr`Pause`}`}
      </button>
      <button class="btn" @click=${() => this.reset()}>
        ${this.tr`Reset`}
      </button>
      ${this.designerIcon("btn ico")}
    </div>`;
  }

  private segCtl(
    opts: [string, string][],
    value: string,
    on: (v: string) => void,
  ) {
    return html`<div class="seg">
      ${opts.map(([v, l]) => html`<button class=${v === value ? "sel" : ""} @click=${() => on(v)}>${l}</button>`)}
    </div>`;
  }

  private animTel(
    tel: Telegram,
    s: Scenario,
    g: Geometry,
    topo: Topology,
    t: number,
  ) {
    const src = s.devicesById.get(tel.sourceDeviceId)!;
    const srcG = g.devices.get(src.id)!;
    const i = src.objects.findIndex((o) => o.id === tel.objectId);
    return animate(tel.plan, topo, g, t, gaCell(srcG, src, i), (r) => {
      const d = s.devicesById.get(r.deviceId)!;
      const dg = g.devices.get(r.deviceId)!;
      const first = r.objectIds[0];
      return first
        ? gaCell(
            dg,
            d,
            d.objects.findIndex((o) => o.id === first),
          )
        : null;
    });
  }

  private liveOutput(o: OutputCommand | null) {
    return (
      !!o &&
      (o.type === "switch"
        ? o.on
        : o.type === "dim"
          ? o.level > 0
          : o.direction !== "stop")
    );
  }

  private renderWires(
    s: Scenario,
    g: Geometry,
    sim: Simulation,
    anims: { tel: Telegram; glows: Glow[] }[],
  ) {
    const segW = { backbone: 8, main: 6, line: 5, ip: 3 } as const;
    const parts: TemplateResult[] = [];
    g.segs.forEach((sg) => {
      const ip = sg.kind === "ip";
      // A segment without bus voltage is drawn grey and dashed.
      const dead = !ip && !sim.busVoltage(sg.id);
      const d = sg.pts.map((p) => p.join(",")).join(" ");
      parts.push(
        svg`<polyline points=${d} fill="none" stroke=${ip ? C.ip : dead ? "#a9a49a" : C.bus} stroke-width=${segW[sg.kind]} stroke-linecap="round" stroke-linejoin="round" stroke-dasharray=${ip ? "7 6" : dead ? "10 7" : "none"}></polyline>`,
      );
      // Bright center highlight gives the cable shape.
      if (!ip && !dead)
        parts.push(
          svg`<polyline points=${d} fill="none" stroke="#8fe0bd" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"></polyline>`,
        );
    });
    g.couplers.forEach((c) => {
      // KNXnet/IP router: side A (primary line) is on the IP network.
      const ipA = c.kind === "router";
      parts.push(
        svg`<line x1=${c.A.p[0]} y1=${c.A.p[1]} x2=${c.c[0]} y2=${c.c[1]} stroke=${ipA ? C.ip : C.bus} stroke-width=${ipA ? 3 : 5} stroke-dasharray=${ipA ? "7 6" : "none"}></line>`,
      );
      parts.push(
        svg`<line x1=${c.c[0]} y1=${c.c[1]} x2=${c.B.p[0]} y2=${c.B.p[1]} stroke=${C.bus} stroke-width="5"></line>`,
      );
    });
    s.devices.forEach((d) => {
      const dg = g.devices.get(d.id)!;
      const ip = d.medium === "IP";
      parts.push(
        svg`<line x1=${dg.drop[0]} y1=${dg.drop[1]} x2=${dg.at[0]} y2=${dg.at[1]} stroke=${ip ? C.ip : C.bus} stroke-width=${ip ? 3 : 4} stroke-dasharray=${ip ? "7 6" : "none"}></line>`,
      );
      parts.push(
        svg`<circle cx=${dg.at[0]} cy=${dg.at[1]} r="5.5" fill="#fff" stroke=${ip ? C.ip : C.bus} stroke-width="3"></circle>`,
      );
      // One vertical wire column per load, so that the wires of stacked loads stay
      // distinct: the upper load uses the column closest to the loads.
      const order = [...dg.loads].sort((a, b) => a.top - b.top);
      const room = (order[0]?.x ?? 0) - (dg.x + CARD_W) - 20;
      const step = Math.min(10, room / Math.max(1, order.length - 1));
      dg.loads.forEach((l) => {
        // The 230 V cable is energized when the relay output is active.
        const live = this.liveOutput(sim.output(d.id, l.channel));
        const column =
          order.length > 1 ? l.x - 8 - order.indexOf(l) * step : l.x - 14;
        l.rows.forEach((i) => {
          const y = rowCenter(dg, i);
          const x0 = dg.x + CARD_W;
          const xm = column;
          parts.push(
            svg`<path d=${Math.abs(y - l.cy) < 1 ? `M${x0} ${y} H${l.x - 2}` : `M${x0} ${y} H${xm} V${l.cy} H${l.x - 2}`} stroke=${live ? C.v230 : "#e6c3b2"} stroke-width=${live ? 3 : 2} fill="none" stroke-linejoin="round" style="transition:stroke .3s"></path>`,
          );
        });
        // Normally closed relay: inversion bubble and "NC" label on the load wire.
        const ch = d.channels.find((c) => c.id === l.channel);
        if (ch?.parameters.relayMode === "normallyClosed")
          parts.push(
            svg`<g class="nc"><title>${this.tr`Normally closed relay: the load is powered while the channel is off.`}</title><circle cx=${l.x - 5} cy=${l.cy} r="4" fill="#fff" stroke=${C.amber} stroke-width="2"></circle><text x=${l.x - 12} y=${l.cy - 7} text-anchor="end" font-size="10" font-weight="700" fill=${C.amber}>NC</text></g>`,
          );
      });
      dg.plate?.keys.forEach((k) =>
        k.rows.forEach((i) => {
          const y = rowCenter(dg, i);
          const x0 = dg.x - KEY_GAP - 7;
          parts.push(
            svg`<path d=${`M${x0} ${k.top + k.h / 2} H${x0 + 5} V${y} H${dg.x}`} stroke="#cdc7b8" stroke-width="1.5" fill="none" stroke-linejoin="round"></path>`,
          );
        }),
      );
    });
    anims.forEach((a) =>
      a.glows.forEach((gl) =>
        parts.push(
          svg`<polyline points=${(gl.pts ?? [gl.a, gl.b]).map((p) => p.join(",")).join(" ")} fill="none" stroke=${C.tg} stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=${gl.o} stroke-dasharray=${a.tel.kind === "state" ? "3 13" : "none"}></polyline>`,
        ),
      ),
    );
    return html`<svg width=${g.W} height=${g.H}>${parts}</svg>`;
  }

  /**
   * Power supply of a line segment (L1.1) or of its downstream segment (L1.1b); a click
   * cuts or restores the bus voltage of the segment.
   */
  private segPsu(s: Scenario, segId: string) {
    const m = /^L(\d+\.\d+)(b?)$/.exec(segId);
    const l = m ? s.lines.find((x) => x.address === m[1]) : undefined;
    const psu = m?.[2] ? l?.extension?.powerSupply : l?.powerSupply;
    if (!psu) return nothing;
    const on = this.sim?.busVoltage(segId) ?? true;
    const text = psu.currentMa
      ? this.tr`PSU ${psu.currentMa} mA`
      : this.tr`PSU`;
    const label = [
      this.tr`Bus power supply with choke`,
      psu.name,
      on
        ? this.tr`click to cut the bus voltage`
        : this.tr`no bus voltage: click to restore it`,
    ]
      .filter(Boolean)
      .join(" · ");
    return html`<button
      class="psu ${on ? "" : "off"}"
      title=${label}
      aria-label=${label}
      aria-pressed=${on ? "false" : "true"}
      @click=${(e: Event) => {
        e.stopPropagation();
        const sim = this.sim;
        if (!sim) return;
        const sent = sim.setBusVoltage(segId, !on);
        if (this.stepMode && sent.length) sim.pause();
        this.afterInput();
      }}
    >
      ${text}${on ? nothing : html` · ${this.tr`off`}`}
    </button>`;
  }

  private renderSegLabels(g: Geometry, s: Scenario) {
    return [...g.segs.values()].map((sg) => {
      const [x, y] = sg.labelAt;
      const color = sg.kind === "ip" ? `color:${C.ip};` : "";
      if (sg.labelDir === "v")
        return html`<div
          class="seglabel"
          style="left:${x}px;top:${y}px;${color}transform:rotate(-90deg);transform-origin:left top"
        >
          ${sg.label}
        </div>`;
      return html`<div
        class="seglabel"
        style="left:${x}px;top:${y}px;${color}${sg.kind === "ip" ? "transform:translateX(-100%)" : ""}"
      >
        ${sg.label}${this.segPsu(s, sg.id)}
      </div>`;
    });
  }

  private renderDevice(d: Device, dg: DevG, sim: Simulation) {
    const t = sim.timeMs;
    const sup = d.presentation.supervisor;
    const cells = d.objects.map((o) => {
      const at = sim.objectUpdatedAt(d.id, o.id);
      const fresh = at !== null && t - at < 1300;
      const v = sim.objectValue(d.id, o.id);
      const sv = shortValue(o.dpt, v);
      // For a long value such as temperature, compact the cell and shift the address.
      const wide = sv.length >= 5 || (dptBits(o.dpt) >= 16 && sv.length >= 4);
      const valBox = html`<span
        class="val ${d.receiver ? "l" : "r"} ${fresh ? "fresh" : ""} ${v ? "set" : ""} ${wide ? "w" : ""}"
        title="${this.tr`Internal object value:`} ${preciseValue(o.dpt, v, this.tr)}"
        >${sv}</span
      >`;
      const others = o.gas.slice(1);
      // Room for the value box beside the address, in proportion to its text.
      const room = wide
        ? `padding-${d.receiver ? "left" : "right"}:${Math.max(30, sv.length * 6 + 10)}px`
        : "";
      const ga = html`<div
        class="cell ga ${fresh ? "hi" : ""} ${wide ? (d.receiver ? "pl" : "pr") : ""}"
        style=${room}
        title=${o.gas.map((x) => `${x} ${gaName(this.model!, x)}`).join("\n")}
      >
        <span>${o.gas[0] ?? "—"}</span
        >${others.length ? html`<small>${others.join(" ")}</small>` : nothing}${valBox}
      </div>`;
      // Limit long names to two lines, or one beside a supervisor display value.
      const lab = html`<div class="cell ${fresh ? "hi" : ""}" title=${o.name}>
        <span style="min-width:0;max-width:100%"
          ><span
            class="txt ${o.name.length > 22 ? "long" : ""} ${sup ? "one" : ""}"
            >${o.name}</span
          >${sup ? html`<span class="sub">${formatValue(o.dpt, v, this.tr)}</span>` : nothing}</span
        >
      </div>`;
      return d.receiver ? [ga, lab] : [lab, ga];
    });
    const sel = this.info === "dev:" + d.id;
    return html`
      ${dg.plate ? this.renderPlate(d, dg, sim) : nothing}
      <div
        class="card ${sup ? "sup" : ""} ${sim.devicePowered(d.id) ? "" : "unpowered"}"
        style="left:${dg.x}px;top:${dg.top}px;width:${dg.w}px;grid-auto-rows:${ROW - 1}px;${sel ? `box-shadow:0 0 0 4px ${hexA(C.cpl, 0.35)}` : ""}"
        title=${this.tr`Click to inspect objects and channels`}
        @click=${(e: Event) => {
          e.stopPropagation();
          this.info = sel ? null : "dev:" + d.id;
          this.requestUpdate();
          // Allows a host page (the designer) to open the device editor.
          this.dispatchEvent(
            new CustomEvent("bd-select", {
              detail: { deviceId: d.id },
              bubbles: true,
              composed: true,
            }),
          );
        }}
      >
        <div class="cell ia">
          ${d.address || "KNXnet/IP"}${
            d.presentation.remoteSystem
              ? html`<small class="sys"
                  >⇄ ${String(sim.deviceState(d.id).system ?? "")}</small
                >`
              : nothing
          }
        </div>
        <div class="cell name" title=${d.name}>${d.name}</div>
        ${cells}
      </div>
      ${dg.loads.map((l) => this.renderLoad(d, l, sim))}
    `;
  }

  private renderPlate(d: Device, dg: DevG, sim: Simulation) {
    const p = dg.plate!;
    return html`<div
      class="plate"
      style="left:${p.x}px;top:${p.top}px;width:${PLATE_W}px;height:${p.h}px"
    >
      ${p.keys.map((k) => (k.kind === "button" ? this.renderKey(d, k, p.top, sim) : k.kind === "screen" ? this.renderScreen(d, k, p.top, sim) : this.renderNumber(d, k, p.top, sim)))}
    </div>`;
  }

  private renderKey(d: Device, k: KeyG, plateTop: number, sim: Simulation) {
    const b = d.buttons.find((x) => x.id === k.id)!;
    const down = this.hold?.dev === d.id && this.hold.button === b.id;
    const led = b.led
      ? !!sim.objectValue(d.id, b.led) !== !!b.ledInverted
      : null;
    const act = (name: string, a: Button["press"]) => {
      if (!a) return "";
      const o = d.objects.find((x) => x.id === a.object);
      return `${name} → ${o?.gas[0] ?? "—"} = ${a.value === "toggle" ? this.tr`toggle` : a.value}`;
    };
    // In “Key 2 · Down”, bold the key identifier and use a caption for its function.
    const [main, sub] = b.label.split(/\s+·\s+/, 2);
    const title = [
      b.label,
      b.contact
        ? this.tr`contact input: click for a short press, hold for a long press`
        : "",
      act(this.tr`press`, b.press),
      act(this.tr`short press`, b.short),
      act(this.tr`long press`, b.long),
    ]
      .filter(Boolean)
      .join("\n");
    return html`<button
      class="key ${down ? "down" : ""}"
      style="top:${k.top - plateTop}px;height:${k.h}px;${k.h > 44 ? "flex-direction:column;gap:3px" : ""}"
      title=${title}
      aria-label=${title.replace(/\n/g, " · ")}
      @pointerdown=${(e: PointerEvent) => this.onDown(e, d, b)}
      @pointerup=${(e: PointerEvent) => this.onUp(e)}
      @pointercancel=${(e: PointerEvent) => this.onCancel(e)}
      @lostpointercapture=${(e: PointerEvent) => this.onCancel(e)}
      @click=${(e: Event) => e.stopPropagation()}
      @keydown=${(e: KeyboardEvent) => this.onKey(e, d, b)}
      @keyup=${(e: KeyboardEvent) => this.onKeyUp(e, d, b)}
    >
      ${led !== null ? html`<span class="led ${led ? "on" : ""}"></span>` : nothing}
      <span class="ico">${ICON[b.icon] ?? b.icon}</span>
      ${sub ? html`<span class="kx"><span class="kl">${main}</span><span class="ks">${sub}</span></span>` : html`<span class="kl">${b.label}</span>`}
    </button>`;
  }

  /** Thermostat display: measured temperature, mode and setting, heat demand. */
  private renderScreen(d: Device, k: KeyG, plateTop: number, sim: Simulation) {
    const ds = sim.deviceState(d.id);
    const n = (v: unknown, digits = 1) =>
      typeof v === "number"
        ? new Intl.NumberFormat(this.tr.lang ?? "en", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
          }).format(v)
        : "–";
    const mode = typeof ds.mode === "number" ? ds.mode : null;
    const val = Number(ds.valuePct ?? 0);
    const demand = val > 0 || ds.switchOn === true;
    return html`<div
      class="screen"
      style="top:${k.top - plateTop}px;height:${k.h}px"
      title="${d.name} · ${mode === null ? "" : hvacModeName(mode, this.tr)} · ${this.tr`setpoint`} ${n(ds.setpointC)} °C${demand ? ` · ${ds.heating === false ? this.tr`cooling` : this.tr`heating`} ${Math.round(val)} %` : ""}"
    >
      <b>${n(ds.measuredC)}<small>°C</small></b>
      <span
        >${mode === null ? "" : shortValue("20.102", mode)}
        ${n(ds.setpointC)}${
          demand
            ? html`<i class=${ds.heating === false ? "cool" : ""}
                >${ds.heating === false ? this.tr`cool` : this.tr`heat`}</i
              >`
            : nothing
        }</span
      >
    </div>`;
  }

  private renderNumber(d: Device, k: KeyG, plateTop: number, sim: Simulation) {
    const n = d.inputs.find((x) => x.id === k.id)!;
    const key = `${d.id}/${n.id}`;
    const o = d.objects.find((x) => x.id === n.object);
    const current = sim.objectValue(d.id, n.object);
    const decimals = Math.min(3, (String(n.step).split(".")[1] ?? "").length);
    const draft =
      this.drafts.get(key) ??
      (current === null ? "" : String(Number(current.toFixed(decimals))));
    const submit = (e: Event) => {
      e.stopPropagation();
      const field = (e.currentTarget as HTMLElement)
        .closest(".numin")!
        .querySelector("input")!;
      this.submitNumber(d, n, field.value);
    };
    return html`<div
      class="numin"
      style="top:${k.top - plateTop}px;height:${k.h}px"
      title="${n.label} → ${o?.gas[0] ?? "—"} (${n.min}…${n.max})"
      @click=${(e: Event) => e.stopPropagation()}
    >
      <label>${n.label}</label>
      <div>
        <input
          type="number"
          inputmode="decimal"
          min=${n.min}
          max=${n.max}
          step=${n.step}
          .value=${draft}
          aria-label=${n.label}
          @input=${(e: Event) => this.drafts.set(key, (e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => {
            e.stopPropagation();
            if (e.key === "Enter" && !e.repeat) submit(e);
          }}
        /><button title=${this.tr`Send value`} @click=${submit}>↵</button>
      </div>
    </div>`;
  }

  private renderLoad(d: Device, l: LoadG, sim: Simulation) {
    const c = d.channels.find((x) => x.id === l.channel)!;
    const cfg = c.equipmentConfigs[l.index];
    const view = equipmentView(l.view);
    const state = sim.equipmentState(d.id, c.id, l.index) ?? {};
    // Several loads on one output: each shows its name, or its rank.
    const label =
      c.equipmentConfigs.length > 1
        ? `${c.label} · ${cfg?.name ?? l.index + 1}`
        : cfg?.name
          ? `${c.label} · ${cfg.name}`
          : c.label;
    const app = sim.channelState(d.id, c.id);
    const notes = [
      app.forced
        ? app.forced === "on"
          ? this.tr`forced on`
          : this.tr`forced off`
        : "",
      app.shed ? this.tr`shed` : "",
      // Metered output: measured power.
      d.presentation.metered.includes(c.id)
        ? `${Math.round(Number(app.powerW ?? 0))} W`
        : "",
    ].filter(Boolean);
    const note = notes.length ? notes.join(" · ") : undefined;
    const box = { x: l.x, y: l.top, width: l.w, height: l.h };
    const drawn = view
      ? this.safeRender(
          sim,
          d,
          c.id,
          l.view,
          () =>
            view.render({
              state,
              label,
              box,
              note,
              t: this.tr,
              parameters: cfg?.parameters ?? {},
              act: (action, payload) => {
                if (
                  sim.equipmentAction(
                    d.id,
                    c.id,
                    action,
                    payload ?? null,
                    l.index,
                  )
                )
                  this.afterInput();
              },
            }),
          box,
        )
      : html`<div
          class="loadlbl"
          style="position:absolute;left:${l.x}px;top:${l.top}px"
        >
          ${label} · ${this.tr`view “${l.view}” missing`}
        </div>`;
    // For a shutter, show the actuator estimate beside actual position without conflating them.
    const est = app.estimatedPositionPct;
    const cmd = sim.output(d.id, c.id);
    const strip =
      typeof est === "number"
        ? html`<div
            class="est"
            style="left:${l.x}px;top:${l.top + (l.view === "venetianBlind" ? 132 : 118)}px"
          >
            <span
              title="${this.tr`Position estimated by the actuator (${est.toFixed(1)} %)`}"
              >${this.tr`Estimated`} <b>${pct(est)}</b></span
            >
            ${
              l.view === "venetianBlind" &&
              typeof app.estimatedSlatPct === "number"
                ? html`<span
                    title="${this.tr`Slat angle estimated by the actuator (${app.estimatedSlatPct.toFixed(1)} %)`}"
                    >${this.tr`Slats est.`}
                    <b>${pct(app.estimatedSlatPct)}</b></span
                  >`
                : nothing
            }
            <span title=${this.tr`Motor command applied by the actuator`}
              >${this.tr`Motor`}
              <b
                class=${cmd?.type === "motor" && cmd.direction !== "stop" ? "mv" : ""}
                >${cmd?.type === "motor" ? (cmd.direction === "down" ? "▼" : cmd.direction === "up" ? "▲" : "■") : "—"}</b
              ></span
            >
          </div>`
        : nothing;
    return html`${drawn}${strip}${l.index === 0 ? this.renderCountdown(l, app, sim) : nothing}`;
  }

  /**
   * Countdown of an output, on its first load: a pending switch-on or switch-off delay, or
   * the staircase timer. A clock, the state reached (I on, O off), and the time left.
   */
  private renderCountdown(l: LoadG, app: JsonObject, sim: Simulation) {
    const delayed =
      typeof app.delayAtMs === "number" && typeof app.delayed === "boolean";
    const at = delayed
      ? (app.delayAtMs as number)
      : typeof app.offAtMs === "number"
        ? app.offAtMs
        : null;
    if (at === null) return nothing;
    const on = delayed && app.delayed === true;
    const left = Math.max(0, (at - sim.timeMs) / 1000);
    const shown = left < 10 ? left.toFixed(1) : left.toFixed(0);
    const sec = new Intl.NumberFormat(this.tr.lang ?? "en", {
      minimumFractionDigits: left < 10 ? 1 : 0,
      maximumFractionDigits: left < 10 ? 1 : 0,
    }).format(Number(shown));
    const title = delayed
      ? on
        ? this.tr`switch-on delay: on in ${sec} s`
        : this.tr`switch-off delay: off in ${sec} s`
      : this.tr`timer: off in ${sec} s`;
    return html`<div
      class="countdown ${on ? "on" : "off"} ${delayed ? "delay" : "timer"}"
      style="left:${l.x - 10}px;top:${l.top - 12}px"
      title=${title}
      aria-label=${title}
      role="timer"
    >
      <span aria-hidden="true">⏱ ${on ? "I" : "O"}</span> <b>${sec} s</b>
    </div>`;
  }

  /** Isolate extension view rendering; on error, draw a fallback frame and report a diagnostic. */
  private safeRender(
    sim: Simulation,
    d: Device,
    ch: string,
    viewId: string,
    render: () => TemplateResult,
    box: { x: number; y: number; width: number; height: number },
  ): TemplateResult {
    try {
      return render();
    } catch (e) {
      const message = String((e as Error)?.message ?? e);
      sim.reportOnce(`view:${d.id}/${ch}`, {
        code: "view-error",
        message: this.tr`view “${viewId}” (${d.id}/${ch}): ${message}`,
        deviceId: d.id,
        extension: viewId,
      });
      return html`<div
        class="viewfault"
        style="left:${box.x}px;top:${box.y}px;width:${box.width}px;min-height:${Math.min(box.height, 40)}px"
        title=${message}
      >
        ${this.tr`view “${viewId}” failed`}
      </div>`;
    }
  }

  private renderCoupler(
    c: CouplerG,
    sim: Simulation,
    live: Telegram[],
    t: number,
  ) {
    const topoC = sim.network.coupler(c.id)!;
    const rep = sim.network.isRepeater(topoC);
    const col = rep ? C.rep : C.cpl;
    const soft = rep ? C.repSoft : C.cplSoft;
    let active = 0;
    live.forEach((tel) =>
      tel.plan.couplers.forEach(
        (e) =>
          e.couplerId === c.id &&
          t >= e.tInMs &&
          (active = Math.max(active, win(t, e.tInMs, e.tDecisionMs, 200, 350))),
      ),
    );
    const table = sim.network.filterTable(topoC);
    const sel = this.info === "cpl:" + c.id;
    return html`<div
        class="coupler"
        style="left:${c.c[0] - c.w / 2}px;top:${c.c[1] - c.h / 2}px;width:${c.w}px;height:${c.h}px;border-color:${col};background:${soft};border-radius:${
          c.kind === "router" ? 28 : 9
        }px;transform:scale(${1 + 0.06 * active});box-shadow:0 0 0 ${9 * active}px ${hexA(col, 0.18)}${sel ? `, 0 0 0 3px ${hexA(C.cpl, 0.4)}` : ""}"
        @click=${(e: Event) => {
          e.stopPropagation();
          this.info = sel ? null : "cpl:" + c.id;
          this.requestUpdate();
        }}
      >
        <b style="color:${col}">${sim.network.couplerName(topoC)}</b
        ><span>${c.address}</span>
      </div>
      ${
        this.showTables
          ? html`<div
              class="chip"
              style="left:${c.c[0]}px;top:${c.c[1] + c.h / 2 + 6}px;border:1px dashed ${col};color:${col}"
            >
              ${table ? (table.length ? this.tr`table: ${table.join(" · ")}` : this.tr`table: empty`) : this.tr`no filtering`}
            </div>`
          : nothing
      }`;
  }

  private renderTags(g: Geometry, live: Telegram[], t: number) {
    type Ev = Telegram["plan"]["couplers"][number];
    const last = new Map<string, { e: Ev; ga: string }>();
    live.forEach((tel) =>
      tel.plan.couplers.forEach(
        (e) =>
          t >= e.tInMs &&
          (!last.has(e.couplerId) ||
            e.tInMs > last.get(e.couplerId)!.e.tInMs) &&
          last.set(e.couplerId, { e, ga: tel.ga }),
      ),
    );
    return [...last.values()].map(({ e, ga }) => {
      const o = win(t, e.tInMs, e.tDecisionMs + 1100);
      if (o <= 0) return nothing;
      const c = g.couplers.find((x) => x.id === e.couplerId)!;
      const block = e.tag === "block";
      const col = block ? C.red : e.tag === "rep" ? C.rep : C.cpl;
      const settled = t >= e.tDecisionMs;
      const body = !settled
        ? `${ga} · ${this.tr`checking…`}`
        : block
          ? `${ga} · ✕ ${this.tr`filtered`}`
          : html`${ga} ·
              ${e.tag === "rep" ? this.tr`repeated` : this.tr`forwarded`} · RC
              ${e.rcBefore}→<b>${e.rcAfter}</b>`;
      return html`<div
        class="tag"
        style="left:${Math.min(Math.max(c.c[0], 114), g.W - 114)}px;top:${c.c[1] - c.h / 2 - 8}px;opacity:${o};border:1.5px solid ${col};color:${col}"
      >
        ${body}
      </div>`;
    });
  }

  private renderPill(tel: Telegram, p: { p: Pt; o: number; small: boolean }) {
    const st = tel.kind === "state";
    const col = C.tg;
    const sel = this.selId === tel.id;
    return html`<div
      class="pill"
      style="left:${p.p[0]}px;top:${p.p[1]}px;transform:translate(-50%,-50%) scale(${p.small ? 0.85 : 1});opacity:${Math.max(0, Math.min(1, p.o))};background:${
        st ? "#fff" : col
      };border:2.5px solid ${col};color:${st ? col : "#fff"};box-shadow:${sel ? `0 0 0 3px ${hexA(C.amber, 0.8)}, ` : ""}0 0 14px 3px ${hexA(C.tg, 0.3)}"
      @click=${(e: Event) => {
        e.stopPropagation();
        this.selId = tel.id;
        this.requestUpdate();
      }}
    >
      ${st ? html`<i></i>` : nothing}${tel.ga}<em
        >${tel.service === "GroupValueRead" ? "?" : `= ${shortValue(tel.dpt, tel.value)}`}</em
      >
    </div>`;
  }

  /** Device long-press threshold (longPressMs parameter), 500 ms by default. */
  private longMs(devId: string): number {
    const v = this.model?.devicesById.get(devId)?.parameters.longPressMs;
    return typeof v === "number" ? v : LONG_MS;
  }

  /** Long-press threshold of a held key: its contact input's own time, or the device's. */
  private holdMs(h: Hold): number {
    if (h.contact) {
      const v = this.model?.devicesById
        .get(h.dev)
        ?.buttons.find((b) => b.id === h.button)?.longPressMs;
      if (typeof v === "number") return v;
    }
    return this.longMs(h.dev);
  }

  private renderHold(s: Scenario, g: Geometry) {
    const h = this.hold;
    if (!h || !h.hasLong) return nothing;
    const d = s.devicesById.get(h.dev)!;
    const p = g.devices.get(h.dev)!.plate!;
    const lp = Math.min(1, (performance.now() - h.start) / this.holdMs(h));
    const b = d.buttons.find((x) => x.id === h.button)!;
    const ga = d.objects.find((o) => o.id === b.long?.object)?.gas[0];
    // A contact key is "fired" from its press on; its long press comes later.
    const long = h.contact ? !!h.longFired : h.fired;
    const x = p.x;
    const y = p.top + p.h + 8;
    return html`<div
        class="holdbar"
        style="left:${x}px;top:${y}px;width:${PLATE_W}px"
      >
        <div
          style="width:${lp * 100}%;background:${lp >= 1 ? C.tg : C.amber}"
        ></div>
      </div>
      <div
        class="holdtxt"
        style="left:${x}px;top:${y + 10}px;color:${long ? C.tg : "#9a6a00"}"
      >
        ${long ? (ga ? this.tr`Long press → ${ga}` : this.tr`Long press`) : this.tr`Hold for a long press…`}
      </div>`;
  }

  // ── Explications ────────────────────────────────────────────────────────

  private devLabel(s: Scenario, id: string | undefined) {
    const d = id ? s.devicesById.get(id) : undefined;
    return d ? d.address || d.name : "?";
  }

  private objName(
    s: Scenario,
    dev: string | undefined,
    obj: string | undefined,
  ) {
    return (
      s.devicesById.get(dev ?? "")?.objects.find((o) => o.id === obj)?.name ??
      obj ??
      ""
    );
  }

  private explain(
    e: JournalEvent,
    s: Scenario,
    sim: Simulation,
  ): TemplateResult | string {
    const dev = this.devLabel(s, e.deviceId);
    const tel =
      e.telegramId !== undefined ? sim.telegram(e.telegramId) : undefined;
    const v = tel ? shortValue(tel.dpt, tel.value) : "";
    const tr = this.tr;
    const obj = this.objName(s, e.deviceId, e.objectId);
    switch (e.kind) {
      case "telegram-emitted":
        if (tel?.service === "GroupValueRead")
          return html`<b>${dev}</b>
            ${tr`requests the value of ${e.ga} (read).`}`;
        if (tel?.service === "GroupValueResponse")
          return html`<b>${dev}</b>
            ${tr`responds ${e.ga} = ${v} (object “${obj}”, R flag).`}`;
        if (!obj)
          return html`<b>${dev}</b>
            ${tr`sends ${e.ga} = ${v} (write from the USB interface).`}`;
        return html`<b>${dev}</b>
          ${tr`sends ${e.ga} = ${v} (object “${obj}”).`}`;
      case "coupler-decision": {
        const c = sim.network.coupler(e.couplerId ?? "");
        const d = e.data as { tag: string; rcBefore: number; rcAfter: number };
        const verdict =
          d.tag === "block"
            ? tr`filtered, the telegram stops here`
            : d.tag === "rep"
              ? tr`repeated, RC ${d.rcBefore}→${d.rcAfter}`
              : tr`forwarded, RC ${d.rcBefore}→${d.rcAfter}`;
        return html`<b>${c ? sim.network.couplerName(c) : ""} ${c?.address}</b>
          ${tr`checks its table: ${e.ga} ${verdict}.`}`;
      }
      case "object-write-accepted":
        return html`<b>${dev}</b> ${
            (e.data as { internal?: boolean })?.internal
              ? tr`receives ${e.ga}: object “${obj}” takes the value ${v} (internal link).`
              : tr`receives ${e.ga}: object “${obj}” takes the value ${v}.`
          }`;
      case "object-write-ignored":
        return html`<b>${dev}</b>
          ${tr`receives ${e.ga} but object “${obj}” ignores it: W flag disabled.`}`;
      case "output-changed":
        return html`<b>${dev}</b> ·
          ${s.devicesById.get(e.deviceId ?? "")?.channels.find((c) => c.id === e.channelId)?.label ?? e.channelId}
          : ${e.message}.`;
      case "timer-fired":
        return html`<b>${dev}</b> : ${tr`${e.message} reached.`}`;
      default:
        return e.message ?? e.kind;
    }
  }

  private stopText(stop: StepStop, s: Scenario, sim: Simulation) {
    const order = [
      "output-changed",
      "object-write-ignored",
      "object-write-accepted",
      "coupler-decision",
      "telegram-emitted",
      "timer-fired",
    ];
    const main = [...stop.events].sort(
      (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind),
    )[0]!;
    const extra = stop.events.length - 1;
    return html`${this.explain(main, s, sim)}${extra > 0 ? html` <small class="more">${extra > 1 ? this.tr`(+${extra} details)` : this.tr`(+${extra} detail)`}</small>` : nothing}`;
  }

  private renderInfo(s: Scenario, g: Geometry, sim: Simulation) {
    if (!this.info) return nothing;
    const close = () => ((this.info = null), this.requestUpdate());
    const [kind, id] = this.info.split(":") as [string, string];
    if (kind === "cpl") {
      const c = g.couplers.find((x) => x.id === id);
      const tc: TopoCoupler | undefined = sim.network.coupler(id);
      if (!c || !tc) return nothing;
      const key =
        c.kind === "extension"
          ? sim.network.isRepeater(tc)
            ? "repeater"
            : "segmentCoupler"
          : c.kind;
      const table = sim.network.filterTable(tc);
      return html`<div class="info" @click=${(e: Event) => e.stopPropagation()}>
        <h3>
          ${sim.network.couplerName(tc)} ${c.address}<span @click=${close}
            >×</span
          >
        </h3>
        <div>${couplerInfo(key, this.tr)}</div>
        ${table ? html`<div style="margin-top:6px;font-family:var(--mono);font-size:12.5px">${this.tr`Filter table:`} ${table.length ? table.join(" · ") : this.tr`empty`}</div>` : nothing}
      </div>`;
    }
    const d = s.devicesById.get(id);
    if (!d) return nothing;
    return html`<div class="info" @click=${(e: Event) => e.stopPropagation()}>
      <h3>${d.name} ${d.address}<span @click=${close}>×</span></h3>
      ${d.description ? html`<div>${d.description}</div>` : nothing}
      <div class="behavior">
        ${this.tr`Behavior`} <code>${d.behavior}</code>
      </div>
      <table>
        <tr>
          <th>${this.tr`Object`}</th>
          <th>GA</th>
          <th>DPT</th>
          <th title=${this.tr`W: accepts writes · T: may transmit`}>W T</th>
          <th>${this.tr`Value`}</th>
        </tr>
        ${d.objects.map(
          (o) =>
            html`<tr>
              <td>${o.name}</td>
              <td class="m">${o.gas.join(", ") || "—"}</td>
              <td class="m" title=${dptName(o.dpt, this.tr)}>${o.dpt}</td>
              <td class="m flags">
                <span
                  class=${o.flags.W ? "on" : ""}
                  title=${o.flags.W ? this.tr`W: accepts received writes` : this.tr`W: ignores received writes`}
                  >W</span
                ><span
                  class=${o.flags.T ? "on" : ""}
                  title=${o.flags.T ? this.tr`T: may transmit` : this.tr`T: does not transmit`}
                  >T</span
                >
              </td>
              <td class="m">
                ${preciseValue(o.dpt, sim.objectValue(d.id, o.id), this.tr)}
              </td>
            </tr>`,
        )}
      </table>
      ${
        d.channels.length
          ? html`<details open>
              <summary>${this.tr`Channels (${d.channels.length})`}</summary>
              ${this.renderChannels(d, sim)}
            </details>`
          : nothing
      }
    </div>`;
  }

  private renderChannels(d: Device, sim: Simulation) {
    return html`<table class="chans">
      ${d.channels.map((c) => {
        const app = sim.channelState(d.id, c.id);
        const eq = sim.equipmentState(d.id, c.id);
        const out = sim.output(d.id, c.id);
        const rows: [string, string][] = [];
        if (typeof app.estimatedPositionPct === "number") {
          rows.push([
            this.tr`Estimated position`,
            preciseValue("5.001", app.estimatedPositionPct, this.tr),
          ]);
          rows.push([
            this.tr`Actual position`,
            eq
              ? preciseValue("5.001", Number(eq.positionPct), this.tr)
              : this.tr`no shutter connected`,
          ]);
          rows.push([
            this.tr`Motor command`,
            out ? describeCommand(out, this.tr) : "—",
          ]);
          rows.push([this.tr`Phase`, String(app.phase)]);
          if (eq?.limit)
            rows.push([
              this.tr`End stop`,
              eq.limit === "top" ? this.tr`top` : this.tr`bottom`,
            ]);
          // Down and up times, shown separately only when they differ.
          const times = (down: unknown, up: unknown) =>
            up === undefined || Number(up) === Number(down)
              ? `${Number(down) / 1000} s`
              : `${Number(down) / 1000} s ↓ · ${Number(up) / 1000} s ↑`;
          rows.push([
            this.tr`Configured travel time`,
            times(
              c.parameters.estimatedTravelTimeMs,
              c.parameters.estimatedTravelTimeUpMs,
            ),
          ]);
          const motor = c.equipmentConfigs[0];
          if (motor)
            rows.push([
              this.tr`Actual travel time`,
              times(
                motor.parameters.actualTravelTimeMs,
                motor.parameters.actualTravelTimeUpMs,
              ),
            ]);
        } else {
          rows.push([
            this.tr`Output`,
            out ? describeCommand(out, this.tr) : "—",
          ]);
          if (app.forced)
            rows.push([
              this.tr`Forcing`,
              `${app.forced === "on" ? this.tr`forced on` : this.tr`forced off`} · ${this.tr`stored command:`} ${app.commanded ? this.tr`on` : this.tr`off`}`,
            ]);
          if (typeof app.offAtMs === "number")
            rows.push([
              this.tr`Timer`,
              this
                .tr`switching off in ${((app.offAtMs - sim.timeMs) / 1000).toFixed(1)} s`,
            ]);
          if (typeof app.delayAtMs === "number")
            rows.push([
              this.tr`Delay`,
              app.delayed
                ? this
                    .tr`switching on in ${((app.delayAtMs - sim.timeMs) / 1000).toFixed(1)} s`
                : this
                    .tr`switching off in ${((app.delayAtMs - sim.timeMs) / 1000).toFixed(1)} s`,
            ]);
          if (eq && "on" in eq)
            rows.push([this.tr`Equipment`, eq.on ? this.tr`on` : this.tr`off`]);
        }
        return html`<tr class="head">
            <td colspan="2">
              ${c.label}<small
                >${c.loads.length ? c.loads.join(" + ") : this.tr`unused`}</small
              >
            </td>
          </tr>
          ${rows.map(
            ([k, v]) =>
              html`<tr>
                <td>${k}</td>
                <td class="m">${v}</td>
              </tr>`,
          )}`;
      })}
    </table>`;
  }

  // ── Group monitor and telegram detail ──
  private clock(tMs: number) {
    const total = 10 * 3600 + tMs / 1000;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = (total % 60).toFixed(1).padStart(4, "0");
    return `${h}:${String(m).padStart(2, "0")}:${sec}`;
  }

  private rawText(tel: Telegram) {
    const bits = dptBits(tel.dpt);
    if (bits === 32 || bits === 24)
      return `0x${(tel.raw >>> 0)
        .toString(16)
        .toUpperCase()
        .padStart(bits / 4, "0")}`;
    return bits === 16
      ? `0x${hex(tel.raw >> 8)}${hex(tel.raw & 0xff)}`
      : bits === 8
        ? `0x${hex(tel.raw)}`
        : String(tel.raw);
  }

  /** Public physical room action for host pages (window or outdoor temperature). */
  /**
   * Set the simulated clock, as local date and time "YYYY-MM-DDTHH:MM[:SS]"; return the
   * telegrams sent, or an empty list when the scenario has no clock or the value is invalid.
   */
  setClock(value: string) {
    const sim = this.sim;
    const ms = parseClockStart(value);
    if (!sim || ms === null) return [];
    const out = sim.setClock(ms);
    this.afterInput();
    return out;
  }

  /** Simulated clock: date and time badge, with an optional control to set it. */
  private renderClock(sim: Simulation) {
    const c = sim.clock();
    if (!c) return nothing;
    const d = new Date(c.nowMs);
    const date = new Intl.DateTimeFormat(this.language, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
    const time = new Intl.DateTimeFormat(this.language, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZone: "UTC",
    }).format(d);
    const iso = d.toISOString().slice(0, 19);
    return html`<div class="clock" @click=${(e: Event) => e.stopPropagation()}>
      <span title=${this.tr`Simulated clock (×${c.speed})`}
        >${date} · <b>${time}</b></span
      >
      ${
        this.clockEdit
          ? html`<input
                type="datetime-local"
                step="1"
                aria-label=${this.tr`Clock time`}
                .value=${iso}
                @keydown=${(e: KeyboardEvent) => {
                  e.stopPropagation();
                  if (e.key === "Enter")
                    (
                      e.currentTarget as HTMLElement
                    ).nextElementSibling?.dispatchEvent(new Event("click"));
                }}
              /><button
                class="btn"
                @click=${(e: Event) => {
                  const input = (e.currentTarget as HTMLElement)
                    .previousElementSibling as HTMLInputElement;
                  this.clockEdit = false;
                  this.setClock(input.value);
                }}
              >
                ${this.tr`Set`}
              </button>`
          : html`<button
              class="btn"
              title=${this.tr`Set the simulated clock`}
              @click=${() => {
                this.clockEdit = true;
                this.requestUpdate();
              }}
            >
              ${this.tr`Set time`}
            </button>`
      }
    </div>`;
  }

  /**
   * Cut (false) or restore (true) the bus voltage of a line segment: `L1.1`, or `L1.1b`
   * behind its extension. Returns the telegrams sent by the devices' reactions.
   */
  setBusVoltage(segmentId: string, on: boolean) {
    const sim = this.sim;
    if (!sim) return [];
    const out = sim.setBusVoltage(segmentId, on);
    this.afterInput();
    return out;
  }

  roomAction(roomId: string, action: "window" | "outside", value: number) {
    const sim = this.sim;
    if (!sim) return [];
    const out = sim.roomAction(roomId, action, value);
    this.afterInput();
    return out;
  }

  /** Rooms panel: physical values, window, outdoor temperature, and control. */
  private renderRooms(s: Scenario, sim: Simulation) {
    const fmt = (v: number) =>
      new Intl.NumberFormat(this.tr.lang ?? "en", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(v);
    return html`<div
      class="panel rooms"
      @click=${(e: Event) => e.stopPropagation()}
    >
      <header>
        <span class="cap">${this.tr`Rooms`}</span>
        <span class="hint"
          >${this.tr`physical quantities; thermal time compressed`}</span
        >
      </header>
      <div class="room-list">
        ${s.rooms.map((r) => {
          const st = sim.room(r.id)!;
          const regs = s.devices
            .filter((d) => d.room === r.id)
            .map((d) => ({ d, ds: sim.deviceState(d.id) }))
            .filter((x) => typeof x.ds.setpointC === "number");
          const emitters = s.devices.flatMap((d) =>
            d.channels.flatMap((c) =>
              c.equipmentConfigs.flatMap((e, i) =>
                e.room === r.id
                  ? [
                      {
                        d,
                        c,
                        open: Number(
                          sim.equipmentState(d.id, c.id, i)?.openPct ?? 0,
                        ),
                      },
                    ]
                  : [],
              ),
            ),
          );
          return html`<div class="room ${st.windowOpen ? "open" : ""}">
            <div class="room-head">
              <b title=${r.name}>${r.name}</b>
              <span class="room-t" data-room=${r.id}
                >${fmt(st.temperatureC)} °C</span
              >
            </div>
            ${regs.map(
              ({ d, ds }) =>
                html`<div class="room-line" title=${d.name}>
                  <span>${d.name}</span>
                  <b
                    >${hvacModeName(Number(ds.mode), this.tr)} ·
                    ${fmt(Number(ds.setpointC))} °C</b
                  >
                </div>`,
            )}
            ${emitters.map(
              (e) =>
                html`<div class="room-line">
                  <span>${e.c.label}</span>
                  <span class="room-bar"><i style="width:${e.open}%"></i></span
                  ><b>${Math.round(e.open)} %</b>
                </div>`,
            )}
            <div class="room-ctl">
              <button
                class="btn ${st.windowOpen ? "primary" : ""}"
                aria-pressed=${st.windowOpen ? "true" : "false"}
                @click=${() =>
                  this.roomAction(r.id, "window", st.windowOpen ? 0 : 1)}
              >
                ${st.windowOpen ? this.tr`Close window` : this.tr`Open window`}
              </button>
              <span class="room-out"
                >${this.tr`Out.`}
                <button
                  class="btn"
                  aria-label=${this.tr`Lower outside temperature`}
                  @click=${() =>
                    this.roomAction(
                      r.id,
                      "outside",
                      st.outsideTemperatureC - 5,
                    )}
                >
                  −</button
                ><b>${fmt(st.outsideTemperatureC)} °C</b
                ><button
                  class="btn"
                  aria-label=${this.tr`Raise outside temperature`}
                  @click=${() =>
                    this.roomAction(
                      r.id,
                      "outside",
                      st.outsideTemperatureC + 5,
                    )}
                >
                  +
                </button></span
              >
            </div>
          </div>`;
        })}
      </div>
    </div>`;
  }

  /** USB interface panel: Write and read a group address through the USB interface. */
  private renderUsbPanel(s: Scenario, sim: Simulation) {
    const list = this.interfaces();
    const dev =
      list.find((d) => d.id === this.usbPanel.dev) ?? (list[0] as Device);
    const gas = [
      ...new Set([
        ...s.groupAddresses.keys(),
        ...s.devices.flatMap((d) => d.objects.flatMap((o) => o.gas)),
      ]),
    ].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    const ga = gas.includes(this.usbPanel.ga)
      ? this.usbPanel.ga
      : (gas[0] ?? "");
    const dpt = ga ? sim.gaDpt(ga) : "1.001";
    const bits = dptBits(dpt);
    const choices: number[] | null =
      bits === 1
        ? [0, 1]
        : bits === 2
          ? [0, 1, 2, 3]
          : dpt === "17.001"
            ? Array.from({ length: 64 }, (_, i) => i)
            : dpt === "20.102"
              ? [0, 1, 2, 3, 4]
              : null;
    const value = Number(this.usbPanel.value.replace(",", "."));
    // As in the engine, a value outside the DPT range is not offered for writing.
    const problem =
      this.usbPanel.value.trim() === ""
        ? this.tr`finite number expected`
        : checkValue(dpt, value, this.tr);
    const valid = problem === null;
    const last = this.usbPanel.read;
    const answers = last
      ? sim.history.filter(
          (t) =>
            t.id > last.id &&
            t.ga === last.ga &&
            t.service === "GroupValueResponse",
        )
      : [];
    const readTel = last ? sim.telegram(last.id) : undefined;
    const waiting =
      !!last &&
      !answers.length &&
      (!readTel || sim.timeMs < readTel.plan.endMs + 1500);
    return html`<div
      class="panel usb"
      @click=${(e: Event) => e.stopPropagation()}
    >
      <header>
        <span class="cap">${this.tr`Tools`}</span>
        <span class="hint"
          >${this.tr`USB interface`}
          ${
            list.length > 1
              ? html`<select
                  @change=${(e: Event) => {
                    this.usbPanel.dev = (e.target as HTMLSelectElement).value;
                    this.requestUpdate();
                  }}
                >
                  ${list.map((d) => html`<option value=${d.id} ?selected=${d === dev}>${d.address} · ${d.name}</option>`)}
                </select>`
              : html`<b>${dev.address}</b> · ${dev.name}`
          }</span
        >
      </header>
      <div class="usb-row">
        <label
          >${this.tr`Group address`}
          <select
            @change=${(e: Event) => {
              this.usbPanel.ga = (e.target as HTMLSelectElement).value;
              this.requestUpdate();
            }}
          >
            ${gas.map((g) => html`<option value=${g} ?selected=${g === ga}>${g} ${gaName(s, g)}</option>`)}
          </select></label
        >
        <label
          >${this.tr`Value`} <small>${dptName(dpt, this.tr)}</small> ${
            choices
              ? html`<select
                  @change=${(e: Event) => {
                    this.usbPanel.value = (e.target as HTMLSelectElement).value;
                    this.requestUpdate();
                  }}
                >
                  ${choices.map((c) => html`<option value=${c} ?selected=${c === value}>${formatValue(dpt, c, this.tr)}</option>`)}
                </select>`
              : html`<input
                  inputmode="decimal"
                  .value=${this.usbPanel.value}
                  @input=${(e: Event) => {
                    this.usbPanel.value = (e.target as HTMLInputElement).value;
                    this.requestUpdate();
                  }}
                />`
          }</label
        >
        <button
          class="btn primary"
          ?disabled=${!ga || !valid}
          @click=${() => this.groupWrite(ga, value, dev.id)}
        >
          ${this.tr`Write`}
        </button>
        <button
          class="btn"
          ?disabled=${!ga}
          @click=${() => this.groupRead(ga, dev.id)}
        >
          ${this.tr`Read`}
        </button>
      </div>
      <div class="usb-out">
        ${
          problem && ga
            ? html`<div class="usb-bad" role="alert">${problem}</div>`
            : nothing
        }
        ${
          !last
            ? this
                .tr`Write sends a GroupValueWrite; Read sends a GroupValueRead: each associated object with the R flag responds, on its own sending address.`
            : answers.length
              ? answers.map(
                  (a) =>
                    html`<div>
                      ${this.tr`Response from`} <b>${a.sourceAddress}</b>
                      (${s.devicesById.get(a.sourceDeviceId)?.name}) :
                      <b>${formatValue(a.dpt, a.value, this.tr)}</b>
                    </div>`,
                )
              : waiting
                ? this.tr`Reading ${last.ga}…`
                : this
                    .tr`No response for ${last.ga}: no associated object has the R flag, or a coupler filtered the read or the response.`
        }
      </div>
    </div>`;
  }

  /** Larger, temporary view of the group monitor and telegram details. */
  private renderEnlargedMonitor(s: Scenario, g: Geometry, sim: Simulation) {
    const close = () => {
      this.monitorExpanded = false;
      this.requestUpdate();
    };
    return html`<dialog
      class="enlarged"
      aria-label=${this.tr`Group monitor`}
      @close=${close}
      @click=${(e: MouseEvent) => {
        e.stopPropagation();
        // A click on the backdrop targets the dialog element itself.
        if (e.target === e.currentTarget) close();
      }}
      @keydown=${(e: KeyboardEvent) => e.stopPropagation()}
    >
      ${this.renderMonitor(s, sim, true)} ${this.renderDetail(s, g, sim)}
    </dialog>`;
  }

  private renderMonitor(s: Scenario, sim: Simulation, enlarged = false) {
    const sel = this.selected(sim);
    const tels = sim.history;
    return html`<div class="panel">
      <header>
        <span class="cap">${this.tr`Group monitor`}</span>
        <span class="hint"
          >${tels.length > 1 ? this.tr`${tels.length} telegrams` : this.tr`${tels.length} telegram`}
          · t = ${(sim.timeMs / 1000).toFixed(1)} s ·
          ${this.tr`click to inspect`}</span
        >
        ${
          enlarged
            ? html`<button
                class="btn close"
                title=${this.tr`Close`}
                aria-label=${this.tr`Close`}
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this.monitorExpanded = false;
                  this.requestUpdate();
                }}
              >
                ✕
              </button>`
            : html`<button
                class="btn enlarge"
                title=${this.tr`Enlarge the monitor`}
                aria-label=${this.tr`Enlarge the monitor`}
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this.monitorExpanded = true;
                  this.requestUpdate();
                }}
              >
                ${html`<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" /></svg>`}
              </button>`
        }
      </header>
      <div class="mon">
        ${
          tels.length
            ? html`<table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>${this.tr`Time`}</th>
                    <th>${this.tr`Source`}</th>
                    <th>${this.tr`Destination`}</th>
                    <th class="opt">${this.tr`Type`}</th>
                    <th class="opt">DPT</th>
                    <th>${this.tr`Value`}</th>
                  </tr>
                </thead>
                <tbody>
                  ${tels.map(
                    (tel) =>
                      html`<tr
                        class="${tel === sel ? "sel" : ""} ${tel.kind === "state" ? "state" : ""}"
                        @click=${() => {
                          this.selId = tel.id;
                          this.requestUpdate();
                        }}
                      >
                        <td>${tel.id}</td>
                        <td>${this.clock(tel.timeMs)}</td>
                        <td>
                          ${tel.sourceAddress || "IP"}<small
                            >${s.devicesById.get(tel.sourceDeviceId)?.name}</small
                          >
                        </td>
                        <td>${tel.ga}<small>${gaName(s, tel.ga)}</small></td>
                        <td class="opt">${tel.service}</td>
                        <td class="opt">${tel.dpt}</td>
                        <td>
                          ${
                            tel.service === "GroupValueRead"
                              ? html`<small>${this.tr`read`}</small>`
                              : html`${this.rawText(tel)}<small
                                    >${formatValue(tel.dpt, tel.value, this.tr)}${tel.service === "GroupValueResponse" ? ` · ${this.tr`response`}` : ""}</small
                                  >`
                          }
                        </td>
                      </tr>`,
                  )}
                </tbody>
              </table>`
            : html`<div class="empty">
                ${this.tr`No telegram yet. Press a push-button key.`}
              </div>`
        }
      </div>
    </div>`;
  }

  private selected(sim: Simulation): Telegram | undefined {
    return (
      (this.selId !== null ? sim.telegram(this.selId) : undefined) ??
      sim.history[sim.history.length - 1]
    );
  }

  private causeText(tel: Telegram, s: Scenario, sim: Simulation): string {
    const e = sim.journal.find((x) => x.id === tel.causeId);
    const tr = this.tr;
    if (!e) return tel.kind === "state" ? tr`automatic transmission` : "—";
    if (e.kind === "input")
      return tr`gesture ${String((e.data as { inputId?: string })?.inputId ?? "")} · ${String((e.data as { gesture?: string })?.gesture ?? "")}`;
    if (e.kind === "timer-fired")
      return tr`timer ${String((e.data as { key?: string })?.key ?? "")} of ${this.devLabel(s, e.deviceId)}`;
    if (e.kind === "object-write-accepted")
      return tr`reception on “${this.objName(s, e.deviceId, e.objectId)}” (${e.ga})`;
    return e.kind;
  }

  private renderDetail(s: Scenario, g: Geometry, sim: Simulation) {
    const tel = this.selected(sim);
    if (!tel) {
      return html`<div class="panel">
        <header><span class="cap">${this.tr`Telegram`}</span></header>
        <div class="empty">
          ${this.tr`Details of the last telegram (fields, bytes, couplers crossed, target objects) will appear here.`}
        </div>
      </div>`;
    }
    const t = sim.timeMs;
    const frame = buildFrame(
      tel.sourceAddress || "0.0.0",
      tel.ga,
      tel.value,
      tel.dpt,
      6,
      this.tr,
      tel.service,
      tel.priority,
    );
    const read = tel.service === "GroupValueRead";
    const fcol = [C.mute, C.bus, C.tg, C.cpl, C.amber, C.mute];
    const decisions = tel.plan.couplers.filter((e) => t >= e.tDecisionMs);
    const recv = tel.receptions.filter((r) => r.objects.length);
    const reached = tel.receptions.filter(
      (r) => !r.objects.length && !r.internal,
    );
    const transit = t < tel.plan.endMs;
    void g;
    return html`<div class="panel">
      <header>
        <span class="cap">${this.tr`Telegram`} #${tel.id}</span>
        <span
          class="badge"
          style="background:${tel.kind === "cmd" ? C.tg : "#fff"};color:${tel.kind === "cmd" ? "#fff" : C.tg}"
          >${tel.kind === "state" ? html`<i style="width:7px;height:7px;border-radius:4px;background:${C.amber};display:inline-block"></i>` : nothing}${
            read
              ? this.tr`Read`
              : tel.service === "GroupValueResponse"
                ? this.tr`Response`
                : tel.kind === "cmd"
                  ? this.tr`Command`
                  : this.tr`Status feedback`
          }</span
        >
      </header>
      <div class="kv-row">
        <span>${this.tr`Source`}</span
        ><b
          >${tel.sourceAddress || "IP"}<small
            >${this.tr`individual addr.`} ·
            ${s.devicesById.get(tel.sourceDeviceId)?.name}</small
          ></b
        >
      </div>
      <div class="kv-row">
        <span>${this.tr`Destination`}</span
        ><b
          >${tel.ga}<small
            >${this.tr`group addr.`}${gaName(s, tel.ga) ? " · " + gaName(s, tel.ga) : ""}</small
          ></b
        >
      </div>
      <div class="kv-row">
        <span>${this.tr`Service`}</span><b>${tel.service}</b>
      </div>
      <div class="kv-row">
        <span>${this.tr`Value`}</span>${
          read
            ? html`<b
                >—<small
                  >${this.tr`a read carries no value: each associated object with the R flag responds, on its own sending address`}</small
                ></b
              >`
            : html`<b
                >${this.rawText(tel)}<small
                  >${preciseValue(tel.dpt, tel.value, this.tr)} ·
                  ${this.tr`${formatValue(tel.dpt, tel.value, this.tr)} according to ${dptName(tel.dpt, this.tr)}`}</small
                ></b
              >`
        }
      </div>
      <div class="kv-row">
        <span>${this.tr`Cause`}</span
        ><b class="cause">${this.causeText(tel, s, sim)}</b>
      </div>
      <div class="frame">
        ${frame.map(
          (f, i) =>
            html`<div
              style="border-color:${fcol[i]};color:${fcol[i]}"
              title="${f.label} : ${f.hint}"
            >
              ${f.bytes.map(hex).join(" ")}
            </div>`,
        )}
      </div>
      <div class="hint">
        ${this.tr`TP1 frame: control · source · destination · type/RC/length · APCI+data · checksum. The DPT is not transmitted: only the devices know it.`}
      </div>
      ${
        tel.plan.couplers.length
          ? html`<div class="sep">
              <b>${this.tr`Couplers`}</b
              >${transit ? html` <span style="color:${C.tg}">· ${this.tr`in progress`}</span>` : nothing}
              ${decisions.map((e) => {
                const c = sim.network.coupler(e.couplerId)!;
                const col =
                  e.tag === "block" ? C.red : e.tag === "rep" ? C.rep : C.cpl;
                return html`<div class="line">
                  <span>${sim.network.couplerName(c)} ${c.address}</span>
                  <span
                    style="font-family:var(--mono);color:${col};font-weight:600"
                    >${e.tag === "block" ? `✕ ${this.tr`filtered`}` : (e.tag === "rep" ? this.tr`repeated` : this.tr`forwarded`) + ` · RC ${e.rcBefore}→${e.rcAfter}`}</span
                  >
                </div>`;
              })}
            </div>`
          : nothing
      }
      <div class="sep">
        <b>${this.tr`Objects linked to ${tel.ga}`}</b>
        ${
          recv.length
            ? recv.map((r) => {
                const d = s.devicesById.get(r.deviceId)!;
                return r.objects.map((o) => {
                  const ok = o.result === "accepted";
                  return html`<div class="line">
                    <span
                      ><b style="font-family:var(--mono)"
                        >${d.address || d.name}</b
                      >
                      ·
                      ${this.objName(s, d.id, o.objectId)}${r.internal ? html` <small>${this.tr`(internal link)`}</small>` : nothing}</span
                    >
                    <span
                      style="color:${ok ? C.bus : C.red};font-weight:600"
                      title=${ok ? this.tr`write accepted` : this.tr`W flag disabled: value and behavior unchanged`}
                      >${ok ? this.tr`received` : this.tr`ignored (W)`}</span
                    >
                  </div>`;
                });
              })
            : html`<div class="hint">
                ${transit ? this.tr`The telegram is travelling on the bus…` : this.tr`No other device listens to this address.`}
              </div>`
        }
        ${
          reached.length
            ? html`<div class="hint">
                ${this.tr`Reached without association:`}
                ${reached.map((r) => this.devLabel(s, r.deviceId)).join(", ")}
              </div>`
            : nothing
        }
      </div>
    </div>`;
  }
}

/**
 * Create (or reuse) a diagram in `target', such as `new DataTable("#t", options)`.
 * `scenario`: JSON object, URL (loaded in HTTP) or selector "#id" of a JSON block.
 */
export function create(
  target: string | Element,
  scenario?: unknown,
  options?: Partial<ViewOptions>,
): BusDiagram {
  const host =
    typeof target === "string" ? document.querySelector(target) : target;
  if (!host)
    throw new Error(
      translator(
        document.documentElement.lang || "en",
      )`BusDiagram.create: element ${String(target)} not found`,
    );
  let el: BusDiagram;
  if (host instanceof BusDiagram) el = host;
  else {
    el = document.createElement("bus-diagram") as BusDiagram;
    host.appendChild(el);
  }
  if (options) el.options = { ...(el.options ?? {}), ...options };
  if (typeof scenario === "string") {
    if (scenario.startsWith("#")) el.scenario = scenario;
    else el.src = scenario;
  } else if (scenario !== undefined) el.load(scenario);
  return el;
}

if (!customElements.get("bus-diagram"))
  customElements.define("bus-diagram", BusDiagram);
