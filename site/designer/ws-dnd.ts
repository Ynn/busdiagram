// Programming gestures follow the usual commissioning workflow: a catalog entry is dropped onto a line; a group address
// is dropped onto a group object, or a group object onto a group address; the first
// address of an object is its sending address. Every gesture calls the same edit
// operation as the equivalent button, with the same checks and one undo step.
import { dptBits } from "../../src/knx/dpt";
import type { Dev } from "./edit";
import * as E from "./edit";
import { t } from "./lang";
import { devOf, objLabel, parts, sizeText } from "./ws-state";
import type { Host } from "./ws-state";

// ── Drag and drop ────────────────────────────────────────────────────────────
// Data types: a group address "application/x-bd-ga"; a group object "application/x-bd-obj"
// ("device/object"); a catalog entry "application/x-bd-device"; a device to move
// "application/x-bd-move". The DPT size travels in a type name, readable while dragging.

const BITS = "application/x-bd-bits-";
export const has = (e: DragEvent, type: string) =>
  e.dataTransfer?.types.includes(type) ?? false;
const bitsOf = (e: DragEvent) => {
  const b = e.dataTransfer?.types.find((x) => x.startsWith(BITS));
  return b ? Number(b.slice(BITS.length)) : null;
};

export function startGa(host: Host, e: DragEvent, ga: string) {
  const dpt = host.doc ? E.gaDpt(host.doc, ga) : undefined;
  e.dataTransfer?.setData("application/x-bd-ga", ga);
  e.dataTransfer?.setData("text/plain", ga);
  if (dpt) e.dataTransfer?.setData(`${BITS}${dptBits(dpt)}`, "");
  if (e.dataTransfer) e.dataTransfer.effectAllowed = "link";
}

export function startObj(e: DragEvent, d: Dev, o: Dev["objects"][number]) {
  e.dataTransfer?.setData("application/x-bd-obj", `${d.id}/${o.id}`);
  e.dataTransfer?.setData("text/plain", `${d.name ?? d.id} ${o.name ?? o.id}`);
  if (o.dpt) e.dataTransfer?.setData(`${BITS}${dptBits(o.dpt)}`, "");
  if (e.dataTransfer) e.dataTransfer.effectAllowed = "link";
}

/** Link an address and an object; the address is added after the object's sending address. */
export function link(host: Host, ga: string, devId: string, objectId: string) {
  const doc = host.doc;
  const d = doc && devOf(doc, devId);
  const o = d?.objects.find((x) => x.id === objectId);
  if (!d || !o) return;
  if (E.gasOf(o).includes(ga))
    return host.refuse(
      t`Link`,
      t`${ga} is already linked to ${objLabel(d, o)}.`,
    );
  host.run(t`Link`, (x) =>
    E.setGaMembers(x, ga, [{ dev: devId, obj: objectId }], []),
  );
}

/** Drop target for a group address, on a group object. */
export function gaTarget(host: Host, d: Dev, o: Dev["objects"][number]) {
  const el = (e: DragEvent) => e.currentTarget as HTMLElement;
  return {
    over: (e: DragEvent) => {
      if (!has(e, "application/x-bd-ga")) return;
      // The innermost target decides (a row inside a list that is itself a target).
      e.stopPropagation();
      const bits = bitsOf(e);
      if (bits !== null && o.dpt && bits !== dptBits(o.dpt)) {
        el(e).classList.add("drop-no");
        host.ws.hint = t`Not possible: the data size differs (${sizeText(o.dpt)} for ${objLabel(d, o)}).`;
        host.requestUpdate();
        return;
      }
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "link";
      el(e).classList.add("drop-ok");
      const hint = t`Link with ${objLabel(d, o)} (${d.name ?? d.id})`;
      if (host.ws.hint !== hint) {
        host.ws.hint = hint;
        host.requestUpdate();
      }
    },
    leave: (e: DragEvent) => el(e).classList.remove("drop-ok", "drop-no"),
    drop: (e: DragEvent) => {
      el(e).classList.remove("drop-ok", "drop-no");
      const ga = e.dataTransfer?.getData("application/x-bd-ga");
      if (!ga) return;
      e.preventDefault();
      e.stopPropagation();
      host.ws.hint = "";
      link(host, ga, d.id, o.id);
    },
  };
}

