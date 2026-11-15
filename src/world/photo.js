import * as THREE from "three";

const loader = new THREE.TextureLoader();
const base = import.meta.env?.BASE_URL ?? "/";

// Loads a photo texture for a PBR material. Resolves null on failure so the
// procedural/canvas material underneath keeps working.
export function loadPhoto(file, { repeat = [1, 1], offset = null, rotation = 0, srgb = true } = {}) {
  return new Promise((resolve) => {
    loader.load(
      `${base}textures/${file}`,
      (texture) => {
        if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeat[0], repeat[1]);
        if (offset) texture.offset.set(offset[0], offset[1]);
        if (rotation) {
          texture.center.set(0.5, 0.5);
          texture.rotation = rotation;
        }
        texture.anisotropy = 4;
        resolve(texture);
      },
      undefined,
      () => resolve(null)
    );
  });
}

// Swaps a photo map into an existing material once it arrives.
export function swapMap(material, promise, tint = null) {
  if (!material || !promise) return;
  promise.then((texture) => {
    if (!texture) return;
    material.map = texture;
    if (tint !== null && tint !== undefined) material.color.setHex(tint);
    material.needsUpdate = true;
  });
}
