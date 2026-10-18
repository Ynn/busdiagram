// Values of the parameters in memory, as ETS writes them: texts, signed and wide integers,
// floats; each one read back as it was written.
import { describe, expect, it } from "vitest";
import type { ParameterType } from "../../src/knxprod/application";
import {
  decodeValue,
  encodeValue,
  knownTime,
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

describe("times", () => {
  it("packs a duration in seconds as its device keeps it (seconds, minutes, hours)", () => {
    const t = {
      ...type("time", 24),
      unit: "PackedDaysHoursMinutesAndSeconds",
    } as ParameterType;
    // As ETS writes them for a presence detector of System B: 10 s, 1 min, 5 min.
    expect([...encodeValue(t, "10")]).toEqual([10, 0, 0]);
    expect([...encodeValue(t, "60")]).toEqual([0, 1, 0]);
    expect(roundTrip(t, "300")).toBe("300");
    expect(roundTrip(t, "65535")).toBe("65535");
    // In another unit, an integer.
    expect([
      ...encodeValue(
        { ...type("time", 16), unit: "Seconds" } as ParameterType,
        "300",
      ),
    ]).toEqual([1, 0x2c]);
    expect(valueProblem(t, "1.5")).toBe("number");
  });
});

describe("times of other units", () => {
  it("knows the units it writes, and bounds a packed time by its octets", () => {
    const packed = {
      ...type("time", 24),
      unit: "PackedDaysHoursMinutesAndSeconds",
    } as ParameterType;
    expect(knownTime(packed)).toBe(true);
    expect(
      knownTime({ ...type("time", 16), unit: "Seconds" } as ParameterType),
    ).toBe(true);
    expect(
      knownTime({
        ...type("time", 32),
        unit: "PackedMinutesSecondsAndMilliseconds",
      } as ParameterType),
    ).toBe(false);
    // 255 h 59 min 59 s at most in three octets.
    expect(valueProblem(packed, String(255 * 3600 + 3599))).toBeNull();
    expect(valueProblem(packed, String(256 * 3600))).toBe("range");
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
