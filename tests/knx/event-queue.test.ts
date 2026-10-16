// The file of dated events of the simulation: in order of time then of insertion, and no
// larger than its live events once many are cancelled.
import { describe, expect, it } from "vitest";
import { EventQueue } from "../../src/knx/clock";

describe("event queue", () => {
  it("drops the cancelled events of a timer set again and again", () => {
    const q = new EventQueue<string>();
    q.push(10, "near");
    let far = q.push(1_000_000, "far 0");
    for (let i = 1; i <= 10_000; i++) {
      q.cancel(far);
      far = q.push(1_000_000 + i, `far ${i}`);
    }
    expect(q.size).toBe(2);
    expect(q.held).toBeLessThan(200);
    expect(q.pop()?.item).toBe("near");
    expect(q.pop()?.item).toBe("far 10000");
  });

  it("keeps the order of events at the same time once compacted", () => {
    const q = new EventQueue<number>();
    const cancelled = Array.from({ length: 300 }, (_, i) => q.push(5, -i));
    [1, 2, 3].forEach((n) => q.push(5, n));
    cancelled.forEach((e) => q.cancel(e));
    expect([q.pop()?.item, q.pop()?.item, q.pop()?.item]).toEqual([1, 2, 3]);
  });
});
