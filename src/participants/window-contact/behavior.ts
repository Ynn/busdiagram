// Window contact: reports the state of a window measured in the room.
import type { BehaviorContext, BehaviorDefinition } from "../../knx/contracts";
import { num } from "../shared/values";
import { contactWarnings } from "./rules";

/**
 * Value transmitted for a window. The physical window drives the electrical contact
 * (a normally open reed contact is closed while the window is closed); the input
 * interprets the contact, inverted for a normally closed contact; the result is then
 * encoded with the DPT semantics: 1.009 is 1 for "closed", 1.019 and 1.001 are 1 for "open".
 */
function contactValue(
  ctx: BehaviorContext<unknown>,
  dpt: string,
  windowOpen: boolean,
) {
  const nc = ctx.device.parameters.contactType === "normallyClosed";
  const contactClosed = nc ? windowOpen : !windowOpen;
  const invert = ctx.device.parameters.invert === true;
  const open = !contactClosed !== invert;
  return (dpt === "1.009" ? !open : open) ? 1 : 0;
}

export const windowContact: BehaviorDefinition<null> = {
  warnings: contactWarnings,
  description:
    "Window contact (binary input): sends the opening and closing of its room's window.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      contactType: {
        title: "Contact type",
        expert: true,
        type: "string",
        enum: ["normallyOpen", "normallyClosed"],
        enumTitles: ["Normally open", "Normally closed"],
        default: "normallyOpen",
        description:
          "Physical contact: a normally open contact is closed while the window is closed; a normally closed contact is open while the window is closed.",
      },
      invert: {
        title: "Invert input",
        expert: true,
        type: "boolean",
        default: false,
        description:
          "Interpret the electrical input for a normally closed contact. The transmitted value always follows the DPT (1.019: 1 = open; 1.009: 1 = closed).",
      },
      sendOnStart: {
        title: "Send on start",
        type: "boolean",
        default: true,
        description:
          "Send contact state when the simulation starts, as after bus power returns, so a thermostat can detect an already open window.",
      },
      startDelayMs: {
        title: "Start-up send delay",
        unit: "ms",
        expert: true,
        type: "integer",
        minimum: 0,
        default: 1000,
        description:
          "Delay after the simulation starts before the contact state is sent.",
      },
    },
  },
  readsRoom: true,
  ports: {
    contact: {
      dpts: ["1.019", "1.001", "1.009"],
      channel: "none",
      title: "Contact",
      direction: "out",
      description: "1.019 / 1.001: 1 means open; 1.009: 1 means closed",
    },
  },
  createState: () => null,
  onInit(ctx) {
    const room = ctx.readRoom();
    ctx.device.objects
      .filter((o) => o.port === "contact")
      .forEach((o) =>
        ctx.setObject(o.id, contactValue(ctx, o.dpt, !!room?.windowOpen)),
      );
    // After bus power returns, a binary input sends its contact state after a delay.
    if (ctx.device.parameters.sendOnStart !== false)
      ctx.schedule("start", num(ctx.device.parameters.startDelayMs, 1000));
  },
  // When the bus voltage returns, the binary input reads its contact again (the window may
  // have moved meanwhile) and sends it after its start delay, as at start-up.
  onBusRecovery(ctx) {
    const room = ctx.readRoom();
    ctx.device.objects
      .filter((o) => o.port === "contact")
      .forEach((o) =>
        ctx.setObject(o.id, contactValue(ctx, o.dpt, !!room?.windowOpen)),
      );
    if (ctx.device.parameters.sendOnStart !== false)
      ctx.schedule("start", num(ctx.device.parameters.startDelayMs, 1000));
  },
  onTimer(ctx, key) {
    if (key !== "start") return;
    ctx.device.objects
      .filter((o) => o.port === "contact")
      .forEach((o) => ctx.transmit(o.id));
  },
  onRoomChange(ctx, room) {
    ctx.device.objects
      .filter((o) => o.port === "contact")
      .forEach((o) => {
        const v = contactValue(ctx, o.dpt, room.windowOpen);
        if (ctx.getObject(o.id) === v) return;
        ctx.setObject(o.id, v);
        ctx.transmit(o.id);
      });
  },
};
