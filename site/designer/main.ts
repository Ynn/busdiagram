// Scenario Designer: guided mode (forms) and JSON mode (autocompletion, errors in
// line), live preview. JSON is the source of truth; guided mode rewrites it
// through validated, undoable operations (editor history).
import { autocompletion } from "@codemirror/autocomplete";
import { redo, undo } from "@codemirror/commands";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import type { Diagnostic } from "@codemirror/lint";
import { lintGutter, linter } from "@codemirror/lint";
import { EditorSelection } from "@codemirror/state";
import { EditorView, basicSetup } from "codemirror";
import {
  ScenarioError,
  availableLanguages,
  buildScenario,
  captureRegistry,
  toV2,
} from "../../src/core";
import { buildAuthorSchema } from "../../src/knx/schema";
import { restoreRegistry, saveRegistry } from "../../src/knx/registry";
import { restoreViews, saveViews } from "../../src/ui/equipment";
import { deliveryCheck } from "./delivery";
import * as BusDiagramApi from "../../src/index";
import type { BusDiagram } from "../../src/ui/bus-diagram";
import type { ToolbarMode, ViewOptions } from "../../src/ui/options";
import bundleSource from "../../dist/bus-diagram.js?raw";
import {
  buildInfo,
  embedSnippet,
  encodeShare,
  escapeScript,
  standalonePage,
  wrapExtension,
} from "../shared/embed";
import { cdnTag } from "../shared/cdn.js";
import { formatJson } from "../shared/format-json";
import { SchemaNavigator, scenarioCompletion } from "./completion";
import type { Doc } from "./edit";
import { EditRefusal } from "./edit";
import type { GuidedEditor, Refusal } from "./guided";
import "./guided";
import { cursorContext, nodeForPath, parsePath } from "./json-tree";
import { setDesignerLanguage, t } from "./lang";
import { initLayout } from "./layout";
import { SNIPPETS, SnippetRefusal } from "./snippets";

// ── Language: saved choice, or English on first use ──
const LANG = "bus-diagram-designer-lang";
function pickLanguage(): string {
  try {
    const saved = localStorage.getItem(LANG);
    if (saved) return saved;
  } catch {
    // stockage indisponible
  }
  return "en";
}
const language = pickLanguage();
setDesignerLanguage(language);
document.documentElement.lang = language;

