import type { Translate } from "../i18n";
import { en } from "../i18n";
// Logical KNX network: segments, ordered connecting points, couplers, filtering and
// Telegram propagation schedule. No coordination: the layout places this order.
import { compareAddress } from "./address";
import type { GroupRouting, Scenario } from "./scenario";

export type SegmentKind = "line" | "main" | "backbone" | "ip";
export type CouplerKind = "line" | "area" | "router" | "extension";
export type ExtMode = "repeater" | "segmentCoupler";
export type Side = "A" | "B";

export interface TopoPoint {
  /** `dev:<deviceId>` or `cpl:<couplerId>:<A|B>`. */
  id: string;
  deviceId?: string;
  couplerId?: string;
  side?: Side;
}

export interface TopoSegment {
  id: string;
  kind: SegmentKind;
  /** Line concerned (`1.1`) or area (`1`) depending on type. */
  ref: string;
  downstream: boolean;
  points: TopoPoint[];
}

export interface TopoCoupler {
  id: string;
  kind: CouplerKind;
  address: string;
  line: string | null;
  /** Side A: upper level (or TP for router); side B: lower level (or IP). */
  A: { seg: string; point: string };
  B: { seg: string; point: string };
}

export interface Topology {
  segments: Map<string, TopoSegment>;
  couplers: TopoCoupler[];
  deviceSegment: Map<string, string>;
}

const devPoint = (id: string): TopoPoint => ({ id: `dev:${id}`, deviceId: id });
const cplPoint = (id: string, side: Side): TopoPoint => ({
  id: `cpl:${id}:${side}`,
  couplerId: id,
  side,
});

/**
 * Canonical ordering of points on a segment.
 * - Line: connection to the upper level, devices in declared order, extension.
 * - Backbone, main line, or IP network (an L-shaped path: device row then
 *   coupler column): devices run toward the corner, then the upper connection
 *   at the corner, followed by lower connections sorted by address.
 * The couplers have their A side towards the upper level (the IP network for a router).
 */
