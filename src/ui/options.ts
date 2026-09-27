// Component display options: one definition serves both HTML attributes
// and the `options` property, as well as the reference docs. No Lit dependency.

export type ToolbarMode = "full" | "compact" | "none";
export type FitMode = "width" | "contain";

export interface ViewOptions {
  toolbar: ToolbarMode;
  monitor: boolean;
  description: boolean;
  hints: boolean;
  fit: FitMode;
  maxScale: number;
  minScale: number;
  speed: number | null;
  stepMode: boolean;
}

export const DEFAULT_OPTIONS: ViewOptions = {
  toolbar: "full",
  monitor: true,
  description: true,
  hints: true,
  fit: "width",
  maxScale: 1.2,
  minScale: 0.7,
  speed: null,
  stepMode: false,
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
    name: "speed",
    attribute: "speed",
    type: "number",
    default: "scenario `options.speed`, otherwise 1",
    summary: "Initial simulation speed.",
    details:
      "1 is real time, 0.35 is slower, and 2 is faster. The long-press threshold (0.5 real seconds) does not change.",
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