/** Texts of the page (data-t attributes, data-title, index.html data-aria). */
const pageTexts = (): Record<string, string> => ({
  Documentation: t`Documentation`,
  Designer: t`Designer`,
  "Start from a template": t`Start from a template`,
  "Start from a template…": t`Start from a template…`,
  "Insert a device": t`Insert a device`,
  "+ Insert…": t`+ Insert…`,
  "Line to insert on": t`Line to insert on`,
  Format: t`Format`,
  "Reformat the JSON": t`Reformat the JSON`,
  "Open…": t`Open…`,
  "Open a .json file": t`Open a .json file`,
  "→ Format 2": t`→ Format 2`,
  "Convert a format 1 scenario to format 2": t`Convert a format 1 scenario to format 2`,
  Export: t`Export`,
  "Extensions…": t`Extensions…`,
  "Load, replace or remove extensions (.js)": t`Load, replace or remove extensions (.js)`,
  Extensions: t`Extensions`,
  "Scripts adding behaviours, equipment or views. They are stored in this browser and embedded in the exported standalone page. A failing script leaves no definition loaded.": t`Scripts adding behaviours, equipment or views. They are stored in this browser and embedded in the exported standalone page. A failing script leaves no definition loaded.`,
  "Load an extension…": t`Load an extension…`,
  "Code to paste into a page…": t`Code to paste into a page…`,
  "Standalone page (.html)": t`Standalone page (.html)`,
  "JSON file": t`JSON file`,
  "Player link…": t`Player link…`,
  "bus-diagram.js library": t`bus-diagram.js library`,
  Language: t`Language`,
  Help: t`Help`,
  About: t`About`,
  "BusDiagram is an independent educational project. It is not affiliated with, endorsed by, or sponsored by KNX Association. KNX and ETS are trademarks of KNX Association. BusDiagram simulates device behavior for teaching; it does not configure or commission real installations.": t`BusDiagram is an independent educational project. It is not affiliated with, endorsed by, or sponsored by KNX Association. KNX and ETS are trademarks of KNX Association. BusDiagram simulates device behavior for teaching; it does not configure or commission real installations.`,
  "License:": t`License:`,
  "Source code": t`Source code`,
  "Third-party notices": t`Third-party notices`,
  Guided: t`Guided`,
  Simulation: t`Simulation`,
  "JSON scenario": t`JSON scenario`,
  "Ctrl+Space: suggestions (fields, ports, DPTs, declared group addresses, objects and channels of the device).": t`Ctrl+Space: suggestions (fields, ports, DPTs, declared group addresses, objects and channels of the device).`,
  Toolbar: t`Toolbar`,
  full: t`full`,
  compact: t`compact`,
  none: t`none`,
  Monitor: t`Monitor`,
  Description: t`Description`,
  "16:9 slide": t`16:9 slide`,
  "Undo (Ctrl+Z)": t`Undo (Ctrl+Z)`,
  "Redo (Ctrl+Y)": t`Redo (Ctrl+Y)`,
  Undo: t`Undo`,
  Redo: t`Redo`,
  "Drag or use the arrow keys; double-click to reset": t`Drag or use the arrow keys; double-click to reset`,
  Open: t`Open`,
  Copy: t`Copy`,
  Close: t`Close`,
});
function applyPageTexts() {
  const texts = pageTexts();
  const tr = (k: string | undefined) => (k ? (texts[k] ?? k) : "");
  document.title = t`BusDiagram designer`;
  document
    .querySelectorAll<HTMLElement>("[data-t]")
    .forEach((el) => (el.textContent = tr(el.dataset.t)));
  document
    .querySelectorAll<HTMLElement>("[data-title]")
    .forEach((el) => (el.title = tr(el.dataset.title)));
  document
    .querySelectorAll<HTMLElement>("[data-aria]")
    .forEach((el) => el.setAttribute("aria-label", tr(el.dataset.aria)));
}
applyPageTexts();
initLayout(() => window.dispatchEvent(new Event("resize")));

// The extension scripts are for window.BusDiagram: this is the designer's instance,
// shared with the preview. They are stored to reopen a project that uses them.
(window as unknown as { BusDiagram: typeof BusDiagramApi }).BusDiagram =
  BusDiagramApi;
const EXTENSIONS = "bus-diagram-designer-extensions";
interface LoadedExtension {
  name: string;
  source: string;
}
let extensions: LoadedExtension[] = [];
/** Definitions provided by each loaded extension (marked in the manager). */
const provided = new Map<string, string[]>();
/** Runs an extension script; returns an error message, or null if successful. */
function runExtension(ext: LoadedExtension): string | null {
  let error: unknown = null;
  const onError = (e: ErrorEvent) => (error = e.error ?? e.message);
  window.addEventListener("error", onError);
  const el = document.createElement("script");
  // Same contract as delivered pages (function scope): one or two replacements
  // extensions of the same internal variable do not re-declare anything.
  el.textContent = wrapExtension(ext.source, ext.name);
  document.head.append(el);
  el.remove();
  window.removeEventListener("error", onError);
  return error ? String((error as Error)?.message ?? error) : null;
}
// Original records: a reloading of extensions always starts from this state.
const baseRegistry = saveRegistry();
const baseViews = saveViews();
/**
 * Runs extensions in order, each in an atomic way: if the script raises a
 * error, its records already made are cancelled (no half-loaded definition).
 */
