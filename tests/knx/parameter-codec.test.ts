// Values of the parameters in memory, as ETS writes them: texts, signed and wide integers,
// floats; each one read back as it was written.
import { describe, expect, it } from "vitest";
import type { ParameterType } from "../../src/knxprod/application";
import {
  decodeValue,
  encodeValue,
  valueProblem,
} from "../../src/knxprod/config";

const type = (kind: ParameterType["kind"], sizeInBit: number, signed = false) =>
  ({ id: "T", kind, sizeInBit, signed }) as ParameterType;

const roundTrip = (t: ParameterType, v: string) =>
  decodeValue(t, encodeValue(t, v));

describe("parameter values in memory", () => {
  it("keeps a text, completed with NUL octets", () => {
    const t = type("text", 40);
    expect([...encodeValue(t, "20,0")]).toEqual([0x32, 0x30, 0x2c, 0x30, 0]);
    expect(roundTrip(t, "20,0")).toBe("20,0");
    // Cut to the size of the type.
    expect(roundTrip(type("text", 16), "abc")).toBe("ab");
  });

  it("keeps signed and wide integers", () => {
    expect(roundTrip(type("number", 8, true), "-5")).toBe("-5");
    expect([...encodeValue(type("number", 16, true), "-2")]).toEqual([
      0xff, 0xfe,
    ]);
    expect(roundTrip(type("number", 48), "281474976710655")).toBe(
      "281474976710655",
    );
    expect(roundTrip(type("number", 32), "4294967295")).toBe("4294967295");
  });

  it("keeps floats: IEEE 754 and the KNX 2-octet float", () => {
    expect(roundTrip(type("float", 32), "21.5")).toBe("21.5");
    expect(roundTrip(type("float", 64), "-0.125")).toBe("-0.125");
    expect(roundTrip(type("float", 16), "21.5")).toBe("21.5");
    // DPT 9: 21.5 °C is 0C33h.
    expect([...encodeValue(type("float", 16), "21.5")]).toEqual([0x0c, 0x33]);
  });
});

describe("parameter values refused", () => {
  it("outside their type: choice, number, bounds, octets, text", () => {
    const e = {
      ...type("enum", 8),
      enums: [{ value: 1, text: "on", id: "E1" }],
    } as ParameterType;
    expect(valueProblem(e, "1")).toBeNull();
    expect(valueProblem(e, "2")).toBe("choice");
    expect(valueProblem(type("number", 8), "256")).toBe("range");
    expect(valueProblem(type("number", 8), "1.5")).toBe("number");
    expect(valueProblem(type("number", 8, true), "-128")).toBeNull();
    expect(
      valueProblem({ ...type("number", 16), max: 100 } as ParameterType, "101"),
    ).toBe("range");
    expect(valueProblem(type("text", 16), "abc")).toBe("text");
    expect(valueProblem(type("text", 32), "€")).toBe("text");
    expect(valueProblem(type("float", 32), "x")).toBe("number");
  });

  it("keeps all the digits of a float on 64 bits", () => {
    expect(roundTrip(type("float", 64), "123456789.125")).toBe("123456789.125");
  });
});
