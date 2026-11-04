import * as THREE from "three";
import { rand, clamp, damp, choice, createCanvasTexture } from "./utils.js";
import { ZOMBIE_TYPES, Zombie } from "./zombie.js";

function buildSharedAssets() {
  const skin = [
    new THREE.MeshStandardMaterial({ color: 0x71806c, roughness: 0.94 }),
    new THREE.MeshStandardMaterial({ color: 0x817b68, roughness: 0.95 }),
    new THREE.MeshStandardMaterial({ color: 0x625f53, roughness: 0.94 }),
    new THREE.MeshStandardMaterial({ color: 0x8b816d, roughness: 0.94 }),
  ];
  const runnerSkin = [
    new THREE.MeshStandardMaterial({ color: 0x93947e, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x7e8879, roughness: 0.92 }),
  ];
  const spitterSkin = new THREE.MeshStandardMaterial({
    color: 0x7e9565,
    roughness: 0.86,
    emissive: 0x182108,
    emissiveIntensity: 0.45,
  });
  const bruteSkin = new THREE.MeshStandardMaterial({
    color: 0x6c6b5e,
    roughness: 0.92,
  });

  const shirts = [
    new THREE.MeshStandardMaterial({ color: 0x3c4442, roughness: 0.96 }),
    new THREE.MeshStandardMaterial({ color: 0x523b35, roughness: 0.95 }),
    new THREE.MeshStandardMaterial({ color: 0x4d4f3c, roughness: 0.96 }),
    new THREE.MeshStandardMaterial({ color: 0x2b3542, roughness: 0.94 }),
    new THREE.MeshStandardMaterial({ color: 0x5e5544, roughness: 0.97 }),
  ];
  const pants = [
    new THREE.MeshStandardMaterial({ color: 0x202428, roughness: 0.98 }),
    new THREE.MeshStandardMaterial({ color: 0x2c2a26, roughness: 0.97 }),
    new THREE.MeshStandardMaterial({ color: 0x1b2023, roughness: 0.98 }),
  ];
  const hair = [
    new THREE.MeshStandardMaterial({ color: 0x231d18, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x352b22, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 1 }),
  ];

  const stainTexture = createCanvasTexture(128, 128, (context, width, height) => {
    context.clearRect(0, 0, width, height);
    const gradient = context.createRadialGradient(
      width / 2,
      height / 2,
      2,
      width / 2,
      height / 2,
      width * 0.45
    );
    gradient.addColorStop(0, "rgba(66, 3, 3, 0.9)");
    gradient.addColorStop(0.5, "rgba(48, 2, 2, 0.5)");
    gradient.addColorStop(1, "rgba(18, 0, 0, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    for (let i = 0; i < 16; i += 1) {
      const red = Math.floor(rand(35, 90));
      const alpha = rand(0.14, 0.5);
      context.fillStyle = "rgba(" + red + ", 2, 2, " + alpha + ")";
      context.beginPath();
      context.ellipse(
        rand(10, width - 10),
        rand(10, height - 10),
        rand(2, 17),
        rand(1, 8),
        rand(0, Math.PI),
        0,
        Math.PI * 2
      );
      context.fill();
    }
  });

  const shared = {
    skin,
    runnerSkin,
    spitterSkin,
    bruteSkin,
    shirts,
    pants,
    hair,
    boots: new THREE.MeshStandardMaterial({ color: 0x121313, roughness: 0.94 }),
    dimEye: new THREE.MeshBasicMaterial({ color: 0xd8d3bd }),
    redEye: new THREE.MeshBasicMaterial({ color: 0xff4d2e, toneMapped: false }),
    mouth: new THREE.MeshBasicMaterial({ color: 0x260a08 }),
    stainMaterial: new THREE.MeshBasicMaterial({
      map: stainTexture,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
    stainGeometry: new THREE.PlaneGeometry(0.38, 0.44),
    spitterJaw: new THREE.MeshStandardMaterial({ color: 0x5f744c, roughness: 0.9 }),
    spitterShirt: new THREE.MeshStandardMaterial({ color: 0x596045, roughness: 0.92 }),
    spitterPants: new THREE.MeshStandardMaterial({ color: 0x3a3b2e, roughness: 0.94 }),
    spitterBelly: new THREE.MeshStandardMaterial({
      color: 0x8ca65f,
      roughness: 0.8,
      emissive: 0x364216,
      emissiveIntensity: 0.4,
    }),
    acidSac: new THREE.MeshStandardMaterial({
      color: 0xa6cf55,
      roughness: 0.34,
      emissive: 0x83b63b,
      emissiveIntensity: 1.15,
      transparent: true,
      opacity: 0.92,
    }),
    bruteShirt: new THREE.MeshStandardMaterial({ color: 0x303130, roughness: 0.96 }),
    brutePants: new THREE.MeshStandardMaterial({ color: 0x1c1e1e, roughness: 0.98 }),
    bruteArmor: new THREE.MeshStandardMaterial({
      color: 0x383a36,
      roughness: 0.62,
      metalness: 0.33,
    }),
    torsoGeometry: new THREE.BoxGeometry(0.62, 0.8, 0.32),
    neckGeometry: new THREE.CylinderGeometry(0.1, 0.13, 0.16, 7),
    headGeometry: new THREE.IcosahedronGeometry(0.235, 1),
    jawGeometry: new THREE.BoxGeometry(0.2, 0.1, 0.13),
    eyeGeometry: new THREE.SphereGeometry(0.029, 6, 5),
    hairGeometry: new THREE.SphereGeometry(0.235, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
    armGeometry: new THREE.BoxGeometry(0.15, 0.66, 0.16),
    forearmGeometry: new THREE.BoxGeometry(0.13, 0.34, 0.14),
    handGeometry: new THREE.BoxGeometry(0.15, 0.11, 0.14),
    legGeometry: new THREE.BoxGeometry(0.21, 0.8, 0.22),
    footGeometry: new THREE.BoxGeometry(0.24, 0.12, 0.4),
    bellyGeometry: new THREE.SphereGeometry(0.4, 10, 8),
    sacGeometry: new THREE.SphereGeometry(0.27, 8, 7),
    shoulderGeometry: new THREE.BoxGeometry(0.36, 0.22, 0.42),
    shadowGeometry: new THREE.CircleGeometry(0.52, 16),
  };

  return shared;
}

export class ZombieManager {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.world = game.world;
    this.audio = game.audio;
    this.shared = buildSharedAssets();
    this.zombies = [];
    this.hitMeshes = [];
    this.projectiles = [];
    this.acidPools = [];
    this.corpses = [];
    this.distraction = { position: new THREE.Vector3(), timer: 0 };
    this.targetBuffer = [];

    this.projectileGeometry = new THREE.SphereGeometry(0.16, 8, 6);
    this.projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xb7e65b, toneMapped: false });
    this.projectileGlowMaterial = new THREE.SpriteMaterial({
      map: game.world.materials.glowTexture,
      color: 0xa5dc49,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  spawn(type, position, options = {}) {
    if (this.getAliveCount() >= 42) return null;
    const zombie = new Zombie(this, type, position, options);
    zombie.root.updateMatrixWorld(true);
    this.zombies.push(zombie);
    return zombie;
  }

  registerHitMeshes(zombie) {
    for (const item of zombie.hitMeshes) {
      item.userData.zombie = zombie;
      this.hitMeshes.push(item);
    }
  }

  unregisterHitMeshes(zombie) {
    this.hitMeshes = this.hitMeshes.filter((item) => item.userData.zombie !== zombie);
  }

  registerDeath(zombie) {
    this.corpses.push(zombie);
    if (this.corpses.length > 16) {
      const oldest = this.corpses.shift();
      this.removeZombie(oldest);
    }
  }

  removeZombie(zombie) {
    if (!zombie) return;
    if (zombie.root.parent) this.scene.remove(zombie.root);
    if (zombie.shadow) zombie.shadow.material.dispose();
    this.unregisterHitMeshes(zombie);
    const index = this.zombies.indexOf(zombie);
    if (index >= 0) this.zombies.splice(index, 1);
    const corpseIndex = this.corpses.indexOf(zombie);
    if (corpseIndex >= 0) this.corpses.splice(corpseIndex, 1);
  }

  update(dt) {
    if (this.distraction.timer > 0) {
      this.distraction.timer = Math.max(0, this.distraction.timer - dt);
    }

    this.targetBuffer = this.game.getSurvivorTargets();
    for (let i = this.zombies.length - 1; i >= 0; i -= 1) {
      const zombie = this.zombies[i];
      if (!zombie) continue;
      zombie.update(dt, this.targetBuffer);
    }

    this.updateProjectiles(dt);
    this.updateAcidPools(dt);
  }

  raycast(raycaster) {
    const intersections = raycaster.intersectObjects(this.hitMeshes, false);
    for (const intersection of intersections) {
      const zombie = intersection.object.userData.zombie;
      if (!zombie || zombie.dead || !zombie.alive) continue;
      return {
        point: intersection.point,
        distance: intersection.distance,
        zombie,
        headshot: Boolean(intersection.object.userData.head),
        surface: "flesh",
      };
    }
    return null;
  }

  getNearestAlive(position, maxRange = 30, requireLineOfSight = false) {
    let best = null;
    let bestDistance = maxRange;
    for (const zombie of this.zombies) {
      if (zombie.dead) continue;
      const distance = position.distanceTo(zombie.position);
      if (distance >= bestDistance) continue;
      if (requireLineOfSight && !this.world.hasLineOfSight(position, zombie.position)) continue;
      best = zombie;
      bestDistance = distance;
    }
    return best;
  }

  getAliveCount() {
    let count = 0;
    for (const zombie of this.zombies) {
      if (!zombie.dead) count += 1;
    }
    return count;
  }

  getCounts() {
    let alive = 0;
    let specials = 0;
    for (const zombie of this.zombies) {
      if (zombie.dead) continue;
      alive += 1;
      if (zombie.isSpecial) specials += 1;
    }
    return { alive, specials };
  }

  getSeparation(zombie) {
    let forceX = 0;
    let forceZ = 0;
    for (const other of this.zombies) {
      if (other === zombie || other.dead) continue;
      const dx = zombie.position.x - other.position.x;
      const dz = zombie.position.z - other.position.z;
      const desired = zombie.radius + other.radius + 0.42;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq >= desired * desired || distanceSq < 0.0001) continue;
      const distance = Math.sqrt(distanceSq);
      const weight = (desired - distance) / desired;
      forceX += (dx / distance) * weight * 1.9;
      forceZ += (dz / distance) * weight * 1.9;
    }
    const length = Math.hypot(forceX, forceZ);
    if (length > 2.2) {
      forceX = (forceX / length) * 2.2;
      forceZ = (forceZ / length) * 2.2;
    }
    return { x: forceX, z: forceZ };
  }

  attackSurvivor(zombie, target) {
    if (!target || target.downed || target.alive === false) return;
    this.game.damageSurvivor(target, zombie.damage, zombie.position, zombie);
    this.audio.zombieAttack(this.panFor(zombie.position));
    if (target.kind === "player" && zombie.type === "brute") {
      this.game.player.shake = Math.min(1.5, this.game.player.shake + 0.55);
      this.game.player.shakeTime = 0.3;
    }
  }

  panFor(position) {
    const player = this.game.player;
    if (!player) return 0;
    const dx = position.x - player.position.x;
    const dz = position.z - player.position.z;
    const distance = Math.max(1, Math.hypot(dx, dz));
    const rightX = Math.cos(player.yaw);
    const rightZ = -Math.sin(player.yaw);
    return clamp(((dx * rightX + dz * rightZ) / distance) * 0.9, -1, 1);
  }

  spitProjectile(zombie, targetPosition) {
    if (zombie.dead) return;
    const origin = new THREE.Vector3(zombie.position.x, 1.55, zombie.position.z);
    const target = new THREE.Vector3(targetPosition.x, 1.0, targetPosition.z);
    const toTarget = target.clone().sub(origin);
    const flightTime = clamp(toTarget.length() / 16, 0.35, 1.4);
    const velocity = toTarget.divideScalar(flightTime);
    velocity.y += 0.5 * 4.5 * flightTime;

    const mesh = new THREE.Mesh(this.projectileGeometry, this.projectileMaterial);
    mesh.position.copy(origin);
    const glow = new THREE.Sprite(this.projectileGlowMaterial);
    glow.scale.set(1.1, 1.1, 1);
    mesh.add(glow);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      velocity,
      gravity: 4.5,
      life: 5,
      damage: ZOMBIE_TYPES.spitter.spitDamage,
    });
    this.audio.spit(this.panFor(zombie.position));
  }

  updateProjectiles(dt) {
    const targets = this.targetBuffer;
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      projectile.life -= dt;
      projectile.velocity.y -= projectile.gravity * dt;
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      projectile.mesh.rotation.x += dt * 8;
      projectile.mesh.rotation.z += dt * 5;

      let impacted = projectile.life <= 0 || projectile.mesh.position.y <= 0.12;
      if (!impacted && this.world.collidesCircle(projectile.mesh.position.x, projectile.mesh.position.z, 0.12)) {
        impacted = true;
      }

      if (!impacted) {
        for (const target of targets) {
          if (!target || target.downed || target.alive === false) continue;
          const dx = target.position.x - projectile.mesh.position.x;
          const dz = target.position.z - projectile.mesh.position.z;
          const dy = 1.0 - projectile.mesh.position.y;
          if (dx * dx + dz * dz + dy * dy < 0.85 * 0.85) {
            impacted = true;
            break;
          }
        }
      }

      if (impacted) {
        this.createAcidPool(projectile.mesh.position, 2.15, 6.5);
        this.scene.remove(projectile.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  createAcidPool(position, radius = 2.15, duration = 6.5) {
    const groundPosition = new THREE.Vector3(position.x, 0.035, position.z);
    this.game.effects.acidSplash(groundPosition);
    const material = new THREE.MeshBasicMaterial({
      color: 0x90b841,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 26), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(groundPosition);
    mesh.scale.y = 0.76;
    this.scene.add(mesh);

    this.acidPools.push({
      mesh,
      material,
      position: groundPosition,
      radius,
      life: duration,
      maxLife: duration,
      damageClock: 0.2,
    });
  }

  updateAcidPools(dt) {
    const targets = this.targetBuffer;
    for (let i = this.acidPools.length - 1; i >= 0; i -= 1) {
      const pool = this.acidPools[i];
      pool.life -= dt;
      pool.damageClock -= dt;
      pool.material.opacity = clamp(pool.life / pool.maxLife, 0, 1) * 0.3;

      if (pool.damageClock <= 0) {
        pool.damageClock = 0.55;
        for (const target of targets) {
          if (!target || target.downed || target.alive === false) continue;
          const dx = target.position.x - pool.position.x;
          const dz = target.position.z - pool.position.z;
          if (Math.hypot(dx, dz) < pool.radius) {
            this.game.damageSurvivor(target, 6, pool.position, null, { type: "acid" });
          }
        }
      }

      if (pool.life <= 0) {
        this.scene.remove(pool.mesh);
        pool.mesh.geometry.dispose();
        pool.material.dispose();
        this.acidPools.splice(i, 1);
      }
    }
  }

  shoveFrom(position, direction, radius, strength) {
    for (const zombie of this.zombies) {
      if (zombie.dead) continue;
      const dx = zombie.position.x - position.x;
      const dz = zombie.position.z - position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > radius || distance < 0.001) continue;
      const dot = (dx / distance) * direction.x + (dz / distance) * direction.z;
      if (dot < 0.25) continue;
      zombie.shove(direction, strength * (1 - (distance / radius) * 0.35));
      this.game.effects.impact(
        new THREE.Vector3(zombie.position.x, 1.2, zombie.position.z),
        new THREE.Vector3(0, 1, 0.3),
        "flesh"
      );
    }
  }

  damageInRadius(position, radius, damage, killer = null) {
    let hits = 0;
    for (const zombie of this.zombies) {
      if (zombie.dead) continue;
      const dx = zombie.position.x - position.x;
      const dz = zombie.position.z - position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > radius) continue;
      const falloff = 1 - (distance / radius) * 0.55;
      const direction = new THREE.Vector3(dx, 0, dz).normalize();
      const result = zombie.takeDamage(damage * falloff, {
        direction,
        headshot: false,
        killer,
      });
      if (result.killed) hits += 1;
    }
    return hits;
  }

  setDistraction(position, duration) {
    this.distraction.position.copy(position);
    this.distraction.timer = duration;
  }

  getProjectileCount() {
    return this.projectiles.length;
  }

  clear() {
    for (const zombie of [...this.zombies]) {
      this.removeZombie(zombie);
    }
    for (const projectile of this.projectiles) {
      this.scene.remove(projectile.mesh);
    }
    for (const pool of this.acidPools) {
      this.scene.remove(pool.mesh);
      pool.mesh.geometry.dispose();
      pool.material.dispose();
    }
    this.zombies = [];
    this.hitMeshes = [];
    this.projectiles = [];
    this.acidPools = [];
    this.corpses = [];
    this.distraction.timer = 0;
  }
}
