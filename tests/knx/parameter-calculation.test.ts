// Parameter calculations: the scripts with which ETS sets hidden parameters, read with the
// subset of JavaScript that programs use (those of the Switch/Blind Master 5800 of
// Schneider Electric), and run in their order until none changes anything.
import { describe, expect, it } from "vitest";
import type { ApplicationProgram } from "../../src/knxprod/application";
import { calculate, runScript } from "../../src/knxprod/calculation";

describe("scripts of parameter calculations", () => {
  it("assigns, separated by new lines or commas", () => {
    expect(
      runScript("PAR_UP = PAR_TIME/100\n PAR_DOWN = PAR_TIME/100", {
        PAR_TIME: 6000,
      }),
    ).toMatchObject({ PAR_UP: 60, PAR_DOWN: 60 });
    expect(runScript("A = X/100, B = Y/10", { X: 300, Y: 50 })).toMatchObject({
      A: 3,
      B: 5,
    });
  });

  it("chooses with if, else if and else, with or without braces", () => {
    const script = `if      (PAR_INPUT1 == 32768) PAR_OUTPUT  = 0
else if ((PAR_INPUT1 > 32768 ) && (PAR_INPUT2 == 32768 )) PAR_OUTPUT   = 1
else if ((PAR_INPUT1 > 32768 ) && (PAR_INPUT2 > 32768 )) PAR_OUTPUT    = 2`;
    expect(
      runScript(script, { PAR_INPUT1: 32768, PAR_INPUT2: 32768 }).PAR_OUTPUT,
    ).toBe(0);
    expect(
      runScript(script, { PAR_INPUT1: 32770, PAR_INPUT2: 32768 }).PAR_OUTPUT,
    ).toBe(1);
    expect(
      runScript(script, { PAR_INPUT1: 32770, PAR_INPUT2: 32770 }).PAR_OUTPUT,
    ).toBe(2);
    const occupied =
      "if (PAR_CH_IN <=1) { PAR_CH_OUT = PAR_CH_IN2 }\n else { PAR_CH_OUT = 170 }";
    expect(
      runScript(occupied, { PAR_CH_IN: 1, PAR_CH_IN2: 6 }).PAR_CH_OUT,
    ).toBe(6);
    expect(
      runScript(occupied, { PAR_CH_IN: 2, PAR_CH_IN2: 6 }).PAR_CH_OUT,
    ).toBe(170);
  });

  it("compares texts and their length", () => {
    const pin = `if ( (PAR_PIN =='0000' ) || (PAR_PIN =='1234' ) || (PAR_PIN.length != 4) )  { PAR_RESULT = 1 }
    else { PAR_RESULT = 0 }`;
    expect(runScript(pin, { PAR_PIN: "1234" }).PAR_RESULT).toBe(1);
    expect(runScript(pin, { PAR_PIN: "123" }).PAR_RESULT).toBe(1);
    expect(runScript(pin, { PAR_PIN: "4711" }).PAR_RESULT).toBe(0);
  });

  it("refuses what it does not read", () => {
    expect(() => runScript("A = f(1)", {})).toThrow();
    expect(() => runScript("A = B", {})).toThrow();
    expect(() => runScript("while (1) {}", {})).toThrow();
  });
});

describe("calculations of a program", () => {
  const ref = (id: string) =>
    [`${id}_R`, { id: `${id}_R`, ref: id, access: "" }] as const;
  const program = {
    parameters: new Map(
      [
        ["F0", "1"],
        ["H0", "1"],
        ["F1", "1"],
        ["H1", "1"],
      ].map(([id, value]) => [id, { id, type: "T", value }]),
    ),
    parameterRefs: new Map(["F0", "H0", "F1", "H1"].map(ref)),
    types: new Map([["T", { id: "T", kind: "number", sizeInBit: 8 }]]),
    calculations: [
      {
        id: "PC-1",
        script: "PAR_OUTPUT = PAR_INPUT",
        inputs: [{ ref: "F0_R", alias: "PAR_INPUT" }],
        outputs: [{ ref: "H0_R", alias: "PAR_OUTPUT" }],
      },
      {
        id: "PC-2",
        script:
          "if (PAR_CH_IN <=1) { PAR_CH_OUT = PAR_CH_IN2 } else { PAR_CH_OUT = 170 }",
        inputs: [
          { ref: "H0_R", alias: "PAR_CH_IN" },
          { ref: "F1_R", alias: "PAR_CH_IN2" },
        ],
        outputs: [{ ref: "H1_R", alias: "PAR_CH_OUT" }],
      },
    ],
  } as unknown as ApplicationProgram;

  it("sets the hidden parameters, one calculation after the other", () => {
    // Channel 1 a blind (2): channel 2 is occupied.
    expect(calculate(program, { F0_R: "2" })).toEqual({
      F0_R: "2",
      H0_R: "2",
      H1_R: "170",
    });
    expect(calculate(program, { F0_R: "1", F1_R: "6" })).toEqual({
      F0_R: "1",
      F1_R: "6",
      H1_R: "6",
    });
  });

  it("changes nothing when the defaults agree", () => {
    expect(calculate(program, {})).toEqual({});
  });
});
