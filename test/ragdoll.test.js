import { describe, it, expect } from "vitest";
import { stepRagdollBody, stepRagdollChunk, RAGDOLL_GRAVITY, RAGDOLL_BODIES, RAGDOLL_GIBS } from "../src/ragdoll.js";

function makeBody(overrides = {}) {
  return {
    group: { position: { x: 0, y: 2, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    vel: { x: 1, y: 0, z: 0 },
    ang: { x: 2, y: 0, z: 0 },
    lieX: -Math.PI / 2,
    lieZ: 0,
    restY: 0.2,
    settled: false,
    life: 9,
    ...overrides,
  };
}

function makeChunk(overrides = {}) {
  return {
    mesh: { position: { x: 0, y: 2, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    vx: 1, vy: 0, vz: 0, ax: 2, ay: 0, az: 0,
    radius: 0.2, life: 7,
    ...overrides,
  };
}

describe("stepRagdollBody", () => {
  it("falls and settles flat on soft landings", () => {
    const body = makeBody({ group: { position: { x: 0, y: 0.3, z: 0 }, rotation: { x: 0.5, y: 0, z: 0 } }, vel: { x: 0, y: -0.5, z: 0 } });
    stepRagdollBody(body, 0.1);
    expect(body.settled).toBe(true);
    const before = body.group.rotation.x;
    stepRagdollBody(body, 0.1);
    expect(body.group.rotation.x).toBeLessThan(before);
  });

  it("bounces instead of settling on hard impacts", () => {
    const body = makeBody({ group: { position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, vel: { x: 0, y: -10, z: 0 } });
    stepRagdollBody(body, 0.1);
    expect(body.settled).toBe(false);
    expect(body.group.position.y).toBe(body.restY);
    expect(body.vel.y).toBeGreaterThan(0);
  });

  it("caps concurrent bodies and gibs", () => {
    expect(RAGDOLL_BODIES).toBe(8);
    expect(RAGDOLL_GIBS).toBe(12);
  });
});

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
});
