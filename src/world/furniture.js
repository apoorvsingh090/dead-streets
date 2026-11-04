import * as THREE from "three";
import { rand, randInt, choice, lerp } from "../utils.js";

const CAR_COLORS = [0x28323a, 0x462c2b, 0x4e4c43, 0x303434, 0x3f3d43, 0x554d3b];
const TRASH_COLORS = [0x171819, 0x202122, 0x292725, 0x111314];

export function buildFurniture(world) {
  buildStreetLampFixtures(world);

  addCar(world, 6.25, 84, 0.08, CAR_COLORS[0], true);
  addCar(world, -6.05, 66, -0.04, CAR_COLORS[1]);
  addCar(world, 5.65, 43, 0.13, CAR_COLORS[2], true);
  addCar(world, -5.35, 20, -0.06, CAR_COLORS[3]);
  addCar(world, 6.05, -24, 0.08, CAR_COLORS[4], true);
  addCar(world, -5.75, -63, -0.06, CAR_COLORS[5]);

  addBus(world, -7.15, 7.5);

  addDumpster(world, 8.15, 72, 0.03);
  addDumpster(world, -8.2, 31, -0.04);
  addDumpster(world, 8.1, -47, 0.06);

  addTrafficLight(world, 7.8, 18.4);
  addPowerPoles(world);
  addAlleyFences(world);
  addStreetClutter(world);
  addFinaleCover(world);
}

function buildStreetLampFixtures(world) {
  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0x202526,
    roughness: 0.6,
    metalness: 0.58,
  });
  const lampMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc37d,
    toneMapped: false,
  });

  for (const lamp of world.streetLights) {
    const side = lamp.light.position.x > 0 ? 1 : -1;
    const z = lamp.light.position.z;
    const group = new THREE.Group();

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.12, 6.8, 8), poleMaterial);
    pole.position.set(side * 9.9, 3.4, z);
    group.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.09, 0.09), poleMaterial);
    arm.position.set(side * 8.92, 6.77, z);
    group.add(arm);

    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.34), poleMaterial);
    housing.position.set(side * 7.92, 6.72, z);
    group.add(housing);

    const bulb = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.24), lampMaterial);
    bulb.rotation.x = -Math.PI / 2;
    bulb.position.set(side * 7.92, 6.61, z);
    group.add(bulb);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: world.materials.glowTexture,
        color: 0xffb36b,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.scale.set(2.2, 2.2, 1);
    halo.position.set(side * 7.92, 6.6, z);
    group.add(halo);

    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 2.9, 6.4, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffb56d,
        transparent: true,
        opacity: 0.028,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    cone.position.set(side * 7.92, 3.35, z);
    group.add(cone);

    world.scene.add(group);
    group.traverse((child) => {
      if (child.isMesh && child !== bulb) world.registerStatic(child, "metal");
    });
    world.addCollider(side * 9.9 - 0.16, side * 9.9 + 0.16, z - 0.16, z + 0.16, 7, false);
    lamp.halo = halo;
    lamp.bulb = bulb;
    lamp.cone = cone;
  }
}

function addCar(world, x, z, rotation, color, wrecked = false) {
  const car = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: wrecked ? 0.92 : 0.42,
    metalness: wrecked ? 0.21 : 0.52,
  });
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: wrecked ? 0x0b0e0f : 0x162126,
    roughness: 0.2,
    metalness: 0.68,
    transparent: true,
    opacity: wrecked ? 0.55 : 0.9,
  });
  const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x0b0d0d, roughness: 0.96 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.58, 4.15), bodyMaterial);
  body.position.y = 0.66;
  car.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.55, 2.1), bodyMaterial);
  roof.position.set(0, 1.12, -0.15);
  car.add(roof);

  const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.46, 0.06), windowMaterial);
  frontWindow.position.set(0, 1.17, 0.97);
  frontWindow.rotation.x = -0.28;
  car.add(frontWindow);

  const rearWindow = frontWindow.clone();
  rearWindow.position.z = -1.25;
  rearWindow.rotation.x = 0.25;
  car.add(rearWindow);

  for (const side of [-1, 1]) {
    for (const zOffset of [-1.35, 1.3]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12),
        tireMaterial
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.93, 0.37, zOffset);
      car.add(wheel);
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 2.5), world.materials.metalDark);
    sill.position.set(side * 0.96, 0.63, 0);
    car.add(sill);
  }

  const headlightMaterial = new THREE.MeshBasicMaterial({
    color: wrecked ? 0x29251b : 0xf1d59a,
    transparent: true,
    opacity: wrecked ? 0.4 : 0.9,
  });
  for (const side of [-1, 1]) {
    const light = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.16), headlightMaterial);
    light.position.set(side * 0.59, 0.73, 2.08);
    light.rotation.y = Math.PI;
    car.add(light);
  }

  if (wrecked) {
    const scorch = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 3.2),
      new THREE.MeshBasicMaterial({ color: 0x080808, transparent: true, opacity: 0.55 })
    );
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.y = 0.04;
    car.add(scorch);
  }

  car.position.set(x, 0, z);
  car.rotation.y = rotation;
  world.scene.add(car);
  world.registerGroup(car, "metal");
  world.addCollider(x - 1.2, x + 1.2, z - 2.3, z + 2.3, 1.7, true);
}

