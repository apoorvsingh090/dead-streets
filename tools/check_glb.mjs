import { readFileSync } from "fs";
import { Box3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
for (const id of ["rifle", "shotgun", "pistol"]) {
  const buf = readFileSync(`public/models/${id}.glb`);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  await new Promise((resolve, reject) => {
    loader.parse(
      ab,
      "",
      (gltf) => {
        gltf.scene.updateWorldMatrix(true, true);
        const box = new Box3().setFromObject(gltf.scene);
        const fmt = (v) => v.toArray().map((n) => n.toFixed(3)).join(",");
        const mats = new Set();
        gltf.scene.traverse((o) => {
          if (o.isMesh) for (const m of o.material.length ? o.material : [o.material]) mats.add(m.name);
        });
        console.log(id, "bbox min", fmt(box.min), "max", fmt(box.max), "materials:", [...mats].join("|"));
        resolve();
      },
      reject
    );
  });
}
