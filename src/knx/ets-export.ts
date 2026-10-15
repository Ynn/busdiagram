// Group addresses of a scenario in the XML format that ETS imports (Group Addresses →
// Import), namespace http://knx.org/xml/ga-export/01, as described by the schema that
// ETS 6.4 embeds. With them, an ETS project decodes the telegrams of the simulation with
// the same DPTs, names and structure as the diagram.
import type { Translate } from "../i18n";
import { en } from "../i18n";
import { compareAddress, parseGA } from "./address";
import { isRepresentableDpt } from "./dpt";
import type { Scenario } from "./scenario";

const xml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** DPT as ETS writes it: "DPST-9-1" for 9.001, "DPT-9" for a main type alone. */
export function etsDpt(dpt: string): string | null {
  const m = /^(\d{1,3})\.(\d{3,5})$/.exec(dpt);
  if (!m || !isRepresentableDpt(dpt)) return null;
  return `DPST-${Number(m[1])}-${Number(m[2])}`;
}

/** Names are 1 to 255 characters in the schema. */
const name = (s: string) => s.trim().slice(0, 255);

/** Every group address of the scenario: declared, and used by objects. */
function addressesOf(s: Scenario): string[] {
  const all = new Set<string>(s.groupAddresses.keys());
  s.devices.forEach((d) =>
    d.objects.forEach((o) => o.gas.forEach((g) => all.add(g))),
  );
  return [...all].filter((g) => parseGA(g)).sort(compareAddress);
}

/** DPT of an address: declared, otherwise that of its first object. */
function dptOf(s: Scenario, ga: string): string | undefined {
  const declared = s.groupAddresses.get(ga)?.dpt;
  if (declared) return declared;
  for (const d of s.devices)
    for (const o of d.objects) if (o.gas.includes(ga)) return o.dpt;
  return undefined;
}

/** Name of an address: declared, otherwise from its first object. */
function nameOf(s: Scenario, ga: string): string {
  const declared = s.groupAddresses.get(ga)?.name;
  if (declared?.trim()) return name(declared);
  for (const d of s.devices)
    for (const o of d.objects)
      if (o.gas[0] === ga) return name(`${d.name} – ${o.name ?? o.id}`);
  return ga;
}

/** XML of the scenario's group addresses, three-level style, for ETS. */
export function etsGroupAddressXml(s: Scenario, t: Translate = en): string {
  const lines = [
    '<?xml version="1.0" encoding="utf-8" standalone="yes"?>',
    '<GroupAddress-Export xmlns="http://knx.org/xml/ga-export/01">',
  ];
  const tree = new Map<number, Map<number, string[]>>();
  addressesOf(s).forEach((ga) => {
    const [main, middle] = parseGA(ga)!;
    if (!tree.has(main)) tree.set(main, new Map());
    const mids = tree.get(main)!;
    if (!mids.has(middle)) mids.set(middle, []);
    mids.get(middle)!.push(ga);
  });
  [...tree.keys()]
    .sort((a, b) => a - b)
    .forEach((main) => {
      const start = main * 2048;
      lines.push(
        `  <GroupRange Name="${xml(name(s.groupRanges.get(String(main)) ?? t`Main group ${main}`))}" RangeStart="${Math.max(1, start)}" RangeEnd="${start + 2047}">`,
      );
      const mids = tree.get(main)!;
      [...mids.keys()]
        .sort((a, b) => a - b)
        .forEach((middle) => {
          const mstart = start + middle * 256;
          lines.push(
            `    <GroupRange Name="${xml(name(s.groupRanges.get(`${main}/${middle}`) ?? t`Middle group ${main}/${middle}`))}" RangeStart="${Math.max(1, mstart)}" RangeEnd="${mstart + 255}">`,
          );
          mids.get(middle)!.forEach((ga) => {
            const dpt = dptOf(s, ga);
            const ets = dpt ? etsDpt(dpt) : null;
            lines.push(
              `      <GroupAddress Name="${xml(nameOf(s, ga))}" Address="${ga}"${ets ? ` DPTs="${ets}"` : ""} />`,
            );
          });
          lines.push("    </GroupRange>");
        });
      lines.push("  </GroupRange>");
    });
  lines.push("</GroupAddress-Export>", "");
  return lines.join("\r\n");
}
