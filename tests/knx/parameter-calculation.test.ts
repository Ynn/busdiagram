// Parameter calculations: the scripts with which ETS sets hidden parameters, read with the
// subset of JavaScript that programs use (those of a switch and blind actuator of System
// B), and run in their order until none changes anything.
import { describe, expect, it } from "vitest";
import type { ApplicationProgram } from "../../src/knxprod/application";
import {
  calculate,
  runScript,
  uncalculate,
} from "../../src/knxprod/calculation";
import type { CalculationProblem } from "../../src/knxprod/calculation";

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

  it("declares, chooses with ? :, and combines bits, as a presence detector program does", () => {
    const script = `var nResult = 0;
      nResult = ((ON > 0) ? 1:0) | (((OFF > 0) ? 1:0) & DAYLIGHT);
      USED = nResult;`;
    expect(runScript(script, { ON: 4, OFF: 0, DAYLIGHT: 1 }).USED).toBe(1);
    expect(runScript(script, { ON: 0, OFF: 4, DAYLIGHT: 1 }).USED).toBe(1);
    expect(runScript(script, { ON: 0, OFF: 4, DAYLIGHT: 0 }).USED).toBe(0);
  });

  it("ends a statement with a semicolon before else, and reads && || lazily", () => {
    expect(runScript("if (X == 1) A = 2; else A = 3;", { X: 1 }).A).toBe(2);
    expect(runScript("A = false && UNKNOWN", {}).A).toBe(false);
    expect(runScript("A = true || UNKNOWN", {}).A).toBe(true);
    expect(runScript("A = X ? 1 : UNKNOWN", { X: 1 }).A).toBe(1);
    expect(() => runScript("A = true && UNKNOWN", {})).toThrow();
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

  it("says which calculation it could not run, and sets nothing of it", () => {
    const broken = {
      ...program,
      calculations: [
        { ...program.calculations![0]!, script: "PAR_OUTPUT = f(PAR_INPUT)" },
      ],
    } as ApplicationProgram;
    const problems: CalculationProblem[] = [];
    expect(calculate(broken, { F0_R: "2" }, problems)).toEqual({ F0_R: "2" });
    expect(problems).toMatchObject([{ calculation: "PC-1" }]);
  });

  it("keeps a value that its parameter takes only", () => {
    const outOfRange = {
      ...program,
      types: new Map([
        ["T", { id: "T", kind: "number", sizeInBit: 8, min: 0, max: 200 }],
      ]),
      calculations: [
        {
          ...program.calculations![0]!,
          script: "PAR_OUTPUT = PAR_INPUT * 100",
        },
      ],
    } as unknown as ApplicationProgram;
    const problems: CalculationProblem[] = [];
    expect(calculate(outOfRange, { F0_R: "3" }, problems)).toEqual({
      F0_R: "3",
    });
    expect(problems).toMatchObject([{ calculation: "PC-1", ref: "H0_R" }]);
  });

  it("sets all the outputs of a calculation or none", () => {
    const two = {
      ...program,
      types: new Map([
        ["T", { id: "T", kind: "number", sizeInBit: 8, min: 0, max: 200 }],
      ]),
      calculations: [
        {
          id: "PC-1",
          script: "PAR_A = PAR_INPUT, PAR_B = PAR_INPUT * 100",
          inputs: [{ ref: "F0_R", alias: "PAR_INPUT" }],
          outputs: [
            { ref: "H0_R", alias: "PAR_A" },
            { ref: "H1_R", alias: "PAR_B" },
          ],
        },
      ],
    } as unknown as ApplicationProgram;
    const problems: CalculationProblem[] = [];
    // 3 fits H0, 300 does not fit H1: neither is set.
    expect(calculate(two, { F0_R: "3" }, problems)).toEqual({ F0_R: "3" });
    expect(problems).toMatchObject([{ calculation: "PC-1", ref: "H1_R" }]);
    expect(calculate(two, { F0_R: "2" })).toEqual({
      F0_R: "2",
      H0_R: "2",
      H1_R: "200",
    });
  });

  it("keeps the digits of a float", () => {
    const float = {
      ...program,
      types: new Map([["T", { id: "T", kind: "float", sizeInBit: 32 }]]),
      calculations: [
        { ...program.calculations![0]!, script: "PAR_OUTPUT = PAR_INPUT / 2" },
      ],
    } as unknown as ApplicationProgram;
    expect(calculate(float, { F0_R: "1" }).H0_R).toBe("0.5");
  });
});

