export const RAGDOLL_BURSTS = 6;
export const RAGDOLL_GRAVITY = 22;

// Advances one ragdoll chunk a step (mutates chunk + mesh transform).
// Ground plane at y = chunk.radius with a dead bounce and friction.
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
