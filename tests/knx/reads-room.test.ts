// readsRoom: the behaviors that read their room declare it, so that the designer can tell
// which room assignments act on the simulation.
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { STANDARD_MODEL } from "../../src/standard-model";

const dir = resolve(import.meta.dirname, "../../src/participants");

describe("readsRoom", () => {
  it("is declared by every behavior that reads its room, and only by them", () => {
    const readers = readdirSync(dir).filter((p) => {
      const file = resolve(dir, p, "behavior.ts");
      try {
        return /\breadRoom\(|\bonRoomChange\(/.test(readFileSync(file, "utf8"));
      } catch {
        return false;
      }
    });
    expect(readers.length).toBeGreaterThan(0);
    const declared = STANDARD_MODEL.flatMap((m) =>
      Object.entries(m.behaviors ?? {}),
    )
      .filter(([, b]) => b.readsRoom)
      .map(([id]) => id);
    // Directory names in kebab case, behavior IDs in camel case with a version.
    const camel = (p: string) =>
      p.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
    expect(declared.map((id) => id.split("/")[0]).sort()).toEqual(
      readers.map(camel).sort(),
    );
  });
});