export function buildTopology(s: Scenario): Topology {
  const segments = new Map<string, TopoSegment>();
  const couplers: TopoCoupler[] = [];
  const deviceSegment = new Map<string, string>();
  const topo = s.topology;
  const areas = topo.areas.map((a) => a.address);
  const areaLevel = topo.backbone || topo.ip === "areaCouplers";

  const seg = (
    id: string,
    kind: SegmentKind,
    ref: string,
    downstream = false,
  ) => {
    const sg: TopoSegment = { id, kind, ref, downstream, points: [] };
    segments.set(id, sg);
    return sg;
  };
  const addDevices = (
    sg: TopoSegment,
    filter: (d: Scenario["devices"][number]) => boolean,
    reverse = false,
  ) => {
    const list = s.devices.filter(filter);
    (reverse ? list.reverse() : list).forEach((d) => {
      sg.points.push(devPoint(d.id));
      deviceSegment.set(d.id, sg.id);
    });
  };
  const couple = (
    id: string,
    kind: CouplerKind,
    address: string,
    line: string | null,
    up: TopoSegment,
    down: TopoSegment,
  ) => {
    couplers.push({
      id,
      kind,
      address,
      line,
      A: { seg: up.id, point: `cpl:${id}:A` },
      B: { seg: down.id, point: `cpl:${id}:B` },
    });
  };

  // Upper levels, from top to bottom.
  const ipSeg = topo.ip ? seg("IP", "ip", "IP") : null;
  if (ipSeg) addDevices(ipSeg, (d) => d.medium === "IP", true);
  const bb = topo.backbone ? seg("BB", "backbone", "0") : null;
  if (bb) addDevices(bb, (d) => d.medium === "TP" && d.line === "0.0", true);
  const mains = new Map<number, TopoSegment>();
  topo.mainLines.forEach((a) => {
    const ml = seg(`ML${a}`, "main", String(a));
    addDevices(ml, (d) => d.medium === "TP" && d.line === `${a}.0`, true);
    mains.set(a, ml);
  });

  // Areas: an area coupler (TP or IP router) between the backbone or IP network and the main line.
  if (areaLevel)
    areas.forEach((a) => {
      const ml = mains.get(a)!;
      const upper = topo.ip === "areaCouplers" ? ipSeg! : bb!;
      ml.points.push(cplPoint(`AC${a}`, "B"));
      upper.points.push(cplPoint(`AC${a}`, "A"));
      couple(
        `AC${a}`,
        topo.ip === "areaCouplers" ? "router" : "area",
        `${a}.0.0`,
        null,
        upper,
        ml,
      );
    });

  // Lines: a line coupler (TP or IP router) between the main line or IP network and a line.
  [...s.lines]
    .sort((x, y) => compareAddress(x.address, y.address))
    .forEach((l) => {
      const sg = seg(`L${l.address}`, "line", l.address);
      const upper =
        topo.ip === "lineCouplers" ? ipSeg : (mains.get(l.area) ?? null);
      if (upper) {
        sg.points.push(cplPoint(`LC${l.address}`, "B"));
        upper.points.push(cplPoint(`LC${l.address}`, "A"));
        couple(
          `LC${l.address}`,
          topo.ip === "lineCouplers" ? "router" : "line",
          `${l.address}.0`,
          l.address,
          upper,
          sg,
        );
      }
      addDevices(
        sg,
        (d) => d.medium === "TP" && d.line === l.address && !d.downstream,
      );
      if (l.extension) {
        sg.points.push(cplPoint(`EXT${l.address}`, "A"));
        const down = seg(`L${l.address}b`, "line", l.address, true);
        down.points.push(cplPoint(`EXT${l.address}`, "B"));
        addDevices(
          down,
          (d) => d.medium === "TP" && d.line === l.address && d.downstream,
        );
        couple(
          `EXT${l.address}`,
          "extension",
          l.extension.address,
          l.address,
          sg,
          down,
        );
      }
    });

  return { segments, couplers, deviceSegment };
}

// ── Telegram propagation schedule ────────────────────────────────────────────────

/** Simulated timing is defined in milliseconds independently of diagram geometry. */
export const TIMING = {
  emitMs: 550,
  hopMs: 250,
  couplerInMs: 150,
  decisionMs: 900,
  couplerOutMs: 150,
  receiveMs: 500,
} as const;

/** Initial routing counter for the modeled telegram path. */
export const RC0 = 6;

export type Tag = "pass" | "block" | "ip" | "rep";

export interface FrontPlan {
  segId: string;
  originIndex: number;
  tStartMs: number;
  /** Date of arrival of the front at each point in the segment (same order as `points`). */
  arrivalsMs: number[];
}

export interface CouplerPlan {
  couplerId: string;
  from: Side;
  tArriveMs: number;
  tInMs: number;
  tDecisionMs: number;
  tOutMs: number;
  pass: boolean;
  tag: Tag;
  /** Blocked because the segment on the other side has no bus voltage. */
  noVoltage?: boolean;
  rcBefore: number;
  rcAfter: number;
}

export interface DeliveryPlan {
  deviceId: string;
  /** Arrival of the front at the device's connection. */
  tArriveMs: number;
  /** End of the return to the object: moment of the application effect. */
  tDeliverMs: number;
  rc: number;
  /** Items associated with the GA, in the order of the table. */
  objectIds: string[];
}

export interface TransportPlan {
  sourceDeviceId: string;
  ga: string;
  t0Ms: number;
  busMs: number;
  fronts: FrontPlan[];
  couplers: CouplerPlan[];
  deliveries: DeliveryPlan[];
  endMs: number;
}

export class Network {
  readonly topology: Topology;
  private readonly modes = new Map<string, ExtMode>();
  private sideCache = new Map<string, Set<string>>();
  /** Segments whose bus voltage is cut. */
  private readonly unpowered = new Set<string>();

