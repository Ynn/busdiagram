// Catalog of the device types that the designer can insert, by category.
import { isStandardBehavior } from "../../src/knx/registry";
import type { Registry } from "../../src/knx/registry";
import type { Doc } from "./edit";
import { t } from "./lang";
import type {
  CatalogCategory,
  DesignerContribution,
  Snippet,
} from "./snippet-kit";
import { CATALOG_CATEGORIES } from "./snippet-kit";
import { TOPOLOGY_TEMPLATES } from "./snippets";
import { DESIGNER } from "./standard-designer";

// ── Catalog ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<CatalogCategory, () => string> = {
  controls: () => t`Controls`,
  actuators: () => t`Actuators`,
  sensors: () => t`Sensors`,
  automation: () => t`Automation and metering`,
  supervision: () => t`Supervision and gateways`,
};

/** Template identifiers of a catalog group: the first template of each participant. */
const catalogIds = (
  designer: readonly DesignerContribution[],
  category: CatalogCategory,
) =>
  designer
    .filter((c) => c.category === category && c.templates.length)
    .map((c) => c.templates[0]!.id);

export interface CatalogEntry {
  value: string;
  label: string;
  hint: string;
  behavior: string;
  objects: { name: string; dpt: string }[];
  channels: number;
}

const previews = new Map<string, CatalogEntry | null>();
/**
 * Catalog entry of a template: the device it creates on an empty installation. One entry
 * per type: the number of keys or outputs is set on the Configuration page of the device,
 * so the catalog names the type (`catalogName`) and gives the count it starts with.
 */
function templateEntry(
  s: Snippet,
  name?: () => [string, string],
): CatalogEntry | null {
  if (!previews.has(s.id)) {
    try {
      const base = {
        formatVersion: 2,
        lines: [{ address: "1.1" }],
        devices: [],
        groupAddresses: [],
      } as unknown as Doc;
      const d = (s.apply(base, { line: "1.1" }) as Doc).devices.at(-1);
      previews.set(
        s.id,
        d
          ? {
              value: `snippet:${s.id}`,
              label: name?.()[0] ?? s.label,
              hint: name?.()[1] ?? s.hint,
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
      previews.set(s.id, null);
    }
  }
  return previews.get(s.id) ?? null;
}

/**
 * Groups of the catalog: the participants by category, then the other templates, then the
 * behaviors of loaded extensions (those without designer entry).
 */
export function catalogGroups(
  reg: Registry,
  designer: readonly DesignerContribution[] = DESIGNER,
): [string, CatalogEntry[]][] {
  const templates = [
    ...designer.flatMap((c) => c.templates),
    ...TOPOLOGY_TEMPLATES,
  ];
  const nameOf = new Map(
    designer
      .filter((c) => c.catalogName && c.templates.length)
      .map((c) => [c.templates[0]!.id, c.catalogName!]),
  );
  const entry = (s: Snippet) => templateEntry(s, nameOf.get(s.id));
  const byId = (id: string) => templates.find((x) => x.id === id)!;
  const listed = new Set(
    CATALOG_CATEGORIES.flatMap((c) => catalogIds(designer, c)),
  );
  // Variants of a listed type (another number of keys or outputs) and the topology.
  const variants = new Set([
    ...designer.flatMap((c) => c.templates.slice(1).map((s) => s.id)),
    ...TOPOLOGY_TEMPLATES.map((s) => s.id),
  ]);
  const groups: [string, CatalogEntry[]][] = CATALOG_CATEGORIES.map((c) => [
    CATEGORY_LABELS[c](),
    catalogIds(designer, c)
      .map((id) => entry(byId(id)))
      .filter((e): e is CatalogEntry => !!e),
  ]);
  const others = templates
    .filter((s) => !listed.has(s.id) && !variants.has(s.id))
    .map(entry)
    .filter((e): e is CatalogEntry => !!e);
  if (others.length) groups.push([t`Other devices`, others]);
  const contributed = new Set(designer.map((c) => c.behavior));
  const ext = [...reg.behaviors]
    .filter(([id]) => !isStandardBehavior(id) && !contributed.has(id))
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