function addBus(world, x, z) {
  const bus = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f4b43,
    roughness: 0.68,
    metalness: 0.34,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.45, 2.65, 9.2), bodyMaterial);
  body.position.y = 1.55;
  bus.add(body);

  const windows = new THREE.Mesh(
    new THREE.BoxGeometry(2.47, 0.88, 7.8),
    new THREE.MeshStandardMaterial({
      color: 0x121b1d,
      roughness: 0.2,
      metalness: 0.55,
      emissive: 0x263337,
      emissiveIntensity: 0.3,
    })
  );
  windows.position.set(0, 2.12, 0);
  bus.add(windows);

  for (const wheelZ of [-3.1, 3.1]) {
    for (const wheelX of [-1.16, 1.16]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.52, 0.3, 14),
        new THREE.MeshStandardMaterial({ color: 0x0b0d0d, roughness: 0.92 })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wheelX, 0.54, wheelZ);
      bus.add(wheel);
    }
  }

  bus.position.set(x, 0, z);
  world.scene.add(bus);
  world.registerGroup(bus, "metal");
  world.addCollider(x - 1.4, x + 1.4, z - 4.8, z + 4.8, 2.8, true);
}

function addDumpster(world, x, z, rotation) {
  const dumpster = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.36, 2.5), world.materials.metalGreen);
  body.position.y = 0.79;
  dumpster.add(body);

  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.08, 1.55), world.materials.metalDark);
  lid.position.set(-0.18, 1.5, 0);
  lid.rotation.z = 0.1;
  dumpster.add(lid);

  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x090b0b, roughness: 1 });
  for (const zOffset of [-0.9, 0.9]) {
    for (const xOffset of [-0.78, 0.78]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.08, 8),
        wheelMaterial
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(xOffset, 0.17, zOffset);
      dumpster.add(wheel);
    }
  }

  dumpster.position.set(x, 0, z);
  dumpster.rotation.y = rotation;
  world.scene.add(dumpster);
  world.registerGroup(dumpster, "metal");
  world.addCollider(x - 1.05, x + 1.05, z - 1.35, z + 1.35, 1.6, true);
}

function addTrafficLight(world, x, z) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.13, 5.8, 8),
    world.materials.metalDark
  );
  pole.position.y = 2.9;
  group.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.12, 0.12), world.materials.metalDark);
  arm.position.set(-2.3, 5.55, 0);
  group.add(arm);

  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.45), world.materials.metalDark);
  housing.position.set(-4.4, 5.0, 0);
  group.add(housing);

  const lampMaterial = new THREE.MeshBasicMaterial({ color: 0x231d16 });
  for (let i = 0; i < 3; i += 1) {
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), lampMaterial);
    lamp.position.set(-4.62, 5.38 - i * 0.34, 0);
    lamp.rotation.y = -Math.PI / 2;
    group.add(lamp);
  }

  group.position.set(x, 0, z);
  world.scene.add(group);
  world.registerGroup(group, "metal");
  world.addCollider(x - 0.18, x + 0.18, z - 0.18, z + 0.18, 6, false);
}

function addPowerPoles(world) {
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x242524, roughness: 0.9 });
  const wireMaterial = new THREE.LineBasicMaterial({
    color: 0x0d0f10,
    transparent: true,
    opacity: 0.7,
  });
  const positions = [];

  for (const [x, z] of [
    [9.65, 90],
    [-9.65, 48],
    [9.65, 11],
    [-9.65, -31],
    [9.65, -74],
  ]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.13, 7.8, 7),
      poleMaterial
    );
    pole.position.set(x, 3.9, z);
    world.scene.add(pole);
    world.registerStatic(pole, "wood");

    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.4), poleMaterial);
    cross.position.set(x, 7.0, z);
    cross.rotation.y = Math.PI / 2;
    world.scene.add(cross);
    world.registerStatic(cross, "wood");
    positions.push({ x, z });
    world.addCollider(x - 0.16, x + 0.16, z - 0.16, z + 0.16, 8, false);
  }

  for (let i = 0; i < positions.length - 1; i += 1) {
    const from = positions[i];
    const to = positions[i + 1];
    for (const offset of [-0.7, 0.7]) {
      const points = [];
      for (let j = 0; j <= 16; j += 1) {
        const t = j / 16;
        points.push(
          new THREE.Vector3(
            lerp(from.x, to.x, t),
            7.0 - Math.sin(t * Math.PI) * 0.75,
            lerp(from.z, to.z, t) + offset
          )
        );
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), wireMaterial);
      world.scene.add(line);
    }
  }
}

