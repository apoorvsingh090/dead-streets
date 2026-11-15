import { describe, it, expect } from "vitest";
import { damageFalloff } from "../src/combat.js";

describe("damageFalloff", () => {
  it("deals full damage inside 40% of range", () => {
    expect(damageFalloff(10, 120, "rifle")).toBe(1);
    expect(damageFalloff(48, 120, "rifle")).toBe(1);
    expect(damageFalloff(25.6, 64, "shotgun")).toBe(1);
  });

  it("decays to the floor at max range", () => {
    expect(damageFalloff(120, 120, "rifle")).toBeCloseTo(0.55, 5);
    expect(damageFalloff(64, 64, "shotgun")).toBeCloseTo(0.2, 5);
    expect(damageFalloff(92, 92, "pistol")).toBeCloseTo(0.45, 5);
  });

  it("shotgun falls off harder than rifle mid-range", () => {
    const mid = (range) => range * 0.7;
    expect(damageFalloff(mid(64), 64, "shotgun")).toBeLessThan(
      damageFalloff(mid(120), 120, "rifle")
    );
  });

  it("is monotonic decreasing past the knee", () => {
    let prev = 1;
    for (let d = 49; d <= 120; d += 7) {
      const v = damageFalloff(d, 120, "rifle");
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });

  it("handles garbage input without NaN", () => {
    expect(damageFalloff(0, 120, "rifle")).toBe(1);
    expect(damageFalloff(-5, 120, "rifle")).toBe(1);
    expect(damageFalloff(50, 0, "rifle")).toBe(1);
  });
});
