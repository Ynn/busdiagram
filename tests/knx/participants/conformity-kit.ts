// Helpers of the conformity tests: an example with changed parameters or extra objects,
// and a USB interface to write any group address, as a commissioning tool would.
import { createSimulator } from "../../../src/core";
import type { Simulation } from "../../../src/knx/sim";
import { raw } from "../helpers";

export type Doc = {
  lines: { address: string }[];
  devices: Dev[];
  groupAddresses?: unknown[];
} & Record<string, unknown>;
export type Dev = {
  id: string;
  address?: string;
  parameters?: Record<string, unknown>;
  objects: Record<string, unknown>[];
  channels?: ({
    id: string;
    parameters?: Record<string, unknown>;
    equipment?: unknown;
  } & Record<string, unknown>)[];
} & Record<string, unknown>;

/** A copy of an example, changed by `edit`, with a USB interface on its first line. */
export function example(file: string, edit: (doc: Doc) => void = () => {}) {
  const doc = raw(file) as Doc;
  edit(doc);
  if (!doc.devices.some((d) => d.behavior === "usbInterface/v1"))
    doc.devices.push({
      id: "tool",
      name: "USB interface",
      address: `${doc.lines[0]!.address}.250`,
      kind: "interface",
      behavior: "usbInterface/v1",
      objects: [],
    });
  const sim = createSimulator(doc);
  // Start-up telegrams (status, reads on initialisation) occupy the bus first.
  sim.advance(3000);
  return sim;
}

export const device = (doc: Doc, id: string) =>
  doc.devices.find((d) => d.id === id)!;

/** Set parameters of a device, or of one of its channels. */
export function setParams(
  doc: Doc,
  id: string,
  params: Record<string, unknown>,
  channel?: string,
) {
  const d = device(doc, id);
  if (channel) {
    const c = d.channels!.find((x) => x.id === channel)!;
    c.parameters = { ...c.parameters, ...params };
  } else d.parameters = { ...d.parameters, ...params };
}

/** Write a group address from the USB interface, then let the telegrams arrive. */
export function write(sim: Simulation, ga: string, value: number, ms = 3000) {
  const usb = sim.scenario.devices.find(
    (d) => d.behavior === "usbInterface/v1",
  )!;
  sim.groupWrite(usb.id, ga, value);
  sim.advance(ms);
}