function loadExtensions(list: LoadedExtension[]) {
  restoreRegistry(baseRegistry);
  restoreViews(baseViews);
  provided.clear();
  const loaded: LoadedExtension[] = [];
  const refused: { ext: LoadedExtension; error: string }[] = [];
  for (const ext of list) {
    const reg = saveRegistry();
    const views = saveViews();
    const error = runExtension(ext);
    if (error) {
      restoreRegistry(reg);
      restoreViews(views);
      refused.push({ ext, error });
      continue;
    }
    const after = saveRegistry();
    provided.set(ext.name, [
      ...[...after.behaviors.keys()].filter((k) => !reg.behaviors.has(k)),
      ...[...after.equipment.keys()].filter((k) => !reg.equipment.has(k)),
      ...[...saveViews().keys()]
        .filter((k) => !views.has(k))
        .map((k) => t`view ${k}`),
    ]);
    loaded.push(ext);
  }
  return { loaded, refused };
}
function storeExtensions() {
  try {
    localStorage.setItem(EXTENSIONS, JSON.stringify(extensions));
  } catch {
    // storage unavailable: extensions remain available for this session
  }
}
try {
  extensions = JSON.parse(
    localStorage.getItem(EXTENSIONS) ?? "[]",
  ) as LoadedExtension[];
} catch {
  extensions = [];
}
const startup = loadExtensions(extensions);
extensions = startup.loaded;
if (startup.refused.length) {
  // A previously saved extension that now fails is skipped and reported to the user.
  storeExtensions();
  setTimeout(() =>
    startup.refused.forEach((r) =>
      toast(t`Extension ${r.ext.name} rejected: ${r.error}`),
    ),
  );
}

let registry = captureRegistry();
let nav = new SchemaNavigator(buildAuthorSchema(registry));
const DRAFT = "bus-diagram-designer-draft";
const TAB = "bus-diagram-designer-tab";

// ── Templates: repository scenarios converted to format 2 ──
const files = import.meta.glob("../../scenarios/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;
const templates = Object.entries(files)
  .map(([p, data]) => {
    const v2 = toV2(buildScenario(data, registry), registry);
    return {
      id: p
        .split("/")
        .pop()!
        .replace(/\.json$/, ""),
      title: String(v2.title ?? p),
      data: v2,
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
const empty = () => ({
  formatVersion: 2,
  title: t`New installation`,
  lines: [
    { address: "1.1", name: t`Lab kit`, powerSupply: { currentMa: 640 } },
  ],
  groupAddresses: [],
  devices: [],
});

const $ = <T extends HTMLElement>(sel: string) =>
  document.querySelector(sel) as T;
const preview = $<BusDiagram>("#preview");
const guided = $<GuidedEditor>("#guided");
const status = $<HTMLElement>("#status");
const problemsEl = $<HTMLElement>("#problems");

// ── Parse text as JSON, then validate with the engine ────────────────────────
interface Analysis {
  text: string;
  data: unknown;
  parseError: boolean;
  problems: { path: string; code: string; message: string }[];
  valid: boolean;
}
let analysis: Analysis | null = null;
let lastParsed: unknown = empty();

function analyze(text: string): Analysis {
  if (analysis?.text === text) return analysis;
  let data: unknown = null;
  let parseError = false;
  const problems: Analysis["problems"] = [];
  try {
    data = JSON.parse(text);
    lastParsed = data;
  } catch (e) {
    parseError = true;
    problems.push({
      path: "",
      code: "json",
      message: t`Invalid JSON: ${(e as Error).message}`,
    });
  }
  if (!parseError) {
    try {
      buildScenario(data, registry, t);
    } catch (e) {
      if (e instanceof ScenarioError) problems.push(...e.details);
      else
        problems.push({
          path: "",
          code: "error",
          message: String((e as Error)?.message ?? e),
        });
    }
  }
  analysis = { text, data, parseError, problems, valid: !problems.length };
  return analysis;
}

const scenarioLinter = linter(
  (view) => {
    const a = analyze(view.state.doc.toString());
    if (a.parseError) return jsonParseLinter()(view);
    return a.problems.map((p): Diagnostic => {
      const hit = nodeForPath(view.state, parsePath(p.path));
      const node = hit?.node;
      // Missing field: highlight the opening brace of the object that should contain it.
      const from = node ? node.from : 0;
      const to = node
        ? hit.exact
          ? node.to
          : node.from + 1
        : Math.min(1, view.state.doc.length);
      return {
        from,
        to,
        severity: "error",
        message: p.message,
        source: p.path || undefined,
      };
    });
  },
  { delay: 250 },
);

// ── Editor ──
let saveTimer = 0;
let previewTimer = 0;
const editor = new EditorView({
  parent: $("#editor"),
  doc: initialText(),
  extensions: [
    basicSetup,
    json(),
    lintGutter(),
    scenarioLinter,
    autocompletion({
      override: [(ctx) => scenarioCompletion(nav, () => lastParsed)(ctx)],
      activateOnTyping: true,
    }),
    EditorView.updateListener.of((u) => {
      if (!u.docChanged) return;
      clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        try {
          localStorage.setItem(DRAFT, u.state.doc.toString());
        } catch {
          // Storage unavailable (private browsing): no draft is saved.
        }
      }, 400);
      clearTimeout(previewTimer);
      // Guided edits refresh the preview immediately; typing refreshes it after a short pause.
      previewTimer = window.setTimeout(
        refresh,
        u.transactions.some((tr) => tr.isUserEvent("guided")) ? 0 : 350,
      );
    }),
    EditorView.theme({
      "&": { height: "100%" },
      ".cm-scroller": { fontFamily: "var(--mono)" },
    }),
  ],
});

function initialText() {
  // A scenario passed in the link: #json=<percent-encoded JSON>. Invalid JSON is
  // still loaded so that the editor can show where it fails.
  const inline = /(?:^#|&)json=([^&]*)/.exec(location.hash)?.[1];
  if (inline !== undefined) {
    let text: string;
    try {
      text = decodeURIComponent(inline);
    } catch {
      text = inline;
    }
    try {
      return formatJson(JSON.parse(text));
    } catch {
      return text;
    }
  }
  // Link from the documentation to edit a template in the designer: #template=<name>
  const wanted = new URLSearchParams(location.hash.slice(1)).get("template");
  const m = wanted ? templates.find((x) => x.id === wanted) : undefined;
  if (m) return formatJson(m.data);
  try {
    const d = localStorage.getItem(DRAFT);
    if (d && d.trim()) return d;
  } catch {
    // Ignored.
  }
  const first =
    templates.find((x) => x.id === "lighting-control") ?? templates[0];
  return formatJson(first ? first.data : empty());
}

function setText(text: string, userEvent = "input") {
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: text },
    userEvent,
  });
}

