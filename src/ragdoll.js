export const RAGDOLL_BODIES = 8;
export const RAGDOLL_GIBS = 12;
export const RAGDOLL_GRAVITY = 22;

// Single rigid-body crumple: the whole corpse tips over ballistically and
// settles flat, instead of scattering into blocks.
export function stepRagdollBody(body, dt) {
  if (body.settled) {
    const ease = Math.min(1, 10 * dt);
    body.group.rotation.x += (body.lieX - body.group.rotation.x) * ease;
    body.group.rotation.z += (body.lieZ - body.group.rotation.z) * ease;
    return;
  }
  body.vel.y -= RAGDOLL_GRAVITY * dt;
  body.group.position.x += body.vel.x * dt;
  body.group.position.y += body.vel.y * dt;
  body.group.position.z += body.vel.z * dt;
  if (body.group.position.y <= body.restY) {
    body.group.position.y = body.restY;
    const impact = Math.abs(body.vel.y);
    if (body.vel.y < 0) body.vel.y *= -0.3;
    body.vel.x *= 0.55;
    body.vel.z *= 0.55;
    body.ang.x *= 0.5;
    body.ang.y *= 0.5;
    body.ang.z *= 0.5;
    if (impact < 3.5) body.settled = true;
  }
  body.group.rotation.x += body.ang.x * dt;
  body.group.rotation.y += body.ang.y * dt;
  body.group.rotation.z += body.ang.z * dt;
}

// Small gib chunk (head pop, debris): ballistic + ground bounce.
export function stepRagdollChunk(chunk, dt) {
  chunk.vy -= RAGDOLL_GRAVITY * dt;
  chunk.mesh.position.x += chunk.vx * dt;
  chunk.mesh.position.y += chunk.vy * dt;
  chunk.mesh.position.z += chunk.vz * dt;
  if (chunk.mesh.position.y < chunk.radius) {
    chunk.mesh.position.y = chunk.radius;
    if (chunk.vy < 0) chunk.vy *= -0.35;
    chunk.vx *= 0.6;
    chunk.vz *= 0.6;
    chunk.ax *= 0.55;
    chunk.ay *= 0.55;
    chunk.az *= 0.55;
  }
  chunk.mesh.rotation.x += chunk.ax * dt;
  chunk.mesh.rotation.y += chunk.ay * dt;
  chunk.mesh.rotation.z += chunk.az * dt;
}
