// Render a transport plan (logical times) as telegram markers moving along cables.
// Geometry does not change timing; it only determines marker positions.
import type { Geometry, Pt, Seg } from "../knx/layout";
import { segLength, segPoint, segPos, segSlice } from "../knx/layout";
import {
  behindCut,
  type DeliveryPlan,
  type Topology,
  type TransportPlan,
} from "../knx/network";
import { TIMING } from "../knx/network";

export interface Pill {
  p: Pt;
  o: number;
  small: boolean;
}

export interface Glow {
  a: Pt;
  b: Pt;
  o: number;
  /** Full path when travel turns a corner. */
  pts?: Pt[];
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const dist = (p: Pt, q: Pt) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const lerp = (a: Pt, b: Pt, f: number): Pt => [
  a[0] + (b[0] - a[0]) * f,
  a[1] + (b[1] - a[1]) * f,
];

/** Default speed on a free end of cable (units per ms). */
const FREE_END_SPEED = 1.1;
const FADE_MS = 1400;
const END_PILL_MS = 250;

interface Key {
  t: number;
  u: number;
}

/** Position (curvilinear abscisse) of the front at the moment t, by linear interpolation. */
function headAt(keys: Key[], t: number): number {
  if (t <= keys[0]!.t) return keys[0]!.u;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!;
    const b = keys[i]!;
    if (t <= b.t)
      return b.t === a.t ? b.u : a.u + ((b.u - a.u) * (t - a.t)) / (b.t - a.t);
  }
  return keys[keys.length - 1]!.u;
}

/** Key images from one side of the origin point to the end of the cable. */
function sideKeys(
  S: Seg,
  u0: number,
  t0: number,
  pts: Key[],
  dir: 1 | -1,
): Key[] | null {
  const end = dir > 0 ? segLength(S) : 0;
  if (Math.abs(end - u0) < 0.5) return null;
  const keys: Key[] = [{ t: t0, u: u0 }];
  pts
    .filter((k) => (k.u - u0) * dir > 0.5)
    .sort((a, b) => Math.abs(a.u - u0) - Math.abs(b.u - u0))
    .forEach((k) =>
      keys.push({ t: Math.max(k.t, keys[keys.length - 1]!.t), u: k.u }),
    );
  const last = keys[keys.length - 1]!;
  const prev = keys[keys.length - 2];
  let speed = FREE_END_SPEED;
  if (prev && last.t > prev.t)
    speed = Math.abs(last.u - prev.u) / (last.t - prev.t) || FREE_END_SPEED;
  keys.push({ t: last.t + Math.abs(end - last.u) / speed, u: end });
  return keys;
}