function jump(path: string) {
  showTab("json");
  const hit = nodeForPath(editor.state, parsePath(path));
  const from = hit?.node.from ?? 0;
  editor.dispatch({
    selection: EditorSelection.range(from, hit?.exact ? hit.node.to : from),
    scrollIntoView: true,
  });
  editor.focus();
}

/**
 * Transactional scenario edit: calculate on a copy, validate, then
 * replace the text in one undo step. Explain refusals without changing the document.
 */
function tryCommit(label: string, mutate: (doc: Doc) => void): Refusal | null {
  const a = analyze(editor.state.doc.toString());
  if (a.parseError)
    return {
      label,
      message: t`fix the JSON syntax first (see the errors)`,
    };
  const doc = structuredClone(a.data) as Doc;
  try {
    mutate(doc);
  } catch (e) {
    const known = e instanceof EditRefusal || e instanceof SnippetRefusal;
    return {
      label,
      message: known
        ? (e as Error).message
        : String((e as Error)?.message ?? e),
    };
  }
  const after = analyze(formatJson(doc));
  if (after.problems.length > a.problems.length) {
    const p =
      after.problems.find(
        (x) =>
          !a.problems.some((y) => y.path === x.path && y.message === x.message),
      ) ?? after.problems[0]!;
    return { label, message: p.message, path: p.path };
  }
  setText(after.text, "guided");
  return null;
}

/** Menu variant: show the refusal in a notification. */
function commit(label: string, mutate: (doc: Doc) => void): boolean {
  const r = tryCommit(label, mutate);
  if (r)
    toast(
      t`${label}: change rejected — ${r.path ? `${r.path} : ` : ""}${r.message}.`,
    );
  return !r;
}

// ── Onglets ──────────────────────────────────────────────────────────────────
type Tab = "guided" | "json" | "sim";
/** Guided editor, JSON editor, or the simulation alone, over the whole width. */
function showTab(tab: Tab) {
  $("#pane-guided").hidden = tab !== "guided";
  $("#pane-json").hidden = tab !== "json";
  $(".split").classList.toggle("sim", tab === "sim");
  for (const t of ["guided", "json", "sim"] as const)
    $(`#tab-${t}`).setAttribute("aria-selected", String(tab === t));
  try {
    localStorage.setItem(TAB, tab);
  } catch {
    // Ignored.
  }
  if (tab === "json") editor.requestMeasure();
}
$("#tab-guided").addEventListener("click", () => showTab("guided"));
$("#tab-json").addEventListener("click", () => showTab("json"));
$("#tab-sim").addEventListener("click", () => showTab("sim"));

