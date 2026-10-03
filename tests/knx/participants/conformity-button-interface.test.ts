// Conformity of the push-button interface with values other than the defaults, as the
// manual of a binary input interface describes them: switching on short and long presses
// or on the edges of the contact, dimming step, lock and bus recovery of a blind input,
// and an inverted LED.
import { describe, expect, it } from "vitest";
import { buildScenario } from "../../../src/knx/scenario";
import type { Simulation } from "../../../src/knx/sim";
import { raw } from "../helpers";
import type { Doc } from "./conformity-kit";
import { device, example, setParams, write } from "./conformity-kit";

const B = "buttonInterface";
const input = (
  params: Record<string, unknown>,
  ch: string,
  edit: (doc: Doc) => void = () => {},
) =>
  example("push-button-interface.json", (doc) => {
    setParams(doc, B, params, ch);
    edit(doc);
  });
const sentOn = (sim: Simulation, ga: string) =>
  sim.history
    .filter((t) => t.ga === ga && t.sourceDeviceId === B)
    .map((t) => t.value);
const gesture = (
  sim: Simulation,
  ch: string,
  g: "short" | "long" | "down" | "up",
) => {
  sim.input(B, ch, g);
  sim.advance(2000);
};

describe("push-button interface: switching", () => {
  it("switchLongPress: one action on a short press, another on a long press", () => {
    const sim = input(
      { switchLongPress: true, onShort: "on", onLong: "off" },
      "in1",
    );
    gesture(sim, "in1", "short");
    gesture(sim, "in1", "long");
    gesture(sim, "in1", "up");
    expect(sentOn(sim, "1/1/1")).toEqual([1, 0]);
  });

  it("onPress, onRelease: on while the key is held, off when released", () => {
    const sim = input({ onPress: "on", onRelease: "off" }, "in1");
    gesture(sim, "in1", "down");
    expect(sim.objectValue("switchActuator", "st")).toBe(1);
    gesture(sim, "in1", "up");
    expect(sentOn(sim, "1/1/1")).toEqual([1, 0]);
  });
});

describe("push-button interface: dimming", () => {
  it("dimStep: the step of the relative dimming telegram", () => {
    const sim = input({ dimStep: 3 }, "in2");
    gesture(sim, "in2", "long");
    gesture(sim, "in2", "up");
    // Brighter (bit 3) with step 3, then the stop telegram: same direction, step 0.
    expect(sentOn(sim, "1/2/2")).toEqual([0b1011, 0b1000]);
  });
});

describe("push-button interface: blind input", () => {
  const withLock = (doc: Doc) =>
    device(doc, B).objects.push({
      id: "lock3",
      name: "Lock",
      ga: "1/6/3",
      dpt: "1.001",
      port: "lock",
      channel: "in3",
      flags: { W: true, T: false },
    });

  it("blindLockStart, blindLockEnd: movements when locked and unlocked", () => {
    const sim = input(
      { blindLockStart: "down", blindLockEnd: "up" },
      "in3",
      withLock,
    );
    write(sim, "1/6/3", 1);
    write(sim, "1/6/3", 0);
    expect(sentOn(sim, "1/3/1")).toEqual([1, 0]);
  });

  it("a locked input ignores its key", () => {
    const sim = input({}, "in3", withLock);
    write(sim, "1/6/3", 1);
    gesture(sim, "in3", "long");
    gesture(sim, "in3", "up");
    expect(sentOn(sim, "1/3/1")).toEqual([]);
  });

  it("blindBusRecovery: a movement when the bus voltage returns", () => {
    const sim = input({ blindBusRecovery: "down" }, "in3");
    sim.setBusVoltage("L1.1", false);
    sim.advance(1000);
    sim.setBusVoltage("L1.1", true);
    sim.advance(3000);
    expect(sentOn(sim, "1/3/1")).toEqual([1]);
  });
});

describe("push-button interface: LED", () => {
  it("ledInverted: the key's LED is lit for 0", () => {
    const doc = raw("push-button-interface.json") as Doc;
    setParams(doc, B, { ledInverted: true }, "in1");
    const key = buildScenario(doc)
      .devicesById.get(B)!
      .buttons.find((b) => b.id === "in1")!;
    expect(key.ledInverted).toBe(true);
  });
});

describe("push-button interface: contact of the wired push-button", () => {
  const nc = (actuatedContact: "open" | "closed") =>
    input(
      { onPress: "on", onRelease: "off", actuatedContact },
      "in1",
      (doc) => {
        device(doc, B).channels!.find((c) => c.id === "in1")!.keyContact =
          "normallyClosed";
      },
    );

  it("a normally closed push-button with an input set to open: works as usual", () => {
    const sim = nc("open");
    gesture(sim, "in1", "down");
    gesture(sim, "in1", "up");
    expect(sentOn(sim, "1/1/1")).toEqual([1, 0]);
    expect(
      sim.getState().diagnostics.some((d) => d.code === "config-contact"),
    ).toBe(false);
  });

  it("a mismatch: presses and releases are seen the wrong way round, with a warning", () => {
    const sim = nc("closed");
    gesture(sim, "in1", "down"); // seen as a release: nothing (not pressed)
    gesture(sim, "in1", "up"); // seen as a press: on
    expect(sentOn(sim, "1/1/1")).toEqual([1]);
    gesture(sim, "in1", "down"); // seen as a release: off
    expect(sentOn(sim, "1/1/1")).toEqual([1, 0]);
    expect(
      sim.getState().diagnostics.some((d) => d.code === "config-contact"),
    ).toBe(true);
  });

  it("a mismatch on a long-press function: at rest, the input sees a long press", () => {
    const sim = input(
      { switchLongPress: true, onShort: "on", onLong: "off" },
      "in1",
      (doc) => {
        device(doc, B).channels!.find((c) => c.id === "in1")!.keyContact =
          "normallyClosed";
      },
    );
    gesture(sim, "in1", "down");
    gesture(sim, "in1", "up"); // the key is released: held for the input
    sim.advance(1000);
    expect(sentOn(sim, "1/1/1")).toEqual([0]);
  });
});
