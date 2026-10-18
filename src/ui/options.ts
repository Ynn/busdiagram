// Component display options: one definition serves both HTML attributes
// and the `options` property, as well as the reference docs. No Lit dependency.

export type ToolbarMode = "full" | "compact" | "none";
export type FitMode = "width" | "contain";
export type WrapMode = "auto" | "none";

export interface ViewOptions {
  toolbar: ToolbarMode;
  monitor: boolean;
  description: boolean;
  hints: boolean;
  fit: FitMode;
  maxScale: number;
  minScale: number;
  /** A line too long for the space of the diagram continues on rows below. */
  wrap: WrapMode;
  /** Zoom buttons, and Ctrl + wheel and dragging on the diagram. */
  zoom: boolean;
  speed: number | "instant" | null;
  stepMode: boolean;
  /** Address of the designer opened by the toolbar icon, or "none" to hide the icon. */
  designer: string;
  /**
   * Timeline below the diagram: "" hides it; otherwise its first traces, separated by
   * spaces ("on" shows it without traces).
   */
  timeline: string;
  /**
   * WebSocket address of the BusDiagram-ETS program, linked to ETS when the reader asks
   * for it from the toolbar; "none" hides the control.
   */
  bridge: string;
}

/** The published designer, which keeps up with the latest version of the format. */
export const PUBLISHED_DESIGNER =
  "https://ynn.github.io/busdiagram/designer/index.html";

/** WebSocket address of the BusDiagram-ETS program on this computer. */
export const DEFAULT_BRIDGE = "ws://127.0.0.1:3761/ws";

export const DEFAULT_OPTIONS: ViewOptions = {
  toolbar: "full",
  monitor: true,
  description: true,
  hints: true,
  fit: "width",
  maxScale: 1.2,
  minScale: 0.7,
  wrap: "auto",
  zoom: true,
  speed: null,
  stepMode: false,
  designer: PUBLISHED_DESIGNER,
  timeline: "",
  bridge: DEFAULT_BRIDGE,
};

export interface OptionDoc {
  name: keyof ViewOptions;
  attribute: string;
  type: string;
  default: string;
  summary: string;
  details: string;
  example: string;
}

/** Reference text for each option, used to generate the documentation. */
export const OPTION_DOCS: OptionDoc[] = [
  {
    name: "toolbar",
    attribute: "toolbar",
    type: '"full" | "compact" | "none"',
    default: '"full"',
    summary: "Toolbar above the diagram.",
    details:
      "‘full’ shows the title, speed, filter tables, step control, pause, and reset. ‘compact’ shows three small floating buttons in a corner of the diagram, suitable for a slide. ‘none’ hides the controls while leaving the diagram interactive.",
    example: '<bus-diagram toolbar="compact">',
  },
  {
    name: "monitor",
    attribute: "monitor",
    type: "boolean",
    default: "true",
    summary: "Group monitor and telegram details below the diagram.",
    details:
      "Set to false when a slide or page needs only the diagram. Telegrams still travel over the bus.",
    example: '<bus-diagram monitor="false">',
  },
  {
    name: "description",
    attribute: "description",
    type: "boolean",
    default: "true",
    summary: "Scenario `description` below the toolbar.",
    details: "Hide when the page or slide already explains the interaction.",
    example: '<bus-diagram description="false">',
  },
  {
    name: "hints",
    attribute: "hints",
    type: "boolean",
    default: "true",
    summary: "Hint explaining short and long button presses.",
    details: "Shown only when a button distinguishes short and long presses.",
    example: '<bus-diagram hints="false">',
  },
  {
    name: "fit",
    attribute: "fit",
    type: '"width" | "contain"',
    default: '"width"',
    summary: "Diagram scaling.",
    details:
      "‘width’ uses the available width between minScale and maxScale; oversized diagrams scroll horizontally instead of becoming unreadable. ‘contain’ fits the entire diagram within the component; give the component an explicit height, such as 100% of a slide.",
    example: '<bus-diagram fit="contain" style="height:560px">',
  },
  {
    name: "maxScale",
    attribute: "max-scale",
    type: "number",
    default: "1.2",
    summary: "Maximum diagram scale.",
    details:
      "Prevents a small diagram from becoming oversized on a large screen.",
    example: '<bus-diagram max-scale="1">',
  },
  {
    name: "minScale",
    attribute: "min-scale",
    type: "number",
    default: "0.7",
    summary: "Minimum scale in ‘width’ mode before horizontal scrolling.",
    details:
      "Below this scale, labels would become unreadable, so the diagram scrolls.",
    example: '<bus-diagram min-scale="0.5">',
  },
  {
    name: "wrap",
    attribute: "wrap",
    type: '"auto" | "none"',
    default: '"auto"',
    summary: "Lines too long for the diagram continue on rows below.",
    details:
      "‘auto’: the devices of a line that do not fit the width of the component (in ‘contain’ mode and in full screen, its whole space) continue on another row, the cable of the line turning back between the two, in the order of the devices on the line. ‘none’ keeps each line on one row, as wide as its devices.",
    example: '<bus-diagram wrap="none">',
  },
  {
    name: "zoom",
    attribute: "zoom",
    type: "boolean",
    default: "true",
    summary: "Zoom of the diagram.",
    details:
      "Buttons in a corner of the diagram zoom in and out, and go back to the scale that fits; Ctrl + wheel (or the pinch of a touchpad) zooms on the pointer, and dragging the background of a zoomed diagram moves it. false keeps the scale of ‘fit’.",
    example: '<bus-diagram zoom="false">',
  },
  {
    name: "speed",
    attribute: "speed",
    type: 'number | "instant"',
    default: "scenario `options.speed`, otherwise 1",
    summary: "Initial simulation speed.",
    details:
      "1 is real time, 0.35 is slower, and 2 is faster: telegrams are slowed down so that they can be followed on the diagram. ‘instant’ runs in real time with telegrams as fast as on a real bus (about 20 ms each), not animated. The long-press threshold (0.5 real seconds) does not change.",
    example: '<bus-diagram speed="0.35">',
  },
  {
    name: "stepMode",
    attribute: "step-mode",
    type: "boolean",
    default: "false",
    summary: "Start in step mode.",
    details:
      "Pause at each transmission, coupler decision, reception, output change, and scheduled event, with an explanation and a Next button.",
    example: "<bus-diagram step-mode>",
  },
  {
    name: "designer",
    attribute: "designer",
    type: 'URL | "none"',
    default: "the published designer",
    summary: "Designer opened by the icon of the toolbar.",
    details:
      "The icon opens the designer in a new tab with the scenario, carried compressed in the link after #, which is not sent to the server. Give the address of a copy of the designer (for example a relative path, to work offline), or none to hide the icon. Hidden when the toolbar is.",
    example: '<bus-diagram designer="designer/index.html">',
  },
  {
    name: "timeline",
    attribute: "timeline",
    type: "trace identifiers | true",
    default: "hidden",
    summary: "Timeline of up to four traces on the axis of simulated time.",
    details:
      "Shows object values and on/off states as steps, room temperatures, openings, and levels as curves, and the telegrams of a traced object as marks. List the first traces: device/object for an object, device:channel for the equipment of an output, @room for the temperature of a room; with no list (or true), the timeline starts empty. A menu adds or removes traces.",
    example: '<bus-diagram timeline="livingThermostat/temp @livingRoom">',
  },
  {
    name: "bridge",
    attribute: "bridge",
    type: 'WebSocket URL | "none"',
    default: `"${DEFAULT_BRIDGE}"`,
    summary: "Link to ETS from the toolbar.",
    details:
      "With the BusDiagram-ETS program running on the reader's computer, the ‘Link to ETS’ button of the full toolbar connects the diagram to ETS, which reaches the program as a KNXnet/IP tunnelling interface. ETS reaches the bus through the diagram's bus interface (USB or IP), or, without one, on its main line, every group address then crossing the couplers to and from it. A group telegram from ETS enters the bus there, and the telegrams that reach that point through the topology are sent to ETS, whose group monitor shows them. While linked, the simulation runs in real time; telegrams from ETS are refused while it is paused. The toolbar also downloads the group addresses of the diagram for ETS, and asks for the program's port when it cannot reach it. ‘none’ hides these controls.",
    example: '<bus-diagram bridge="none">',
  },
];

