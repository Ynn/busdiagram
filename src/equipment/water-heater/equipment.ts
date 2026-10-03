// Electric hot water cylinder: an element heats the water up to the setpoint of its own
// thermostat; the water cools slowly and drawing off hot water lowers its temperature.
import type { EquipmentDefinition, JsonObject } from "../../knx/contracts";

export interface WaterHeaterState extends JsonObject {
  /** Supply switched on by the actuator. */
  powered: boolean;
  /** The element heats (powered and below the thermostat setpoint). */
  heating: boolean;
  /** Mean water temperature, °C. */
  tempC: number;
}

const num = (v: unknown, d: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : d;

/** The thermostat of the element: off at the setpoint, on again below its hysteresis. */
const thermostat = (s: WaterHeaterState, p: JsonObject) => {
  const sp = num(p.setpointC, 60);
  if (!s.powered) return false;
  return s.heating ? s.tempC < sp : s.tempC <= sp - num(p.hysteresisK, 5);
};

export const waterHeater: EquipmentDefinition<WaterHeaterState> = {
  title: "Hot water cylinder",
  description:
    "Electric hot water cylinder: its element heats the water to the setpoint of its own thermostat while the output supplies it; the water cools slowly and drawing off hot water cools it.",
  accepts: "switch",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      powerW: {
        title: "Element power",
        type: "number",
        minimum: 100,
        maximum: 12000,
        default: 2000,
        description: "Electrical power (W) of the element while it heats.",
      },
      volumeL: {
        title: "Volume",
        type: "number",
        minimum: 10,
        maximum: 1000,
        default: 200,
        description: "Water volume of the cylinder (litres).",
      },
      setpointC: {
        title: "Thermostat setpoint",
        type: "number",
        minimum: 30,
        maximum: 80,
        default: 60,
        description:
          "Temperature (°C) at which the thermostat of the element cuts the heating.",
      },
      hysteresisK: {
        title: "Thermostat hysteresis",
        type: "number",
        minimum: 1,
        maximum: 20,
        default: 5,
        description:
          "The element heats again once the water is this much below the setpoint (K).",
      },
      lossKPerH: {
        title: "Standing losses",
        type: "number",
        minimum: 0,
        maximum: 5,
        default: 0.5,
        description: "Cooling of the water without draw-off (K per hour).",
      },
      timeScale: {
        title: "Time acceleration",
        type: "number",
        minimum: 1,
        maximum: 3600,
        default: 60,
        description:
          "The water heats and cools this many times faster than real time, so that a heating cycle of hours lasts minutes (as energy metering).",
      },
      drawL: {
        title: "Draw-off",
        type: "number",
        minimum: 1,
        maximum: 200,
        default: 40,
        description:
          "Volume of hot water drawn off by a click on the cylinder (litres), replaced by cold water at 10 °C.",
      },
    },
  },
  initialState: {
    type: "object",
    additionalProperties: false,
    properties: {
      tempC: {
        title: "Water temperature at start",
        type: "number",
        minimum: 5,
        maximum: 80,
        default: 45,
      },
      powered: { title: "On at start", type: "boolean", default: false },
    },
  },
  create: (_p, init) => {
    const s = {
      powered: init.powered === true,
      heating: false,
      tempC: num(init.tempC, 45),
    };
    return s;
  },
  applyCommand(s, c, p) {
    if (c.type !== "switch" || c.on === s.powered) return s;
    const next = { ...s, powered: c.on, heating: false };
    return { ...next, heating: thermostat(next, p) };
  },
  advance(s, dtMs, p) {
    if (dtMs <= 0) return s;
    const hours = (dtMs / 3_600_000) * num(p.timeScale, 60);
    // 1.163 Wh heat one litre of water by one kelvin.
    const gain = s.heating
      ? (num(p.powerW, 2000) * hours) / (num(p.volumeL, 200) * 1.163)
      : 0;
    const loss = num(p.lossKPerH, 0.5) * hours;
    // The thermostat cuts the element when the water reaches the setpoint, even within
    // a step of the simulation.
    const heated = s.heating
      ? Math.min(Math.max(s.tempC, num(p.setpointC, 60)), s.tempC + gain)
      : s.tempC;
    const tempC = Math.min(99, Math.max(5, heated - loss));
    const next = { ...s, tempC };
    // Reaching the setpoint during this step cuts the element.
    const heating =
      s.heating && heated >= num(p.setpointC, 60)
        ? false
        : thermostat(next, p);
    return heating === s.heating && tempC === s.tempC
      ? s
      : { ...next, heating };
  },
  powerW: (s, p) => (s.heating ? num(p.powerW, 2000) : 0),
  interact(s, action, p) {
    if (action !== "draw") return s;
    // Hot water drawn off is replaced by cold water: the mean temperature drops.
    const share = Math.min(1, num(p.drawL, 40) / num(p.volumeL, 200));
    const tempC = s.tempC - (s.tempC - 10) * share;
    const next = { ...s, tempC };
    return { ...next, heating: thermostat(next, p) };
  },
};
