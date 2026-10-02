// Kit shared by the designer templates: free individual addresses, IDs and group
// addresses selected automatically, and the contribution of a participant to the designer.
// An insertion completely succeeds or is refused with a reason (SnippetRefusal):
// no partial transfer or address already occupied.
import type { Dev } from "./edit";
import { t } from "./lang";

export type Json = Record<string, unknown>;
export type Doc = Json & {
  lines?: Json[];
  devices?: Json[];
  groupAddresses?: Json[];
  ipRouter?: Json;
  topology?: Json;
};

export class SnippetRefusal extends Error {}

export interface SnippetContext {
  /** Target line ("1.1"); by default the first line declared. */
  line?: string;
}

export const flags = (W: boolean, T: boolean) => ({ W, T });
const isRec = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Does the document have the minimum form necessary for an insertion? */
export function shapeProblem(doc: unknown): string | null {
  if (!isRec(doc)) return t`the root must be an object { … }`;
  for (const k of ["lines", "devices", "groupAddresses"])
    if (doc[k] !== undefined && !Array.isArray(doc[k]))
      return t`“${k}” must be a list [ … ]`;
  if (doc.ipRouter !== undefined && !isRec(doc.ipRouter))
    return t`“ipRouter” must be an object`;
  if (
    ((doc.lines as unknown[]) ?? []).some(
      (l) => !isRec(l) || typeof l.address !== "string",
    )
  )
    return t`each line needs an “area.line” address`;
  if (((doc.devices as unknown[]) ?? []).some((d) => !isRec(d)))
    return t`each device must be an object`;
  return null;
}

export function freeId(doc: Doc, base: string) {
  const used = new Set((doc.devices ?? []).map((d) => d.id));
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(`${base}${i}`)) return `${base}${i}`;
}

/** Occupied individual addresses: devices, router, line extensions. */
export function usedAddresses(doc: Doc): Set<string> {
  const used = new Set<string>();
  (doc.devices ?? []).forEach(
    (d) => typeof d.address === "string" && used.add(d.address),
  );
  if (typeof doc.ipRouter?.address === "string") used.add(doc.ipRouter.address);
  (doc.lines ?? []).forEach((l) => {
    const ext = l.extension as Json | undefined;
    if (typeof ext?.address === "string") used.add(ext.address);
  });
  return used;
}

/** First free address of the line (1–255; « .0 » is that of the coupler). */
export function freeAddress(doc: Doc, line?: string): string {
  const target = line ?? String(doc.lines?.[0]?.address ?? "1.1");
  // "Z.0" (main line) and "0.0" (backbone) are not reported in "lines".
  const level = /^\d+\.0$/.test(target);
  if (!level && !(doc.lines ?? []).some((l) => l.address === target))
    throw new SnippetRefusal(t`line ${target} is not declared`);
  const used = usedAddresses(doc);
  for (let i = 1; i <= 255; i++)
    if (!used.has(`${target}.${i}`)) return `${target}.${i}`;
  throw new SnippetRefusal(t`no free address left on line ${target}`);
}

/** Next free group address in the given main/medium group. */
export function freeGa(
  doc: Doc,
  main = 1,
  middle = 1,
  taken: string[] = [],
): string {
  const used = new Set<string>(taken);
  (doc.groupAddresses ?? []).forEach((g) => used.add(String(g.address)));
  (doc.devices ?? []).forEach((d) =>
    (Array.isArray(d.objects) ? (d.objects as Json[]) : []).forEach((o) =>
      [o?.ga].flat().forEach((g) => used.add(String(g))),
    ),
  );
  for (let i = 1; i <= 255; i++)
    if (!used.has(`${main}/${middle}/${i}`)) return `${main}/${middle}/${i}`;
  throw new SnippetRefusal(
    t`no free group address left in ${main}/${middle}/…`,
  );
}

export function ensureBase(input: Doc): Doc {
  const problem = shapeProblem(input);
  if (problem) throw new SnippetRefusal(problem);
  const doc = input;
  return {
    formatVersion: 2,
    title: doc.title ?? t`New installation`,
    ...doc,
    lines: doc.lines?.length
      ? doc.lines
      : [{ address: "1.1", name: t`Lab kit`, powerSupply: { currentMa: 640 } }],
    groupAddresses: doc.groupAddresses ?? [],
    devices: doc.devices ?? [],
  };
}

export interface Snippet {
  id: string;
  readonly label: string;
  readonly hint: string;
  apply(doc: Doc, ctx?: SnippetContext): Doc;
}

/** First room, created on demand ("Room 1") for a sensor or radiator. */
export function withRoom(doc: Doc): { doc: Doc; room: string } {
  const rooms = (Array.isArray(doc.rooms) ? doc.rooms : []) as Json[];
  if (rooms.length) return { doc, room: String(rooms[0]!.id) };
  return {
    doc: { ...doc, rooms: [{ id: "room1", name: t`Room 1` }] },
    room: "room1",
  };
}

/** Simulated clock added when a time device needs one. */
export const DEFAULT_CLOCK = { start: "2026-01-05T06:55:00", speed: 60 };

/** Categories of the catalog, in display order. */
export const CATALOG_CATEGORIES = [
  "controls",
  "actuators",
  "sensors",
  "automation",
  "supervision",
] as const;
export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

/** What the designer knows of a participant: catalog entry, templates, displayed name. */
export interface DesignerContribution {
  behavior: string;
  /** Category of its catalog entry; none for a participant without template. */
  category?: CatalogCategory;
  /** Templates; the first is the catalog entry, the others are variants. */
  templates: Snippet[];
  /** Name and hint of the catalog entry, when they differ from the template's. */
  catalogName?: () => [string, string];
  /** Type shown under the device name, with its number of channels for instance. */
  typeLabel?: (device: Dev) => string;
  /**
   * Identifiers of the objects the designer creates, by port: a prefix ("c" for c1, c2…),
   * and the channel number added always (default) or only when the device has several
   * channels. Without it, the port name is the prefix.
   */
  objectIds?: Readonly<
    Record<string, { prefix: string; numbered?: "always" | "several" }>
  >;
  /** Texts of the contribution, by language, registered with the designer. */
  messages?: Readonly<Record<string, Record<string, string>>>;
}
