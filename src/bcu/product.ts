// Toolkit to write a manufacturer's device: what it is (manufacturer, product, programs,
// masks), its hardware (channels: inputs or outputs), the group objects its application
// has with a given memory, and its application ("firmware"), which reads its parameters
// in the memory and sends its objects by number. defineProduct() turns it into a
// participant of the simulation: a behavior whose objects come from the tables in the
// memory, which ETS can program through the device's BCU profile.
import type {
  BehaviorContext,
  BehaviorDefinition,
  ChannelInfo,
  ObjectInfo,
  ParticipantModel,
} from "../knx/contracts";
import type { ProductProperty } from "./profile";
import { readBits } from "./profile";

/** A group object the application has: its number, its channel, its datapoint type. */
export interface ProductObject {
  number: number;
  /** Channel of the device it belongs to, or undefined for the whole device. */
  channel?: string;
  dpt: string;
  /** Name when the scenario gives none (the designer writes the product database's). */
  name?: string;
}

/** Hooks of the application, as a behavior's; `contactKey` for contact inputs. */
export type Firmware<S> = Pick<
  BehaviorDefinition<S>,
  | "createState"
  | "onInit"
  | "onInput"
  | "onObjectWrite"
  | "onRead"
  | "onTimer"
  | "onTick"
  | "onBusFailure"
  | "onBusRecovery"
  | "onClockChange"
  | "deviceState"
  | "channelState"
  | "contactKey"
>;

export interface ProductSpec<S = unknown> {
  /** Identifier of the product in its range: "example/sa-2". */
  id: string;
  /** Behavior of the scenario that runs it: "example.sa2/v1". */
  behavior: string;
  /** How the diagram draws it: buttonInterface, switchActuator… */
  kind: string;
  manufacturer: string;
  /**
   * What the delivered device holds in its memory ([address, octets]): ETS checks it
   * before loading an application (manufacturer code, hardware configuration).
   */
  delivered: readonly (readonly [number, readonly number[]])[];
  /** Manufacturer code of KNX Association (0x48 for Theben). */
  manufacturerId: number;
  /** Where its application has its group object table, for a BIM M112 (070xh). */
  objectTable?: number;
  /**
   * Identifier of the application the device is delivered with, for a BIM M112:
   * manufacturer (2 octets), application type (2), version — ETS compares it before
   * loading.
   */
  applicationId?: readonly number[];
  /** Properties of its own that its application program writes (BIM M112). */
  properties?: readonly ProductProperty[];
  name: string;
  orderNumber?: string;
  description: string;
  /** Application programs it runs, without their hash ("M-00FE_A-0001-10"). */
  programs: readonly string[];
  /** Mask versions of its BCU (0x0012). */
  masks: readonly number[];

  /** Where its parameters are in memory ([address, length]), which the pages set. */
  parameterMemory: readonly [number, number][];
  /** Its channels, as the hardware has them. */
  channels: readonly { id: string; label: string }[];
  /** Contact inputs (keys of wired push-buttons), as a push-button interface has. */
  contactInputs?: boolean;
  /** Outputs that drive loads, by command type. */
  output?: BehaviorDefinition["output"];
  /**
   * What is set on the device itself, not by ETS (the switching times of a time switch,
   * entered with its keys): parameters of the scenario, shown with the installation.
   */
  settings?: BehaviorDefinition["parameters"];
  /** The group objects the application has with this memory (its active objects). */
  objects(memory: Uint8Array): ProductObject[];
  firmware: Firmware<S>;
}

/** A product of the simulation, as the registry keeps it. */
export type Product = ProductSpec<unknown>;

/** Application program identifier without its hash ("M-00FE_A-0001-10"). */
export const programKey = (id: string) => id.split("-").slice(0, 4).join("-");

/** The product that runs an application program, if one does. */
export const productOfProgram = (
  products: Iterable<Product>,
  programId: string,
) => [...products].find((p) => p.programs.includes(programKey(programId)));

const PORT = "object";

/** The participant of a product: its behavior, and the product for the registry. */
export function defineProduct<S>(spec: ProductSpec<S>): ParticipantModel {
  const behavior: BehaviorDefinition<S> = {
    description: spec.description,
    ports: {
      [PORT]: {
        dpts: "any",
        channel: "optional",
        title: "Group object",
        direction: "both",
        description: "group object of the application, by its number",
      },
    },
    // A product has objects whose values it only keeps or sends (versions, texts).
    representsAnyDpt: true,
    ...(spec.contactInputs ? { contactInputs: true } : {}),
    ...(spec.output ? { output: spec.output } : {}),
    ...(spec.settings ? { parameters: spec.settings } : {}),
    ...spec.firmware,
  };
  return {
    behaviors: { [spec.behavior]: behavior },
    bcuProducts: [spec as Product],
  };
}

// ── Helpers for the firmware ────────────────────────────────────────────────

type Ctx = BehaviorContext<unknown>;

/** Memory of the device (empty when it has none). */
export const memoryOf = (ctx: { device: { memory?: Uint8Array | null } }) =>
  ctx.device.memory ?? new Uint8Array(0);

/** Bits of the memory at an address and bit offset (MSB first). */
export const bits = (
  ctx: { device: { memory?: Uint8Array | null } },
  address: number,
  bitOffset: number,
  count: number,
) => readBits(memoryOf(ctx), address, bitOffset, count);

/** Identifier of the group object of a number in the scenario. */
export const objectId = (n: number) => `o${n}`;

/** The object of a number, if the application has it. */
export const objectOf = (ctx: Ctx, n: number): ObjectInfo | undefined =>
  ctx.device.objects.find((o) => o.id === objectId(n));

/** Send a value on an object: written to the object, then transmitted. */
export function send(ctx: Ctx, n: number, value: number) {
  const o = objectOf(ctx, n);
  if (!o) {
    ctx.note(ctx.t`group object ${n} not enabled, nothing sent`);
    return;
  }
  ctx.setObject(o.id, value);
  ctx.transmit(o.id);
}

/** Value of an object, or null. */
export const valueOf = (ctx: Ctx, n: number) => {
  const o = objectOf(ctx, n);
  return o ? ctx.getObject(o.id) : null;
};

/** Number of an object identifier ("o12" → 12), or null. */
export const numberOf = (id: string) => {
  const m = /^o(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
};

export type { ChannelInfo };
