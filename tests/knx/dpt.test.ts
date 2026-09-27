import { describe, expect, it } from "vitest";
import {
  canonical,
  checkValue,
  decode,
  dptInfo,
  encode,
  encodeFloat16,
  formatValue,
  shortValue,
} from "../../src/knx/dpt";
import { buildFrame, hex } from "../../src/knx/format";
import { load } from "./helpers";

const bytes = (f: ReturnType<typeof buildFrame>) =>
  f
    .flatMap((x) => x.bytes)
    .map(hex)
    .join(" ");

describe("codecs", () => {
  it("DPT 5.001 : 0, 50, 100 % → 0x00, 0x80, 0xFF", () => {
    expect([0, 50, 100].map((v) => encode("5.001", v))).toEqual([
      0x00, 0x80, 0xff,
    ]);
    expect(decode("5.001", 0x80)).toBeCloseTo(50.19608, 5);
    expect(decode("5.001", 0xff)).toBe(100);
    expect(canonical("5.001", 50)).toBeCloseTo(50.196, 3);
    expect(shortValue("5.001", canonical("5.001", 50))).toBe("50%");
  });

  it("DPT 17.001 : bytes 0 and 63 → scenes 1 and 64", () => {
    expect(encode("17.001", 0)).toBe(0);
    expect(encode("17.001", 63)).toBe(63);
    expect(formatValue("17.001", 0)).toBe("Scene 1");
    expect(formatValue("17.001", 63)).toBe("Scene 64");
  });

  it("DPT 1.008: 0 up, 1 down", () => {
    expect(formatValue("1.008", 0)).toBe("Up");
    expect(formatValue("1.008", 1)).toBe("Down");
  });

  it("uses the standardized DPT 1.007 step direction", () => {
    expect(formatValue("1.007", 0)).toBe("Step decrease");
    expect(formatValue("1.007", 1)).toBe("Step increase");
  });

  it("uses the standardized names in generated metadata", () => {
    expect(dptInfo("1.003")?.name).toBe("Enable");
    expect(dptInfo("1.010")?.name).toBe("Start/Stop");
  });
});

describe("TP1 frame", () => {
  it("1.1.1 → 1/1/1 = 1", () => {
    expect(bytes(buildFrame("1.1.1", "1/1/1", 1, "1.001"))).toBe(
      "BC 11 01 09 01 E1 00 81 3B",
    );
  });

  it("DPT 5.001: 100% transported in 0xFF, 50% in 0x80", () => {
    expect(
      bytes(buildFrame("1.1.3", "2/4/1", 100, "5.001"))
        .split(" ")
        .slice(5, 9),
    ).toEqual(["E2", "00", "80", "FF"]);
    expect(bytes(buildFrame("1.1.3", "2/4/1", 50, "5.001")).split(" ")[8]).toBe(
      "80",
    );
  });

  it("the frame uses the same codec as the engine", () => {
    const sim = load("shutter-calibration.json");
    const [tel] = sim.input("pushButton", "position", "value", 50);
    const frame = buildFrame(tel!.sourceAddress, tel!.ga, tel!.value, tel!.dpt);
    expect(frame[4]!.bytes[2]).toBe(tel!.raw);
    expect(tel!.raw).toBe(0x80);
  });
});

describe("DPT 9.xxx (2-byte float)", () => {
  it("encodes by the standard formula: 0.01 × M × 2^E", () => {
    // 21 °C: 2100 exceeds 2047 → E = 1, M = 1050 → 0x0C1A. -5.5 °C: M = −550 → 0x85DA.
    expect(encode("9.001", 21)).toBe(0x0c1a);
    expect(encode("9.001", -5.5)).toBe(0x85da);
    expect(decode("9.001", 0x0c1a)).toBe(21);
    expect(decode("9.001", encode("9.001", -5.5))).toBe(-5.5);
    expect(encode("9.001", 0)).toBe(0);
    expect(decode("9.001", 0x07ff)).toBe(20.47);
    expect(encode("9.001", 670433.28)).toBe(0x7ffe);
    expect(decode("9.002", 0xf800)).toBe(-671088.64);
    expect(() => decode("9.001", 0x7fff)).toThrow(/invalid/);
    expect(() => encodeFloat16(670760)).toThrow(/range/);
    expect(checkValue("9.001", 670433.28)).toBeNull();
    expect(checkValue("9.001", 670433.29)).toMatch(/outside the range/);
    expect(checkValue("9.002", -671088.64)).toBeNull();
  });
  it("quantizes according to the exponent", () => {
    expect(canonical("9.001", 21.37)).toBe(21.38);
    expect(canonical("9.001", 19.5)).toBe(19.5);
    expect(canonical("9.002", -2)).toBe(-2);
  });
  it("displays °C, K, and HVAC modes", () => {
    expect(formatValue("9.001", 21)).toBe("21.0 °C");
    expect(formatValue("9.002", 0.5)).toBe("+0.5 K");
    expect(formatValue("20.102", 3)).toBe("Economy");
    expect(shortValue("20.102", 1)).toBe("C");
    expect(checkValue("20.102", 5)).toMatch(/outside the range/);
    expect(checkValue("9.001", 21.5)).toBeNull();
  });
});

it("temperature frame: 2 bytes of data, length 3", () => {
  const f = buildFrame("1.1.1", "3/4/1", 21, "9.001");
  expect(f[3]!.bytes[0]! & 0x0f).toBe(3);
  expect(f[4]!.bytes).toEqual([0x00, 0x80, 0x0c, 0x1a]);
});
