import * as THREE from "three";

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const lerp = (a, b, t) => a + (b - a) * t;

export const damp = (current, target, lambda, dt) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

export const rand = (min = 0, max = 1) => min + Math.random() * (max - min);

export const randInt = (min, max) => Math.floor(rand(min, max + 1));

export const choice = (items) => items[Math.floor(Math.random() * items.length)];

export function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function formatTime(seconds, withCentiseconds = false) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const base = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  if (!withCentiseconds) return base;
  return `${base}.${String(Math.floor((safe % 1) * 100)).padStart(2, "0")}`;
}

export function createCanvasTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  draw(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function setMeshShadow(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function disposeObject(object) {
  object.traverse((child) => {
    if (!child.isMesh && !child.isPoints && !child.isLine) return;
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

export function removeFromParent(object) {
  if (!object || !object.parent) return;
  object.parent.remove(object);
}

export function shortestAngle(from, to) {
  let delta = (to - from + Math.PI) % (Math.PI * 2);
  if (delta < 0) delta += Math.PI * 2;
  return delta - Math.PI;
}

export function dampAngle(current, target, lambda, dt) {
  return current + shortestAngle(current, target) * (1 - Math.exp(-lambda * dt));
}

export function pointInBox2D(x, z, box) {
  return x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;
}

export function segmentIntersectsBox2D(x1, z1, x2, z2, box, padding = 0) {
  const minX = box.minX - padding;
  const maxX = box.maxX + padding;
  const minZ = box.minZ - padding;
  const maxZ = box.maxZ + padding;

  const dx = x2 - x1;
  const dz = z2 - z1;
  let tMin = 0;
  let tMax = 1;

  for (const [origin, direction, min, max] of [
    [x1, dx, minX, maxX],
    [z1, dz, minZ, maxZ],
  ]) {
    if (Math.abs(direction) < 1e-8) {
      if (origin < min || origin > max) return false;
    } else {
      let t1 = (min - origin) / direction;
      let t2 = (max - origin) / direction;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }
  }

  return true;
}

export function makeRng(seed = 92817) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function countDown(value, dt) {
  return Math.max(0, value - dt);
}
