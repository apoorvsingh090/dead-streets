import { describe, it, expect } from "vitest";
import { stepRagdollChunk, RAGDOLL_GRAVITY, RAGDOLL_BURSTS } from "../src/ragdoll.js";

function makeChunk(overrides = {}) {
  return {
    mesh: {
      position: { x: 0, y: 2, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    vx: 1,
    vy: 0,
    vz: 0,
    ax: 2,
    ay: 0,
    az: 0,
    radius: 0.2,
    life: 7,
    ...overrides,
  };
}

describe("stepRagdollChunk", () => {
  it("applies gravity to vertical velocity", () => {
    const chunk = makeChunk();
    stepRagdollChunk(chunk, 0.1);
    expect(chunk.vy).toBeCloseTo(-RAGDOLL_GRAVITY * 0.1, 5);
    expect(chunk.mesh.position.y).toBeLessThan(2);
  });

  it("bounces off the ground and damps motion", () => {
    const chunk = makeChunk({ mesh: { position: { x: 0, y: 0.25, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, vy: -5, vx: 2 });
    stepRagdollChunk(chunk, 0.1);
    expect(chunk.mesh.position.y).toBe(chunk.radius);
    expect(chunk.vy).toBeGreaterThan(0);
    expect(Math.abs(chunk.vx)).toBeLessThan(2);
  });

  it("never sinks below its radius", () => {
    const chunk = makeChunk({ mesh: { position: { x: 0, y: 0.21, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, vy: -20 });
    for (let i = 0; i < 30; i += 1) stepRagdollChunk(chunk, 1 / 60);
    expect(chunk.mesh.position.y).toBeGreaterThanOrEqual(chunk.radius - 1e-9);
  });

  it("spins chunks by angular velocity", () => {
    const chunk = makeChunk();
    stepRagdollChunk(chunk, 0.25);
    expect(chunk.mesh.rotation.x).toBeCloseTo(0.5, 5);
  });

  it("caps concurrent bursts", () => {
    expect(RAGDOLL_BURSTS).toBe(6);
  });
});
