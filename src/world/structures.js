import * as THREE from "three";
import { rand, choice } from "../utils.js";
import { makeSignTexture } from "./textures.js";
import { loadPhoto, swapMap } from "./photo.js";

// Shared concrete photo material for the large flat safehouse walls.
// Neutral tint so the photo shows through.
const concreteWallMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.92,
});
swapMap(concreteWallMaterial, loadPhoto("concrete_wall.jpg", { repeat: [2, 1] }), 0xffffff);

// Shared canvas material for the CEDA checkpoint tents.
const tentMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.9,
  side: THREE.DoubleSide,
});
swapMap(tentMaterial, loadPhoto("tent_canvas.jpg", { repeat: [2, 2] }));

export function buildGates(world) {
  world.gates.push(createGate(world, 53, "CEDA CHECKPOINT", 1));
  world.gates.push(createGate(world, -4, "MARKET BARRICADE", 2));
  applyFinaleBarrierPhoto(world);
  addShopInteriors(world);
  buildCedaTents(world);
}

function createGate(world, z, label, index) {
  const group = new THREE.Group();
  group.position.z = z;

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x272b2b,
    roughness: 0.5,
    metalness: 0.68,
  });

  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.52, 6.3, 0.6), frameMaterial);
    post.position.set(side * 8.85, 3.15, 0);
    group.add(post);
  }

  const header = new THREE.Mesh(new THREE.BoxGeometry(17.9, 1.65, 0.7), frameMaterial);
  header.position.set(0, 5.65, 0);
  group.add(header);

  const shutter = new THREE.Mesh(
    new THREE.BoxGeometry(16.8, 4.7, 0.22),
    world.materials.shutter
  );
  shutter.position.set(0, 2.35, 0);
  group.add(shutter);

  const beacon = new THREE.Mesh(
    new THREE.CircleGeometry(0.13, 12),
    new THREE.MeshBasicMaterial({ color: 0xd4392f, toneMapped: false })
  );
  beacon.position.set(0, 5.65, 0.38);
  group.add(beacon);

  const beaconGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: world.materials.glowTexture,
      color: 0xe34332,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  beaconGlow.scale.set(1.3, 1.3, 1);
  beaconGlow.position.set(0, 5.65, 0.45);
  group.add(beaconGlow);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 0.95),
    new THREE.MeshBasicMaterial({
      map: makeSignTexture(label, "#d3b363", { small: true }),
      transparent: true,
      opacity: 0.65,
    })
  );
  sign.position.set(0, 4.4, 0.2);
  group.add(sign);

  world.scene.add(group);
  world.registerGroup(group, "metal");

  const collider = world.addCollider(-8.7, 8.7, z - 0.32, z + 0.32, 4.9, true);
  const gate = {
    index,
    z,
    label,
    group,
    shutter,
    beacon,
    beaconGlow,
    collider,
    opening: false,
    openProgress: 0,
    open: false,
    baseY: 2.35,
  };
  return gate;
}

export function buildSafehouses(world) {
  buildStartSafehouse(world);
  buildEndSafehouse(world);
}

function buildStartSafehouse(world) {
  const group = new THREE.Group();

  const wall = new THREE.Mesh(new THREE.BoxGeometry(21.6, 8.5, 1.2), concreteWallMaterial);
  wall.position.set(0, 4.25, 107.5);
  group.add(wall);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(4, 4.2, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x242929, roughness: 0.55, metalness: 0.56 })
  );
  door.position.set(0, 2.1, 106.8);
  group.add(door);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 1),
    new THREE.MeshBasicMaterial({
      map: makeSignTexture("SAFEHOUSE", "#82b68a", { small: true }),
      transparent: true,
      opacity: 0.55,
    })
  );
  sign.position.set(0, 5.2, 106.85);
  sign.rotation.y = Math.PI;
  group.add(sign);

  for (const side of [-1, 1]) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 4.1, 8),
      world.materials.metalRust
    );
    pipe.position.set(side * 4.2, 2.05, 106.75);
    group.add(pipe);
  }

  world.scene.add(group);
  group.traverse((child) => {
    if (child.isMesh) world.registerStatic(child, "metal");
  });
}

