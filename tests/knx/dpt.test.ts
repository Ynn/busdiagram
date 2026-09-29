import { describe, expect, it } from "vitest";
import {
  canonical,
  checkValue,
  decode,
  dptBits,
  dptInfo,
  encode,
  encodeFloat16,
  formatValue,
  shortValue,
  SUPPORTED_DPTS,
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

describe("DPT 5.004, 9.024, 9.028, 13.013", () => {
  it("5.004 is 1 % per step up to 255 %, as in the specification examples", () => {
    expect(encode("5.004", 50)).toBe(0x32);
    expect(encode("5.004", 100)).toBe(0x64);
    expect(encode("5.004", 255)).toBe(0xff);
    expect(decode("5.004", 0xff)).toBe(255);
    expect(checkValue("5.004", 12.5)).not.toBeNull();
  });

  it("9.024 and 9.028 use the KNX 2-byte float in kW and km/h", () => {
    expect(decode("9.024", encode("9.024", 3.5))).toBeCloseTo(3.5, 2);
    expect(decode("9.024", encode("9.024", -2))).toBeCloseTo(-2, 2);
    expect(decode("9.028", encode("9.028", 51.1))).toBeCloseTo(51.1, 1);
    expect(encode("9.028", 3.5)).toBe(encode("9.005", 3.5));
    expect(formatValue("9.028", 36)).toBe("36.0 km/h");
    expect(formatValue("9.024", 3.5)).toBe("3.5 kW");
  });

  it("13.013 is a signed 32-bit count of kWh", () => {
    expect(encode("13.013", -1)).toBe(0xffffffff);
    expect(decode("13.013", 0xffffffff)).toBe(-1);
    expect(decode("13.013", encode("13.013", 4210))).toBe(4210);
    expect(formatValue("13.013", 4210)).toBe("4,210 kWh");
  });
});

describe("DPTs shown but not simulated", () => {
  it("take their size from the standard format and show raw bytes", () => {
    expect(dptBits("229.001")).toBe(48);
    expect(dptBits("12.001")).toBe(32);
    expect(dptBits("232.600")).toBe(24);
    expect(decode("12.001", 0x1234)).toBe(0x1234);
    expect(formatValue("12.001", 0x1234)).toBe("0x00001234");
    expect(() => encode("12.001", 1)).toThrow();
  });
});

describe("units in short values", () => {
  it("every DPT with a unit shows it in its short value, as in its full display", () => {
    const unitOf = (text: string) => /[^\d\s.,+\-–]+$/.exec(text)?.[0] ?? "";
    for (const id of SUPPORTED_DPTS) {
      const info = dptInfo(id)!;
      if (info.bits < 8 || info.codec === "time" || info.codec === "date")
        continue;
      const sample = Math.min(info.max, Math.max(info.min, 42));
      const full = formatValue(id, sample);
      // Only numeric values carry a unit (not scenes or HVAC modes).
      if (!/^[+-]?\d/.test(full)) continue;
      const unit = unitOf(full);
      if (!unit) continue;
      expect(shortValue(id, sample), id).toContain(unit.replace(/\s/g, ""));
    }
  });

  it("scales large energy and power values", () => {
    expect(shortValue("13.010", 950)).toBe("950Wh");
    expect(shortValue("13.010", 12500)).toBe("12.5kWh");
    expect(shortValue("14.056", 2500)).toBe("2500W");
    expect(shortValue("14.056", 12500)).toBe("12.5kW");
    expect(shortValue("13.013", 4210)).toBe("4210kWh");
    expect(shortValue("9.004", 42000)).toBe("42klx");
    expect(shortValue("9.001", 21)).toBe("21.0°C");
  });
});