guided.registry = registry;
guided.commit = tryCommit;
guided.undo = () => undo(editor);
guided.redo = () => redo(editor);
$("#undo-btn").addEventListener("click", () => undo(editor));
$("#redo-btn").addEventListener("click", () => redo(editor));
guided.convert = () => convertToV2();
guided.onSelect = (id) => (guided.selected = id);
preview.addEventListener("bd-select", (e) => {
  guided.selected = (e as CustomEvent<{ deviceId: string }>).detail.deviceId;
  showTab("guided");
});
document.addEventListener("keydown", (e) => {
  // Ctrl+Z / Ctrl+Y in guided mode use the scenario's undo history.
  if (!(e.ctrlKey || e.metaKey) || $("#pane-guided").hidden) return;
  if ((e.target as HTMLElement).closest("input, textarea")) return;
  const back = e.key === "z" && !e.shiftKey;
  if (!back && e.key !== "y" && !(e.key === "z" && e.shiftKey)) return;
  e.preventDefault();
  if (back) undo(editor);
  else redo(editor);
});

// ── Preview ──
let loaded = "";
function options(): Partial<ViewOptions> {
  return {
    toolbar:
      ($<HTMLSelectElement>("#opt-toolbar").value as ToolbarMode) ?? "full",
    monitor: $<HTMLInputElement>("#opt-monitor").checked,
    description: $<HTMLInputElement>("#opt-description").checked,
    fit: $<HTMLInputElement>("#opt-slide").checked ? "contain" : "width",
  };
}

function refresh() {
  const a = analyze(editor.state.doc.toString());
  renderProblems(a);
  if (!a.parseError) refreshLines(a.data);
  const v2 =
    !a.parseError &&
    (a.data as { formatVersion?: unknown })?.formatVersion === 2;
  guided.format = a.parseError ? "invalid" : v2 ? "v2" : "v1";
  guided.doc = v2 ? (a.data as Doc) : null;
  if (!a.valid) return;
  const key = JSON.stringify(a.data);
  if (key === loaded) return;
  loaded = key;
  preview.load(a.data);
}

function applyOptions() {
  preview.options = options();
  $("#frame").classList.toggle("slide", options().fit === "contain");
}

function renderProblems(a: Analysis) {
  problemsEl.replaceChildren();
  if (a.valid) {
    status.textContent = t`Valid scenario — preview up to date`;
    status.className = "ok";
    return;
  }
  status.textContent =
    a.problems.length > 1
      ? t`${a.problems.length} errors — the preview shows the last valid version`
      : t`1 error — the preview shows the last valid version`;
  status.className = "bad";
  a.problems.slice(0, 50).forEach((p) => {
    const li = document.createElement("li");
    const path = document.createElement("code");
    path.textContent = p.path || t`(root)`;
    li.append(path, ` ${p.message}`);
    li.title = t`Go to the error`;
    li.addEventListener("click", () => {
      // In guided mode, an error opens the affected editor; otherwise it selects the JSON location.
      if (!$("#pane-guided").hidden && a.data) {
        const d = /^devices\[(\d+)\]/.exec(p.path);
        const g = /^groupAddresses\[(\d+)\]/.exec(p.path);
        const data = a.data as Doc;
        const target = d
          ? data.devices?.[Number(d[1])]?.id
          : g
            ? `ga:${data.groupAddresses?.[Number(g[1])]?.address}`
            : undefined;
        if (target) return void (guided.selected = target);
      }
      jump(p.path);
    });
    problemsEl.append(li);
  });
}

// ── Menus ────────────────────────────────────────────────────────────────────
const tplSelect = $<HTMLSelectElement>("#templates");
[{ id: "__empty", title: t`Empty installation` }, ...templates].forEach((m) => {
  const o = document.createElement("option");
  o.value = m.id;
  o.textContent = m.title;
  tplSelect.append(o);
});
tplSelect.addEventListener("change", () => {
  const m = templates.find((x) => x.id === tplSelect.value);
  setText(formatJson(m ? m.data : empty()));
  tplSelect.selectedIndex = 0;
  guided.selected = null;
});

