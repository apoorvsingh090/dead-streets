import * as THREE from "three";
import { rand, randInt, choice, createCanvasTexture } from "../utils.js";
import { makeSignTexture } from "./textures.js";
import { loadPhoto, swapMap } from "./photo.js";

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

  // Worn painted crossings; the photo's black backing stays invisible
  // because it is used as an alpha mask, not an albedo.
  const crosswalkMaterial = new THREE.MeshStandardMaterial({
    color: 0xb9b49a,
    roughness: 0.75,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  loadPhoto("crosswalk.jpg", { repeat: [1, 1], rotation: Math.PI / 2, srgb: false }).then((texture) => {
    if (!texture) return;
    crosswalkMaterial.alphaMap = texture;
    crosswalkMaterial.needsUpdate = true;
  });
  for (const z of [52, -48]) {
    const crossing = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.1), crosswalkMaterial);
    crossing.rotation.x = -Math.PI / 2;
    crossing.position.set(0, 0.032, z);
    scene.add(crossing);
    world.registerStatic(crossing, "concrete");
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

  // Scattered ground trash; dark backing melts into the asphalt.
  const trashMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  loadPhoto("trash_decal.jpg", { repeat: [1, 1] }).then((texture) => {
    if (!texture) return;
    trashMaterial.map = texture;
    trashMaterial.needsUpdate = true;
  });
  for (let i = 0; i < 22; i += 1) {
    const trash = new THREE.Mesh(new THREE.PlaneGeometry(rand(0.9, 2.4), rand(0.9, 2.4)), trashMaterial);
    trash.rotation.x = -Math.PI / 2;
    trash.rotation.z = rand(0, Math.PI * 2);
    trash.position.set(rand(-7.5, 7.5), 0.029, rand(-100, 104));
    scene.add(trash);
    world.registerStatic(trash, "concrete");
  }

  // Scattered tire skid marks; dark backing melts into the asphalt.
  const tireMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  loadPhoto("tire_marks.jpg", { repeat: [1, 1] }).then((texture) => {
    if (!texture) return;
    tireMaterial.map = texture;
    tireMaterial.needsUpdate = true;
  });
  for (let i = 0; i < 10; i += 1) {
    const tire = new THREE.Mesh(new THREE.PlaneGeometry(rand(1.6, 3.6), rand(0.8, 1.6)), tireMaterial);
    tire.rotation.x = -Math.PI / 2;
    tire.rotation.z = rand(0, Math.PI * 2);
    tire.position.set(rand(-7.5, 7.5), 0.03, rand(-100, 104));
    scene.add(tire);
    world.registerStatic(tire, "concrete");
  }

  // Scattered oil stains; dark with iridescent color, plain map.
  const oilMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  loadPhoto("oil_stains.jpg", { repeat: [1, 1] }).then((texture) => {
    if (!texture) return;
    oilMaterial.map = texture;
    oilMaterial.needsUpdate = true;
  });
  for (let i = 0; i < 8; i += 1) {
    const oil = new THREE.Mesh(new THREE.PlaneGeometry(rand(0.8, 2.2), rand(0.8, 2.2)), oilMaterial);
    oil.rotation.x = -Math.PI / 2;
    oil.rotation.z = rand(0, Math.PI * 2);
    oil.position.set(rand(-7.5, 7.5), 0.031, rand(-100, 104));
    scene.add(oil);
    world.registerStatic(oil, "concrete");
  }

  // Storm drain grates near the curbs; dark backing melts into the asphalt.
  const drainMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  loadPhoto("drain_grate.jpg", { repeat: [1, 1] }).then((texture) => {
    if (!texture) return;
    drainMaterial.map = texture;
    drainMaterial.needsUpdate = true;
  });
  for (let i = 0; i < 6; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * rand(7.5, 8.5);
    const drain = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), drainMaterial);
    drain.rotation.x = -Math.PI / 2;
    drain.rotation.z = rand(0, Math.PI * 2);
    // Sidewalk top sits at y=0.12; keep grates on the road/asphalt below it.
    drain.position.set(x, Math.abs(x) < 7.7 ? 0.032 : 0.125, rand(-95, 95));
    scene.add(drain);
    world.registerStatic(drain, "concrete");
  }
  // Two more on the outer edge of the sidewalk, by the building line.
  for (const side of [-1, 1]) {
    const drain = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), drainMaterial);
    drain.rotation.x = -Math.PI / 2;
    drain.rotation.z = rand(0, Math.PI * 2);
    drain.position.set(side * rand(10.1, 10.5), 0.125, rand(-95, 95));
    scene.add(drain);
    world.registerStatic(drain, "concrete");
  }

  // Blood trails near the barricades (z=53 CEDA CHECKPOINT, z=-4 MARKET
  // BARRICADE) and by the start safehouse entrance; dark backing melts in.
  const bloodMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  loadPhoto("blood_trail.jpg", { repeat: [1, 1] }).then((texture) => {
    if (!texture) return;
    bloodMaterial.map = texture;
    bloodMaterial.needsUpdate = true;
  });
  for (const barricadeZ of [53, -4]) {
    for (let i = 0; i < 3; i += 1) {
      const blood = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), bloodMaterial);
      blood.rotation.x = -Math.PI / 2;
      blood.rotation.z = rand(0, Math.PI * 2);
      blood.position.set(rand(-6, 6), 0.033, barricadeZ + rand(-6, 6));
      scene.add(blood);
      world.registerStatic(blood, "concrete");
    }
  }
  for (let i = 0; i < 2; i += 1) {
    const blood = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), bloodMaterial);
    blood.rotation.x = -Math.PI / 2;
    blood.rotation.z = rand(0, Math.PI * 2);
    blood.position.set(rand(-3, 3), 0.033, rand(96, 103));
    scene.add(blood);
    world.registerStatic(blood, "concrete");
  }

  // Tar repair strips scattered on the road; dark backing melts into asphalt.
  const patchMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  loadPhoto("road_patch.jpg", { repeat: [1, 1] }).then((texture) => {
    if (!texture) return;
    patchMaterial.map = texture;
    patchMaterial.needsUpdate = true;
  });
  for (let i = 0; i < 8; i += 1) {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), patchMaterial);
    patch.rotation.x = -Math.PI / 2;
    patch.rotation.z = rand(0, Math.PI * 2);
    patch.position.set(rand(-6, 6), 0.034, rand(-95, 95));
    scene.add(patch);
    world.registerStatic(patch, "concrete");
  }
}

