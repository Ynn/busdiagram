import type { Translate } from "../i18n";
import { en } from "../i18n";
// Deterministic layout of the backbone, main lines, lines, and devices.
// All coordinates are in logical units; the component scales the whole.
// The order of connections comes from the logical topology (network.ts): the layout places it.
import { buildTopology } from "./network";
import type { CouplerKind, Topology } from "./network";
import type { Device, Scenario } from "./scenario";

export type Pt = [number, number];

export const ROW = 38;
export const CARD_W = 224;
export const DROP = 42;
export const PLATE_W = 104;
/** Vertical space between two loads of the same device. */
const LOAD_STACK_GAP = 6;
export const KEY_GAP = 12;
export const LOAD_GAP = 34;
export const LOAD_W = 84;
const COUPLER_W = 128;
const COUPLER_H = 56;

export interface Seg {
  id: string;
  /** Track of the cable: a straight line, or a square (row of participants then column). */
  pts: Pt[];
  /** Ends of the route. */
  a: Pt;
  b: Pt;
  kind: "line" | "main" | "backbone" | "ip";
  label: string;
  /** Position of wording; "v": writes along a column. */
  labelAt: Pt;
  labelDir: "h" | "v";
}

const polySeg = (
  id: string,
  kind: Seg["kind"],
  pts: Pt[],
  label: string,
  labelAt: Pt,
  labelDir: Seg["labelDir"],
): Seg => ({
  id,
  kind,
  pts,
  a: pts[0]!,
  b: pts[pts.length - 1]!,
  label,
  labelAt,
  labelDir,
});

export type { CouplerKind } from "./network";

export interface CouplerG {
  id: string;
  kind: CouplerKind;
  address: string;
  c: Pt;
  w: number;
  h: number;
  A: { seg: string; p: Pt };
  B: { seg: string; p: Pt };
  line: string | null;
}

export interface KeyG {
  /** "screen" means a thermostat display (temperature, mode, set-up). */
  kind: "button" | "input" | "screen";
  /** Identifier of the key or entry. */
  id: string;
  top: number;
  h: number;
  rows: number[];
}

export interface LoadG {
  channel: string;
  /** Place of the load among the loads of its output (0 for the first). */
  index: number;
  view: string;
  x: number;
  /** Top of the drawing area. */
  top: number;
  cy: number;
  w: number;
  h: number;
  rows: number[];
}

export interface DevG {
  id: string;
  x: number;
  top: number;
  w: number;
  h: number;
  seg: string;
  drop: Pt;
  at: Pt;
  plate: { x: number; top: number; h: number; keys: KeyG[] } | null;
  loads: LoadG[];
}

export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface Geometry {
  W: number;
  H: number;
  segs: Map<string, Seg>;
  couplers: CouplerG[];
  devices: Map<string, DevG>;
  zones: Zone[];
  /** Position of each point of connection of the topology. */
  points: Map<string, Pt>;
}

export interface EquipmentSize {
  width: number;
  height: number;
  /** Distance from the top of the drawing to its axis (default: mid-height). */
  anchorY?: number;
}

export interface LayoutOptions {
  /** Horizontal difference between two participants in a row. */
  deviceGap?: number;
  /** Language of drawn labels (lines, areas, backbone). */
  t?: Translate;
  /** Dimensions of an equipment view, provided by the view registry. */
  equipmentSize?: (view: string) => EquipmentSize | undefined;
}

export const DEFAULT_EQUIPMENT_SIZES: Record<string, EquipmentSize> = {
  lamp: { width: LOAD_W, height: 32 },
  shutter: { width: 92, height: 142, anchorY: 58 },
  venetianBlind: { width: 92, height: 178, anchorY: 58 },
  dimmableLamp: { width: LOAD_W, height: 32 },
  daliGroup: { width: 168, height: 78, anchorY: 22 },
  radiator: { width: 96, height: 36 },
  fan: { width: LOAD_W, height: 34 },
  appliance: { width: LOAD_W, height: 34 },
};

export const cardHeight = (d: Device) => (2 + d.objects.length) * ROW;
export const rowCenter = (g: DevG, i: number) => g.top + (2.5 + i) * ROW;
/** Centre of the "group address" cell of the object line i. */
export const gaCell = (g: DevG, d: Device, i: number): Pt => [
  g.x + (d.receiver ? 0.25 : 0.75) * g.w,
  rowCenter(g, i),
];