function buildEndSafehouse(world) {
  const group = new THREE.Group();

  const back = new THREE.Mesh(new THREE.BoxGeometry(21.6, 10.5, 1.4), concreteWallMaterial);
  back.position.set(0, 5.25, -106.05);
  group.add(back);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(6.5, 5.5, 0.45), world.materials.metalDark);
  frame.position.set(0, 2.75, -104.9);
  group.add(frame);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(5.25, 4.5, 0.42),
    world.materials.evacDoor
  );
  door.position.set(0, 2.25, -104.58);
  group.add(door);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.1),
    new THREE.MeshBasicMaterial({
      map: makeSignTexture("EVAC", "#86db91", { small: true }),
      transparent: true,
      opacity: 0.9,
    })
  );
  sign.position.set(0, 5.2, -104.75);
  group.add(sign);

  const exitGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: world.materials.glowTexture,
      color: 0x79d887,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  exitGlow.scale.set(5.2, 3.4, 1);
  exitGlow.position.set(0, 5.2, -104.35);
  group.add(exitGlow);

  for (const side of [-1, 1]) {
    const barricade = new THREE.Mesh(
      new THREE.BoxGeometry(3.7, 1.8, 0.4),
      world.materials.metalRust
    );
    barricade.position.set(side * 6.2, 0.9, -104.4);
    barricade.rotation.z = side * 0.08;
    group.add(barricade);
  }

  world.scene.add(group);
  group.traverse((child) => {
    if (child.isMesh) world.registerStatic(child, "metal");
  });

  world.safehouseDoor = {
    group,
    door,
    sign,
    exitGlow,
    opening: false,
    progress: 0,
    baseY: door.position.y,
  };

  const marker = new THREE.Group();
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x69bf72,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.15, 36), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  marker.add(ring);

  const tickMaterials = [];
  for (let i = 0; i < 3; i += 1) {
    const tickMaterial = new THREE.MeshBasicMaterial({
      color: 0x7add88,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    tickMaterials.push(tickMaterial);
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.65), tickMaterial);
    tick.rotation.x = -Math.PI / 2;
    tick.rotation.z = (Math.PI * 2 * i) / 3;
    tick.position.set(
      Math.cos((Math.PI * 2 * i) / 3) * 2.45,
      0.045,
      Math.sin((Math.PI * 2 * i) / 3) * 2.45
    );
    marker.add(tick);
  }

  marker.position.set(0, 0, -101.1);
  world.scene.add(marker);
  world.extractionMarker = { group: marker, ringMaterial, tickMaterials };

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.9, 8, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x6cbf75,
      transparent: true,
      opacity: 0.025,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  beam.position.set(0, 4, -101.1);
  world.scene.add(beam);
  world.extractionBeam = beam;
}

export function buildSupplies(world) {
  createSupplyCache(world, 7.6, 41, "Pharmacy cache");
  createSupplyCache(world, -7.45, 23.5, "Market cache");
  createSupplyCache(world, 7.55, -22, "Alley cache");
}

