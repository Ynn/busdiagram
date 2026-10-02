// clockMaster/v1: broadcasts the time of day (DPT 10.001) and the date (DPT 11.001) of the
// simulated clock of the scenario (`clock`).
import type { BehaviorContext, BehaviorDefinition } from "../../knx/contracts";
import { MINUTE, dateValue, send, timeOfDayValue } from "../shared/clock";

const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function setValues(ctx: BehaviorContext<unknown>, nowMs: number) {
  ctx.device.objects.forEach((o) => {
    if (o.port === "time") ctx.setObject(o.id, timeOfDayValue(nowMs));
    if (o.port === "date") ctx.setObject(o.id, dateValue(nowMs));
  });
}

/** Schedule the next broadcast at the next multiple of the period, in clock time. */
interface ClockState {
  /** Clock time of the last broadcast, ms; null before the first one. */
  lastMs: number | null;
}

function scheduleClock(ctx: BehaviorContext<ClockState>) {
  const c = ctx.clock();
  const period = num(ctx.device.parameters.sendPeriodMin, 1) * MINUTE;
  if (!c || period <= 0) return;
  const wait = period - (c.nowMs % period);
  ctx.schedule("send", Math.max(1, Math.round(wait / c.speed)));
}

function broadcast(ctx: BehaviorContext<ClockState>) {
  const c = ctx.clock();
  if (!c) return;
  // The start-up and periodic sends can fall on the same instant: send once.
  if (ctx.state.lastMs === c.nowMs) return;
  ctx.state.lastMs = c.nowMs;
  send(ctx, "time", timeOfDayValue(c.nowMs));
  send(ctx, "date", dateValue(c.nowMs));
}

export const clockMaster: BehaviorDefinition<ClockState> = {
  description:
    "Clock master: sends the time of day (10.001) and the date (11.001) of the simulated clock at a fixed period and after the clock is set.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      sendPeriodMin: {
        title: "Send period",
        type: "integer",
        minimum: 0,
        maximum: 1440,
        default: 1,
        description:
          "Clock minutes between two broadcasts, aligned on the clock (1 = every full minute); 0 sends only at start and after the clock is set.",
      },
      sendOnStart: {
        title: "Send on start",
        type: "boolean",
        default: true,
        description: "Send time and date shortly after the simulation starts.",
      },
      startDelayMs: {
        title: "Start-up send delay",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 0,
        default: 1000,
        description:
          "Delay after the simulation starts before time and date are sent.",
      },
    },
  },
  ports: {
    time: {
      defaultFlags: { R: true },
      dpts: ["10.001"],
      channel: "none",
      title: "Time of day",
      direction: "out",
      description: "day of week and time of the simulated clock",
    },
    date: {
      defaultFlags: { R: true },
      dpts: ["11.001"],
      channel: "none",
      title: "Date",
      direction: "out",
      description: "date of the simulated clock",
    },
  },
  createState: () => ({ lastMs: null }),
  onInit(ctx) {
    const c = ctx.clock();
    if (!c) {
      ctx.note(ctx.t`Clock master: the scenario declares no clock`);
      return;
    }
    // Current values are available to read requests (R flag) from the start.
    setValues(ctx, c.nowMs);
    if (ctx.device.parameters.sendOnStart !== false)
      ctx.schedule("start", num(ctx.device.parameters.startDelayMs, 1000));
    scheduleClock(ctx);
  },
  onTimer(ctx, key) {
    if (key === "start") broadcast(ctx);
    if (key === "send") {
      broadcast(ctx);
      scheduleClock(ctx);
    }
  },
  onClockChange(ctx) {
    ctx.state.lastMs = null;
    broadcast(ctx);
    ctx.cancel("send");
    scheduleClock(ctx);
  },
};
