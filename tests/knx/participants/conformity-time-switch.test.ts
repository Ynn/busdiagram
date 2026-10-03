// Time switch: temporary and permanent override, as on the time switches of the catalogue.
// The clock of the example starts on Monday at 21:57, 60 times faster than real time:
// one simulated second is one clock minute.
import { describe, expect, it } from "vitest";
import { device, example, setParams, write } from "./conformity-kit";

const T = "timeSwitch";
const timeSwitch = (program: string, params: Record<string, unknown> = {}) =>
  example("time-schedule.json", (doc) => {
    setParams(doc, T, { program, ...params });
    device(doc, T).objects.push(
      {
        id: "ovr",
        name: "Override",
        ga: "6/1/8",
        dpt: "1.001",
        port: "override",
        flags: { W: true, T: false },
      },
      {
        id: "timed",
        name: "Timed override",
        ga: "6/1/7",
        dpt: "1.001",
        port: "overrideTimed",
        flags: { W: true, T: false },
      },
      {
        id: "perm",
        name: "Permanent override",
        ga: "6/1/9",
        dpt: "1.001",
        port: "overridePermanent",
        flags: { W: true, T: false },
      },
    );
  });
const out = (sim: ReturnType<typeof timeSwitch>) => sim.objectValue(T, "out");

// The example settles for 3 s (22:00) before the tests act; the clock master of the
// example sends every second, so a telegram of the tool arrives about 2.3 s later.
describe("time switch: override", () => {
  it("an override holds until the next switching point", () => {
    const sim = timeSwitch("Mon-Sun 22:00 = 1; Mon-Sun 22:05 = 1");
    write(sim, "6/1/8", 0); // about 22:03
    expect(out(sim)).toBe(0);
    expect(sim.deviceState(T).overridden).toBe(true);
    sim.advance(3000); // past 22:05
    expect(out(sim)).toBe(1);
    expect(sim.deviceState(T).overridden).toBe(false);
  });

  it("a permanent override suspends the program, and its end applies it again", () => {
    // The program value at start is 1 (22:09 the day before).
    const sim = timeSwitch("Mon-Sun 22:04 = 0; Mon-Sun 22:09 = 1");
    write(sim, "6/1/9", 1); // received about 22:02
    sim.advance(2000); // past 22:04: ignored
    expect(out(sim)).toBe(1);
    expect(sim.deviceState(T).suspended).toBe(true);
    write(sim, "6/1/9", 0); // received about 22:07: the value of 22:04 applies
    expect(out(sim)).toBe(0);
    expect(sim.deviceState(T).suspended).toBe(false);
  });

  it("a timed override holds for its duration, switching points included", () => {
    // 15 clock minutes = 15 s; the switching point at 22:06 is held.
    const sim = timeSwitch("Mon-Sun 22:00 = 1; Mon-Sun 22:06 = 1", {
      overrideDurationMin: 15,
    });
    write(sim, "6/1/7", 0); // received about 22:02
    sim.advance(6000); // past 22:06
    expect(out(sim)).toBe(0);
    expect(sim.deviceState(T).overridden).toBe(true);
    sim.advance(10000); // past 22:17: the program value (1) applies
    expect(out(sim)).toBe(1);
    expect(sim.deviceState(T).overridden).toBe(false);
  });
});
