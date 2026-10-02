// Air quality sensor in the designer: catalog entry, templates, and displayed type.
// Designer entry of the participant: never imported by its model or the library.
import type {
  DesignerContribution,
  Snippet,
} from "../../../site/designer/snippet-kit";
import {
  ensureBase,
  flags,
  freeAddress,
  freeId,
} from "../../../site/designer/snippet-kit";
import { t } from "../../../site/designer/lang";
import { airQualitySensorDesignerFr } from "./designer.fr";

/** Air quality sensor: temperature, humidity, CO₂, CO₂ alarm, and ventilation value. */
const airQualitySensor: Snippet = {
  id: "airQualitySensor",
  get label() {
    return t`Air quality sensor`;
  },
  get hint() {
    return t`Temperature (9.001), humidity (9.007), and CO₂ (9.008) entered on the device; CO₂ alarm (1.005) and ventilation control value (5.001).`;
  },
  apply(input, ctx = {}) {
    const doc = ensureBase(input);
    const obj = (id: string, name: string, dpt: string, port: string) => ({
      id,
      name,
      ga: [],
      dpt,
      port,
      flags: flags(false, true),
    });
    return {
      ...doc,
      devices: [
        ...doc.devices!,
        {
          id: freeId(doc, "airSensor"),
          name: t`Air quality sensor`,
          address: freeAddress(doc, ctx.line),
          kind: "sensor",
          behavior: "airQualitySensor/v1",
          objects: [
            obj("temp", t`Temperature`, "9.001", "temperature"),
            obj("hum", t`Relative humidity`, "9.007", "humidity"),
            obj("co2", t`CO₂`, "9.008", "co2"),
            obj("co2Alarm", t`CO₂ alarm`, "1.005", "co2Alarm"),
            obj("vent", t`Ventilation control value`, "5.001", "ventilation"),
          ],
          inputs: [
            {
              id: "temp",
              type: "number",
              label: t`Temperature (°C)`,
              object: "temp",
              min: 10,
              max: 35,
              step: 0.5,
            },
            {
              id: "hum",
              type: "number",
              label: t`Humidity (%)`,
              object: "hum",
              min: 0,
              max: 100,
              step: 5,
            },
            {
              id: "co2",
              type: "number",
              label: t`CO₂ (ppm)`,
              object: "co2",
              min: 400,
              max: 3000,
              step: 100,
            },
          ],
        },
      ],
    };
  },
};

export const airQualitySensorDesigner: DesignerContribution = {
  messages: { fr: airQualitySensorDesignerFr },
  behavior: "airQualitySensor/v1",
  category: "sensors",
  templates: [airQualitySensor],
  typeLabel: () => t`Air quality sensor`,
};
