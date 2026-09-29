// Units of the quantities that a port may carry in several DPTs. A behavior computes in
// the base unit (W, Wh, m/s) and converts at the object: the value on the bus follows the
// object's DPT, never a renamed number.

const SCALE: Record<string, number> = {
  "9.024": 1 / 1000, // W → kW
  "13.013": 1 / 1000, // Wh → kWh
  "9.028": 3.6, // m/s → km/h
};

/** Value in the base unit → value in the unit of the object's DPT. */
export function toObjectUnit(dpt: string, value: number): number {
  const k = SCALE[dpt];
  if (k === undefined) return value;
  const v = value * k;
  return dpt === "13.013" ? Math.round(v) : v;
}

/** Value in the unit of the object's DPT → value in the base unit. */
export function fromObjectUnit(dpt: string, value: number): number {
  const k = SCALE[dpt];
  return k === undefined ? value : value / k;
}