function createSupplyCache(world, x, z, name) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;

  const pallet = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 1.6), world.materials.wood);
  pallet.position.y = 0.07;
  group.add(pallet);

  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.72, 1.28), world.materials.crate);
  crate.position.y = 0.5;
  group.add(crate);

  const medkit = new THREE.Group();
  const medkitBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.3, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xb9b7a8, roughness: 0.88 })
  );
  medkit.add(medkitBody);
  const crossMaterial = new THREE.MeshBasicMaterial({ color: 0xa81c1e });
  const crossA = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.08), crossMaterial);
  crossA.position.y = 0.16;
  medkit.add(crossA);
  const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.34), crossMaterial);
  crossB.position.y = 0.16;
  medkit.add(crossB);
  medkit.position.set(-0.36, 1.02, 0);
  group.add(medkit);

  const ammoBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.38, 0.46),
    new THREE.MeshStandardMaterial({ color: 0x3a4436, roughness: 0.84, metalness: 0.2 })
  );
  ammoBox.position.set(0.35, 0.99, -0.12);
  group.add(ammoBox);

  const pipeBomb = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.55, 10),
    new THREE.MeshStandardMaterial({ color: 0x7b2722, roughness: 0.48, metalness: 0.46 })
  );
  pipeBomb.rotation.z = Math.PI / 2;
  pipeBomb.position.set(0.38, 1.02, 0.36);
  group.add(pipeBomb);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: world.materials.glowTexture,
      color: 0x89bd7f,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.scale.set(3.2, 2.4, 1);
  glow.position.set(0, 1.15, 0);
  group.add(glow);

  world.scene.add(group);
  world.registerGroup(group, "wood");

  const point = {
    type: "supply",
    id: `supply-${world.supplies.length}`,
    name,
    position: new THREE.Vector3(x, 1.1, z),
    group,
    glow,
    used: false,
    label: "TAKE SUPPLIES",
  };
  world.supplies.push(point);
  world.interactables.push(point);
}

export function buildGenerator(world) {
  const group = new THREE.Group();
  group.position.set(-7.15, 0, -77.5);

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 1.45), world.materials.metalDark);
  base.position.y = 0.09;
  group.add(base);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.92, 1.16),
    world.materials.generator
  );
  body.position.y = 0.64;
  group.add(body);

  const engine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.33, 0.36, 0.75, 12),
    new THREE.MeshStandardMaterial({ color: 0x2d3131, roughness: 0.48, metalness: 0.7 })
  );
  engine.rotation.z = Math.PI / 2;
  engine.position.set(0.2, 1.08, 0);
  group.add(engine);

  const warning = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.3),
    new THREE.MeshBasicMaterial({
      map: makeSignTexture("START", "#d4b261", { small: true }),
      transparent: true,
      opacity: 0.8,
    })
  );
  warning.position.set(0, 0.77, 0.591);
  group.add(warning);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xbe3c2e, toneMapped: false })
  );
  beacon.position.set(0, 1.4, 0.22);
  group.add(beacon);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: world.materials.glowTexture,
      color: 0xd23f2d,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.scale.set(1.1, 1.1, 1);
  glow.position.set(0, 1.4, 0.25);
  group.add(glow);

  const cable = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, 0.45, 0.5),
      new THREE.Vector3(0.3, 0.18, 1.6),
      new THREE.Vector3(2.4, 0.08, 2.1),
    ]),
    new THREE.LineBasicMaterial({ color: 0x0b0c0c })
  );
  group.add(cable);

  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.42, 10),
    new THREE.MeshStandardMaterial({ color: 0x5c2825, roughness: 0.72, metalness: 0.35 })
  );
  can.position.set(-1.0, 0.24, 0.8);
  group.add(can);

  world.scene.add(group);
  world.registerGroup(group, "metal");
  world.addCollider(-8.2, -6.05, -78.4, -76.6, 1.4, true);

  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0xa13b30,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const marker = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.3, 36), markerMaterial);
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(-7.15, 0.045, -77.5);
  world.scene.add(marker);

  const point = {
    type: "generator",
    id: "generator",
    position: new THREE.Vector3(-7.15, 1.25, -77.5),
    group,
    beacon,
    glow,
    warning,
    marker,
    markerMaterial,
    on: false,
    label: "START THE GENERATOR",
  };
  world.generator = point;
  world.interactables.push(point);
}

export function buildBarrels(world) {
  addExplosiveBarrel(world, 8.15, 58.8);
  addExplosiveBarrel(world, -8.2, 12.5);
  addExplosiveBarrel(world, 4.8, -70.5);
  addBurningBarrel(world, -8.65, -36.5);
}