/** Lights and ttravels of a telegram at the moment tMs. */
export function animate(
  plan: TransportPlan,
  topo: Topology,
  g: Geometry,
  tMs: number,
  emitFrom: Pt,
  recvTo: (r: DeliveryPlan) => Pt | null,
): { pills: Pill[]; glows: Glow[] } {
  const pills: Pill[] = [];
  const glows: Glow[] = [];
  const t = tMs;
  const dg = g.devices.get(plan.sourceDeviceId);

  // 1. Descent: emitter object → bottom of plug → bus
  if (dg && t >= plan.t0Ms && t < plan.busMs) {
    const f = (t - plan.t0Ms) / TIMING.emitMs;
    const path: Pt[] = [emitFrom, [dg.drop[0], emitFrom[1]], dg.drop, dg.at];
    pills.push({ p: along(path, f), o: easeOut(f * 4), small: false });
    glows.push({
      a: dg.drop,
      b: along([dg.drop, dg.at], clamp((f - 0.5) * 2, 0, 1)),
      o: 0.5,
    });
  }

  // 2. Propagating fronts on each segment, in both directions
  plan.fronts.forEach((fr) => {
    if (t < fr.tStartMs || behindCut(plan, fr.path)) return;
    const S = g.segs.get(fr.segId);
    const sg = topo.segments.get(fr.segId);
    if (!S || !sg) return;
    const originPt = g.points.get(sg.points[fr.originIndex]!.id);
    if (!originPt) return;
    const u0 = segPos(S, originPt);
    const pts: Key[] = sg.points.flatMap((p, j) => {
      const pos = g.points.get(p.id);
      return pos && j !== fr.originIndex
        ? [{ t: fr.arrivalsMs[j]!, u: segPos(S, pos) }]
        : [];
    });
    const sides = [
      sideKeys(S, u0, fr.tStartMs, pts, 1),
      sideKeys(S, u0, fr.tStartMs, pts, -1),
    ].filter((k): k is Key[] => k !== null);
    const tDone = Math.max(
      fr.tStartMs,
      ...sides.map((k) => k[k.length - 1]!.t),
    );
    const op = 1 - easeOut((t - tDone) / FADE_MS);
    if (op <= 0) return;
    let lo = u0;
    let hi = u0;
    sides.forEach((keys) => {
      const u = headAt(keys, t);
      lo = Math.min(lo, u);
      hi = Math.max(hi, u);
      const tEnd = keys[keys.length - 1]!.t;
      const travelled = Math.abs(u - u0);
      if (t < tEnd)
        pills.push({
          p: segPoint(S, u),
          o: easeOut(travelled / 40),
          small: false,
        });
      else if (t < tEnd + END_PILL_MS)
        pills.push({
          p: segPoint(S, u),
          o: 1 - (t - tEnd) / END_PILL_MS,
          small: true,
        });
    });
    glows.push({
      a: segPoint(S, lo),
      b: segPoint(S, hi),
      o: 0.45 * op,
      pts: S.pts.length > 2 ? segSlice(S, lo, hi) : undefined,
    });
  });

  // 3. Crossing of couplers: input, analysis (masked tablet), output if transmitted
  plan.couplers.forEach((c) => {
    if (t < c.tArriveMs || behindCut(plan, c.path)) return;
    const cg = g.couplers.find((x) => x.id === c.couplerId);
    if (!cg) return;
    const to = c.from === "A" ? "B" : "A";
    const p0 = cg[c.from].p;
    const p1 = cg[to].p;
    if (t < c.tInMs) {
      const f = (t - c.tArriveMs) / (c.tInMs - c.tArriveMs || 1);
      pills.push({
        p: lerp(p0, cg.c, f),
        o: 1 - easeOut((f - 0.6) / 0.4),
        small: f > 0.6,
      });
    } else if (c.pass && t >= c.tDecisionMs && t < c.tOutMs) {
      const f = (t - c.tDecisionMs) / (c.tOutMs - c.tDecisionMs || 1);
      pills.push({ p: lerp(cg.c, p1, f), o: easeOut(f / 0.4), small: f < 0.4 });
    }
  });

  // 4. Upstairs: bus → receiver object; applicative effect occurs upon arrival
  plan.deliveries.forEach((r) => {
    if (
      !r.objectIds.length ||
      t < r.tArriveMs ||
      t >= r.tDeliverMs + 150 ||
      behindCut(plan, r.path)
    )
      return;
    const to = recvTo(r);
    const rg = g.devices.get(r.deviceId);
    if (!to || !rg) return;
    const f = clamp(
      (t - r.tArriveMs) / (r.tDeliverMs - r.tArriveMs || 1),
      0,
      1,
    );
    const path: Pt[] = [rg.at, rg.drop, [rg.drop[0], to[1]], to];
    pills.push({
      p: along(path, f),
      o: t > r.tDeliverMs ? 1 - (t - r.tDeliverMs) / 150 : 1,
      small: f > 0.85,
    });
    glows.push({
      a: rg.at,
      b: along([rg.at, rg.drop], clamp(f * 2, 0, 1)),
      o: 0.5,
    });
  });
  return { pills, glows };
}

function along(path: Pt[], f: number): Pt {
  const lens = path.slice(1).map((p, i) => dist(path[i]!, p));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  let d = clamp(f, 0, 1) * total;
  for (let i = 0; i < lens.length; i++) {
    const L = lens[i]!;
    if (d <= L || i === lens.length - 1)
      return lerp(path[i]!, path[i + 1]!, L ? d / L : 0);
    d -= L;
  }
  return path[path.length - 1]!;
}
