// energyMeter/v1: independent energy meter with several measured circuits, such as a
// meter on the supply of a heat pump, a water heater, or a group of sockets. Unlike the
// metering of a switching actuator, it does not switch the circuits it measures. The power
// of each circuit is entered by the reader (numeric input on its power object) or given at
// start; the meter integrates energy and sends power on change and energy cyclically.
import type {
  BehaviorContext,
  BehaviorDefinition,
  JsonObject,
} from "../../knx/contracts";
import { fromObjectUnit, toObjectUnit } from "../../knx/units";
import { sendTypedValue } from "../shared/typed-value";

interface CircuitState {
  powerW: number;
  energyWh: number;
  sentW: number | null;
}

interface MeterState {
  atMs: number;
  started: boolean;
  totalSentW: number | null;
  channels: Record<string, CircuitState>;
}

type Ctx = BehaviorContext<MeterState>;

const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function send(ctx: Ctx, port: string, ch: string | null, value: number) {
  ctx.device.objects
    .filter(
      (o) => o.port === port && (ch === null ? !o.channel : o.channel === ch),
    )
    .forEach((o) => {
      ctx.setObject(o.id, toObjectUnit(o.dpt, value));
      ctx.transmit(o.id);
    });
}

/** Count the energy of the elapsed interval with the power measured during it. */
function integrate(ctx: Ctx) {
  const m = ctx.state;
  const scale = num(ctx.device.parameters.energyTimeScale, 60);
  const hours = ((ctx.timeMs - m.atMs) / 3_600_000) * scale;
  m.atMs = ctx.timeMs;
  for (const c of Object.values(m.channels)) c.energyWh += c.powerW * hours;
}

/** Send power on change (or cyclically), energy and total power cyclically. */
function report(ctx: Ctx, cyclic: boolean) {
  integrate(ctx);
  const m = ctx.state;
  const delta = num(ctx.device.parameters.powerSendDeltaW, 10);
  let total = 0;
  for (const [ch, c] of Object.entries(m.channels)) {
    total += c.powerW;
    if (cyclic || c.sentW === null || Math.abs(c.powerW - c.sentW) >= delta) {
      c.sentW = c.powerW;
      send(ctx, "power", ch, c.powerW);
    }
    if (cyclic) send(ctx, "energy", ch, Math.round(c.energyWh));
  }
  if (
    cyclic ||
    m.totalSentW === null ||
    Math.abs(total - m.totalSentW) >= delta
  ) {
    m.totalSentW = total;
    send(ctx, "totalPower", null, total);
  }
}

export const energyMeter: BehaviorDefinition<MeterState> = {
  // Each measured circuit shows the power of its loads.
  presentation: (d) => ({
    metered: d.channels
      .filter((c) =>
        d.objects.some(
          (o) =>
            o.channel === c.id && (o.port === "power" || o.port === "energy"),
        ),
      )
      .map((c) => c.id),
  }),
  description:
    "Energy meter: measures several circuits that other devices switch or that are always supplied; sends their power and integrated energy.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      meterIntervalMs: {
        title: "Metering send interval",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 1000,
        default: 5000,
        description: "Cyclic sending of power and energy values (ms).",
      },
      powerSendDeltaW: {
        title: "Power send threshold",
        expert: true,
        type: "number",
        minimum: 0,
        default: 10,
        description:
          "Send a power value when it changes by at least this many watts.",
      },
      energyTimeScale: {
        title: "Energy time scale",
        expert: true,
        type: "number",
        exclusiveMinimum: 0,
        default: 60,
        description:
          "Energy counting speed: 60 counts one simulated second as one minute, so that the counter moves visibly; 1 counts real time.",
      },
    },
  },
  channelInitialState: {
    type: "object",
    additionalProperties: false,
    properties: {
      powerW: {
        title: "Measured power at start",
        type: "number",
        minimum: 0,
        maximum: 1000000,
        default: 0,
        description:
          "Power (W) drawn by the circuit when the simulation starts; a numeric input on the power object changes it.",
      },
      energyWh: {
        title: "Meter index at start",
        type: "number",
        minimum: 0,
        default: 0,
        description: "Energy (Wh) already counted when the simulation starts.",
      },
    },
  },
  ports: {
    power: {
      dpts: ["14.056", "9.024"],
      channel: "required",
      title: "Power",
      direction: "out",
      description:
        "power measured on the circuit: W with 14.056, kW with 9.024; a numeric input on this object enters the measured power",
    },
    energy: {
      dpts: ["13.010", "13.013"],
      channel: "required",
      title: "Energy",
      direction: "out",
      description:
        "energy counted on the circuit, sent cyclically: Wh with 13.010, kWh with 13.013",
    },
    totalPower: {
      dpts: ["14.056", "9.024"],
      channel: "none",
      title: "Total power",
      direction: "out",
      description: "sum of the measured circuits: W with 14.056, kW with 9.024",
    },
  },
  acceptsInputs: true,
  createState: (device) => ({
    atMs: 0,
    started: false,
    totalSentW: null,
    channels: Object.fromEntries(
      device.channels.map((c) => [
        c.id,
        {
          powerW: Math.max(0, num(c.initialState.powerW, 0)),
          energyWh: Math.max(0, num(c.initialState.energyWh, 0)),
          sentW: null,
        },
      ]),
    ),
  }),
  onInit(ctx) {
    // Show the initial power and meter index on the objects without transmitting them.
    for (const [ch, c] of Object.entries(ctx.state.channels))
      ctx.device.objects
        .filter((o) => o.channel === ch)
        .forEach((o) => {
          if (o.port === "power")
            ctx.setObject(o.id, toObjectUnit(o.dpt, c.powerW));
          if (o.port === "energy")
            ctx.setObject(o.id, toObjectUnit(o.dpt, Math.round(c.energyWh)));
        });
    ctx.schedule("meterSoon", 500);
  },
  onInput(ctx, input) {
    const inp = ctx.device.inputs.find((x) => x.id === input.inputId);
    const o = inp && ctx.device.objects.find((x) => x.id === inp.object);
    const c = o?.channel ? ctx.state.channels[o.channel] : undefined;
    if (
      input.gesture === "value" &&
      input.value !== undefined &&
      o?.port === "power" &&
      c
    ) {
      // A measured power is entered: count the energy so far, then apply it.
      integrate(ctx);
      c.powerW = Math.max(0, fromObjectUnit(o.dpt, input.value));
      report(ctx, false);
      return;
    }
    sendTypedValue(ctx as never, input);
  },
  onTimer(ctx, key) {
    if (key !== "meterSoon" && key !== "meter") return;
    report(ctx, key === "meter" || !ctx.state.started);
    if (key === "meter" || !ctx.state.started) {
      ctx.state.started = true;
      ctx.schedule("meter", num(ctx.device.parameters.meterIntervalMs, 5000));
    }
  },
  channelState(state, ch, timeMs, device): JsonObject {
    const c = state.channels[ch];
    if (!c) return {};
    // Energy projected at `timeMs`, as the next integration would count it.
    const scale = num(device.parameters.energyTimeScale, 60);
    const hours = ((timeMs - state.atMs) / 3_600_000) * scale;
    return { powerW: c.powerW, energyWh: c.energyWh + c.powerW * hours };
  },
};
