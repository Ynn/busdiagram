// weatherStation/v1: outdoor measurements entered on the device (wind, brightness,
// temperature) and one-bit threshold outputs with hysteresis, such as a wind alarm
// for shutters or a sun protection request.
import type { BehaviorContext, BehaviorDefinition } from "../contracts";

interface WeatherState {
  /** Current state of each threshold output, by port. */
  alarms: Record<string, number>;
}

/** Threshold outputs: measured port, parameters, and defaults. */
const THRESHOLDS = [
  {
    out: "windAlarm",
    source: "wind",
    on: "windThreshold",
    hyst: "windHysteresis",
    defaults: [10, 2],
  },
  {
    out: "sunProtection",
    source: "brightness",
    on: "brightnessThreshold",
    hyst: "brightnessHysteresis",
    defaults: [40000, 5000],
  },
] as const;

const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function evaluate(ctx: BehaviorContext<WeatherState>) {
  const p = ctx.device.parameters;
  for (const th of THRESHOLDS) {
    const src = ctx.device.objects.find((o) => o.port === th.source);
    const out = ctx.device.objects.find((o) => o.port === th.out);
    if (!src || !out) continue;
    const value = ctx.getObject(src.id);
    if (value === null) continue;
    const limit = num(p[th.on], th.defaults[0]);
    const hyst = num(p[th.hyst], th.defaults[1]);
    const before = ctx.state.alarms[th.out] ?? 0;
    // Set at the threshold; reset only below threshold − hysteresis.
    const after = before
      ? value <= limit - hyst
        ? 0
        : 1
      : value >= limit
        ? 1
        : 0;
    if (after === before) continue;
    ctx.state.alarms[th.out] = after;
    ctx.note(
      after
        ? ctx.t`${value} reaches the threshold ${limit}: output set`
        : ctx.t`${value} is below ${limit - hyst} (threshold − hysteresis): output reset`,
    );
    ctx.setObject(out.id, after);
    ctx.transmit(out.id);
  }
}

export const weatherStation: BehaviorDefinition<WeatherState> = {
  description:
    "Weather station: sends measured wind speed, brightness, and temperature; sets one-bit outputs when wind or brightness thresholds are reached.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      windThreshold: {
        title: "Wind alarm threshold",
        type: "number",
        minimum: 0,
        default: 10,
        description: "Wind speed (m/s) at which the wind alarm is set.",
      },
      windHysteresis: {
        title: "Wind alarm hysteresis",
        expert: true,
        type: "number",
        minimum: 0,
        default: 2,
        description:
          "The alarm is reset when the wind speed falls below threshold − hysteresis (m/s).",
      },
      brightnessThreshold: {
        title: "Sun protection threshold",
        type: "number",
        minimum: 0,
        default: 40000,
        description: "Brightness (lux) at which sun protection is requested.",
      },
      setsRoomOutdoorTemperature: {
        title: "Outdoor temperature applies to the rooms",
        type: "boolean",
        default: true,
        description:
          "An entered outdoor temperature also becomes the outdoor temperature of every room in the thermal model, so that the building reacts to it.",
      },
      brightnessHysteresis: {
        title: "Sun protection hysteresis",
        expert: true,
        type: "number",
        minimum: 0,
        default: 5000,
        description:
          "The request is reset when brightness falls below threshold − hysteresis (lux).",
      },
    },
  },
  ports: {
    wind: {
      dpts: ["9.005"],
      channel: "none",
      title: "Wind speed",
      direction: "out",
      description: "measured wind speed (m/s), sent when entered",
    },
    brightness: {
      dpts: ["9.004"],
      channel: "none",
      title: "Brightness",
      direction: "out",
      description: "measured brightness (lux), sent when entered",
    },
    outdoorTemp: {
      dpts: ["9.001"],
      channel: "none",
      title: "Outdoor temperature",
      direction: "out",
      description: "measured outdoor temperature (°C), sent when entered",
    },
    windAlarm: {
      dpts: ["1.005", "1.001"],
      channel: "none",
      title: "Wind alarm",
      direction: "out",
      description: "1 when the wind threshold is reached, 0 after hysteresis",
    },
    sunProtection: {
      dpts: ["1.001", "1.002"],
      channel: "none",
      title: "Sun protection",
      direction: "out",
      description:
        "1 when the brightness threshold is reached, 0 after hysteresis",
    },
  },
  acceptsInputs: true,
  createState: () => ({ alarms: {} }),
  onInput(ctx, input) {
    if (input.gesture !== "value" || input.value === undefined) return;
    const inp = ctx.device.inputs.find((x) => x.id === input.inputId);
    if (!inp) return;
    const o = ctx.device.objects.find((x) => x.id === inp.object);
    // The entered value is the physical outdoor temperature; the station measures it.
    if (
      o?.port === "outdoorTemp" &&
      ctx.device.parameters.setsRoomOutdoorTemperature !== false
    ) {
      ctx.setOutsideTemperature(input.value);
      ctx.note(
        ctx.t`Outdoor temperature of the rooms set to ${input.value} °C`,
      );
    }
    ctx.setObject(inp.object, input.value);
    ctx.transmit(inp.object);
    evaluate(ctx);
  },
  deviceState(state) {
    return { ...state.alarms };
  },
};
