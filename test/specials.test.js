import { describe, it, expect } from "vitest";
import { specialsFor } from "../src/director.js";

const WAVE_TWO = { id: 2, specials: [{ at: 6.5, type: "spitter" }] };
const WAVE_ONE = { id: 1, specials: [] };

describe("specialsFor", () => {
  it("adds a late second spitter on nightmare wave 2", () => {
    expect(specialsFor(WAVE_TWO, "nightmare")).toEqual([
      { at: 6.5, type: "spitter" },
      { at: 30, type: "spitter" },
    ]);
  });

  it("leaves other tiers and wave 1 alone", () => {
    expect(specialsFor(WAVE_TWO, "survivor")).toEqual([{ at: 6.5, type: "spitter" }]);
    expect(specialsFor(WAVE_TWO, "civilian")).toEqual([{ at: 6.5, type: "spitter" }]);
    expect(specialsFor(WAVE_ONE, "nightmare")).toEqual([]);
  });

  it("does not mutate the wave def", () => {
    specialsFor(WAVE_TWO, "nightmare");
    expect(WAVE_TWO.specials).toEqual([{ at: 6.5, type: "spitter" }]);
  });
});