function addAlleyFences(world) {
  const gateMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2d2c,
    roughness: 0.64,
    metalness: 0.55,
  });

  for (const [side, z] of [
    [-1, 96],
    [1, 58],
    [-1, -16],
    [1, -76],
  ]) {
    const group = new THREE.Group();
    for (let i = -3; i <= 3; i += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.2, 0.04), gateMaterial);
      bar.position.set(side * 10.63, 1.1, z + i * 0.32);
      group.add(bar);
    }
    for (const y of [0.55, 1.65]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 2.2), gateMaterial);
      rail.position.set(side * 10.63, y, z);
      group.add(rail);
    }
    world.scene.add(group);
    world.registerGroup(group, "metal");
  }
}

function addStreetClutter(world) {
  const coneMaterial = new THREE.MeshStandardMaterial({ color: 0x85442e, roughness: 0.88 });
  const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xc8b280 });
  const coneBody = new THREE.ConeGeometry(0.18, 0.6, 10);
  const coneBase = new THREE.BoxGeometry(0.44, 0.06, 0.44);
  const coneStripe = new THREE.CylinderGeometry(0.135, 0.16, 0.11, 10);

  for (let i = 0; i < 8; i += 1) {
    const cone = new THREE.Group();
    const base = new THREE.Mesh(coneBase, coneMaterial);
    base.position.y = 0.03;
    cone.add(base);
    const body = new THREE.Mesh(coneBody, coneMaterial);
    body.position.y = 0.33;
    cone.add(body);
    const stripe = new THREE.Mesh(coneStripe, stripeMaterial);
    stripe.position.y = 0.27;
    cone.add(stripe);
    cone.position.set(rand(-8, 8), 0, choice([2, 34, 55.6, -6.5, -58, -79]));
    world.scene.add(cone);
    world.registerGroup(cone, "plastic");
  }

  for (let i = 0; i < 26; i += 1) {
    const bag = new THREE.Mesh(
      new THREE.DodecahedronGeometry(rand(0.18, 0.4), 0),
      new THREE.MeshStandardMaterial({
        color: choice(TRASH_COLORS),
        roughness: 0.92,
      })
    );
    bag.position.set(rand(-9.5, 9.5), rand(0.14, 0.28), rand(-96, 99));
    bag.scale.y = rand(0.6, 1.2);
    world.scene.add(bag);
    world.registerStatic(bag, "fabric");
  }

  const woodPieces = [];
  for (let i = 0; i < 7; i += 1) {
    woodPieces.push({
      x: rand(-9, 9),
      z: choice([rand(45, 51), rand(-2, 1), rand(-98, -70)]),
      rotation: rand(0, Math.PI),
    });
  }
  for (const piece of woodPieces) {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(rand(0.12, 0.25), 0.08, rand(0.8, 2.2)),
      world.materials.wood
    );
    board.rotation.y = piece.rotation;
    board.position.set(piece.x, 0.04, piece.z);
    world.scene.add(board);
    world.registerStatic(board, "wood");
  }
}

function addFinaleCover(world) {
  const barrierMaterial = new THREE.MeshStandardMaterial({
    color: 0x4e4e48,
    roughness: 0.94,
  });
  const sandbagMaterial = new THREE.MeshStandardMaterial({
    color: 0x4e4939,
    roughness: 1,
  });

  for (const [x, z, rotation] of [
    [-7.0, -89, 0.1],
    [7.3, -92, -0.08],
  ]) {
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.95, 0.65), barrierMaterial);
    barrier.position.set(x, 0.48, z);
    barrier.rotation.y = rotation;
    world.scene.add(barrier);
    world.registerStatic(barrier, "concrete");
    world.addCollider(x - 1.7, x + 1.7, z - 0.5, z + 0.5, 1, false);
  }

  for (const [x, z, count] of [
    [-3.8, -94, 3],
    [3.6, -96, 2],
  ]) {
    const group = new THREE.Group();
    for (let row = 0; row < count; row += 1) {
      for (let i = 0; i < 4 - row; i += 1) {
        const bag = new THREE.Mesh(
          new THREE.BoxGeometry(0.62, 0.26, 0.38),
          sandbagMaterial
        );
        bag.position.set((i - (3 - row) / 2) * 0.66, 0.13 + row * 0.24, 0);
        bag.rotation.y = rand(-0.12, 0.12);
        group.add(bag);
      }
    }
    group.position.set(x, 0, z);
    world.scene.add(group);
    world.registerGroup(group, "fabric");
    world.addCollider(x - 1.25, x + 1.25, z - 0.36, z + 0.36, 0.9, false);
  }

  for (let i = 0; i < 5; i += 1) {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(rand(0.55, 0.9), rand(0.4, 0.75), rand(0.55, 0.9)),
      world.materials.wood
    );
    crate.position.set(rand(-9, 9), 0.3, rand(-99, -84));
    crate.rotation.y = rand(0, Math.PI);
    world.scene.add(crate);
    world.registerStatic(crate, "wood");
    world.addCollider(
      crate.position.x - 0.5,
      crate.position.x + 0.5,
      crate.position.z - 0.5,
      crate.position.z + 0.5,
      0.8,
      false
    );
  }
}
