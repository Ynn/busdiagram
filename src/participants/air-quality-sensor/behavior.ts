// airQualitySensor/v1: room sensor for temperature, relative humidity, and CO2, with
// threshold alarms and a step controller for ventilation. The profile is neutral:
// it follows the functions commonly offered by KNX CO2 sensors (measurement values,
// alarm thresholds with hysteresis, three-step control value with minimum step time).
import type { BehaviorContext, BehaviorDefinition } from "../../knx/contracts";

interface AirState {
  /** Current step of the ventilation controller, 0–3. */
  step: number;
  /** Time of the last step change, ms; null before the first one. */
  stepAtMs: number | null;
  co2Alarm: number;
  humidityAlarm: number;
}

type Ctx = BehaviorContext<AirState>;

const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const valueOf = (ctx: Ctx, port: string) => {
  const o = ctx.device.objects.find((x) => x.port === port);
  return o ? ctx.getObject(o.id) : null;
};

function send(ctx: Ctx, port: string, value: number) {
  ctx.device.objects
    .filter((o) => o.port === port)
    .forEach((o) => {
      ctx.setObject(o.id, value);
      ctx.transmit(o.id);
    });
}

/** Two-level alarm: set at the threshold, reset below threshold − hysteresis. */
function alarm(
  ctx: Ctx,
  key: "co2Alarm" | "humidityAlarm",
  value: number | null,
  limit: number,
  hysteresis: number,
) {
  if (value === null) return;
  const before = ctx.state[key];
  const after = before
    ? value <= limit - hysteresis
      ? 0
      : 1
    : value >= limit
      ? 1
      : 0;
  if (after === before) return;
  ctx.state[key] = after;
  ctx.note(
    after
      ? ctx.t`${value} reaches the alarm threshold ${limit}: alarm set`
      : ctx.t`${value} is below ${limit - hysteresis}: alarm reset`,
  );
  send(ctx, key, after);
}

/** Target step for a CO2 value, from the current step, with a symmetric hysteresis band. */
export function ventilationStep(
  co2: number,
  current: number,
  thresholds: number[],
  hysteresis: number,
): number {
  let step = current;
  while (step < thresholds.length && co2 >= thresholds[step]! + hysteresis)
    step++;
  while (step > 0 && co2 < thresholds[step - 1]! - hysteresis) step--;
  return step;
}

function control(ctx: Ctx) {
  const co2 = valueOf(ctx, "co2");
  if (co2 === null) return;
  const p = ctx.device.parameters;
  const thresholds = [
    num(p.step1Ppm, 800),
    num(p.step2Ppm, 1000),
    num(p.step3Ppm, 1200),
  ].sort((a, b) => a - b);
  const st = ctx.state;
  const target = ventilationStep(
    co2,
    st.step,
    thresholds,
    num(p.stepHysteresisPpm, 50),
  );
  if (target === st.step) return;
  const minMs = num(p.minStepTimeMs, 0);
  const since = st.stepAtMs === null ? Infinity : ctx.timeMs - st.stepAtMs;
  if (since < minMs) {
    ctx.schedule("step", minMs - since);
    ctx.note(ctx.t`Ventilation step kept for its minimum time`);
    return;
  }
  st.step = target;
  st.stepAtMs = ctx.timeMs;
  const values = [
    num(p.step0Pct, 0),
    num(p.step1Pct, 33),
    num(p.step2Pct, 66),
    num(p.step3Pct, 100),
  ];
  ctx.note(ctx.t`CO₂ ${co2} ppm: ventilation step ${target}`);
  send(ctx, "ventilation", values[target]!);
}

function evaluate(ctx: Ctx) {
  const p = ctx.device.parameters;
  alarm(
    ctx,
    "co2Alarm",
    valueOf(ctx, "co2"),
    num(p.co2AlarmPpm, 1500),
    num(p.co2AlarmHysteresisPpm, 100),
  );
  alarm(
    ctx,
    "humidityAlarm",
    valueOf(ctx, "humidity"),
    num(p.humidityAlarmPct, 70),
    num(p.humidityAlarmHysteresisPct, 5),
  );
  control(ctx);
}

const ppm = (title: string, fallback: number, description: string) => ({
  title,
  type: "number" as const,
  minimum: 0,
  maximum: 10000,
  default: fallback,
  description,
});
const pct = (title: string, fallback: number, description: string) => ({
  title,
  type: "number" as const,
  unit: "%" as const,
  minimum: 0,
  maximum: 100,
  default: fallback,
  description,
});

