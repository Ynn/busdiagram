// The nodes of a device and of its group objects in the trees of the workspace, as the
// building and the topology show them.
import { html } from "lit";
import type { TemplateResult } from "lit";
import type { Dev } from "./edit";
import * as E from "./edit";
import { t } from "./lang";
import { gaTarget, startObj } from "./ws-dnd";
import { objLabel } from "./ws-state";
import type { Host } from "./ws-state";

export interface Node {
  key: string;
  label: TemplateResult | string;
  /** Plain text of the label, for the filter. */
  text: string;
  /** Name shown after the number or address, replaced by a field while renaming. */
  name?: string;
  /** Collapsed until opened (devices: their group objects). */
  closed?: boolean;
  icon: string;
  children?: Node[];
  drag?: (e: DragEvent) => void;
  drop?: {
    over: (e: DragEvent) => void;
    leave: (e: DragEvent) => void;
    drop: (e: DragEvent) => void;
  };
  title?: string;
}

export function objectNode(
  host: Host,
  d: Dev,
  o: Dev["objects"][number],
): Node {
  const drop = gaTarget(host, d, o);
  return {
    key: `obj:${d.id}/${o.id}`,
    icon: "i-obj",
    label: html`${objLabel(d, o)} <small>${E.gasOf(o).join(", ")}</small>`,
    text: `${objLabel(d, o)} ${E.gasOf(o).join(" ")}`,
    title: t`Group object; drag it onto a group address, or drop an address on it`,
    drag: (e) => startObj(e, d, o),
    drop,
  };
}

export function deviceNode(host: Host, d: Dev): Node {
  return {
    key: `dev:${d.id}`,
    icon: "i-dev",
    label: html`<code>${d.address ?? "IP"}</code> ${d.name ?? d.id}`,
    text: `${d.address ?? "IP"} ${d.name ?? d.id}`,
    title: t`Drag the device onto another line to move it`,
    closed: true,
    drag: (e) => {
      e.dataTransfer?.setData("application/x-bd-move", d.id);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    },
    children: E.objectsInOrder(d).map((o) => objectNode(host, d, o)),
  };
}
