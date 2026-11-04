import * as THREE from "three";
import { rand, randInt, choice, createCanvasTexture } from "../utils.js";
import { makeSignTexture } from "./textures.js";

const STREET_FACE = 10.75;

export function buildStreet(world) {
  const { scene } = world;

  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(21.6, 228),
    world.materials.asphalt
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set(0, 0, -1);
  asphalt.receiveShadow = true;
  scene.add(asphalt);
  world.registerStatic(asphalt, "concrete");

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(15.1, 228),
    new THREE.MeshStandardMaterial({ color: 0x202426, roughness: 0.62, metalness: 0.22 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.012, -1);
  road.receiveShadow = true;
  scene.add(road);
  world.registerStatic(road, "concrete");

  for (const side of [-1, 1]) {
    const sidewalk = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 0.12, 228),
      world.materials.sidewalk
    );
    sidewalk.position.set(side * 9.28, 0.06, -1);
    sidewalk.receiveShadow = true;
    scene.add(sidewalk);
    world.registerStatic(sidewalk, "concrete");

    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.18, 228),
      world.materials.curb
    );
    curb.position.set(side * 7.58, 0.09, -1);
    scene.add(curb);
    world.registerStatic(curb, "concrete");
  }

  for (let z = -97; z < 100; z += 7.4) {
    const mark = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.014, 2.8),
      world.materials.line
    );
    mark.position.set(0, 0.022, z);
    scene.add(mark);
    world.registerStatic(mark, "concrete");
  }

  for (let x = -6; x <= 6; x += 1.45) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.014, 4.4),
      world.materials.line
    );
    stripe.position.set(x, 0.024, 6.6);
    scene.add(stripe);
    world.registerStatic(stripe, "concrete");
  }

  const manholeGeometry = new THREE.CylinderGeometry(0.62, 0.62, 0.035, 20);
  const manholeMaterial = new THREE.MeshStandardMaterial({
    color: 0x161a1a,
    roughness: 0.5,
    metalness: 0.72,
  });
  for (const [x, z] of [
    [1.8, 74],
    [-2.2, 27],
    [2.9, -37],
    [-1.4, -86],
  ]) {
    const manhole = new THREE.Mesh(manholeGeometry, manholeMaterial);
    manhole.position.set(x, 0.026, z);
    scene.add(manhole);
    world.registerStatic(manhole, "metal");
  }

  const puddleMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b1518,
    roughness: 0.08,
    metalness: 0.68,
    transparent: true,
    opacity: 0.7,
  });
  for (let i = 0; i < 14; i += 1) {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(rand(0.8, 2.6), 20), puddleMaterial);
    puddle.rotation.x = -Math.PI / 2;
    puddle.rotation.z = rand(0, Math.PI);
    puddle.scale.y = rand(0.35, 0.85);
    puddle.position.set(rand(-7, 7), 0.027, rand(-98, 100));
    scene.add(puddle);
    world.registerStatic(puddle, "concrete");
  }
}

export function buildBuildings(world) {
  for (const side of [-1, 1]) {
    let cursor = 109;
    while (cursor > -112) {
      const frontage = rand(14, 22);
      const depth = rand(8, 13);
      const height = rand(11, 34);
      const centerZ = cursor - frontage / 2;
      const material = choice(world.materials.facades);

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(depth, height, frontage),
        [
          material,
          material,
          world.materials.roof,
          world.materials.roof,
          material,
          material,
        ]
      );
      building.position.set(side * (STREET_FACE + depth / 2), height / 2, centerZ);
      world.scene.add(building);
      world.registerStatic(building, "concrete");

      const parapet = new THREE.Mesh(
        new THREE.BoxGeometry(depth + 0.35, rand(0.5, 1.25), frontage + 0.35),
        world.materials.roof
      );
      parapet.position.set(side * (STREET_FACE + depth / 2), height + 0.2, centerZ);
      world.scene.add(parapet);
      world.registerStatic(parapet, "concrete");

      if (Math.random() < 0.34) {
        addBuildingDetails(world, side, centerZ, frontage, height);
      }

      if (Math.random() < 0.38) {
        const storefrontZ = centerZ + rand(-frontage * 0.2, frontage * 0.2);
        addStorefront(world, side, storefrontZ, rand(5, 8.5));
      }

      if (Math.random() < 0.35) {
        addNeonSign(
          world,
          side,
          centerZ + rand(-frontage * 0.24, frontage * 0.24),
          rand(4.8, Math.min(9, height - 2)),
          choice(["NO VACANCY", "MOTEL", "PHARMACY", "LIQUOR", "OPEN 24H", "PAWN"]),
          choice(["#d75143", "#d9bd63", "#72a9a1", "#ba6b9e"])
        );
      }

      cursor -= frontage + rand(0.6, 2.8);
    }
  }
}