  constructor(
    readonly scenario: Scenario,
    topology?: Topology,
    private readonly t: Translate = en,
  ) {
    this.topology = topology ?? buildTopology(scenario);
    this.resetModes();
  }

  /** Restores the extension modes defined by the scenario, with the bus voltage on. */
  resetModes() {
    this.unpowered.clear();
    this.modes.clear();
    this.scenario.lines.forEach(
      (l) => l.extension && this.modes.set(l.address, l.extension.mode),
    );
    this.sideCache.clear();
  }

  /** Does the segment have bus voltage? */
  powered(segId: string): boolean {
    return !this.unpowered.has(segId);
  }

  setPowered(segId: string, on: boolean) {
    if (on) this.unpowered.delete(segId);
    else this.unpowered.add(segId);
  }

  extMode(line: string): ExtMode {
    return this.modes.get(line) ?? "repeater";
  }

  setExtMode(line: string, mode: ExtMode) {
    this.modes.set(line, mode);
    this.sideCache.clear();
  }

  coupler(id: string): TopoCoupler | undefined {
    return this.topology.couplers.find((c) => c.id === id);
  }

  isRepeater(c: TopoCoupler) {
    return (
      c.kind === "extension" && this.extMode(c.line ?? "") !== "segmentCoupler"
    );
  }

  couplerName(c: TopoCoupler): string {
    const t = this.t;
    const named = this.scenario.topology.couplers.get(c.address)?.name;
    if (named) return named;
    if (c.kind === "router") return this.scenario.topology.routerName;
    if (c.kind === "area") return t`Area coupler`;
    if (c.kind === "line") return t`Line coupler`;
    return this.extMode(c.line ?? "") === "segmentCoupler"
      ? t`Segment coupler`
      : t`Repeater`;
  }

  /** Group addresses used on the side of the coupler (derived from the project associations). */
  sideGAs(c: TopoCoupler, side: Side): Set<string> {
    const key = c.id + side;
    const hit = this.sideCache.get(key);
    if (hit) return hit;
    const set = new Set<string>();
    const seen = new Set([c[side].seg]);
    const q = [c[side].seg];
    while (q.length) {
      const sid = q.shift()!;
      this.topology.segments.get(sid)?.points.forEach((pt) => {
        const d = pt.deviceId
          ? this.scenario.devicesById.get(pt.deviceId)
          : undefined;
        // A visualization without a dummy device is not declared in the project: its addresses are absent.
        if (d?.inFilterTables) {
          d.objects.forEach((o) => o.gas.forEach((g) => set.add(g)));
          d.tableGAs.forEach((g) => set.add(g));
        }
      });
      this.topology.couplers.forEach((o) => {
        if (o.id === c.id) return;
        const nx = o.A.seg === sid ? o.B.seg : o.B.seg === sid ? o.A.seg : null;
        if (nx && !seen.has(nx)) {
          seen.add(nx);
          q.push(nx);
        }
      });
    }
    this.sideCache.set(key, set);
    return set;
  }

  filterTable(c: TopoCoupler): string[] | null {
    if (this.isRepeater(c)) return null;
    const b = this.sideGAs(c, "B");
    return [...this.sideGAs(c, "A")]
      .filter((ga) => b.has(ga))
      .sort(compareAddress);
  }

  /** Parameter "group telegrams" of the coupler for a direction (A → B: downwards). */
  routing(c: TopoCoupler, to: Side): GroupRouting {
    const set = this.scenario.topology.couplers.get(c.address);
    return (to === "B" ? set?.down : set?.up) ?? "filter";
  }

  private passes(c: TopoCoupler, to: Side, ga: string) {
    if (this.isRepeater(c)) return true;
    const mode = this.routing(c, to);
    if (mode === "route") return true;
    if (mode === "block") return false;
    // The filter table holds the addresses used on both sides (line-crossing addresses);
    // it applies in both directions.
    return this.sideGAs(c, "A").has(ga) && this.sideGAs(c, "B").has(ga);
  }