export function buildBuildings(world) {  for (const side of [-1, 1]) {
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
      building.castShadow = true;
      building.receiveShadow = true;
      world.scene.add(building);
      world.registerStatic(building, "concrete");

      const parapet = new THREE.Mesh(
        new THREE.BoxGeometry(depth + 0.35, rand(0.5, 1.25), frontage + 0.35),
        world.materials.roof
      );
      parapet.position.set(side * (STREET_FACE + depth / 2), height + 0.2, centerZ);
      parapet.castShadow = true;
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

      const gap = rand(0.6, 2.8);
      // Infill wall so gaps between buildings read as alleys, not void.
      if (gap > 0.9) {
        const infillHeight = rand(7, 16);
        const infill = new THREE.Mesh(
          new THREE.BoxGeometry(4.5, infillHeight, gap + 0.6),
          Math.random() < 0.4 ? world.materials.graffiti : world.materials.roof
        );
        infill.position.set(
          side * (STREET_FACE + 2.2),
          infillHeight / 2,
          centerZ - frontage / 2 - gap / 2
        );
        infill.castShadow = true;
        infill.receiveShadow = true;
        world.scene.add(infill);
        world.registerStatic(infill, "concrete");
      }

      cursor -= frontage + gap;
    }
  }
}

// Distant silhouettes so the street never ends in flat fog.
export function buildSkyline(world) {
  const materials = [
    new THREE.MeshBasicMaterial({ color: 0xd8dee2 }),
    new THREE.MeshBasicMaterial({ color: 0xbfc8cc }),
    new THREE.MeshBasicMaterial({ color: 0x9aa2a8 }),
    new THREE.MeshBasicMaterial({ color: 0xc9d4d8 }),
  ];
  swapMap(materials[0], loadPhoto("windows_lit.jpg", { repeat: [1, 1] }));
  swapMap(materials[1], loadPhoto("windows_lit.jpg", { repeat: [1.5, 1.5] }));
  swapMap(materials[2], loadPhoto("windows_lit.jpg", { repeat: [0.75, 0.75] }));
  swapMap(materials[3], loadPhoto("windows_lit2.jpg", { repeat: [1.25, 1.25] }));
  let seed = 1234567;
  const srand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const towers = [];
  for (let i = 0; i < 46; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (30 + srand() * 34);
    const z = -130 + srand() * 260;
    const w = 8 + srand() * 14;
    const h = 14 + srand() * 42;
    const d = 8 + srand() * 14;
    towers.push({ x, z, w, h, d, material: materials[i % materials.length] });
  }
  // Cap the ends of the street behind the start and the shelter.
  for (let i = 0; i < 10; i += 1) {
    towers.push({
      x: -40 + i * 9 + srand() * 4,
      z: i % 2 === 0 ? 122 + srand() * 14 : -128 + srand() * 10,
      w: 10 + srand() * 10,
      h: 18 + srand() * 30,
      d: 10,
      material: materials[(i + 1) % materials.length],
    });
  }
  for (const tower of towers) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(tower.w, tower.h, tower.d),
      tower.material
    );
    mesh.position.set(tower.x, tower.h / 2 - 0.5, tower.z);
    world.scene.add(mesh);
  }
}

export function buildSky(world) {
  // Gradient dome + moon + stars. Fog-proof (material.fog = false) so the
  // skyline reads against a sky instead of flat background color.
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#020407");
  gradient.addColorStop(0.45, "#0a1418");
  gradient.addColorStop(0.72, "#16242b");
  gradient.addColorStop(0.86, "#2c2f22");
  gradient.addColorStop(1, "#0b0e0c");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 4, 256);
  const skyTexture = new THREE.CanvasTexture(canvas);
  skyTexture.colorSpace = THREE.SRGBColorSpace;

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(195, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, fog: false })
  );
  world.scene.add(dome);

  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(7, 32),
    new THREE.MeshBasicMaterial({ color: 0xdfe9ec, fog: false, toneMapped: false })
  );
  moon.position.set(-70, 105, -120);
  moon.lookAt(0, 10, 0);
  world.scene.add(moon);

  const moonGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: world.materials.glowTexture,
      color: 0x9db8c4,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  moonGlow.scale.set(46, 46, 1);
  moonGlow.position.copy(moon.position);
  world.scene.add(moonGlow);

  const starGeo = new THREE.BufferGeometry();
  const starCount = 260;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.42;
    positions[i * 3] = 185 * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = 185 * Math.cos(phi) + 4;
    positions[i * 3 + 2] = 185 * Math.sin(phi) * Math.sin(theta);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0xcdd8dc,
      size: 1.4,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.65,
      fog: false,
    })
  );
  world.scene.add(stars);
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
    world.materials.awning
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
