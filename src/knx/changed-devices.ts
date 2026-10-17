// What differs between two scenarios (their JSON) when it is only some devices: those
// whose description or installation entry (what they hold) changed, as when ETS
// downloads an application. The simulation then starts these devices again, not all.
type Rec = Record<string, unknown>;

const isRec = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
/** Entries of a list by their identifier (`key`). */
const byId = (list: unknown, key: string) =>
  new Map(
    (Array.isArray(list) ? list : []).map(
      (x) => [isRec(x) ? x[key] : undefined, x] as const,
    ),
  );

/**
 * The identifiers of the devices that differ, or null when the scenarios differ
 * otherwise (other devices, in another order, rooms, lines, options, couplers…). The
 * group addresses may differ: a download gives a device addresses of its own.
 */
export function changedDevices(
  before: unknown,
  after: unknown,
): string[] | null {
  if (!isRec(before) || !isRec(after)) return null;
  const rest = (s: Rec) => {
    const { devices: _d, installation: _i, groupAddresses: _g, ...other } = s;
    void _d;
    void _i;
    void _g;
    return other;
  };
  if (!same(rest(before), rest(after))) return null;
  const a = Array.isArray(before.devices) ? before.devices : [];
  const b = Array.isArray(after.devices) ? after.devices : [];
  const id = (d: unknown) => (isRec(d) ? d.id : undefined);
  if (a.length !== b.length || a.some((d, i) => id(d) !== id(b[i])))
    return null;
  const ia = isRec(before.installation) ? before.installation : {};
  const ib = isRec(after.installation) ? after.installation : {};
  if (!isRec(before.installation) !== !isRec(after.installation)) return null;
  if (!same(ia.couplers, ib.couplers)) return null;
  const ea = byId(ia.devices, "device");
  const eb = byId(ib.devices, "device");
  return a.flatMap((d, i) => {
    const k = id(d);
    return typeof k === "string" &&
      (!same(d, b[i]) || !same(ea.get(k), eb.get(k)))
      ? [k]
      : [];
  });
}

/**
 * The devices that ETS downloaded: those that differ, when each of them holds another
 * memory; null otherwise (an edit of the project is loaded again, whole).
 */
export function downloadedDevices(
  before: unknown,
  after: unknown,
): string[] | null {
  const ids = changedDevices(before, after);
  if (!ids?.length || !isRec(before) || !isRec(after)) return null;
  const memory = (s: Rec, id: string) => {
    const k = isRec(s.installation) ? s.installation : {};
    const e = byId(k.devices, "device").get(id);
    return isRec(e) ? e.memory : undefined;
  };
  return ids.every((id) => !same(memory(before, id), memory(after, id)))
    ? ids
    : null;
}
