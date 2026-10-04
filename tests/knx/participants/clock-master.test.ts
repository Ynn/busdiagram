// clockMaster/v1: a read gets the clock at that moment (KNX Standard 07_01_01: the Time
// output carries the time of the local clock at the time of transmission; a read gives a
// slave the master clock at once), while broadcasts keep their period.
import { describe, expect, it } from "vitest";
import { createSimulator } from "../../../src/core";

const DAY = 86400;
const SUNDAY = 7;

function clock(start: string) {
  return createSimulator({
    formatVersion: 2,
    title: "Clock",
    lines: [{ address: "1.1" }],
    clock: { start, speed: 1 },
    groupAddresses: [
      { address: "0/7/1", name: "Time", dpt: "10.001" },
      { address: "0/7/2", name: "Date", dpt: "11.001" },
    ],
    devices: [
      {
        id: "clock",
        address: "1.1.1",
        kind: "clock",
        behavior: "clockMaster/v1",
        parameters: { sendPeriodMin: 10, sendOnStart: false },
        objects: [
          {
            id: "time",
            port: "time",
            ga: "0/7/1",
            dpt: "10.001",
            flags: { W: false, T: true, R: true },
          },
          {
            id: "date",
            port: "date",
            ga: "0/7/2",
            dpt: "11.001",
            flags: { W: false, T: true, R: true },
          },
        ],
      },
      {
        id: "usb",
        address: "1.1.2",
        kind: "generic",
        behavior: "usbInterface/v1",
        objects: [],
      },
    ],
  });
}

const responses = (sim: ReturnType<typeof clock>, ga: string) =>
  sim.history.filter((t) => t.ga === ga && t.service === "GroupValueResponse");

describe("clock master", () => {
  it("a read between two broadcasts gets the current time, not the last broadcast", () => {
    const sim = clock("2026-10-04T12:00:00");
    sim.advance(5 * 60_000);
    // One broadcast so far, at 12:00:30.
    const writes = sim.history.filter(
      (t) => t.ga === "0/7/1" && t.service === "GroupValueWrite",
    );
    expect(writes.map((t) => t.value)).toEqual([SUNDAY * DAY + 12 * 3600 + 30]);
    sim.groupRead("usb", "0/7/1");
    sim.advance(3000);
    const [r] = responses(sim, "0/7/1");
    const at = SUNDAY * DAY + 12 * 3600 + 5 * 60;
    expect(r!.value).toBeGreaterThanOrEqual(at);
    expect(r!.value).toBeLessThan(at + 5);
    // The period of the broadcasts is unchanged: the next one at 12:10:30.
    sim.advance(6 * 60_000);
    expect(
      sim.history
        .filter((t) => t.ga === "0/7/1" && t.service === "GroupValueWrite")
        .map((t) => t.value),
    ).toEqual([SUNDAY * DAY + 12 * 3600 + 30, SUNDAY * DAY + 12 * 3600 + 630]);
  });

  it("a read after midnight gets the new date", () => {
    const sim = clock("2026-10-04T23:59:00");
    // 00:00:10, Monday 5 October, before the broadcast of 00:00:30.
    sim.advance(70_000);
    expect(sim.history.filter((t) => t.ga === "0/7/2")).toEqual([]);
    sim.groupRead("usb", "0/7/2");
    sim.advance(3000);
    expect(responses(sim, "0/7/2").map((t) => t.value)).toEqual([20261005]);
  });
});
