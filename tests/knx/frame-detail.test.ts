// Detail of a TP1 frame: sub-fields of each octet, serial characters, check octet, timing,
// and the routing counter on each segment (KNX Standard 03_02_02).
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../src/core";
import {
  checksumDetail,
  frameOctets,
  frameTiming,
  segmentFrames,
  serialCharacter,
} from "../../src/knx/frame-detail";
import { busPath, logicPath } from "../../src/ui/telegram-details";
import { raw } from "./helpers";

const write = (rc = 6) =>
  frameOctets({
    source: "1.1.1",
    ga: "1/1/1",
    service: "GroupValueWrite",
    dpt: "1.001",
    value: 1,
    priority: "low",
    rc,
  });

describe("frame octets", () => {
  it("a switching write from 1.1.1 to 1/1/1", () => {
    const o = write();
    expect(o.map((x) => x.value)).toEqual([
      0xbc, 0x11, 0x01, 0x09, 0x01, 0xe1, 0x00, 0x81, 0x3b,
    ]);
    expect(o.map((x) => x.field)).toEqual([
      "control",
      "source",
      "source",
      "destination",
      "destination",
      "routing",
      "apdu",
      "apdu",
      "checksum",
    ]);
  });

  it("sub-fields: priority, address parts, routing counter, length, APCI, short data", () => {
    const o = write();
    const sub = (i: number, name: string) =>
      o[i]!.subFields.find((s) => s.name === name)!;
    expect(sub(0, "Priority").meaning).toBe("low");
    expect(sub(0, "Repetition").meaning).toBe("not repeated");
    expect(sub(1, "Area").value).toBe(1);
    expect(sub(1, "Line").value).toBe(1);
    expect(sub(3, "Main group").value).toBe(1);
    expect(sub(3, "Middle group").value).toBe(1);
    expect(sub(5, "Routing counter").value).toBe(6);
    expect(sub(5, "Length").value).toBe(1);
    expect(sub(7, "APCI (low bits)").meaning).toBe("GroupValueWrite");
    expect(sub(7, "Data").value).toBe(1);
  });

  it("the routing counter changes the routing octet and the check octet", () => {
    const a = write(6);
    const b = write(5);
    expect(b[5]!.value).toBe(0xd1);
    expect(b[8]!.value).not.toBe(a[8]!.value);
  });

  it("a two-octet value follows the APCI octet in its own octets", () => {
    const o = frameOctets({
      source: "1.1.1",
      ga: "3/4/1",
      service: "GroupValueWrite",
      dpt: "9.001",
      value: 21,
      priority: "low",
      rc: 6,
    });
    expect(o).toHaveLength(11);
    expect(o[5]!.subFields.find((s) => s.name === "Length")!.value).toBe(3);
    expect(o.slice(8, 10).every((x) => x.field === "data")).toBe(true);
  });
});

describe("serial characters", () => {
  it("start bit, data least significant bit first, even parity, stop bit", () => {
    const c = serialCharacter(0xbc); // 1011 1100: five 1
    expect(c.bits).toEqual([0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1]);
    expect(c.bits.slice(1, 10).filter((b) => b).length % 2).toBe(0);
    expect(serialCharacter(0x81).parity).toBe(0);
  });
});

describe("check octet", () => {
  it("each bit column, check octet included, holds an odd number of 1", () => {
    const frame = write().map((x) => x.value);
    const d = checksumDetail(frame);
    expect(d.check).toBe(frame[frame.length - 1]);
    d.ones.forEach((n, col) => {
      const bit = (d.check >> (7 - col)) & 1;
      expect((n + bit) % 2).toBe(1);
    });
    expect(d.running).toHaveLength(frame.length - 1);
    expect(d.check).toBe(~d.running[d.running.length - 1]! & 0xff);
  });
});

describe("timing", () => {
  it("a switching telegram and its acknowledgement take about 20 ms", () => {
    const tm = frameTiming(9, "low");
    expect(tm.frameBits).toBe(8 * 13 + 11);
    const total = tm.idleBits + tm.frameBits + tm.ackPauseBits + tm.ackBits;
    expect((total * tm.bitUs) / 1000).toBeCloseTo(20.2, 1);
    expect(frameTiming(9, "urgent").idleBits).toBe(50);
  });
});

describe("routing counter per segment", () => {
  it("decreases at each coupler crossed", () => {
    const sim = createSimulator(raw("full-topology.json"));
    const tel = sim.groupWrite("p1", "2/1/1", 1)!;
    const segs = segmentFrames(tel.plan, sim.network.topology);
    expect(segs[0]).toMatchObject({ segId: "L1.1", rc: 6 });
    const far = segs.find((s) => s.segId === "L2.1b")!;
    expect(far.rc).toBeLessThan(6);
    expect(segs.every((s) => s.rc >= 0 && s.rc <= 6)).toBe(true);
  });
});

describe("TP1 signal drawing", () => {
  // Parses an SVG path made of M and L commands into its points.
  const points = (d: string) =>
    [...d.matchAll(/([ML])([-\d.]+),([-\d.]+)/g)].map((m) => ({
      cmd: m[1],
      x: Number(m[2]),
      y: Number(m[3]),
    }));
  const runs = [
    { x: 0, bits: [1, 1, 1] }, // idle bus
    { x: 30, bits: serialCharacter(0xbc).bits },
    { x: 140, bits: [1, 1] }, // idle bits between characters
    { x: 160, bits: serialCharacter(0x11).bits },
  ];

  it("draws the logical lane as one unbroken line, with every edge vertical", () => {
    const p = points(logicPath(runs, 10, 0, 20));
    expect(p.filter((q) => q.cmd === "M")).toHaveLength(1);
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1]!;
      const b = p[i]!;
      // Each step is horizontal or vertical: no jump, no slanted segment.
      expect(a.x === b.x || a.y === b.y).toBe(true);
      expect(b.x).toBeGreaterThanOrEqual(a.x);
    }
    // The fall from the idle bus to the first start bit is drawn.
    expect(p).toContainEqual({ cmd: "L", x: 30, y: 0 });
    expect(p).toContainEqual({ cmd: "L", x: 30, y: 20 });
  });

  it("draws the bus voltage as one line that rests at the DC level for each 1", () => {
    const yDc = 50;
    const d = busPath(runs, 10, yDc, 20, 10);
    const p = points(d);
    expect(p.filter((q) => q.cmd === "M")).toHaveLength(1);
    for (let i = 1; i < p.length; i++)
      expect(p[i]!.x).toBeGreaterThanOrEqual(p[i - 1]!.x - 1e-9);
    // At every bit boundary the voltage is back at the DC level.
    for (const run of runs)
      run.bits.forEach((_, k) =>
        expect(p).toContainEqual({ cmd: "L", x: run.x + (k + 1) * 10, y: yDc }),
      );
    // A 0 drops for 35 µs out of 104, then rises above the DC level.
    const active = (35 / 104) * 10;
    expect(p).toContainEqual({ cmd: "L", x: 30 + active, y: yDc + 20 });
    expect(p).toContainEqual({ cmd: "L", x: 30 + active, y: yDc - 10 });
    // The equalisation decays: each sample is closer to the DC level than the one before.
    const eq = p.filter((q) => q.x > 30 + active && q.x < 40).map((q) => yDc - q.y);
    for (let i = 1; i < eq.length; i++) expect(eq[i]!).toBeLessThan(eq[i - 1]!);
  });
});