describe("reverse calculations of a program", () => {
  // A function chosen in the dialog (F, no memory) kept in memory by its hidden copy (H),
  // and a time in ms (T) kept in units of 100 ms (U).
  const program = {
    parameters: new Map([
      ["F", { id: "F", type: "N", value: "1" }],
      [
        "H",
        { id: "H", type: "N", value: "1", memory: { offset: 0, bitOffset: 0 } },
      ],
      ["T", { id: "T", type: "N", value: "1000" }],
      [
        "U",
        {
          id: "U",
          type: "N",
          value: "10",
          memory: { offset: 1, bitOffset: 0 },
        },
      ],
    ]),
    parameterRefs: new Map(
      ["F", "H", "T", "U"].map((id) => [
        `${id}_R`,
        { id: `${id}_R`, ref: id, access: "" },
      ]),
    ),
    types: new Map([["N", { id: "N", kind: "number", sizeInBit: 16 }]]),
    calculations: [
      {
        id: "PC-1",
        script: "PAR_OUTPUT = PAR_INPUT",
        reverse: "PAR_INPUT = PAR_OUTPUT",
        inputs: [{ ref: "F_R", alias: "PAR_INPUT" }],
        outputs: [{ ref: "H_R", alias: "PAR_OUTPUT" }],
      },
      {
        id: "PC-2",
        script: "PAR_UP = PAR_TIME / 100",
        reverse: "PAR_TIME = PAR_UP * 100",
        inputs: [{ ref: "T_R", alias: "PAR_TIME" }],
        outputs: [{ ref: "U_R", alias: "PAR_UP" }],
      },
    ],
  } as unknown as ApplicationProgram;

  it("gives back the values of the dialog that the memory does not hold", () => {
    expect(uncalculate(program, { H_R: "6", U_R: "300" })).toMatchObject({
      F_R: "6",
      H_R: "6",
      T_R: "30000",
      U_R: "300",
    });
  });

  it("keeps a value read in memory", () => {
    const kept = {
      ...program,
      calculations: [
        {
          ...program.calculations![0]!,
          reverse: "PAR_INPUT = 2, PAR_OUTPUT = 3",
        },
      ],
    } as ApplicationProgram;
    expect(uncalculate(kept, { H_R: "6" })).toMatchObject({
      F_R: "2",
      H_R: "6",
    });
  });

  it("says which reverse script it could not run", () => {
    const broken = {
      ...program,
      calculations: [
        { ...program.calculations![0]!, reverse: "PAR_INPUT = g()" },
      ],
    } as ApplicationProgram;
    const problems: CalculationProblem[] = [];
    expect(uncalculate(broken, { H_R: "6" }, problems)).toEqual({ H_R: "6" });
    expect(problems).toMatchObject([{ calculation: "PC-1" }]);
  });
});

describe("an edit of the designer", () => {
  it("is refused when it makes a calculation of the program fail", async () => {
    const { setEtsParameter } = await import("../../site/designer/ets-device");
    const { captureRegistry } = await import("../../src/knx/registry");
    const ref = (id: string) =>
      [`${id}_R`, { id: `${id}_R`, ref: id, access: "" }] as const;
    const app = {
      parameters: new Map(
        [
          ["F0", "1"],
          ["H0", "1"],
        ].map(([id, value]) => [id, { id, type: "T", value }]),
      ),
      parameterRefs: new Map(["F0", "H0"].map(ref)),
      types: new Map([
        ["T", { id: "T", kind: "number", sizeInBit: 8, min: 0, max: 200 }],
      ]),
      segments: new Map(),
      dynamic: [],
      calculations: [
        {
          id: "PC-1",
          script: "PAR_OUTPUT = PAR_INPUT * 100",
          inputs: [{ ref: "F0_R", alias: "PAR_INPUT" }],
          outputs: [{ ref: "H0_R", alias: "PAR_OUTPUT" }],
        },
      ],
    } as unknown as ApplicationProgram;
    const doc = { devices: [{ id: "d", ets: { parameters: {} } }] };
    expect(() =>
      setEtsParameter(doc as never, "d", app, captureRegistry(), "F0_R", "3"),
    ).toThrow(/calculation PC-1 of the program cannot be done/);
    expect(doc.devices[0]!.ets.parameters).toEqual({});
  });
});