function addBuildingDetails(world, side, centerZ, frontage, height) {
  const facadeX = side * STREET_FACE;
  const ledgeCount = randInt(1, 3);
  for (let i = 0; i < ledgeCount; i += 1) {
    const ledge = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.18, rand(3, frontage * 0.7)),
      world.materials.curb
    );
    ledge.position.set(
      facadeX - side * 0.12,
      rand(3, Math.min(height - 1, 12)),
      centerZ
    );
    world.scene.add(ledge);
    world.registerStatic(ledge, "concrete");
  }

  if (Math.random() >= 0.55) return;

  const escape = new THREE.Group();
  const platformMaterial = new THREE.MeshStandardMaterial({
    color: 0x232525,
    roughness: 0.58,
    metalness: 0.65,
  });
  for (let level = 0; level < randInt(2, 4); level += 1) {
    const y = 4 + level * 2.7;
    if (y > height - 1) break;

    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.08, 4.2),
      platformMaterial
    );
    platform.position.set(facadeX - side * 0.52, y, centerZ);
    escape.add(platform);

    for (const zOffset of [-2.05, 2.05]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.85, 0.045),
        platformMaterial
      );
      rail.position.set(facadeX - side * 1.03, y + 0.48, centerZ + zOffset);
      escape.add(rail);
    }
    const topRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 4.1),
      platformMaterial
    );
    topRail.position.set(facadeX - side * 1.03, y + 0.9, centerZ);
    escape.add(topRail);
  }

  world.scene.add(escape);
  escape.traverse((child) => {
    if (child.isMesh) world.registerStatic(child, "metal");
  });
}

function addStorefront(world, side, z, width) {
  const faceX = side * (STREET_FACE - 0.015);
  const glassColor = choice([0xd1a264, 0x87b0a0, 0xb37e68, 0xcfc383]);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 2.35),
    new THREE.MeshBasicMaterial({
      color: glassColor,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
    })
  );
  glass.position.set(faceX, 1.7, z);
  glass.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  world.scene.add(glass);
  world.registerStatic(glass, "glass");

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x171b1c,
    roughness: 0.5,
    metalness: 0.65,
  });
  for (let i = 0; i < 4; i += 1) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.5, 0.08), frameMaterial);
    bar.position.set(faceX, 1.72, z - width / 2 + (width / 3) * i);
    world.scene.add(bar);
    world.registerStatic(bar, "metal");
  }

  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.1, width * 0.72),
    new THREE.MeshStandardMaterial({
      color: choice([0x642a26, 0x3e5645, 0x5d5035, 0x343e56]),
      roughness: 0.92,
    })
  );
  awning.position.set(side * (STREET_FACE - 0.58), 3.02, z);
  world.scene.add(awning);
  world.registerStatic(awning, "metal");

  const signMaterial = new THREE.MeshBasicMaterial({
    map: makeSignTexture(choice(["DINER", "MARKET", "SHOES", "HARDWARE", "EAT"]), "#cba765", {
      small: true,
    }),
    transparent: true,
    opacity: 0.45,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.75), signMaterial);
  sign.position.set(side * (STREET_FACE - 0.6), 3.6, z);
  sign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  world.scene.add(sign);
  world.registerStatic(sign, "metal");
}

function addNeonSign(world, side, z, y, text, color) {
  const vertical = text.length <= 6;
  const texture = makeSignTexture(text, color, { vertical });
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const width = vertical ? 1.2 : 3.8;
  const height = vertical ? 3.2 : 1.2;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  sign.position.set(side * (STREET_FACE - 0.06), y, z);
  sign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  world.scene.add(sign);
  world.registerStatic(sign, "glass");

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: world.materials.glowTexture,
      color,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  glow.scale.set(width * 2.7, height * 2.5, 1);
  glow.position.copy(sign.position);
  glow.position.x -= side * 0.12;
  world.scene.add(glow);

  world.signs.push({
    material,
    glow,
    baseOpacity: rand(0.65, 0.95),
    phase: rand(0, Math.PI * 2),
    rate: rand(0.35, 1.6),
    flicker: Math.random() < 0.35,
  });
}
