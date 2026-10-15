// cEMI codec, against frames exchanged with the Falcon library installed with ETS 6.4
// (session of 14 October 2026 through knx-ws-bridge).
import { describe, expect, it } from "vitest";
import {
  type CemiGroupFrame,
  CemiError,
  L_DATA_IND,
  L_DATA_REQ,
  dataToRaw,
  decodeCemi,
  encodeCemi,
  hexBytes,
  rawToData,
} from "../../src/knx/cemi";

const bytes = (hex: string) => hex.split(" ").map((x) => parseInt(x, 16));

describe("cEMI frames of the Falcon session", () => {
  it("reads the write of ETS: 1.1.251 → 0/0/1 = 1, hop count 5", () => {
    expect(decodeCemi(bytes("11 00 B4 D0 11 FB 00 01 01 00 81"))).toEqual({
      messageCode: L_DATA_REQ,
      service: "GroupValueWrite",
      source: "1.1.251",
      ga: "0/0/1",
      priority: "normal",
      hopCount: 5,
      size: 0,
      data: [1],
    });
  });

  it("reads a read without data", () => {
    const f = decodeCemi(bytes("11 00 B4 D0 11 FB 00 01 01 00 00"));
    expect(f.service).toBe("GroupValueRead");
    expect(f.data).toEqual([]);
  });

  it("writes the response that Falcon accepted", () => {
    const out = encodeCemi({
      messageCode: L_DATA_IND,
      service: "GroupValueResponse",
      source: "1.1.2",
      ga: "0/0/1",
      priority: "low",
      hopCount: 6,
      size: 0,
      data: [1],
    });
    expect(hexBytes(out)).toBe("29 00 BC E0 11 02 00 01 01 00 41");
  });
});

describe("cEMI codec", () => {
  it.each([
    ["GroupValueWrite", 2, [0x0c, 0x33]],
    ["GroupValueResponse", 1, [0xff]],
    ["GroupValueWrite", 3, [0x0c, 0x22, 0x38]],
    ["GroupValueWrite", 4, [0x7f, 0xc0, 0x00, 0x00]],
  ] as const)("round trip %s of %i bytes", (service, size, data) => {
    const f: CemiGroupFrame = {
      messageCode: L_DATA_IND,
      service,
      source: "15.15.255",
      ga: "31/7/255",
      priority: "urgent",
      hopCount: 7,
      size,
      data: [...data],
    };
    const enc = encodeCemi(f);
    // Length counts the APDU after the TPCI octet: APCI octet + data.
    expect(enc[8]).toBe(1 + size);
    expect(decodeCemi(enc)).toEqual(f);
  });

  it("skips additional information", () => {
    const f = decodeCemi(bytes("29 03 03 01 05 BC E0 11 02 08 03 01 00 81"));
    expect(f.ga).toBe("1/0/3");
    expect(f.data).toEqual([1]);
  });

  it.each([
    ["truncated", "11 00 B4 D0 11 FB 00 01 02 00 81"],
    ["too long", "11 00 B4 D0 11 FB 00 01 01 00 81 00"],
    ["not L_Data", "F0 00 B4 D0 11 FB 00 01 01 00 81"],
    ["individual destination", "11 00 B4 50 11 FB 00 01 01 00 81"],
    ["memory read (not a group service)", "11 00 B4 D0 11 FB 00 01 01 02 00"],
    ["numbered TPCI", "11 00 B4 D0 11 FB 00 01 01 40 81"],
    ["read with data", "11 00 B4 D0 11 FB 00 01 01 00 01"],
  ])("refuses a frame %s", (_, hex) => {
    expect(() => decodeCemi(bytes(hex))).toThrow(CemiError);
  });

  it("converts raw values and bytes", () => {
    expect(rawToData(0x0c33, 2)).toEqual([0x0c, 0x33]);
    expect(rawToData(0xfffffffe, 4)).toEqual([0xff, 0xff, 0xff, 0xfe]);
    expect(dataToRaw([0xff, 0xff, 0xff, 0xfe], 4)).toBe(0xfffffffe);
    expect(dataToRaw([0x21], 0)).toBe(0x21);
    expect(() => rawToData(1, 5)).toThrow(CemiError);
  });
});
