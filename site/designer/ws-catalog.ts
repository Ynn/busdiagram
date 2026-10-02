// Catalog of the device types that the designer can insert, by category.
import { isStandardBehavior } from "../../src/knx/registry";
import type { Registry } from "../../src/knx/registry";
import type { Doc } from "./edit";
import { t } from "./lang";
import { SNIPPETS } from "./snippets";

// ── Catalog ──────────────────────────────────────────────────────────────────

/** Catalog groups: label and template identifiers. */
const CATALOG_GROUPS: [() => string, string[]][] = [
  [() => t`Controls`, ["buttonInterface4", "roomThermostat"]],
  [
    () => t`Actuators`,
    ["switchActuator4", "dim", "dali", "shutterActuator", "heatingActuator"],
  ],
  [
    () => t`Sensors`,
    [
      "pir",
      "windowContact",
      "temperatureSensor",
      "airQualitySensor",
      "weatherStation",
    ],
  ],
  [
    () => t`Automation and metering`,
    ["logicModule", "clockMaster", "timeSwitch", "energyMeter"],
  ],
  [() => t`Supervision and gateways`, ["sup", "usbInterface", "systemGateway"]],
];

export interface CatalogEntry {
  value: string;
  label: string;
  hint: string;
  behavior: string;
  objects: { name: string; dpt: string }[];
  channels: number;
}

/**
 * One entry per type: the number of keys or outputs is set on the Configuration page of
 * the device, so the catalog names the type and gives the count it starts with.
 */
const CATALOG_NAMES: Record<string, () => [string, string]> = {
  buttonInterface4: () => [
    t`Push-button interface`,
    t`Four inputs to start with; set the number of inputs on the Configuration page, and the function of each input on its pages.`,
  ],
  switchActuator4: () => [
    t`Switch actuator`,
    t`Four outputs to start with, one lamp each; set the number of outputs on the Configuration page, and the loads of each output.`,
  ],
};

const previews = new Map<string, CatalogEntry | null>();
/** Catalog entry of a template: the device it creates on an empty installation. */
export function templateEntry(id: string): CatalogEntry | null {
  if (!previews.has(id)) {
    const s = SNIPPETS.find((x) => x.id === id);
    try {
      const base = {
        formatVersion: 2,
        lines: [{ address: "1.1" }],
        devices: [],
        groupAddresses: [],
      } as unknown as Doc;
      const d = (s!.apply(base, { line: "1.1" }) as Doc).devices.at(-1);
      previews.set(
        id,
        d
          ? {
              value: `snippet:${id}`,
              label: CATALOG_NAMES[id]?.()[0] ?? s!.label,
              hint: CATALOG_NAMES[id]?.()[1] ?? s!.hint,
              behavior: d.behavior,
              channels: d.channels?.length ?? 0,
              objects: d.objects.map((o) => ({
                name: o.name ?? o.id,
                dpt: o.dpt ?? "",
              })),
            }
          : null,
      );
    } catch {
      previews.set(id, null);
    }
  }
  return previews.get(id) ?? null;
}

export function catalogGroups(reg: Registry): [string, CatalogEntry[]][] {
  const listed = new Set(CATALOG_GROUPS.flatMap(([, ids]) => ids));
  const groups: [string, CatalogEntry[]][] = CATALOG_GROUPS.map(
    ([label, ids]) => [
      label(),
      ids.map(templateEntry).filter((e): e is CatalogEntry => !!e),
    ],
  );
  const others = SNIPPETS.filter(
    (s) =>
      !listed.has(s.id) &&
      // Variants of a listed type (another number of keys or outputs).
      !["ga", "line", "switchActuator6"].includes(s.id),
  )
    .map((s) => templateEntry(s.id))
    .filter((e): e is CatalogEntry => !!e);
  if (others.length) groups.push([t`Other devices`, others]);
  const ext = [...reg.behaviors]
    .filter(([id]) => !isStandardBehavior(id))
    .map(([id, d]): CatalogEntry => ({
      value: `ext:${id}`,
      label: id,
      hint: d.description ?? "",
      behavior: id,
      objects: [],
      channels: 0,
    }));
  if (ext.length) groups.push([t`Loaded extensions`, ext]);
  return groups;
}
