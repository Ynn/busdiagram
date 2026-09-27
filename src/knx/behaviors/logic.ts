// logicGate/v1: logic module combining one-bit inputs into one output.
// The output is recomputed on each received input; an optional enable object
// (DPT 1.003) blocks transmission while it is 0.
import type { BehaviorContext, BehaviorDefinition } from "../contracts";

interface LogicState {
  /** Last transmitted result; null before the first transmission. */
  sent: number | null;
}

const OPERATIONS = ["and", "or", "xor", "not"] as const;
type Operation = (typeof OPERATIONS)[number];

function inputs(ctx: BehaviorContext<LogicState>): number[] {
  return ctx.device.objects
    .filter((o) => o.port === "logicIn")
    .map((o) => (ctx.getObject(o.id) ? 1 : 0));
}

/** Result of the configured operation; unknown inputs count as 0. */
export function evaluate(op: Operation, values: number[]): number {
  switch (op) {
    case "and":
      return values.length && values.every((v) => v === 1) ? 1 : 0;
    case "or":
      return values.some((v) => v === 1) ? 1 : 0;
    case "xor":
      return values.filter((v) => v === 1).length % 2;
    case "not":
      return values[0] === 1 ? 0 : 1;
  }
}

/** "HH:MM" → minutes after midnight, or null. */
const minutesOf = (v: unknown) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v ?? "").trim());
  return m && Number(m[1]) < 24 && Number(m[2]) < 60
    ? Number(m[1]) * 60 + Number(m[2])
    : null;
};

/** Whether a time of day (seconds) lies in [from, to), a window that may cross midnight. */
export function inWindow(seconds: number, fromMin: number, toMin: number) {
  const m = Math.floor((seconds % 86400) / 60);
  return fromMin <= toMin
    ? m >= fromMin && m < toMin
    : m >= fromMin || m < toMin;
}

/**
 * Time window condition from the time object (DPT 10.001) received on the bus;
 * true when no window is configured, false while no time has been received.
 */
function windowOpen(ctx: BehaviorContext<LogicState>): boolean {
  const from = minutesOf(ctx.device.parameters.activeFrom);
  const to = minutesOf(ctx.device.parameters.activeTo);
  if (from === null || to === null) return true;
  const o = ctx.device.objects.find((x) => x.port === "time");
  const v = o ? ctx.getObject(o.id) : null;
  return v !== null && inWindow(v, from, to);
}

function update(
  ctx: BehaviorContext<LogicState>,
  force: boolean,
  quiet = false,
) {
  const p = ctx.device.parameters;
  const op = (OPERATIONS as readonly string[]).includes(String(p.operation))
    ? (p.operation as Operation)
    : "and";
  const enable = ctx.device.objects.find((o) => o.port === "enable");
  if (enable && ctx.getObject(enable.id) === 0) {
    ctx.note(ctx.t`Logic module disabled: output not sent`);
    return;
  }
  const values = inputs(ctx);
  // With only a time window, the output follows the window.
  const logic = values.length ? evaluate(op, values) : 1;
  const result = logic && windowOpen(ctx) ? 1 : 0;
  const out = ctx.device.objects.find((o) => o.port === "logicOut");
  if (!out) return;
  if (!force && p.sendOnChangeOnly !== false && result === ctx.state.sent) {
    if (!quiet)
      ctx.note(ctx.t`Logic result unchanged (${result}): no telegram`);
    return;
  }
  ctx.state.sent = result;
  ctx.setObject(out.id, result);
  ctx.transmit(out.id);
}

export const logicGate: BehaviorDefinition<LogicState> = {
  description:
    "Logic module: combines one-bit inputs (AND, OR, XOR, NOT) and sends the result; an optional enable object blocks the output.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      operation: {
        title: "Operation",
        type: "string",
        enum: [...OPERATIONS],
        enumTitles: ["AND", "OR", "XOR", "NOT (first input)"],
        default: "and",
        description:
          "Logic function applied to the inputs; an input with no value yet counts as 0.",
      },
      activeFrom: {
        title: "Time window from",
        type: "string",
        default: "",
        description:
          "Start of a daily time window (HH:MM). With activeTo and a time object, the output is 1 only inside the window; the window may cross midnight.",
      },
      activeTo: {
        title: "Time window to",
        type: "string",
        default: "",
        description: "End of the daily time window (HH:MM), excluded.",
      },
      sendOnChangeOnly: {
        title: "Send on change only",
        expert: true,
        type: "boolean",
        default: true,
        description:
          "Send the result only when it differs from the last transmitted value.",
      },
    },
  },
  ports: {
    logicIn: {
      dpts: ["1.001", "1.002", "1.003", "1.005", "1.018", "1.019"],
      channel: "none",
      title: "Logic input",
      direction: "in",
      description: "one-bit input of the logic function",
    },
    enable: {
      dpts: ["1.003", "1.001"],
      channel: "none",
      title: "Enable",
      direction: "in",
      description:
        "0 blocks the output; 1 enables it again and sends the current result",
    },
    time: {
      dpts: ["10.001"],
      channel: "none",
      title: "Time of day",
      direction: "in",
      description: "time received from a clock master, used by the time window",
    },
    logicOut: {
      dpts: ["1.001", "1.002", "1.003", "1.005", "1.008", "1.009"],
      channel: "none",
      title: "Logic output",
      direction: "out",
      description: "result of the logic function",
    },
  },
  createState: () => ({ sent: null }),
  onObjectWrite(ctx, e) {
    const o = ctx.device.objects.find((x) => x.id === e.objectId);
    if (o?.port === "logicIn") update(ctx, false);
    else if (o?.port === "time") update(ctx, false, true);
    else if (o?.port === "enable" && e.newValue === 1) update(ctx, true);
  },
  deviceState(state) {
    return { result: state.sent };
  },
};