const insertSelect = $<HTMLSelectElement>("#insert");
SNIPPETS.forEach((s) => {
  const o = document.createElement("option");
  o.value = s.id;
  o.textContent = s.label;
  o.title = s.hint;
  insertSelect.append(o);
});
insertSelect.addEventListener("change", () => {
  const s = SNIPPETS.find((x) => x.id === insertSelect.value);
  insertSelect.selectedIndex = 0;
  if (!s) return;
  if (
    commit(t`Insertion`, (doc) =>
      Object.assign(doc, s.apply(doc, { line: lineSelect.value || undefined })),
    )
  )
    toast(t`${s.label} added. ${s.hint}`);
});

// Update the insertion target from declared lines.
const lineSelect = $<HTMLSelectElement>("#target-line");
function refreshLines(data: unknown) {
  const lines = Array.isArray((data as { lines?: unknown })?.lines)
    ? ((data as { lines: { address?: unknown }[] }).lines
        .map((l) => l?.address)
        .filter((x) => typeof x === "string") as string[])
    : [];
  const current = lineSelect.value;
  if (lines.join() === [...lineSelect.options].map((o) => o.value).join())
    return;
  lineSelect.replaceChildren(
    ...lines.map((l) => {
      const o = document.createElement("option");
      o.value = l;
      o.textContent = t`on line ${l}`;
      return o;
    }),
  );
  if (lines.includes(current)) lineSelect.value = current;
}

$("#format").addEventListener("click", () => {
  const a = analyze(editor.state.doc.toString());
  if (a.parseError) return toast(t`Fix the JSON syntax before formatting.`);
  setText(formatJson(a.data));
});

$("#open").addEventListener("click", () =>
  $<HTMLInputElement>("#file").click(),
);
$<HTMLInputElement>("#file").addEventListener("change", async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  const text = await f.text();
  try {
    setText(formatJson(JSON.parse(text)));
  } catch {
    setText(text);
  }
});

function convertToV2() {
  const a = analyze(editor.state.doc.toString());
  if (!a.valid) return toast(t`The scenario must be valid to be converted.`);
  setText(formatJson(toV2(buildScenario(a.data, registry, t), registry)));
  toast(t`Converted to format 2 (default values omitted).`);
}
$("#to-v2").addEventListener("click", convertToV2);

// Extensions are trusted scripts selected by the user, never loaded from a scenario.
/** Apply a new extension list; restore the old list if validation fails. */
/**
 * Treat a new extension list as a transaction. If any script fails,
 * including a dependent script, or delivery would fail, keep the prior list.
 * changes; sources, registries, and storage retain their previous state.
 */
