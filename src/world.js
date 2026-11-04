import * as THREE from "three";
import { clamp, rand, choice, lerp, segmentIntersectsBox2D } from "./utils.js";
import {
  makeAsphaltTexture,
  makeFacadeTexture,
  makeShutterTexture,
  makeGlowTexture,
  makeFireTexture,
  makeSignTexture,
} from "./world/textures.js";
import { buildStreet, buildBuildings } from "./world/street.js";
import { buildFurniture } from "./world/furniture.js";
import {
  buildGates,
  buildSafehouses,
  buildSupplies,
  buildGenerator,
  buildBarrels,
  buildBackground,
  buildAtmosphere,
} from "./world/structures.js";

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.shootables = [];
    this.gates = [];
    this.supplies = [];
    this.barrels = [];
    this.interactables = [];
    this.streetLights = [];
    this.signs = [];
    this.time = 0;
    this.lightning = 0;
    this.extractionOpen = false;

    this.bounds = {
      minX: -10.12,
      maxX: 10.12,
      minZ: -102.4,
      maxZ: 103.2,
    };

    this.startPosition = new THREE.Vector3(0, 0, 99);
    this.extractionPosition = new THREE.Vector3(0, 0, -101.2);
    this.generatorPosition = new THREE.Vector3(-7.15, 1.25, -77.5);

    this.buildMaterials();
    this.buildLighting();

    buildStreet(this);
    buildBuildings(this);
    buildFurniture(this);
    buildGates(this);
    buildSafehouses(this);
    buildSupplies(this);
    buildGenerator(this);
    buildBarrels(this);
    buildBackground(this);
    buildAtmosphere(this);
  }

  buildMaterials() {
    const asphaltTexture = makeAsphaltTexture();
    asphaltTexture.wrapS = THREE.RepeatWrapping;
    asphaltTexture.wrapT = THREE.RepeatWrapping;
    asphaltTexture.repeat.set(4, 30);

    this.materials = {
      asphalt: new THREE.MeshStandardMaterial({
        map: asphaltTexture,
        color: 0x8f9292,
        roughness: 0.7,
        metalness: 0.14,
      }),
      sidewalk: new THREE.MeshStandardMaterial({
        color: 0x303333,
        roughness: 0.92,
        metalness: 0.04,
      }),
      curb: new THREE.MeshStandardMaterial({ color: 0x454845, roughness: 0.96 }),
      line: new THREE.MeshStandardMaterial({
        color: 0x968e68,
        roughness: 0.85,
        emissive: 0x19160d,
        emissiveIntensity: 0.3,
      }),
      metalDark: new THREE.MeshStandardMaterial({
        color: 0x1d2426,
        roughness: 0.46,
        metalness: 0.72,
      }),
      metalRust: new THREE.MeshStandardMaterial({
        color: 0x3d2b23,
        roughness: 0.82,
        metalness: 0.34,
      }),
      metalGreen: new THREE.MeshStandardMaterial({
        color: 0x27372d,
        roughness: 0.58,
        metalness: 0.52,
      }),
      wood: new THREE.MeshStandardMaterial({ color: 0x3b2a1d, roughness: 0.96 }),
      glowTexture: makeGlowTexture("255, 180, 100"),
      fireTexture: makeFireTexture(),
      shutter: new THREE.MeshStandardMaterial({
        map: makeShutterTexture(),
        color: 0xb3b4ad,
        roughness: 0.58,
        metalness: 0.58,
      }),
      roof: new THREE.MeshStandardMaterial({ color: 0x25292a, roughness: 0.95 }),
      facades: [],
    };

    for (let i = 0; i < 5; i += 1) {
      const texture = makeFacadeTexture(i);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1.35 + i * 0.14, 1.3 + (i % 3) * 0.22);
      this.materials.facades.push(
        new THREE.MeshStandardMaterial({
          map: texture,
          color: 0x9b9e98,
          roughness: 0.88,
          metalness: 0.08,
        })
      );
    }
  }

  buildLighting() {
    this.hemisphere = new THREE.HemisphereLight(0x93a5b0, 0x131719, 0.58);
    this.scene.add(this.hemisphere);

    this.moonLight = new THREE.DirectionalLight(0x9db1bd, 0.72);
    this.moonLight.position.set(-28, 36, 44);
    this.scene.add(this.moonLight);

    this.ambient = new THREE.AmbientLight(0x303a3d, 0.52);
    this.scene.add(this.ambient);

    const streetLightPositions = [
      [7.95, 78],
      [-7.95, 58],
      [-7.95, 38],
      [7.95, -11],
      [-7.95, -28],
      [-7.95, -59],
    ];

    for (const [x, z] of streetLightPositions) {
      const light = new THREE.PointLight(0xffb165, 170, 30, 2);
      light.position.set(x * 0.82, 6.15, z);
      this.scene.add(light);
      this.streetLights.push({
        light,
        baseIntensity: 170,
        phase: rand(0, Math.PI * 2),
        rate: rand(0.25, 0.7),
        broken: x > 0 && z === -11,
      });
    }

    this.safehouseLight = new THREE.PointLight(0x72cf83, 65, 18, 2);
    this.safehouseLight.position.set(0, 3.8, -99.5);
    this.scene.add(this.safehouseLight);
  }

  registerStatic(mesh, surface = "concrete") {
    mesh.userData.surface = surface;
    this.shootables.push(mesh);
    return mesh;
  }

  registerGroup(group, surface = "concrete") {
    group.traverse((child) => {
      if (!child.isMesh) return;
      child.userData.surface = surface;
      this.shootables.push(child);
    });
  }

  addCollider(minX, maxX, minZ, maxZ, height = 3, blocksSight = true) {
    const collider = {
      minX,
      maxX,
      minZ,
      maxZ,
      height,
      blocksSight,
      enabled: true,
    };
    this.colliders.push(collider);
    return collider;
  }

  collidesCircle(x, z, radius) {
    if (
      x < this.bounds.minX + radius ||
      x > this.bounds.maxX - radius ||
      z < this.bounds.minZ + radius ||
      z > this.bounds.maxZ - radius
    ) {
      return true;
    }

    for (const collider of this.colliders) {
      if (!collider.enabled) continue;
      const nearestX = clamp(x, collider.minX, collider.maxX);
      const nearestZ = clamp(z, collider.minZ, collider.maxZ);
      const dx = x - nearestX;
      const dz = z - nearestZ;
      if (dx * dx + dz * dz < radius * radius) return true;
    }

    return false;
  }

  resolveMovement(position, dx, dz, radius) {
    const nextX = clamp(position.x + dx, this.bounds.minX + radius, this.bounds.maxX - radius);
    if (!this.collidesCircle(nextX, position.z, radius)) {
      position.x = nextX;
    }

    const nextZ = clamp(position.z + dz, this.bounds.minZ + radius, this.bounds.maxZ - radius);
    if (!this.collidesCircle(position.x, nextZ, radius)) {
      position.z = nextZ;
    }
  }

  hasLineOfSight(from, to) {
    const x1 = from.x ?? from[0];
    const z1 = from.z ?? from[1];
    const x2 = to.x ?? to[0];
    const z2 = to.z ?? to[1];

    for (const collider of this.colliders) {
      if (!collider.enabled || !collider.blocksSight) continue;
      if (segmentIntersectsBox2D(x1, z1, x2, z2, collider, 0.02)) {
        return false;
      }
    }
    return true;
  }

  raycastStatics(raycaster, far = 150) {
    raycaster.far = far;
    return raycaster.intersectObjects(this.shootables, false);
  }

  getSpawnPoint(playerPosition, minDistance = 16, maxDistance = 34) {
    let minZ = this.bounds.minZ + 1.2;
    let maxZ = this.bounds.maxZ - 1.2;

    for (const gate of this.gates) {
      if (gate.open) continue;
      if (gate.z < playerPosition.z - 1.2) {
        minZ = Math.max(minZ, gate.z + 1.3);
      } else if (gate.z > playerPosition.z + 1.2) {
        maxZ = Math.min(maxZ, gate.z - 1.3);
      }
    }

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const direction = Math.random() < 0.56 ? -1 : 1;
      const distance = rand(minDistance, maxDistance);
      const z = clamp(playerPosition.z + direction * distance, minZ, maxZ);
      let x;
      if (Math.random() < 0.64) {
        x = choice([-1, 1]) * rand(6.3, 9.8);
      } else {
        x = rand(-9.4, 9.4);
      }
      if (!this.collidesCircle(x, z, 0.5)) {
        return new THREE.Vector3(x, 0, z);
      }
    }

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const x = rand(-9.4, 9.4);
      const z = rand(minZ, maxZ);
      if (!this.collidesCircle(x, z, 0.5)) {
        return new THREE.Vector3(x, 0, z);
      }
    }

    return new THREE.Vector3(0, 0, clamp(playerPosition.z - 18, minZ, maxZ));
  }

  getNearbyInteractable(position, maxDistance = 2.8) {
    let best = null;
    let bestDistance = maxDistance;

    for (const point of this.interactables) {
      if (point.used || point.on) continue;
      if (point.type === "supply" && point.used) continue;
      const dx = point.position.x - position.x;
      const dz = point.position.z - position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < bestDistance) {
        best = point;
        bestDistance = distance;
      }
    }

    return best;
  }

  useSupply(point) {
    if (!point || point.used) return false;
    point.used = true;
    point.group.visible = false;
    return true;
  }

  openGate(gate) {
    if (!gate || gate.opening || gate.open) return;
    gate.opening = true;
    gate.beacon.material.color.setHex(0x65c774);
    gate.beaconGlow.material.color.setHex(0x65c774);
  }

  openSafehouse() {
    if (!this.safehouseDoor || this.extractionOpen) return;
    this.extractionOpen = true;
    this.safehouseDoor.opening = true;
    if (this.extractionMarker) {
      this.extractionMarker.ringMaterial.color.setHex(0x7fe38b);
      this.extractionMarker.tickMaterials.forEach((material) => {
        material.color.setHex(0x7fe38b);
        material.opacity = 0.7;
      });
    }
    if (this.extractionBeam) {
      this.extractionBeam.material.color.setHex(0x81d68b);
      this.extractionBeam.material.opacity = 0.05;
    }
  }

  activateGenerator() {
    if (!this.generator || this.generator.on) return;
    this.generator.on = true;
    this.generator.beacon.material.color.setHex(0x6ed17b);
    this.generator.glow.material.color.setHex(0x6ed17b);
    this.generator.glow.material.opacity = 0.16;
    this.generator.marker.visible = false;
    this.generator.warning.material.map = makeSignTexture("ONLINE", "#7fce83", { small: true });
    this.generator.warning.material.needsUpdate = true;
  }

  destroyBarrel(barrel) {
    if (!barrel || !barrel.alive) return;
    barrel.alive = false;
    barrel.group.visible = false;
    barrel.collider.enabled = false;
    barrel.group.traverse((child) => {
      const index = this.shootables.indexOf(child);
      if (index >= 0) this.shootables.splice(index, 1);
    });
  }

  setLightning(amount) {
    this.lightning = clamp(amount, 0, 1);
  }

  update(dt, playerPosition) {
    this.time += dt;

    for (const gate of this.gates) {
      if (!gate.opening) continue;
      gate.openProgress = Math.min(1, gate.openProgress + dt / 2.1);
      const eased = gate.openProgress * gate.openProgress * (3 - 2 * gate.openProgress);
      gate.shutter.position.y = gate.baseY + eased * 5.15;
      gate.beaconGlow.material.opacity = 0.32 + Math.sin(this.time * 5) * 0.12;
      if (gate.openProgress > 0.52) gate.collider.enabled = false;
      if (gate.openProgress >= 1) {
        gate.open = true;
        gate.opening = false;
      }
    }

    if (this.safehouseDoor) {
      const door = this.safehouseDoor;
      if (door.opening) {
        door.progress = Math.min(1, door.progress + dt / 2.5);
        const eased = door.progress * door.progress * (3 - 2 * door.progress);
        door.door.position.y = door.baseY + eased * 4.8;
        door.sign.material.opacity = 0.4 + Math.sin(this.time * 4) * 0.2;
        door.exitGlow.material.opacity = 0.15 + Math.sin(this.time * 3) * 0.08;
        if (door.progress >= 1) door.opening = false;
      }
    }

    for (const lamp of this.streetLights) {
      const flicker = Math.sin(this.time * lamp.rate * 2.3 + lamp.phase) * 0.5 + 0.5;
      let multiplier = 0.9 + flicker * 0.16;
      if (lamp.broken) {
        const pulse = Math.sin(this.time * 8.7 + Math.sin(this.time * 2.3) * 3);
        multiplier = pulse > 0.45 ? 0.9 : 0.08 + Math.max(0, pulse) * 0.3;
      }
      lamp.light.intensity = lamp.baseIntensity * multiplier;
      if (lamp.halo) lamp.halo.material.opacity = 0.18 + multiplier * 0.15;
    }

    for (const sign of this.signs) {
      let opacity = sign.baseOpacity;
      if (sign.flicker) {
        const pulse = Math.sin(this.time * sign.rate * 5 + sign.phase);
        if (pulse > 0.82) opacity *= 0.42;
      }
      sign.material.opacity = opacity;
      sign.glow.material.opacity = 0.08 + opacity * 0.12;
    }

    for (const supply of this.supplies) {
      if (supply.used) continue;
      supply.glow.material.opacity = 0.07 + (Math.sin(this.time * 2.1 + supply.position.z) * 0.5 + 0.5) * 0.08;
    }

    if (this.burningBarrel) {
      const flicker = Math.sin(this.time * 9.1) * 0.04 + Math.sin(this.time * 17.3) * 0.025;
      this.burningBarrel.fire.scale.set(1.3 + flicker, 2.2 + flicker * 1.8, 1);
      this.burningBarrel.fire.material.opacity = 0.78 + flicker;
      this.burningBarrel.light.intensity =
        this.burningBarrel.baseIntensity * (0.82 + Math.sin(this.time * 12.4) * 0.08 + Math.sin(this.time * 4.7) * 0.08);
    }

    if (this.generator && !this.generator.on) {
      this.generator.marker.rotation.z += dt * 0.32;
      this.generator.markerMaterial.opacity = 0.24 + (Math.sin(this.time * 2.4) * 0.5 + 0.5) * 0.22;
      this.generator.glow.material.opacity = 0.24 + (Math.sin(this.time * 2.9) * 0.5 + 0.5) * 0.2;
    }

    if (this.extractionMarker) {
      this.extractionMarker.group.rotation.y += dt * 0.18;
      const pulse = Math.sin(this.time * 2.2) * 0.5 + 0.5;
      this.extractionMarker.ringMaterial.opacity = (this.extractionOpen ? 0.26 : 0.18) + pulse * 0.18;
      if (this.extractionBeam) {
        this.extractionBeam.material.opacity =
          (this.extractionOpen ? 0.035 : 0.018) + pulse * 0.012;
      }
    }

    if (this.safehouseLight) {
      this.safehouseLight.intensity = 65 + Math.sin(this.time * 4.3) * 4;
    }

    this.hemisphere.intensity = 0.58 + this.lightning * 1.9;
    this.ambient.intensity = 0.52 + this.lightning * 1.3;
    this.moonLight.intensity = 0.72 + this.lightning * 1.8;
    this.lightning = Math.max(0, this.lightning - dt * 5.5);
  }
}
