// weatherStation/v1: outdoor measurements entered on the device (wind, brightness,
// temperature) and one-bit threshold outputs with hysteresis, such as a wind alarm
// for shutters or a sun protection request.
import type { BehaviorContext, BehaviorDefinition } from "../../knx/contracts";
import { fromObjectUnit } from "../../knx/units";

interface WeatherState {
  /** Current state of each threshold output, by port. */
  alarms: Record<string, number>;
  /** Rain detected by the sensor (before the delays of the rain alarm). */
  raining: boolean;
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

/** Alarm outputs sent again cyclically with alarmCyclicMs (for monitoring actuators). */
const ALARMS = ["windAlarm", "rainAlarm", "frostAlarm"] as const;

const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function evaluate(ctx: BehaviorContext<WeatherState>) {
  const p = ctx.device.parameters;
  for (const th of THRESHOLDS) {
    const src = ctx.device.objects.find((o) => o.port === th.source);
    const out = ctx.device.objects.find((o) => o.port === th.out);
    if (!src || !out) continue;
    const raw = ctx.getObject(src.id);
    if (raw === null) continue;
    // Thresholds are in m/s; a wind object in km/h (9.028) is converted.
    const value = fromObjectUnit(src.dpt, raw);
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
  frost(ctx);
}

/** Frost alarm: set at or below frostThresholdC, reset above it plus the hysteresis. */
function frost(ctx: BehaviorContext<WeatherState>) {
  const src = ctx.device.objects.find((o) => o.port === "outdoorTemp");
  const raw = src ? ctx.getObject(src.id) : null;
  if (raw === null || !ctx.device.objects.some((o) => o.port === "frostAlarm"))
    return;
  const p = ctx.device.parameters;
  const limit = num(p.frostThresholdC, 3);
  const hyst = num(p.frostHysteresisK, 2);
  const before = ctx.state.alarms.frostAlarm ?? 0;
  const after = before ? (raw >= limit + hyst ? 0 : 1) : raw <= limit ? 1 : 0;
  if (after === before) return;
  ctx.note(
    after
      ? ctx.t`${raw} °C at or below ${limit} °C: frost alarm set`
      : ctx.t`${raw} °C at or above ${limit + hyst} °C: frost alarm reset`,
  );
  setAlarm(ctx, "frostAlarm", after);
}

function setAlarm(ctx: BehaviorContext<WeatherState>, port: string, v: number) {
  ctx.state.alarms[port] = v;
  ctx.device.objects
    .filter((o) => o.port === port)
    .forEach((o) => {
      ctx.setObject(o.id, v);
      ctx.transmit(o.id);
    });
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
      frostThresholdC: {
        title: "Frost alarm threshold",
        type: "number",
        minimum: -20,
        maximum: 10,
        default: 3,
        description:
          "Outdoor temperature (°C) at or below which the frost alarm is set.",
      },
      frostHysteresisK: {
        title: "Frost alarm hysteresis",
        expert: true,
        type: "number",
        minimum: 0,
        default: 2,
        description:
          "The frost alarm is reset once the temperature reaches threshold + hysteresis (K).",
      },
      rainOnDelayMs: {
        title: "Delay of the rain alarm",
        unit: "ms",
        type: "integer",
        minimum: 0,
        default: 20000,
        description:
          "Rain must last this long before the rain alarm is set, so that a short shower is not reported.",
      },
      rainOffDelayMs: {
        title: "Delay of the end of rain",
        unit: "ms",
        type: "integer",
        minimum: 0,
        default: 300000,
        description:
          "The rain alarm is reset this long after the rain stops, so that a short break is not reported.",
      },
      alarmCyclicMs: {
        title: "Cyclic sending of the alarms",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 0,
        default: 0,
        description:
          "Period at which the wind, rain, and frost alarms are sent again, for actuators that monitor them (0: on change only).",
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
      dpts: ["9.005", "9.028"],
      channel: "none",
      title: "Wind speed",
      direction: "out",
      description:
        "measured wind speed, sent when entered: m/s with 9.005, km/h with 9.028 (thresholds stay in m/s)",
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
    rainAlarm: {
      dpts: ["1.005", "1.001"],
      channel: "none",
      title: "Rain alarm",
      direction: "out",
      description:
        "1 after rain has lasted rainOnDelayMs, 0 rainOffDelayMs after it stops; rain is entered on this object's numeric input (0 or 1)",
    },
    frostAlarm: {
      dpts: ["1.005", "1.001"],
      channel: "none",
      title: "Frost alarm",
      direction: "out",
      description:
        "1 when the outdoor temperature is at or below frostThresholdC, 0 above it plus the hysteresis",
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
  createState: () => ({ alarms: {}, raining: false }),
  onInit(ctx) {
    const ms = num(ctx.device.parameters.alarmCyclicMs, 0);
    if (ms > 0) ctx.schedule("cyclic", ms);
  },
  onTimer(ctx, key) {
    if (key === "rainOn" || key === "rainOff") {
      const on = key === "rainOn";
      ctx.note(on ? ctx.t`Rain alarm set` : ctx.t`Rain alarm reset`);
      setAlarm(ctx, "rainAlarm", on ? 1 : 0);
    } else if (key === "cyclic") {
      // The alarms are sent again, so that actuators can monitor the station.
      for (const port of ALARMS)
        ctx.device.objects
          .filter((o) => o.port === port)
          .forEach((o) => {
            ctx.setObject(o.id, ctx.state.alarms[port] ?? 0);
            ctx.transmit(o.id);
          });
      ctx.schedule("cyclic", num(ctx.device.parameters.alarmCyclicMs, 0));
    }
  },
  onInput(ctx, input) {
    if (input.gesture !== "value" || input.value === undefined) return;
    const inp = ctx.device.inputs.find((x) => x.id === input.inputId);
    if (!inp) return;
    const o = ctx.device.objects.find((x) => x.id === inp.object);
    // Rain entered: the rain alarm follows after its delays (not sent at once).
    if (o?.port === "rainAlarm") {
      const raining = input.value !== 0;
      if (raining === ctx.state.raining) return;
      ctx.state.raining = raining;
      const p = ctx.device.parameters;
      ctx.cancel(raining ? "rainOff" : "rainOn");
      const already = (ctx.state.alarms.rainAlarm ?? 0) === (raining ? 1 : 0);
      if (!already)
        ctx.schedule(
          raining ? "rainOn" : "rainOff",
          raining ? num(p.rainOnDelayMs, 20000) : num(p.rainOffDelayMs, 300000),
        );
      ctx.note(
        raining
          ? ctx.t`Rain detected: alarm after the delay`
          : ctx.t`Rain ended: alarm reset after the delay`,
      );
      return;
    }
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