const dist = (p: Pt, q: Pt) => Math.hypot(q[0] - p[0], q[1] - p[1]);
export const segLength = (s: Seg) =>
  s.pts.reduce((acc, p, i) => (i ? acc + dist(s.pts[i - 1]!, p) : 0), 0);
/** Point at the distance u from the beginning of the route. */
export function segPoint(s: Seg, u: number): Pt {
  let rest = Math.max(0, u);
  for (let i = 1; i < s.pts.length; i++) {
    const p = s.pts[i - 1]!;
    const q = s.pts[i]!;
    const L = dist(p, q);
    if (rest <= L || i === s.pts.length - 1) {
      const f = L ? Math.min(1, rest / L) : 0;
      return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
    }
    rest -= L;
  }
  return s.a;
}
/** Portion of the line between lo and hi distances (including angles). */
export function segSlice(s: Seg, lo: number, hi: number): Pt[] {
  const out: Pt[] = [segPoint(s, lo)];
  let acc = 0;
  for (let i = 1; i < s.pts.length - 1; i++) {
    acc += dist(s.pts[i - 1]!, s.pts[i]!);
    if (acc > lo && acc < hi) out.push(s.pts[i]!);
  }
  out.push(segPoint(s, hi));
  return out;
}
/** Distance, along the route, from the point of the nearest cable to p. */
export function segPos(s: Seg, p: Pt): number {
  let best = Infinity;
  let at = 0;
  let acc = 0;
  for (let i = 1; i < s.pts.length; i++) {
    const a = s.pts[i - 1]!;
    const b = s.pts[i]!;
    const L = dist(a, b);
    const f = L
      ? Math.max(
          0,
          Math.min(
            1,
            ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) /
              (L * L),
          ),
        )
      : 0;
    const d = dist(p, [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    if (d < best - 0.01) {
      best = d;
      at = acc + f * L;
    }
    acc += L;
  }
  return at;
}

const COMMAND_PORTS = [
  "switch",
  "dim",
  "value",
  "move",
  "stopStep",
  "positionCommand",
  "scene",
];

const SCREEN_H = 48;

function screenIds(d: Device): Set<string> {
  const ids = d.objects
    .filter((o) =>
      ["actualTemp", "setpointStatus", "hvacModeStatus"].includes(o.port),
    )
    .map((o) => o.id);
  return new Set(ids.length ? ids : d.objects.slice(0, 1).map((o) => o.id));
}

/** Device geometry (card on the left, loads on the right), relative to the top of its row. */
function localParts(d: Device, sizeOf: (view: string) => EquipmentSize) {
  const h = cardHeight(d);
  const rowsOf = (ids: Set<string>) =>
    d.objects.flatMap((o, i) => (ids.has(o.id) ? [i] : []));
  // A thermostat has a display, placed at the head of its plate, facing its state objects.
  const screen =
    d.kind === "thermostat" && d.objects.length ? screenIds(d) : null;
  const controls: { kind: KeyG["kind"]; id: string; ids: Set<string> }[] = [
    ...(screen ? [{ kind: "screen" as const, id: "screen", ids: screen }] : []),
    ...d.buttons.map((b) => ({
      kind: "button" as const,
      id: b.id,
      // A contact input faces the objects of its channel.
      ids: new Set(
        b.contact
          ? d.objects.filter((o) => o.channel === b.id).map((o) => o.id)
          : [b.press, b.short, b.long].flatMap((a) => (a ? [a.object] : [])),
      ),
    })),
    ...d.inputs.map((n) => ({
      kind: "input" as const,
      id: n.id,
      ids: new Set([n.object]),
    })),
  ];
  let keys: KeyG[] = controls.map((c) => {
    const rows = rowsOf(c.ids);
    const first = Math.min(...rows);
    const last = Math.max(...rows);
    const top = (2 + first) * ROW + 4;
    const h = (last - first + 1) * ROW - 8;
    // The display keeps a legible height, centered on its objects.
    if (c.kind === "screen" && h < SCREEN_H)
      return {
        kind: c.kind,
        id: c.id,
        top: top + (h - SCREEN_H) / 2,
        h: SCREEN_H,
        rows,
      };
    return { kind: c.kind, id: c.id, top, h, rows };
  });
  // A key without objects (an input not yet configured) has no rows to face.
  const overlap =
    keys.some((k) => !k.rows.length) ||
    keys.some((k, i) =>
      keys.some(
        (o, j) => j !== i && k.top < o.top + o.h && o.top < k.top + k.h,
      ),
    );
  if (overlap && keys.length) {
    // Several keys on the same objects: regular distribution over the object area.
    const zone = d.objects.length * ROW;
    const kh = Math.max(40, Math.min(64, zone / keys.length));
    const start = Math.min(
      2 * ROW + (zone - kh * keys.length) / 2,
      h - kh * keys.length,
    );
    keys = keys.map((k, i) => ({ ...k, top: start + i * kh + 4, h: kh - 8 }));
  }
  const loads: LoadG[] = [];
  const make = (
    c: Device["channels"][number],
    index: number,
    rows: number[],
    cy: number,
  ): LoadG => {
    const view = c.equipmentConfigs[index]!.view;
    const sz = sizeOf(view);
    return {
      channel: c.id,
      index,
      view,
      x: 0,
      top: 0,
      cy,
      w: sz.width,
      h: sz.height,
      rows,
    };
  };
  // Each load of an output is drawn; the loads of one output start at the same height
  // and the stacking below separates them.
  d.channels.forEach((c) => {
    if (!c.equipmentConfigs.length) return;
    const rows = d.objects.flatMap((o, i) =>
      o.channel === c.id && COMMAND_PORTS.includes(o.port) ? [i] : [],
    );
    const all = rows.length
      ? rows
      : d.objects.flatMap((o, i) => (o.channel === c.id ? [i] : []));
    if (!all.length) return;
    const cy = ((Math.min(...all) + Math.max(...all) + 1) / 2 + 2) * ROW;
    c.equipmentConfigs.forEach((_, i) => loads.push(make(c, i, all, cy)));
  });
  // Channels driven only by a common object (e.g. stage object): stacked loads.
  const orphans = d.channels.flatMap((c) =>
    loads.some((l) => l.channel === c.id)
      ? []
      : c.equipmentConfigs.map((e, i) => ({ c, i, view: e.view })),
  );
  if (orphans.length) {
    const shared = d.objects.flatMap((o, i) => (!o.channel ? [i] : []));
    const size = (o: (typeof orphans)[number]) => sizeOf(o.view).height + 6;
    const total = orphans.reduce((a, o) => a + size(o), 0);
    let y = Math.min(2 * ROW, h - total);
    orphans.forEach((o) => {
      const sz = sizeOf(o.view);
      loads.push(make(o.c, o.i, shared, y + (sz.anchorY ?? sz.height / 2) + 3));
      y += size(o);
    });
  }
  let minRel = 0;
  const anchorOf = (l: LoadG) => sizeOf(l.view).anchorY ?? l.h / 2;
  // Lowest allowed top of each load: keep it above the connector and the bus.
  const maxTop = (l: LoadG) =>
    h - Math.min(l.h - anchorOf(l), 60) - anchorOf(l);
  loads.forEach((l) => {
    l.top = Math.min(l.cy - anchorOf(l), maxTop(l));
  });
  // Loads taller than their object rows (a shutter spans about four rows) would
  // overlap: stack them in order, pushing down, then back up from the lowest limit.
  // Stack in the order of the rows, then of the loads of each output (a stable sort).
  const ordered = [...loads].sort((a, b) => a.cy - b.cy);
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]!;
    const cur = ordered[i]!;
    cur.top = Math.max(cur.top, prev.top + prev.h + LOAD_STACK_GAP);
  }
  for (let i = ordered.length - 1; i >= 0; i--) {
    const cur = ordered[i]!;
    const next = ordered[i + 1];
    cur.top = Math.min(
      cur.top,
      maxTop(cur),
      next ? next.top - cur.h - LOAD_STACK_GAP : Infinity,
    );
  }
  loads.forEach((l) => {
    l.cy = l.top + anchorOf(l);
    minRel = Math.min(minRel, l.top - 4);
  });
  keys.forEach((k) => (minRel = Math.min(minRel, k.top - 6)));
  const left = keys.length ? PLATE_W + KEY_GAP : 0;
  // Stacked loads each get a wire column: widen the gap for them.
  const loadGap = LOAD_GAP + Math.max(0, loads.length - 1) * 10;
  const right = loads.length
    ? loadGap + Math.max(LOAD_W, ...loads.map((l) => l.w))
    : 0;
  return { h, keys, loads, minRel, left, right, loadGap };
}