const BOOL_TRUE = ["", "true", "1", "yes", "oui"];
const BOOL_FALSE = ["false", "0", "no", "non"];

function parseAttr(doc: OptionDoc, raw: string | null): unknown {
  if (raw === null) return undefined;
  const d = DEFAULT_OPTIONS[doc.name];
  if (typeof d === "boolean") {
    const v = raw.trim().toLowerCase();
    return BOOL_TRUE.includes(v)
      ? true
      : BOOL_FALSE.includes(v)
        ? false
        : undefined;
  }
  if (doc.name === "speed" && raw.trim().toLowerCase() === "instant")
    return "instant";
  if (
    doc.name === "speed" ||
    doc.name === "maxScale" ||
    doc.name === "minScale"
  ) {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  if (doc.name === "toolbar")
    return ["full", "compact", "none"].includes(raw) ? raw : undefined;
  if (doc.name === "fit")
    return ["width", "contain"].includes(raw) ? raw : undefined;
  if (doc.name === "wrap")
    return ["auto", "none"].includes(raw) ? raw : undefined;
  if (doc.name === "timeline") {
    const v = raw.trim();
    if (BOOL_FALSE.includes(v.toLowerCase()) || v.toLowerCase() === "none")
      return "";
    return BOOL_TRUE.includes(v.toLowerCase()) ? "on" : v;
  }
  if (doc.name === "bridge") {
    const v = raw.trim();
    if (!v || BOOL_FALSE.includes(v.toLowerCase()) || v === "none")
      return "none";
    return /^wss?:\/\//.test(v) ? v : undefined;
  }
  if (doc.name === "designer") {
    const v = raw.trim();
    return v ? (BOOL_FALSE.includes(v.toLowerCase()) ? "none" : v) : undefined;
  }
  return undefined;
}

/**
 * Effective options: JavaScript `options`, then HTML attributes, then defaults.
 * Invalid values are ignored and the default is retained.
 */
export function resolveOptions(
  getAttr: (name: string) => string | null,
  js: Partial<ViewOptions> | null | undefined,
): ViewOptions {
  const out = { ...DEFAULT_OPTIONS } as Record<string, unknown>;
  for (const doc of OPTION_DOCS) {
    const fromAttr = parseAttr(doc, getAttr(doc.attribute));
    if (fromAttr !== undefined) out[doc.name] = fromAttr;
    const fromJs = js?.[doc.name];
    if (fromJs !== undefined && parseAttr(doc, String(fromJs)) !== undefined)
      out[doc.name] = parseAttr(doc, String(fromJs));
  }
  return out as unknown as ViewOptions;
}
