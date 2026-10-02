// Values of the simulated clock, shared by the clock master and the time switch.
import type { BehaviorContext } from "../../knx/contracts";

export const MINUTE = 60_000;
export const DAY = 86_400_000;

/** KNX day of week: 1 = Monday … 7 = Sunday. */
export const knxDay = (ms: number) => {
  const d = new Date(ms).getUTCDay();
  return d === 0 ? 7 : d;
};

/** DPT 10.001 application value (day × 86400 + seconds) for a clock time. */
export const timeOfDayValue = (ms: number) =>
  knxDay(ms) * 86400 + Math.floor((((ms % DAY) + DAY) % DAY) / 1000);

/** DPT 11.001 application value (YYYYMMDD) for a clock time. */
export const dateValue = (ms: number) => {
  const d = new Date(ms);
  return (
    d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
  );
};

export function send(
  ctx: BehaviorContext<unknown>,
  port: string,
  value: number,
) {
  ctx.device.objects
    .filter((o) => o.port === port)
    .forEach((o) => {
      ctx.setObject(o.id, value);
      ctx.transmit(o.id);
    });
}