export const airQualitySensor: BehaviorDefinition<AirState> = {
  description:
    "Air quality sensor: sends measured temperature, relative humidity, and CO₂; sets alarms at thresholds and controls ventilation in three steps.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      co2AlarmPpm: ppm(
        "CO₂ alarm threshold",
        1500,
        "CO₂ concentration (ppm) at which the CO₂ alarm is set.",
      ),
      co2AlarmHysteresisPpm: {
        ...ppm(
          "CO₂ alarm hysteresis",
          100,
          "The CO₂ alarm is reset below threshold − hysteresis (ppm).",
        ),
        expert: true,
      },
      humidityAlarmPct: pct(
        "Humidity alarm threshold",
        70,
        "Relative humidity (%) at which the humidity alarm is set.",
      ),
      humidityAlarmHysteresisPct: {
        ...pct(
          "Humidity alarm hysteresis",
          5,
          "The humidity alarm is reset below threshold − hysteresis (%).",
        ),
        expert: true,
      },
      step1Ppm: ppm(
        "Threshold step 0 ↔ 1",
        800,
        "CO₂ concentration (ppm) between ventilation steps 0 and 1.",
      ),
      step2Ppm: ppm(
        "Threshold step 1 ↔ 2",
        1000,
        "CO₂ concentration (ppm) between ventilation steps 1 and 2.",
      ),
      step3Ppm: ppm(
        "Threshold step 2 ↔ 3",
        1200,
        "CO₂ concentration (ppm) between ventilation steps 2 and 3.",
      ),
      stepHysteresisPpm: {
        ...ppm(
          "Step hysteresis",
          50,
          "A step changes only above threshold + hysteresis or below threshold − hysteresis (ppm).",
        ),
        expert: true,
      },
      step0Pct: {
        ...pct(
          "Control value step 0",
          0,
          "Ventilation control value (%) sent in step 0.",
        ),
        expert: true,
      },
      step1Pct: {
        ...pct(
          "Control value step 1",
          33,
          "Ventilation control value (%) sent in step 1.",
        ),
        expert: true,
      },
      step2Pct: {
        ...pct(
          "Control value step 2",
          66,
          "Ventilation control value (%) sent in step 2.",
        ),
        expert: true,
      },
      step3Pct: {
        ...pct(
          "Control value step 3",
          100,
          "Ventilation control value (%) sent in step 3.",
        ),
        expert: true,
      },
      minStepTimeMs: {
        title: "Minimum time per step",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 0,
        default: 0,
        description:
          "A step is kept at least this long before the next change (0 disables it).",
      },
    },
  },
  ports: {
    temperature: {
      defaultFlags: { R: true },
      dpts: ["9.001"],
      channel: "none",
      title: "Temperature",
      direction: "out",
      description: "measured temperature (°C), sent when entered",
    },
    humidity: {
      defaultFlags: { R: true },
      dpts: ["9.007", "5.001"],
      channel: "none",
      title: "Relative humidity",
      direction: "out",
      description:
        "measured relative humidity (%), sent when entered: 2-byte float with 9.007, one byte with 5.001",
    },
    co2: {
      defaultFlags: { R: true },
      dpts: ["9.008"],
      channel: "none",
      title: "CO₂",
      direction: "out",
      description: "measured CO₂ concentration (ppm), sent when entered",
    },
    co2Alarm: {
      dpts: ["1.005", "1.001"],
      channel: "none",
      title: "CO₂ alarm",
      direction: "out",
      description:
        "1 when the CO₂ alarm threshold is reached, 0 after hysteresis",
    },
    humidityAlarm: {
      dpts: ["1.005", "1.001"],
      channel: "none",
      title: "Humidity alarm",
      direction: "out",
      description:
        "1 when the humidity alarm threshold is reached, 0 after hysteresis",
    },
    ventilation: {
      dpts: ["5.001"],
      channel: "none",
      title: "Ventilation control value",
      direction: "out",
      description: "control value (%) of the current ventilation step",
    },
  },
  acceptsInputs: true,
  createState: () => ({
    step: 0,
    stepAtMs: null,
    co2Alarm: 0,
    humidityAlarm: 0,
  }),
  onInput(ctx, input) {
    if (input.gesture !== "value" || input.value === undefined) return;
    const inp = ctx.device.inputs.find((x) => x.id === input.inputId);
    if (!inp) return;
    ctx.setObject(inp.object, input.value);
    ctx.transmit(inp.object);
    evaluate(ctx);
  },
  onTimer(ctx, key) {
    if (key === "step") control(ctx);
  },
  deviceState(state) {
    return {
      step: state.step,
      co2Alarm: state.co2Alarm,
      humidityAlarm: state.humidityAlarm,
    };
  },
};
