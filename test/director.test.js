import { describe, it, expect } from "vitest";
import { applyDifficultyMix } from "../src/director.js";

const TABLE = [
  ["walker", 0.7],
  ["runner", 0.3],
];

describe("applyDifficultyMix", () => {
  it("leaves survivor untouched", () => {
    expect(applyDifficultyMix(TABLE, "survivor")).toEqual(TABLE);
  });

  it("adds runners on nightmare and trims walkers", () => {
    const mixed = applyDifficultyMix(TABLE, "nightmare");
    const runner = mixed.find(([type]) => type === "runner")[1];
    const walker = mixed.find(([type]) => type === "walker")[1];
    expect(runner).toBeCloseTo(0.4, 5);
    expect(walker).toBeCloseTo(0.6, 5);
  });

  it("eases runners down on civilian", () => {
    const mixed = applyDifficultyMix(TABLE, "civilian");
    const runner = mixed.find(([type]) => type === "runner")[1];
    expect(runner).toBeCloseTo(0.25, 5);
  });

  it("does not mutate the input table", () => {
    applyDifficultyMix(TABLE, "nightmare");
    expect(TABLE).toEqual([
      ["walker", 0.7],
      ["runner", 0.3],
    ]);
  });
});