async function applyExtensions(next: LoadedExtension[], changed: string[]) {
  const result = loadExtensions(next);
  const problems: { name: string; error: string }[] = result.refused.map(
    (r) => ({ name: r.ext.name, error: r.error }),
  );
  if (!problems.length)
    problems.push(...(await deliveryCheck(bundleSource, next)));
  if (problems.length) {
    loadExtensions(extensions);
    problems.forEach((p) =>
      toast(
        changed.includes(p.name)
          ? t`Extension ${p.name} rejected: ${p.error}`
          : t`Refused: extension ${p.name} would fail (${p.error}). Nothing was changed.`,
      ),
    );
  } else {
    extensions = result.loaded;
    storeExtensions();
    changed.forEach((n) => toast(t`Extension ${n} loaded.`));
  }
  // Catalog, autocomplete, forms, and preview use the current definitions.
  registry = captureRegistry();
  nav = new SchemaNavigator(buildAuthorSchema(registry));
  guided.registry = registry;
  analysis = null;
  loaded = "";
  refresh();
  renderExtensionList();
  return problems.length === 0;
}
function renderExtensionList() {
  const list = $("#ext-list");
  list.replaceChildren();
  if (!extensions.length) {
    const p = document.createElement("p");
    p.className = "ext-empty";
    p.textContent = t`No extension loaded.`;
    list.append(p);
  }
  extensions.forEach((ext) => {
    const row = document.createElement("div");
    row.className = "ext-row";
    const name = document.createElement("div");
    const b = document.createElement("b");
    b.textContent = ext.name;
    const small = document.createElement("small");
    small.textContent = (provided.get(ext.name) ?? []).join(", ") || "—";
    name.append(b, small);
    const replace = document.createElement("button");
    replace.textContent = t`Replace…`;
    replace.addEventListener("click", () => {
      replaceTarget = ext.name;
      $<HTMLInputElement>("#ext-file").click();
    });
    const remove = document.createElement("button");
    remove.textContent = t`Remove`;
    remove.addEventListener("click", async () => {
      if (
        await applyExtensions(
          extensions.filter((x) => x !== ext),
          [],
        )
      )
        toast(t`Extension ${ext.name} removed.`);
    });
    row.append(name, replace, remove);
    list.append(row);
  });
}
let replaceTarget: string | null = null;
$("#load-ext").addEventListener("click", () => {
  renderExtensionList();
  $<HTMLDialogElement>("#ext-dialog").showModal();
});
$("#ext-add").addEventListener("click", () => {
  replaceTarget = null;
  $<HTMLInputElement>("#ext-file").click();
});
$("#ext-close").addEventListener("click", () =>
  $<HTMLDialogElement>("#ext-dialog").close(),
);
$("#about").addEventListener("click", () => {
  // The banner of the bundled library names the build and its source code.
  const build = buildInfo(bundleSource);
  $("#about-version").textContent = `v${build.label ?? BusDiagramApi.version}`;
  $<HTMLAnchorElement>("#about-source").href = build.source;
  $<HTMLDialogElement>("#about-dialog").showModal();
});
$("#about-close").addEventListener("click", () =>
  $<HTMLDialogElement>("#about-dialog").close(),
);
$<HTMLInputElement>("#ext-file").addEventListener("change", async (e) => {
  const input = e.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  input.value = "";
  if (!files.length) return;
  let next = [...extensions];
  const changed: string[] = [];
  for (const f of files) {
    // Replace keeps the target extension name; a file with the same name replaces it too.
    const name = replaceTarget && files.length === 1 ? replaceTarget : f.name;
    const ext = { name, source: await f.text() };
    const i = next.findIndex((x) => x.name === name);
    if (i >= 0) next[i] = ext;
    else next = [...next, ext];
    changed.push(name);
  }
  replaceTarget = null;
  await applyExtensions(next, changed);
});

["#opt-toolbar", "#opt-monitor", "#opt-description", "#opt-slide"].forEach(
  (s) => $(s).addEventListener("change", applyOptions),
);

const langSelect = $<HTMLSelectElement>("#lang");
const langNames: Record<string, string> = { fr: "Français", en: "English" };
availableLanguages().forEach((l) => {
  const o = document.createElement("option");
  o.value = l;
  o.textContent = langNames[l] ?? l;
  o.selected = l === language;
  langSelect.append(o);
});
langSelect.addEventListener("change", () => {
  try {
    localStorage.setItem(LANG, langSelect.value);
    localStorage.setItem(DRAFT, editor.state.doc.toString());
  } catch {
    // Ignored.
  }
  location.reload();
});

// ── Exports ──────────────────────────────────────────────────────────────────
function current(): unknown | null {
  const a = analyze(editor.state.doc.toString());
  if (!a.valid) {
    toast(t`The scenario contains errors: fix them before exporting.`);
    return null;
  }
  return a.data;
}

function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const slug = (data: unknown) =>
  String((data as { title?: string }).title ?? "scenario")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "scenario";

function showCode(title: string, text: string, note: string, link?: string) {
  const dlg = $<HTMLDialogElement>("#code-dialog");
  $("#code-title").textContent = title;
  $("#code-note").textContent = note;
  $<HTMLTextAreaElement>("#code-text").value = text;
  const open = $<HTMLAnchorElement>("#code-open");
  open.hidden = !link;
  if (link) open.href = link;
  dlg.showModal();
}

$("#code-copy").addEventListener("click", async () => {
  const area = $<HTMLTextAreaElement>("#code-text");
  try {
    await navigator.clipboard.writeText(area.value);
    toast(t`Copied to the clipboard.`);
  } catch {
    area.select();
    toast(t`Selected: press Ctrl+C to copy.`);
  }
});
$("#code-close").addEventListener("click", () =>
  $<HTMLDialogElement>("#code-dialog").close(),
);

