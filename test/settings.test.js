import { describe, it, expect } from "vitest";
import { isBetterRun, formatBestLine, loadBool } from "../src/settings.js";

describe("isBetterRun", () => {
  it("prefers wins over losses", () => {
    expect(isBetterRun({ victory: true, kills: 1, time: 10 }, { victory: false, kills: 99, time: 999 })).toBe(true);
    expect(isBetterRun({ victory: false, kills: 99, time: 999 }, { victory: true, kills: 1, time: 10 })).toBe(false);
  });

  it("prefers more kills, then longer survival", () => {
    expect(isBetterRun({ victory: false, kills: 5, time: 10 }, { victory: false, kills: 4, time: 100 })).toBe(true);
    expect(isBetterRun({ victory: false, kills: 4, time: 100 }, { victory: false, kills: 5, time: 10 })).toBe(false);
    expect(isBetterRun({ victory: true, kills: 5, time: 100 }, { victory: true, kills: 5, time: 90 })).toBe(true);
  });

  it("does not crown exact ties", () => {
    const run = { victory: true, kills: 5, time: 100 };
    expect(isBetterRun(run, { ...run })).toBe(false);
  });

  it("any run beats no best", () => {
    expect(isBetterRun({ victory: false, kills: 0, time: 1 }, null)).toBe(true);
  });
});

describe("formatBestLine", () => {
  it("returns empty for no best", () => {
    expect(formatBestLine(null)).toBe("");
  });

  it("formats a best line", () => {
    expect(formatBestLine({ victory: true, kills: 42, time: 125, difficulty: "nightmare" })).toBe(
      "BEST EXTRACTED — 42 KILLS IN 2:05 (NIGHTMARE)"
    );
  });

  it("sanitizes legacy or corrupt bests", () => {
    expect(formatBestLine({ victory: false, kills: 3, time: NaN })).toBe(
      "BEST FELL — 3 KILLS IN 0:00 (SURVIVOR)"
    );
  });
});

describe("loadBool", () => {
  it("defaults to false without storage", () => {
    expect(loadBool("dead-streets:reduce-flash")).toBe(false);
  });
});
