import { describe, it, expect } from "vitest";
import { shapeAxis, lookDelta, moveIntent, LOOK_RATE, STICK_DEADZONE } from "../src/gamepad.js";

describe("shapeAxis", () => {
  it("returns zero inside the deadzone", () => {
    expect(shapeAxis(0)).toBe(0);
    expect(shapeAxis(STICK_DEADZONE)).toBe(0);
    expect(shapeAxis(-STICK_DEADZONE)).toBe(0);
  });

  it("saturates at full tilt preserving sign", () => {
    expect(shapeAxis(1)).toBeCloseTo(1, 5);
    expect(shapeAxis(-1)).toBeCloseTo(-1, 5);
  });

  it("responds quadratically past the deadzone", () => {
    const half = (1 + STICK_DEADZONE) / 2;
    expect(shapeAxis(half)).toBeCloseTo(0.25, 5);
  });
});

describe("lookDelta", () => {
  it("scales full tilt to the look rate", () => {
    expect(lookDelta(1, 1)).toBeCloseTo(LOOK_RATE, 5);
    expect(lookDelta(-1, 0.5)).toBeCloseTo(-LOOK_RATE * 0.5, 5);
  });

  it("is zero without deflection", () => {
    expect(lookDelta(0, 1 / 60)).toBe(0);
  });
});

describe("moveIntent", () => {
  it("maps stick directions to digital intent", () => {
    const intent = moveIntent(0, -1);
    expect(intent.forward).toBe(true);
    expect(intent.back).toBe(false);
    expect(intent.sprint).toBe(true);
  });

  it("is neutral at rest", () => {
    const intent = moveIntent(0, 0);
    expect(intent.forward).toBe(false);
    expect(intent.sprint).toBe(false);
    expect(intent.magnitude).toBe(0);
  });
});