/** Drop target for a group object, on a group address (or on a middle group: new address). */
export function objTarget(host: Host, ga: string | null, middle?: string) {
  const el = (e: DragEvent) => e.currentTarget as HTMLElement;
  const doc = host.doc!;
  return {
    over: (e: DragEvent) => {
      if (!has(e, "application/x-bd-obj")) return;
      e.stopPropagation();
      const bits = bitsOf(e);
      const dpt = ga ? E.gaDpt(doc, ga) : undefined;
      if (ga && bits !== null && dpt && bits !== dptBits(dpt)) {
        el(e).classList.add("drop-no");
        host.ws.hint = t`Not possible: ${ga} carries ${sizeText(dpt)}.`;
        host.requestUpdate();
        return;
      }
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "link";
      el(e).classList.add("drop-ok");
      const hint = ga
        ? t`Link with ${ga}`
        : t`New group address in ${middle ?? ""}, linked to the object`;
      if (host.ws.hint !== hint) {
        host.ws.hint = hint;
        host.requestUpdate();
      }
    },
    leave: (e: DragEvent) => el(e).classList.remove("drop-ok", "drop-no"),
    drop: (e: DragEvent) => {
      el(e).classList.remove("drop-ok", "drop-no");
      const ref = e.dataTransfer?.getData("application/x-bd-obj");
      if (!ref) return;
      e.preventDefault();
      e.stopPropagation();
      host.ws.hint = "";
      const [devId, objectId] = ref.split("/") as [string, string];
      if (ga) return link(host, ga, devId, objectId);
      // Onto a middle group: create an address there and link it.
      const d = devOf(doc, devId);
      const o = d?.objects.find((x) => x.id === objectId);
      if (!d || !o || !middle) return;
      const [m, mm] = parts(middle);
      host.run(t`Link`, (x) => {
        const addr = E.newGaIn(x, m!, mm!, o.name ?? o.id, o.dpt);
        E.setGaMembers(x, addr, [{ dev: devId, obj: objectId }], []);
      });
    },
  };
}

/** Drop target for a catalog entry or a device, on a line. */
/** Drop target on a line, or on one segment of a line with an extension (1 main, 2 behind it). */
export function lineTarget(host: Host, line: string, segment?: 1 | 2) {
  const el = (e: DragEvent) => e.currentTarget as HTMLElement;
  const kind = (e: DragEvent) =>
    has(e, "application/x-bd-device")
      ? "device"
      : has(e, "application/x-bd-move")
        ? "move"
        : null;
  return {
    over: (e: DragEvent) => {
      const k = kind(e);
      if (!k) return;
      e.stopPropagation();
      e.preventDefault();
      el(e).classList.add("drop-ok");
      const where = segment
        ? t`segment ${segment} of line ${line}`
        : t`line ${line}`;
      const hint = k === "device" ? t`Add on ${where}` : t`Move to ${where}`;
      if (host.ws.hint !== hint) {
        host.ws.hint = hint;
        host.requestUpdate();
      }
    },
    leave: (e: DragEvent) => el(e).classList.remove("drop-ok"),
    drop: (e: DragEvent) => {
      el(e).classList.remove("drop-ok");
      const k = kind(e);
      if (!k) return;
      e.preventDefault();
      e.stopPropagation();
      host.ws.hint = "";
      if (k === "device") {
        const v = e.dataTransfer!.getData("application/x-bd-device");
        if (v) host.insertDevice(line, v, segment === 2);
        return;
      }
      const id = e.dataTransfer!.getData("application/x-bd-move");
      const before = host.doc && devOf(host.doc, id);
      if (!before) return;
      const downstream = segment === 2;
      if (E.lineOf(before) === line) {
        // Same line: only the segment can change.
        if (segment && (before.downstream === true) !== downstream)
          host.run(t`Moving a device`, (d) =>
            E.setDownstream(d, id, downstream),
          );
        return;
      }
      const from = before.address;
      if (
        host.run(t`Moving a device`, (d) => {
          E.moveDevice(d, id, line);
          if (downstream) E.setDownstream(d, id, true);
        })
      ) {
        const after = host.doc && devOf(host.doc, id);
        host.announce(
          t`${before.name ?? id} moved from ${from ?? "—"} to ${after?.address ?? "—"}; its objects and addresses are kept.`,
        );
      }
    },
  };
}
