// Products of an imaginary manufacturer, "Example Electric" (manufacturer code FEh), as a
// package of devices delivers real ones: what the tests of the BCU profiles, of the ETS
// downloads and of the import of packages use. Their product databases are written by
// hand (sa-2.json, be-1.json): no manufacturer's data.
//
// SA 2: switch actuator with 2 outputs on a BCU1 (mask 0012h), program M-00FE_A-0001-10.
//   Objects 0 (output A) and 1 (output B). Parameters, one octet per output from
//   100h + 100: bit 7 contact (0 normally open, 1 normally closed), bits 0–1 state at bus
//   recovery (0 unchanged, 1 off, 2 on).
// BE 1: push-button interface with 1 input on a BIM M112 (mask 0701h), program
//   M-00FE_A-0002-10. Object 0 (switching); its group object table at 4200h, its
//   parameter at 4220h: bits 0–1 reaction on press (0 toggle, 1 on, 2 off).
import type { BehaviorContext } from "../../../../src/knx/contracts";
import type { Firmware, ProductObject } from "../../../../src/bcu/product";
import {
  bits,
  defineProduct,
  objectId,
  send,
  valueOf,
} from "../../../../src/bcu/product";
import type { ProductDatabase } from "../../../../src/knxprod/database";
import sa2Database from "./sa-2.json";
import be1Database from "./be-1.json";

const OUTPUTS = ["a", "b"] as const;

const outputParameters = (ctx: BehaviorContext<Sa2State>, n: number) => ({
  normallyClosed: bits(ctx, 0x100 + 100 + n, 0, 1) === 1,
  recovery: bits(ctx, 0x100 + 100 + n, 6, 2),
});

interface Sa2State {
  on: Record<string, boolean>;
}

const relay = (ctx: BehaviorContext<Sa2State>, n: number) => {
  const ch = OUTPUTS[n]!;
  // A normally closed contact lets the current through when the relay is released.
  ctx.setOutput(ch, {
    type: "switch",
    on: ctx.state.on[ch] !== outputParameters(ctx, n).normallyClosed,
  });
};

const sa2Firmware: Firmware<Sa2State> = {
  createState: () => ({ on: { a: false, b: false } }),
  onInit(ctx) {
    OUTPUTS.forEach((ch, n) => {
      const { recovery } = outputParameters(ctx, n);
      if (recovery === 1 || recovery === 2) ctx.state.on[ch] = recovery === 2;
      relay(ctx, n);
    });
  },
  onObjectWrite(ctx, e) {
    const n = OUTPUTS.findIndex((_, i) => e.objectId === objectId(i));
    if (n < 0) return;
    ctx.state.on[OUTPUTS[n]!] = e.newValue !== 0;
    relay(ctx, n);
  },
  channelState: (s, ch) => ({ on: s.on[ch] ?? false }),
};

export const sa2Model = defineProduct({
  id: "example/sa-2",
  behavior: "example.sa2/v1",
  kind: "switchActuator",
  manufacturer: "Example Electric",
  manufacturerId: 0xfe,
  // Manufacturer code at 104h, which ETS checks before loading.
  delivered: [[0x104, [0xfe]]],
  name: "SA 2",
  description: "Example Electric SA 2: switch actuator, 2 outputs.",
  programs: ["M-00FE_A-0001-10"],
  masks: [0x0012],
  parameterMemory: [[0x100 + 100, 2]],
  channels: OUTPUTS.map((c) => ({ id: c, label: c.toUpperCase() })),
  output: "switch",
  objects: (): ProductObject[] =>
    OUTPUTS.map((ch, n) => ({ number: n, channel: ch, dpt: "1.001" })),
  firmware: sa2Firmware,
});

const REACTION = 0x4220;

const be1Firmware: Firmware<Record<string, never>> = {
  createState: () => ({}),
  onInput(ctx, input) {
    if (input.inputId !== "in" || input.gesture !== "down") return;
    const c = ctx as BehaviorContext<unknown>;
    const reaction = bits(ctx, REACTION, 6, 2);
    send(c, 0, reaction === 1 ? 1 : reaction === 2 ? 0 : valueOf(c, 0) ? 0 : 1);
  },
};

export const be1Model = defineProduct({
  id: "example/be-1",
  behavior: "example.be1/v1",
  kind: "buttonInterface",
  manufacturer: "Example Electric",
  manufacturerId: 0xfe,
  delivered: [],
  // Delivered with the application of its program (manufacturer, type, version).
  applicationId: [0x00, 0xfe, 0x00, 0x02, 0x10],
  // Written by its program at the end of the download: 2 elements of 5 octets.
  properties: [{ object: 3, pid: 204, type: 0x15, max: 2 }],
  name: "BE 1",
  description: "Example Electric BE 1: push-button interface, 1 input.",
  programs: ["M-00FE_A-0002-10"],
  masks: [0x0701],
  objectTable: 0x4200,
  parameterMemory: [[REACTION, 1]],
  channels: [{ id: "in", label: "Input" }],
  contactInputs: true,
  objects: () => [{ number: 0, channel: "in", dpt: "1.001" }],
  firmware: be1Firmware,
});

/** The products with their databases, as a package's manifest lists them. */
export const SAMPLE_PRODUCTS = [
  {
    behavior: "example.sa2/v1",
    manufacturer: "Example Electric",
    name: "SA 2",
    model: sa2Model,
    database: sa2Database as unknown as ProductDatabase,
  },
  {
    behavior: "example.be1/v1",
    manufacturer: "Example Electric",
    name: "BE 1",
    model: be1Model,
    database: be1Database as unknown as ProductDatabase,
  },
];
