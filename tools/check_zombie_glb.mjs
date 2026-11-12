import { readFileSync } from "fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const buf = readFileSync("public/models/zombie.glb");
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
new GLTFLoader().parse(
  ab,
  "",
  (gltf) => {
    console.log("animations:", gltf.animations.map((a) => `${a.name}(${a.tracks.length}t, ${a.duration.toFixed(2)}s)`));
    let meshCount = 0;
    let skinned = null;
    gltf.scene.traverse((o) => {
      if (o.isMesh) {
        meshCount += 1;
        if (o.isSkinnedMesh) skinned = o;
      }
    });
    console.log("meshes:", meshCount, "skinned:", !!skinned);
    if (skinned) {
      console.log("bones:", skinned.skeleton.bones.length, "bone[0]:", skinned.skeleton.bones[0]?.name);
    }
  },
  (err) => {
    console.error("parse failed:", err);
    process.exit(1);
  }
);
