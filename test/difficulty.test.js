import { describe, it, expect } from "vitest";
import { DIFFICULTIES } from "../src/difficulty.js";

describe("DIFFICULTIES", () => {
  it("defines three ordered tiers with sane scales", () => {
    const order = ["civilian", "survivor", "nightmare"];
    expect(Object.keys(DIFFICULTIES)).toEqual(order);
    for (const id of order) {
      const d = DIFFICULTIES[id];
      expect(d.healthScale).toBeGreaterThan(0);
      expect(d.speedScale).toBeGreaterThan(0);
      expect(d.spawnScale).toBeGreaterThan(0);
    }
  });

  it("ramps health and density upward", () => {
    const { civilian, survivor, nightmare } = DIFFICULTIES;
    expect(civilian.healthScale).toBeLessThan(survivor.healthScale);
    expect(survivor.healthScale).toBeLessThan(nightmare.healthScale);
    expect(nightmare.spawnScale).toBeLessThan(survivor.spawnScale);
  });
});
