// Configuration consistency: a valid scenario can still illustrate a commissioning error
// (a parameter that disagrees with its load, a segment without power supply...), reported
// as a non-blocking warning. Each behavior brings its own rules (`warnings`); the rules
// common to every installation are here.
import type { Translate } from "../i18n";
import { dptTitle } from "./dpt";
import type { Registry } from "./registry";
import { captureRegistry } from "./registry";
import { buildTopology } from "./network";
import type { Scenario } from "./scenario";

export interface ConfigWarning {
  code: string;
  /** Device concerned; absent for a warning about a line. */
  deviceId?: string;
  channelId?: string;
  message: string;
}

export function configWarnings(
  s: Scenario,
  t: Translate,
  registry: Registry = captureRegistry(),
): ConfigWarning[] {
  const out: ConfigWarning[] = [];
  // Rules of each behavior on its own configuration.
  for (const d of s.devices)
    registry.behaviors
      .get(d.behavior)
      ?.warnings?.(d, t)
      .forEach((w) => out.push({ ...w, deviceId: d.id }));

  // Each TP segment needs its own bus power supply (KNX TP1 specification).
  for (const l of s.lines) {
    const segs: [string, boolean][] = [[l.address, !!l.powerSupply]];
    if (l.extension) segs.push([`${l.address} · 2`, !!l.extension.powerSupply]);
    for (const [seg, powered] of segs)
      if (!powered)
        out.push({
          code: "config-no-power-supply",
          message: t`segment ${seg} has no bus power supply: each TP segment needs its own, with its choke`,
        });
  }

  // A TP1 segment takes up to 64 connected devices (KNX TP1 specification, TP1-64
  // devices); a coupler, a router, or a line extension has a TP1 connection on each of its
  // TP segments and counts on both. More need TP1-256 devices or a line extension.
  for (const sg of buildTopology(s).segments.values()) {
    if (sg.kind === "ip" || sg.points.length <= 64) continue;
    const devices = sg.points.filter((p) => p.deviceId).length;
    const couplers = sg.points.length - devices;
    const name =
      sg.kind === "line"
        ? `${sg.ref}${sg.downstream ? " · 2" : ""}`
        : sg.kind === "main"
          ? `${sg.ref}.0`
          : "0.0";
    out.push({
      code: "config-segment-size",
      deviceId: sg.points.find((p) => p.deviceId)?.deviceId,
      message: t`segment ${name}: ${devices} devices and ${couplers} couplers or repeaters, more than the 64 connections of a TP1 segment; use TP1-256 devices or a line repeater or segment coupler`,
    });
  }

  // Group addresses linking one-bit DPTs with opposite meanings for the same state.
  const opposite: [string, string][] = [["1.009", "1.019"]];
  const byGa = new Map<string, { deviceId: string; dpt: string }[]>();
  for (const d of s.devices)
    for (const o of d.objects)
      for (const ga of o.gas) {
        const list = byGa.get(ga) ?? [];
        list.push({ deviceId: d.id, dpt: o.dpt });
        byGa.set(ga, list);
      }
  // The declared DPT of a group address counts as well: it documents the intended data.
  for (const g of s.groupAddresses.values())
    if (g.dpt && byGa.has(g.address))
      byGa.get(g.address)!.push({
        deviceId: byGa.get(g.address)![0]!.deviceId,
        dpt: g.dpt,
      });
  byGa.forEach((list, ga) => {
    // Same size, different kind of data (scene number and percentage, % and 0–255 %, Wh
    // and kWh): the bytes pass unchanged and each receiver reads them with its own DPT.
    // One-bit DPTs are left out: sharing 1.001 and 1.008 on one address is common practice.
    const kinds = [...new Set(list.map((x) => x.dpt))].filter(
      (d) => !d.startsWith("1."),
    );
    if (
      kinds.length === 2 &&
      kinds.includes("17.001") &&
      kinds.includes("18.001")
    )
      // Scene number and scene control agree on recalls; only storing differs.
      out.push({
        code: "config-datatype",
        deviceId: list.find((x) => x.dpt === "17.001")!.deviceId,
        message: t`${ga} links DPT 17.001 and DPT 18.001: recalls are read alike, but a 17.001 object reads a storing telegram (learn bit) as a recall.`,
      });
    else if (kinds.length > 1) {
      const [a, b] = kinds as [string, string];
      out.push({
        code: "config-datatype",
        deviceId: list.find((x) => x.dpt === a)!.deviceId,
        message: t`${ga} links DPT ${a} (${dptTitle(a, t)}) and DPT ${b} (${dptTitle(b, t)}): the same bytes mean different values; each receiver interprets them with its own DPT.`,
      });
    }
    for (const [a, b] of opposite) {
      const first = list.find((x) => x.dpt === a);
      if (first && list.some((x) => x.dpt === b))
        out.push({
          code: "config-polarity",
          deviceId: first.deviceId,
          message: t`${ga} links DPT ${a} and DPT ${b}, whose values 0 and 1 have opposite meanings; check the receiving objects.`,
        });
    }
  });
  return out;
}
