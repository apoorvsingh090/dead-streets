import * as THREE from "three";
import { loadPhoto, swapMap } from "./photo.js";

// Rooftop dressing: one landmark billboard and a few rooftop water towers.
// Street buildings are placed procedurally with random heights (see
// buildBuildings in street.js), so roof heights are discovered at build time
// by scanning the registered static meshes instead of being hard-coded.
// Call this AFTER buildBuildings(world) so the roofs exist.

const STREET_FACE = 10.75;

// Street buildings are BoxGeometry(depth, height, frontage) centered at
// |x| in [14.75, 17.25] with height in [11, 34]. Parapets (< 1.25m tall) and
// alley infill walls (|x| = 12.95) are filtered out by these bounds.
function findStreetBuildings(world) {
  const buildings = [];
  for (const mesh of world.shootables) {
    const geometry = mesh.geometry;
    if (!geometry || geometry.type !== "BoxGeometry") continue;
    const params = geometry.parameters;
    if (!params) continue;
    const height = params.height;
    if (height < 11 || height > 34.5) continue;
    const x = mesh.position.x;
    if (Math.abs(x) < 13.5 || Math.abs(x) > 18) continue;
    buildings.push({
      side: Math.sign(x) || 1,
      x,
      z: mesh.position.z,
      roofY: mesh.position.y + height / 2,
    });
  }
  return buildings;
}

// Early in the run: the positive-z half, closest to z = 66 (between the
// start at z = 99 and the first checkpoint at z = 53).
function pickBillboardSpot(buildings) {
  const positiveZ = buildings.filter((building) => building.z > 0);
  const pool = positiveZ.length > 0 ? positiveZ : buildings;
  if (pool.length === 0) return null;
  return pool.reduce((best, building) =>
    Math.abs(building.z - 66) < Math.abs(best.z - 66) ? building : best
  );
}

// Up to `count` distinct buildings in the positive-z half, spread along z.
function pickTowerSpots(buildings, billboardSpot, count) {
  const positiveZ = buildings.filter(
    (building) => building.z > 0 && building !== billboardSpot
  );
  const pool =
    positiveZ.length > 0
      ? positiveZ
      : buildings.filter((building) => building !== billboardSpot);
  const sorted = [...pool].sort((a, b) => b.z - a.z);
  if (sorted.length <= count) return sorted;
  const spots = [];
  for (let i = 0; i < count; i += 1) {
    const index = Math.round((i * (sorted.length - 1)) / (count - 1));
    spots.push(sorted[index]);
  }
  return spots;
}

function buildBillboard(world, { x, z, side, baseY, poleHeight, planeY }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const steelMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b3134,
    roughness: 0.42,
    metalness: 0.72,
  });

  for (const zOffset of [-2.8, 2.8]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, poleHeight, 10),
      steelMaterial
    );
    pole.position.set(0, baseY + poleHeight / 2, zOffset);
    pole.castShadow = true;
    group.add(pole);
  }

  // Basic material so the art reads at night; dimmed slightly. Single face,
  // no tiling.
  const billboardMaterial = new THREE.MeshBasicMaterial({ color: 0xbfc3c7 });
  swapMap(
    billboardMaterial,
    loadPhoto("billboard_ad.jpg", { repeat: [1, 1] }),
    0xbfc3c7
  );

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), billboardMaterial);
  plane.position.set(0, planeY, 0);
  plane.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  plane.castShadow = true;
  group.add(plane);

  // Dark backing so the plane is not see-through from behind.
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 4.15, 9.15),
    new THREE.MeshStandardMaterial({
      color: 0x14181a,
      roughness: 0.9,
      metalness: 0.1,
    })
  );
  backing.position.set(side * 0.16, planeY, 0);
  backing.castShadow = true;
  group.add(backing);

  world.scene.add(group);
  world.registerGroup(group, "metal");
}

function buildWaterTower(world, spot, tankMaterial, coneMaterial, legMaterial) {
  const group = new THREE.Group();
  group.position.set(spot.x, spot.roofY, spot.z);

  for (const dx of [-0.95, 0.95]) {
    for (const dz of [-0.95, 0.95]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 1.7, 0.18),
        legMaterial
      );
      leg.position.set(dx, 0.85, dz);
      leg.castShadow = true;
      group.add(leg);
    }
  }

  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 3, 18),
    tankMaterial
  );
  tank.position.set(0, 3.2, 0);
  tank.castShadow = true;
  group.add(tank);

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(1.78, 1.15, 18),
    coneMaterial
  );
  cone.position.set(0, 5.275, 0);
  cone.castShadow = true;
  group.add(cone);

  world.scene.add(group);
  world.registerGroup(group, "wood");
}

export function buildSkylineDressing(world) {
  const buildings = findStreetBuildings(world);

  // Shared tank material for all water towers; the photo wraps around.
  const tankMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0.05,
  });
  swapMap(
    tankMaterial,
    loadPhoto("watertower_wood.jpg", { repeat: [4, 1] }),
    0xffffff
  );

  const coneMaterial = new THREE.MeshStandardMaterial({
    color: 0x1b2023,
    roughness: 0.75,
    metalness: 0.3,
  });
  const legMaterial = new THREE.MeshStandardMaterial({
    color: 0x2e2419,
    roughness: 0.9,
    metalness: 0.05,
  });

  const billboardSpot = pickBillboardSpot(buildings);
  if (billboardSpot) {
    buildBillboard(world, {
      x: billboardSpot.x,
      z: billboardSpot.z,
      side: billboardSpot.side,
      baseY: billboardSpot.roofY,
      poleHeight: 5.2,
      planeY: billboardSpot.roofY + 7.2,
    });
  } else {
    // No building data (called before buildBuildings): self-supporting steel
    // structure on the +x side at z = 64. Poles rise from y = 8 so they
    // always overlap the facade; the plane sits above the maximum possible
    // roofline (~35.3m including parapet).
    buildBillboard(world, {
      x: STREET_FACE + 4.75,
      z: 64,
      side: 1,
      baseY: 8,
      poleHeight: 27.5,
      planeY: 37.5,
    });
  }

  let towerSpots = pickTowerSpots(buildings, billboardSpot, 3);
  if (towerSpots.length === 0) {
    // Fallback when no building data exists; roofY = 12 matches the minimum
    // building height, so towers may clip into taller buildings.
    towerSpots = [
      { x: -(STREET_FACE + 4.75), z: 78, roofY: 12 },
      { x: STREET_FACE + 4.75, z: 34, roofY: 12 },
      { x: -(STREET_FACE + 4.75), z: 12, roofY: 12 },
    ];
  }
  for (const spot of towerSpots) {
    buildWaterTower(world, spot, tankMaterial, coneMaterial, legMaterial);
  }
}