function addExplosiveBarrel(world, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 1.15, 16),
    world.materials.barrelRed
  );
  barrel.position.y = 0.6;
  group.add(barrel);

  for (const y of [0.16, 1.04]) {
    const hoop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.06, 16),
      world.materials.metalDark
    );
    hoop.position.y = y;
    group.add(hoop);
  }

  const hazard = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.2),
    new THREE.MeshBasicMaterial({
      map: makeSignTexture("FUEL", "#d8b35a", { small: true }),
      transparent: true,
      opacity: 0.75,
    })
  );
  hazard.position.set(0, 0.74, 0.421);
  group.add(hazard);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: world.materials.glowTexture,
      color: 0xc84b35,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.scale.set(1.8, 1.2, 1);
  glow.position.y = 0.85;
  group.add(glow);

  world.scene.add(group);
  world.registerGroup(group, "metal");
  const collider = world.addCollider(x - 0.46, x + 0.46, z - 0.46, z + 0.46, 1.2, false);

  const barrelData = {
    id: `barrel-${world.barrels.length}`,
    group,
    glow,
    position: new THREE.Vector3(x, 0.6, z),
    collider,
    alive: true,
  };
  group.traverse((child) => {
    child.userData.barrel = barrelData;
  });
  world.barrels.push(barrelData);
}

function addBurningBarrel(world, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.43, 0.43, 1.12, 16),
    new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.88, metalness: 0.32 })
  );
  barrel.position.y = 0.57;
  group.add(barrel);

  const fire = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: world.materials.fireTexture,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  fire.scale.set(1.3, 2.2, 1);
  fire.position.y = 1.45;
  group.add(fire);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: world.materials.glowTexture,
      color: 0xff8139,
      transparent: true,
      opacity: 0.23,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.scale.set(4.2, 4.2, 1);
  glow.position.y = 1.0;
  group.add(glow);

  const light = new THREE.PointLight(0xff7c35, 45, 12, 2);
  light.position.set(x, 1.5, z);
  world.scene.add(light);

  world.scene.add(group);
  world.registerGroup(group, "metal");
  const collider = world.addCollider(x - 0.5, x + 0.5, z - 0.5, z + 0.5, 1.2, false);
  world.burningBarrel = {
    group,
    fire,
    glow,
    light,
    baseIntensity: 45,
    collider,
  };
}

export function buildBackground(world) {
  const skylineMaterial = new THREE.MeshStandardMaterial({
    color: 0x111719,
    roughness: 1,
    metalness: 0,
  });

  for (let i = 0; i < 22; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const width = rand(8, 22);
    const height = rand(18, 62);
    const depth = rand(6, 15);
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      skylineMaterial
    );
    building.position.set(side * rand(20, 78), height / 2 - 2, rand(-170, -112));
    world.scene.add(building);
  }

  const farGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: world.materials.glowTexture,
      color: 0x7c4531,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  farGlow.scale.set(90, 40, 1);
  farGlow.position.set(-10, 16, -140);
  world.scene.add(farGlow);
}

// The finale barrier material is created inside furniture.js (addFinaleCover),
// which this file does not own. buildFurniture runs before buildGates, so the
// shared material can be found by its gray tint and swapped here. Both barrier
// boxes share one material instance, so a single swapMap covers them.
function applyFinaleBarrierPhoto(world) {
  const seen = new Set();
  world.scene.traverse((child) => {
    if (!child.isMesh) return;
    const material = child.material;
    if (!material || !material.color) return;
    if (material.color.getHex() !== 0x4e4e48) return;
    if (seen.has(material)) return;
    seen.add(material);
    swapMap(material, loadPhoto("concrete_barrier.jpg", { repeat: [2, 1] }), 0x4e4e48);
  });
}