interface RowPlan {
  seg: string;
  label: string;
  devices: Device[];
  busY: number;
}

export function layout(
  s: Scenario,
  topo: Topology = buildTopology(s),
  opts: LayoutOptions = {},
): Geometry {
  const t = opts.t ?? en;
  const DEV_GAP = opts.deviceGap ?? 58;
  const sizeOf = (view: string): EquipmentSize =>
    opts.equipmentSize?.(view) ??
    (Object.hasOwn(DEFAULT_EQUIPMENT_SIZES, view)
      ? DEFAULT_EQUIPMENT_SIZES[view]
      : undefined) ?? { width: LOAD_W, height: 40 };
  const T = s.topology;
  const areas = T.areas.map((a) => a.address);
  const areaName = new Map(T.areas.map((a) => [a.address, a.name]));
  const areaLevel = T.backbone || T.ip === "areaCouplers";
  const lineLevel = T.mainLines.length > 0 || T.ip === "lineCouplers";

  // Columns: backbone (or IP), area couplers, main line (or IP), line couplers.
  const base = 64;
  let BBX = 0;
  let ACX = 0;
  let MLX = 0;
  let LCX = 0;
  let lineX0 = 64;
  if (areaLevel) {
    BBX = base;
    ACX = BBX + 116;
    MLX = ACX + 116;
    LCX = MLX + 116;
    lineX0 = LCX + 78;
  } else if (lineLevel) {
    MLX = base;
    LCX = MLX + 116;
    lineX0 = LCX + 78;
  }
  const devX0 = lineX0 + 44;
  const ipX = T.ip === "areaCouplers" ? BBX : MLX;

  const devices = new Map<string, DevG>();
  const segs = new Map<string, Seg>();
  const couplers: CouplerG[] = [];
  const zones: Zone[] = [];
  const points = new Map<string, Pt>();
  const segDevices = (id: string) =>
    (topo.segments.get(id)?.points ?? []).flatMap((p) =>
      p.deviceId ? [s.devicesById.get(p.deviceId)!] : [],
    );

  // Horizontal placement of a row (left to right order): returns the end abscisse.
  const placeRow = (row: RowPlan, x0: number, order: Device[]): number => {
    let x = x0;
    order.forEach((d) => {
      const p = localParts(d, sizeOf);
      const cardX = x + p.left;
      const top = row.busY - DROP - p.h;
      const plate = p.keys.length
        ? {
            x: cardX - KEY_GAP - PLATE_W,
            top: top + Math.min(...p.keys.map((k) => k.top)) - 6,
            h:
              Math.max(...p.keys.map((k) => k.top + k.h)) -
              Math.min(...p.keys.map((k) => k.top)) +
              12,
            keys: p.keys.map((k) => ({ ...k, top: top + k.top })),
          }
        : null;
      const loads = p.loads.map((l) => ({
        ...l,
        x: cardX + CARD_W + p.loadGap,
        cy: top + l.cy,
        top: top + l.top,
      }));
      const cx = cardX + CARD_W / 2;
      devices.set(d.id, {
        id: d.id,
        x: cardX,
        top,
        w: CARD_W,
        h: p.h,
        seg: row.seg,
        drop: [cx, top + p.h],
        at: [cx, row.busY],
        plate,
        loads,
      });
      points.set(`dev:${d.id}`, [cx, row.busY]);
      x = cardX + CARD_W + p.right + DEV_GAP;
    });
    return x - DEV_GAP;
  };
  const rowExtent = (row: RowPlan) => {
    let need = 56;
    row.devices.forEach((d) => {
      const p = localParts(d, sizeOf);
      need = Math.max(need, DROP + p.h - p.minRel);
    });
    return need;
  };

  let y = 16;
  let maxRight = 0;
  const rows: RowPlan[] = [];
  /** Ranking of a level in square (IP, backbone, main line): devices to the right of the column. */
  interface Corner {
    busY: number;
    right: number;
    devices: boolean;
  }
  const cornerRow = (seg: string, label: string, x: number): Corner => {
    const row: RowPlan = { seg, label, devices: segDevices(seg), busY: 0 };
    if (!row.devices.length) return { busY: y, right: x, devices: false };
    row.busY = y + rowExtent(row);
    // The first logical device is the furthest from the angle: placed on the right.
    const right = placeRow(row, x + 44, [...row.devices].reverse());
    maxRight = Math.max(maxRight, right);
    y = row.busY + 44 + 18;
    return { busY: row.busY, right, devices: true };
  };

  // IP network (supervisor...) and backbone network: top rows.
  let ipCorner: Corner | null = null;
  if (T.ip) {
    ipCorner = cornerRow("IP", t`IP network · KNXnet/IP`, ipX);
    if (!ipCorner.devices) {
      ipCorner.busY = y + 30;
      y = ipCorner.busY + 44;
    }
  }
  const bbCorner = T.backbone ? cornerRow("BB", t`Backbone 0.0`, BBX) : null;

  // Areas: main line (if any), then lines.
  const areaInfo: {
    area: number;
    top: number;
    bottom: number;
    lineYs: number[];
    corner: Corner | null;
  }[] = [];
  areas.forEach((area) => {
    const top = y;
    const boxed = areas.length > 1 || !!areaName.get(area);
    if (boxed) y += 30;
    const hasMain = T.mainLines.includes(area);
    const corner = hasMain
      ? cornerRow(`ML${area}`, t`Main line ${area}.0`, MLX)
      : null;
    if (corner && !corner.devices) {
      // Place the area coupler (or router) above the first line.
      y += areaLevel ? 44 : 20;
      corner.busY = y;
    }
    const lineYs: number[] = [];
    s.lines
      .filter((l) => l.area === area)
      .forEach((l) => {
        const main: RowPlan = {
          seg: `L${l.address}`,
          label: t`Line ${l.address}` + (l.name ? ` · ${l.name}` : ""),
          devices: segDevices(`L${l.address}`),
          busY: 0,
        };
        main.busY = y + rowExtent(main);
        rows.push(main);
        lineYs.push(main.busY);
        y = main.busY + 44 + 18;
        if (l.extension) {
          const down: RowPlan = {
            seg: `L${l.address}b`,
            label: t`Line ${l.address} · downstream segment`,
            devices: segDevices(`L${l.address}b`),
            busY: 0,
          };
          down.busY = y + rowExtent(down);
          rows.push(down);
          y = down.busY + 44 + 18;
        }
      });
    if (corner && !corner.devices && lineYs.length)
      corner.busY = Math.min(corner.busY, lineYs[0]! - (areaLevel ? 72 : 44));
    areaInfo.push({ area, top, bottom: y - 6, lineYs, corner });
    if (boxed) y += 18;
  });

  // The downstream segment starts from the extension (right): its first logical device is closest.
  rows.forEach((r) => {
    const order = r.seg.endsWith("b") ? [...r.devices].reverse() : r.devices;
    maxRight = Math.max(maxRight, placeRow(r, devX0, order));
  });
  const hasExt = s.lines.some((l) => l.extension);
  const lineEnd = Math.max(maxRight + (hasExt ? 96 : 60), lineX0 + 420);

  rows.forEach((r) => {
    const isDown = r.seg.endsWith("b");
    const a: Pt = isDown ? [lineEnd, r.busY] : [lineX0, r.busY];
    const b: Pt = isDown ? [lineX0, r.busY] : [lineEnd, r.busY];
    segs.set(
      r.seg,
      polySeg(r.seg, "line", [a, b], r.label, [lineX0 + 14, r.busY + 9], "h"),
    );
  });

  // Line extensions (repepper / segment coupler)
  s.lines.forEach((l) => {
    if (!l.extension) return;
    const up = segs.get(`L${l.address}`);
    const down = segs.get(`L${l.address}b`);
    if (!up || !down) return;
    couplers.push({
      id: `EXT${l.address}`,
      kind: "extension",
      address: l.extension.address,
      c: [lineEnd, (up.a[1] + down.a[1]) / 2],
      w: COUPLER_W + 20,
      h: COUPLER_H,
      A: { seg: up.id, p: [lineEnd, up.a[1]] },
      B: { seg: down.id, p: [lineEnd, down.a[1]] },
      line: l.address,
    });
  });

  /** Square: row of devices (if present), angle, then column until last connection. */
  const corneredSeg = (
    id: string,
    kind: Seg["kind"],
    label: string,
    x: number,
    corner: Corner,
    bottom: number,
  ) => {
    const pts: Pt[] = [];
    if (corner.devices || kind === "ip")
      pts.push([
        Math.max(corner.right + 30, x + (kind === "ip" ? 260 : 120)),
        corner.busY,
      ]);
    pts.push([x, corner.busY]);
    if (bottom > corner.busY + 0.5 || pts.length === 1)
      pts.push([x, Math.max(bottom, corner.busY + 1)]);
    const horizontal = pts.length > 1 && pts[0]![1] === pts[1]![1];
    segs.set(
      id,
      polySeg(
        id,
        kind,
        pts,
        label,
        horizontal
          ? kind === "ip"
            ? [pts[0]![0] - 8, corner.busY + 7]
            : [x + 14, corner.busY + 9]
          : [x - 24, Math.max(bottom, corner.busY) - 30],
        horizontal ? "h" : "v",
      ),
    );
  };

  // Main lines and line couplers (or IP routers acting as line couplers).
  areaInfo.forEach((ai) => {
    const ml = `ML${ai.area}`;
    s.lines
      .filter((l) => l.area === ai.area)
      .forEach((l) => {
        const busY = segs.get(`L${l.address}`)!.a[1];
        if (!ai.corner && T.ip !== "lineCouplers") return;
        couplers.push({
          id: `LC${l.address}`,
          kind: T.ip === "lineCouplers" ? "router" : "line",
          address: `${l.address}.0`,
          c: [LCX, busY],
          w: COUPLER_W + (T.ip === "lineCouplers" ? 16 : 0),
          h: COUPLER_H,
          A: { seg: T.ip === "lineCouplers" ? "IP" : ml, p: [MLX, busY] },
          B: { seg: `L${l.address}`, p: [lineX0, busY] },
          line: l.address,
        });
      });
    if (ai.corner)
      corneredSeg(
        ml,
        "main",
        t`Main line ${ai.area}.0`,
        MLX,
        ai.corner,
        Math.max(ai.corner.busY, ...ai.lineYs),
      );
    if (areaLevel) {
      const acY = ai.corner!.busY;
      couplers.push({
        id: `AC${ai.area}`,
        kind: T.ip === "areaCouplers" ? "router" : "area",
        address: `${ai.area}.0.0`,
        c: [ACX, acY],
        w: COUPLER_W + (T.ip === "areaCouplers" ? 16 : 0),
        h: COUPLER_H,
        A: { seg: T.ip === "areaCouplers" ? "IP" : "BB", p: [BBX, acY] },
        B: { seg: ml, p: [MLX, acY] },
        line: null,
      });
    }
    if (areas.length > 1 || areaName.get(ai.area))
      zones.push({
        x: (areaLevel ? ACX : MLX) + 20,
        y: ai.top,
        w: 0,
        h: ai.bottom - ai.top,
        label:
          t`Area ${ai.area}` +
          (areaName.get(ai.area) ? ` · ${areaName.get(ai.area)}` : ""),
      });
  });

  // Backbone and IP network: columns extend to the last connected coupler.
  const lastY = (kind: CouplerKind[], side: "A") =>
    Math.max(
      -Infinity,
      ...couplers.filter((c) => kind.includes(c.kind)).map((c) => c[side].p[1]),
    );
  if (bbCorner)
    corneredSeg(
      "BB",
      "backbone",
      t`Backbone 0.0`,
      BBX,
      bbCorner,
      Math.max(bbCorner.busY, lastY(["area"], "A")),
    );
  if (ipCorner)
    corneredSeg(
      "IP",
      "ip",
      t`IP network · KNXnet/IP`,
      ipX,
      ipCorner,
      Math.max(ipCorner.busY, lastY(["router"], "A")),
    );
  // Without a backbone device, its column starts at the first area coupler.
  if (bbCorner && !bbCorner.devices) {
    const first = Math.min(
      ...couplers.filter((c) => c.kind === "area").map((c) => c.A.p[1]),
    );
    const last = lastY(["area"], "A");
    segs.set(
      "BB",
      polySeg(
        "BB",
        "backbone",
        [
          [BBX, first],
          [BBX, Math.max(last, first + 1)],
        ],
        t`Backbone 0.0`,
        [BBX - 24, last - 30],
        "v",
      ),
    );
  }

  couplers.forEach((c) => {
    points.set(`cpl:${c.id}:A`, c.A.p);
    points.set(`cpl:${c.id}:B`, c.B.p);
  });

  let W = Math.max(lineEnd + (hasExt ? 90 : 70), maxRight + 40);
  segs.forEach((sg) => sg.pts.forEach((p) => (W = Math.max(W, p[0] + 40))));
  zones.forEach((z) => (z.w = W - z.x - 14));
  return { W, H: y + 4, segs, couplers, devices, zones, points };
}