  /** Full propagation schedule of a group telegram; filter decisions are frozen. */
  plan(sourceDeviceId: string, ga: string, t0Ms: number): TransportPlan {
    const T = TIMING;
    const busMs = t0Ms + T.emitMs;
    const plan: TransportPlan = {
      sourceDeviceId,
      ga,
      t0Ms,
      busMs,
      fronts: [],
      couplers: [],
      deliveries: [],
      endMs: busMs,
    };
    const bump = (t: number) => (plan.endMs = Math.max(plan.endMs, t));
    const segId = this.topology.deviceSegment.get(sourceDeviceId);
    if (!segId) return plan;
    const q: {
      seg: string;
      point: string;
      t: number;
      rc: number;
      via: string | null;
    }[] = [
      {
        seg: segId,
        point: `dev:${sourceDeviceId}`,
        t: busMs,
        rc: RC0,
        via: null,
      },
    ];
    const seen = new Set<string>();
    while (q.length) {
      const e = q.shift()!;
      if (seen.has(e.seg)) continue;
      seen.add(e.seg);
      const sg = this.topology.segments.get(e.seg)!;
      const origin = sg.points.findIndex((p) => p.id === e.point);
      const arrivalsMs = sg.points.map(
        (_, j) => e.t + Math.abs(j - origin) * T.hopMs,
      );
      plan.fronts.push({
        segId: sg.id,
        originIndex: origin,
        tStartMs: e.t,
        arrivalsMs,
      });
      arrivalsMs.forEach(bump);
      sg.points.forEach((pt, j) => {
        const ta = arrivalsMs[j]!;
        if (pt.deviceId) {
          if (pt.deviceId === sourceDeviceId) return;
          const d = this.scenario.devicesById.get(pt.deviceId)!;
          const objectIds = d.objects
            .filter((o) => o.gas.includes(ga))
            .map((o) => o.id);
          const tDeliverMs = objectIds.length ? ta + T.receiveMs : ta;
          plan.deliveries.push({
            deviceId: d.id,
            tArriveMs: ta,
            tDeliverMs,
            rc: e.rc,
            objectIds,
          });
          bump(tDeliverMs);
        } else if (pt.couplerId && pt.couplerId !== e.via) {
          const c = this.coupler(pt.couplerId)!;
          const from = pt.side!;
          const to: Side = from === "A" ? "B" : "A";
          // Without bus voltage on the other side, the coupler cannot send the telegram.
          const noVoltage = !this.powered(c[to].seg);
          const pass = this.passes(c, to, ga) && e.rc > 0 && !noVoltage;
          const tInMs = ta + T.couplerInMs;
          const tDecisionMs = tInMs + T.decisionMs;
          const tOutMs = tDecisionMs + T.couplerOutMs;
          const tag: Tag = !pass
            ? "block"
            : c.kind === "router"
              ? "ip"
              : this.isRepeater(c)
                ? "rep"
                : "pass";
          plan.couplers.push({
            couplerId: c.id,
            from,
            tArriveMs: ta,
            tInMs,
            tDecisionMs,
            tOutMs,
            pass,
            tag,
            ...(noVoltage ? { noVoltage } : {}),
            rcBefore: e.rc,
            rcAfter: pass ? e.rc - 1 : e.rc,
          });
          bump(pass ? tOutMs : tDecisionMs + 600);
          if (pass)
            q.push({
              seg: c[to].seg,
              point: c[to].point,
              t: tOutMs,
              rc: e.rc - 1,
              via: c.id,
            });
        }
      });
    }
    plan.couplers.sort((a, b) => a.tInMs - b.tInMs);
    plan.deliveries.sort((a, b) => a.tArriveMs - b.tArriveMs);
    return plan;
  }
}