// The storefront glass panels are created inside street.js (addStorefront),
// which this file does not own. They are the only PlaneGeometry meshes with a
// 2.35 height, transparent opacity 0.24 and surface "glass", so they can be
// matched reliably. One dim interior plane is added ~0.3m behind each panel
// (up to 3); the glass itself is left untouched.
function addShopInteriors(world) {
  const panels = [];
  world.scene.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry?.type !== "PlaneGeometry") return;
    if (child.geometry.parameters?.height !== 2.35) return;
    if (!child.material?.transparent || child.material?.opacity !== 0.24) return;
    if (child.userData.surface !== "glass") return;
    panels.push(child);
  });

  for (const glass of panels.slice(0, 3)) {
    const width = glass.geometry.parameters.width;
    const side = Math.sign(glass.position.x) || 1;
    const interiorMaterial = new THREE.MeshBasicMaterial({
      color: 0x8a9094,
      side: THREE.DoubleSide,
    });
    swapMap(interiorMaterial, loadPhoto("shop_interior.jpg"), 0x8a9094);
    const interior = new THREE.Mesh(new THREE.PlaneGeometry(width, 2.35), interiorMaterial);
    interior.position.set(glass.position.x + side * 0.3, glass.position.y, glass.position.z);
    interior.rotation.y = glass.rotation.y;
    world.scene.add(interior);
    world.registerStatic(interior, "glass");
  }
}

// Two ridge tents pitched near the CEDA checkpoint gate (z ~ 53), clear of the
// drive path (|x| > 4) and of the gate collider (z 52.68-53.32).
function buildCedaTents(world) {
  createTent(world, 6.4, 49.6, 0.35);
  createTent(world, -6.4, 56.6, -0.3);
}

function createTent(world, x, z, rotationY) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;

  const width = 3;
  const height = 2.2;
  const length = 2.6;
  const half = width / 2;
  const slope = Math.hypot(half, height);
  const tilt = Math.atan2(height, half);

  const panelGeometry = new THREE.PlaneGeometry(slope, length);
  panelGeometry.rotateX(-Math.PI / 2);

  const leftPanel = new THREE.Mesh(panelGeometry, tentMaterial);
  leftPanel.position.set(-half / 2, height / 2, 0);
  leftPanel.rotation.z = tilt;
  group.add(leftPanel);

  const rightPanel = new THREE.Mesh(panelGeometry, tentMaterial);
  rightPanel.position.set(half / 2, height / 2, 0);
  rightPanel.rotation.z = -tilt;
  group.add(rightPanel);

  const triangle = new THREE.Shape();
  triangle.moveTo(-half, 0);
  triangle.lineTo(half, 0);
  triangle.lineTo(0, height);
  triangle.closePath();
  const endGeometry = new THREE.ShapeGeometry(triangle);
  for (const end of [-1, 1]) {
    const cap = new THREE.Mesh(endGeometry, tentMaterial);
    cap.position.set(0, 0, end * (length / 2));
    group.add(cap);
  }

  world.scene.add(group);
  world.registerGroup(group, "fabric");
}

export function buildAtmosphere(world) {
  const overheadMaterial = new THREE.MeshStandardMaterial({
    color: 0x262a2b,
    roughness: 0.55,
    metalness: 0.62,
  });

  const gantry = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.32, 0.32), overheadMaterial);
  gantry.position.set(0, 6.5, 47.5);
  world.scene.add(gantry);
  world.registerStatic(gantry, "metal");

  for (const side of [-1, 1]) {
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6.5, 0.22), overheadMaterial);
    support.position.set(side * 9.0, 3.25, 47.5);
    world.scene.add(support);
    world.registerStatic(support, "metal");
  }

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(7.6, 1.35),
    new THREE.MeshBasicMaterial({
      map: makeSignTexture("EVACUATION -> 2 BLOCKS", "#b7c38b", { small: true }),
      transparent: true,
      opacity: 0.5,
    })
  );
  sign.position.set(0, 5.55, 47.33);
  world.scene.add(sign);
  world.registerStatic(sign, "metal");
}
