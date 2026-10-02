// Small helpers on parameter values, shared by several participants.

/** A number, or the fallback when the value is not one. */
export const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
/** A value limited to [lo, hi]. */
export const clamp = (v: number, lo = 0, hi = 100) =>
  Math.min(hi, Math.max(lo, v));
