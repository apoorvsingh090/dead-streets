import { describe, it, expect } from "vitest";
import { segmentIntersectsBox2D, clamp, lerp, shortestAngle } from "../src/utils.js";

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