// Subresource Integrity hash of the embedded bundle, which is the file published on npm
// for this version. Unavailable outside a secure context: the tag is then left without it.
let bundleIntegrity: Promise<string | undefined> | undefined;
const integrity = () =>
  (bundleIntegrity ??= (async () => {
    try {
      const digest = await crypto.subtle.digest(
        "SHA-384",
        new TextEncoder().encode(bundleSource),
      );
      let binary = "";
      for (const byte of new Uint8Array(digest))
        binary += String.fromCharCode(byte);
      return `sha384-${btoa(binary)}`;
    } catch {
      return undefined;
    }
  })());

$("#export-snippet").addEventListener("click", async () => {
  const data = current();
  if (!data) return;
  const o = options();
  const style = o.fit === "contain" ? "height:540px" : "";
  // Use <script src> tags if the raw files coexist on one page; otherwise embed extensions
  // Embedded into the code and wrapped as in the designer, with the same execution contract.
  const raw = !(await deliveryCheck(bundleSource, extensions, false)).length;
  const extScripts = extensions
    .map((x) =>
      raw
        ? `<script src="${x.name}"></script>\n`
        : `<script>${escapeScript(wrapExtension(x.source, x.name))}</script>\n`,
    )
    .join("");
  showCode(
    t`Code to paste into the page`,
    `<!-- ${t`Once per page, preferably in <head>:`} -->\n${cdnTag(BusDiagramApi.version, await integrity())}\n${extScripts}\n${embedSnippet(data, o, style)}`,
    t`HTML page, Markdown (Hugo, Pandoc), reveal.js slide: paste the code. The first tag loads version ${BusDiagramApi.version} of the library from a CDN; this exact version stays available and does not change. To work offline, download bus-diagram.js from the Export menu, place it next to the page, and use <script src="bus-diagram.js"></script> instead. The interface language follows the page's lang attribute.` +
      (extensions.length && !raw
        ? " " +
          t`The extensions are embedded in the code: loaded as-is through <script src> tags, they would conflict (global variables with the same name).`
        : extensions.length
          ? " " + t`Place the extension files next to the page.`
          : ""),
  );
});
$("#export-json").addEventListener("click", () => {
  const data = current();
  if (data)
    download(`${slug(data)}.json`, formatJson(data) + "\n", "application/json");
});
$("#export-page").addEventListener("click", () => {
  const data = current();
  if (data)
    download(
      `${slug(data)}.html`,
      standalonePage(data, bundleSource, options(), language, extensions),
      "text/html",
    );
});
$("#export-bundle").addEventListener("click", () =>
  download("bus-diagram.js", bundleSource, "text/javascript"),
);
$("#export-link").addEventListener("click", async () => {
  const data = current();
  if (!data) return;
  const url = new URL(
    `../player.html#${await encodeShare(data, options(), language)}`,
    location.href,
  ).href;
  showCode(
    t`Player link`,
    url,
    t`The scenario is stored in the link itself (nothing is sent to a server). Use it in an iframe or presentation software that displays web pages, once the documentation is published.` +
      (extensions.length
        ? " " +
          t`Note: the player does not load extensions; prefer the standalone page.`
        : ""),
    url,
  );
});

// Close the Export menu after every action.
document
  .querySelectorAll(".menu button")
  .forEach((b) =>
    b.addEventListener("click", () =>
      b.closest("details")?.removeAttribute("open"),
    ),
  );

// ── Divers ───────────────────────────────────────────────────────────────────
let toastTimer = 0;
function toast(msg: string) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("show"), 4000);
}

// Exposed for end-to-end tests.
(window as unknown as { designer: object }).designer = {
  editor,
  setText,
  commit,
  text: () => editor.state.doc.toString(),
  analysis: () => analyze(editor.state.doc.toString()),
  context: () => cursorContext(editor.state, editor.state.selection.main.head),
  suggest: () => {
    const c = cursorContext(editor.state, editor.state.selection.main.head);
    const s = c ? nav.at(c.path, lastParsed) : null;
    return s ? nav.values(s) : null;
  },
};

let startTab: Tab = "guided";
try {
  const saved = localStorage.getItem(TAB);
  if (saved === "json" || saved === "sim") startTab = saved;
} catch {
  // Ignored.
}
showTab(startTab);
applyOptions();
refresh();
