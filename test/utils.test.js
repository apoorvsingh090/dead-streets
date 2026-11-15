import { describe, it, expect } from "vitest";
import {
  segmentIntersectsBox2D,
  clamp,
  lerp,
  shortestAngle,
  smoothstep,
  formatTime,
  dampAngle,
  pointInBox2D,
  makeRng,
  countDown,
} from "../src/utils.js";

describe("segmentIntersectsBox2D", () => {
  const box = { minX: 0, minZ: 0, maxX: 2, maxZ: 2 };

  it("detects a segment that crosses the box", () => {
    expect(segmentIntersectsBox2D(-1, 1, 3, 1, box)).toBe(true);
  });

  it("detects a segment starting inside the box", () => {
    expect(segmentIntersectsBox2D(1, 1, 5, 5, box)).toBe(true);
  });

  it("rejects a segment fully outside", () => {
    expect(segmentIntersectsBox2D(-1, -1, -3, -3, box)).toBe(false);
  });

  it("rejects a parallel segment outside the slab", () => {
    expect(segmentIntersectsBox2D(0.5, 5, 1.5, 5, box)).toBe(false);
  });

  it("hits the boundary edge", () => {
    expect(segmentIntersectsBox2D(-1, 2, 3, 2, box)).toBe(true);
  });

  it("honours padding", () => {
    expect(segmentIntersectsBox2D(-1, 1, -0.5, 1, box, 0.1)).toBe(false);
    expect(segmentIntersectsBox2D(-1, 1, -0.5, 1, box, 1)).toBe(true);
  });
});

describe("math helpers", () => {
  it("clamp bounds", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-5, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  it("lerp interpolates", () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it("shortestAngle wraps to [-pi, pi]", () => {
    expect(shortestAngle(0, Math.PI * 1.5)).toBeCloseTo(-Math.PI * 0.5, 5);
    expect(shortestAngle(Math.PI * 1.9, Math.PI * 0.1)).toBeCloseTo(Math.PI * 0.2, 5);
  });
});

describe("smoothstep", () => {
  it("clamps outside the edge range", () => {
    expect(smoothstep(0, 1, -2)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
  });

  it("passes through 0, 0.5 and 1", () => {
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 5);
    expect(smoothstep(0, 1, 1)).toBe(1);
  });
});

describe("formatTime", () => {
  it("formats minutes and seconds with padding", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(65)).toBe("01:05");
    expect(formatTime(600)).toBe("10:00");
  });

  it("clamps negatives and floors fractions", () => {
    expect(formatTime(-5)).toBe("00:00");
    expect(formatTime(9.9)).toBe("00:09");
  });

  it("optionally appends centiseconds", () => {
    expect(formatTime(65.237)).toBe("01:05");
    expect(formatTime(65.237, true)).toBe("01:05.23");
  });
});

describe("dampAngle", () => {
  it("moves toward the target along the short arc", () => {
    const start = 0;
    const target = Math.PI / 2;
    const next = dampAngle(start, target, 4, 0.016);
    expect(next).toBeGreaterThan(start);
    expect(next).toBeLessThan(target);
  });

  it("converges close to the target over a second", () => {
    let angle = 0;
    for (let i = 0; i < 60; i += 1) angle = dampAngle(angle, 1.5, 6, 1 / 60);
    expect(angle).toBeCloseTo(1.5, 2);
  });
});

describe("pointInBox2D", () => {
  const box = { minX: 0, minZ: 0, maxX: 2, maxZ: 2 };

  it("accepts interior and boundary points", () => {
    expect(pointInBox2D(1, 1, box)).toBe(true);
    expect(pointInBox2D(0, 2, box)).toBe(true);
  });

  it("rejects exterior points", () => {
    expect(pointInBox2D(-0.1, 1, box)).toBe(false);
    expect(pointInBox2D(1, 2.1, box)).toBe(false);
  });
});

describe("makeRng", () => {
  it("is deterministic per seed and varies across calls", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const first = a();
    expect(b()).toBe(first);
    expect(a()).not.toBe(first);
  });

  it("stays in [0, 1)", () => {
    const rng = makeRng(7);
    for (let i = 0; i < 100; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("countDown", () => {
  it("decrements but never goes negative", () => {
    expect(countDown(1, 0.4)).toBeCloseTo(0.6, 9);
    expect(countDown(0.2, 0.5)).toBe(0);
    expect(countDown(0, 1)).toBe(0);
  });
});
