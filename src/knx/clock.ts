// File of events dated in whole milliseconds, separated by an insertion number.
// No real-time dependence: only `advance` of simulation makes time progress.

export interface Scheduled<T> {
  readonly timeMs: number;
  readonly seq: number;
  readonly item: T;
  cancelled: boolean;
}

export class EventQueue<T> {
  private heap: Scheduled<T>[] = [];
  private seq = 0;
  private live = 0;

  get size(): number {
    return this.live;
  }

  push(timeMs: number, item: T): Scheduled<T> {
    if (!Number.isInteger(timeMs))
      throw new RangeError(`time must be an integer: ${timeMs}`);
    const e: Scheduled<T> = { timeMs, seq: this.seq++, item, cancelled: false };
    this.heap.push(e);
    this.up(this.heap.length - 1);
    this.live++;
    return e;
  }

  cancel(e: Scheduled<T>) {
    if (e.cancelled) return;
    e.cancelled = true;
    this.live--;
  }

  peek(): Scheduled<T> | undefined {
    this.drop();
    return this.heap[0];
  }

  pop(): Scheduled<T> | undefined {
    this.drop();
    const top = this.heap[0];
    if (!top) return undefined;
    this.remove0();
    this.live--;
    return top;
  }

  clear() {
    this.heap = [];
    this.live = 0;
    this.seq = 0;
  }

  /** Live events, in the order of treatment (inspection, tests). */
  list(): Scheduled<T>[] {
    return this.heap.filter((e) => !e.cancelled).sort(cmp);
  }

  private drop() {
    while (this.heap[0]?.cancelled) this.remove0();
  }

  private remove0() {
    const last = this.heap.pop()!;
    if (this.heap.length) {
      this.heap[0] = last;
      this.down(0);
    }
  }

  private up(i: number) {
    const h = this.heap;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (cmp(h[i]!, h[p]!) >= 0) break;
      [h[i], h[p]] = [h[p]!, h[i]!];
      i = p;
    }
  }

  private down(i: number) {
    const h = this.heap;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < h.length && cmp(h[l]!, h[m]!) < 0) m = l;
      if (r < h.length && cmp(h[r]!, h[m]!) < 0) m = r;
      if (m === i) return;
      [h[i], h[m]] = [h[m]!, h[i]!];
      i = m;
    }
  }
}

function cmp<T>(a: Scheduled<T>, b: Scheduled<T>) {
  return a.timeMs - b.timeMs || a.seq - b.seq;
}
