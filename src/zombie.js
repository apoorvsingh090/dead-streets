import * as THREE from "three";
import { clamp, damp, dampAngle, rand, choice } from "./utils.js";

export const ZOMBIE_TYPES = {
  walker: {
    health: 88,
    speed: [1.75, 2.75],
    damage: 8,
    attackInterval: 1.15,
    reach: 1.42,
    radius: 0.35,
    scale: [0.94, 1.07],
    displayName: "ROTTEN",
    isSpecial: false,
    headMultiplier: 2.5,
  },
  runner: {
    health: 54,
    speed: [4.7, 5.6],
    damage: 6,
    attackInterval: 0.72,
    reach: 1.38,
    radius: 0.3,
    scale: [0.9, 0.97],
    displayName: "RUNNER",
    isSpecial: false,
    headMultiplier: 2.4,
  },
  spitter: {
    health: 125,
    speed: [1.8, 2.2],
    damage: 11,
    attackInterval: 1.8,
    reach: 1.5,
    radius: 0.38,
    scale: [1, 1.05],
    displayName: "SPITTER",
    isSpecial: true,
    headMultiplier: 2,
    spitDamage: 14,
    spitCooldown: [3.2, 4.6],
  },
  brute: {
    health: 900,
    speed: [1.42, 1.58],
    damage: 34,
    attackInterval: 1.65,
    reach: 2.35,
    radius: 0.62,
    scale: [1.52, 1.64],
    displayName: "BRUTE",
    isSpecial: true,
    headMultiplier: 1.35,
  },
};

function mesh(geometry, material, parent) {
  const item = new THREE.Mesh(geometry, material);
  item.castShadow = false;
  item.receiveShadow = false;
  parent.add(item);
  return item;
}

export class Zombie {
  constructor(manager, type, position, options = {}) {
    this.manager = manager;
    this.game = manager.game;
    this.type = type;
    this.config = ZOMBIE_TYPES[type] ?? ZOMBIE_TYPES.walker;
    this.displayName = this.config.displayName;
    this.isSpecial = this.config.isSpecial;
    this.health = this.config.health * (options.healthScale ?? 1);
    this.maxHealth = this.health;
    this.position = position.clone();
    this.position.y = 0;
    this.radius = this.config.radius;
    this.speed = rand(...this.config.speed) * (options.speedScale ?? 1);
    this.damage = this.config.damage;
    this.reach = this.config.reach;
    this.scale = rand(...this.config.scale);
    this.waveId = options.waveId ?? null;
    this.heading = rand(0, Math.PI * 2);
    this.targetHeading = this.heading;
    this.walkPhase = rand(0, Math.PI * 2);
    this.attackCooldown = rand(0, 0.4);
    this.attackAnim = 0;
    this.spitCooldown = rand(1.5, 3.2);
    this.retargetTimer = rand(0.1, 0.5);
    this.target = null;
    this.distracted = false;
    this.staggerTimer = 0;
    this.flinch = 0;
    this.alive = true;
    this.dead = false;
    this.deathTime = 0;
    this.fallDirection = rand(-1, 1) < 0 ? -1 : 1;
    this.knockbackX = 0;
    this.knockbackZ = 0;
    this.removeTimer = 0;
    this.stuckTimer = 0;
    this.avoidTimer = 0;
    this.avoidSign = Math.random() < 0.5 ? -1 : 1;
    this.hitMeshes = [];

    this.buildModel();
    this.root.position.copy(this.position);
    this.root.rotation.y = this.heading;
    this.root.scale.setScalar(this.scale);
    manager.scene.add(this.root);
    manager.registerHitMeshes(this);
  }

  buildModel() {
    const shared = this.manager.shared;
    const config = this.config;
    const isSpitter = this.type === "spitter";
    const isBrute = this.type === "brute";
    const isRunner = this.type === "runner";

    this.root = new THREE.Group();
    this.root.name = `zombie-${this.type}`;
    this.bodyGroup = new THREE.Group();
    this.root.add(this.bodyGroup);

    let skinMaterial;
    let shirtMaterial;
    let pantsMaterial;

    if (isSpitter) {
      skinMaterial = shared.spitterSkin;
      shirtMaterial = shared.spitterShirt;
      pantsMaterial = shared.spitterPants;
    } else if (isBrute) {
      skinMaterial = shared.bruteSkin;
      shirtMaterial = shared.bruteShirt;
      pantsMaterial = shared.brutePants;
    } else {
      skinMaterial = choice(isRunner ? shared.runnerSkin : shared.skin);
      shirtMaterial = choice(shared.shirts);
      pantsMaterial = choice(shared.pants);
    }

    const torso = mesh(shared.torsoGeometry, shirtMaterial, this.bodyGroup);
    torso.position.y = 1.18;
    if (isBrute) {
      torso.scale.set(1.3, 1.2, 1.25);
    } else if (isSpitter) {
      torso.scale.set(0.97, 0.94, 1.02);
    }
    torso.userData.zombie = this;
    this.hitMeshes.push(torso);
    this.torso = torso;

    const neck = mesh(shared.neckGeometry, skinMaterial, this.bodyGroup);
    neck.position.y = 1.58;
    neck.userData.zombie = this;
    this.hitMeshes.push(neck);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.73, 0.01);
    this.bodyGroup.add(this.headGroup);
    const head = mesh(shared.headGeometry, skinMaterial, this.headGroup);
    head.scale.y = 1.13;
    head.userData.zombie = this;
    head.userData.head = true;
    this.hitMeshes.push(head);
    this.head = head;

    if (isSpitter) {
      const jaw = mesh(shared.jawGeometry, shared.spitterJaw, this.headGroup);
      jaw.position.set(0, -0.12, 0.18);
      jaw.userData.zombie = this;
      jaw.userData.head = true;
      this.hitMeshes.push(jaw);
    }

    const eyeMaterial = isBrute || isSpitter ? shared.redEye : shared.dimEye;
    for (const side of [-1, 1]) {
      const eye = mesh(shared.eyeGeometry, eyeMaterial, this.headGroup);
      eye.position.set(side * 0.072, 0.03, 0.196);
      eye.userData.zombie = this;
      eye.userData.head = true;
      this.hitMeshes.push(eye);
    }

    const mouth = mesh(shared.jawGeometry, shared.mouth, this.headGroup);
    mouth.scale.set(0.62, 0.3, 0.45);
    mouth.position.set(0, -0.068, 0.2);
    mouth.userData.zombie = this;
    mouth.userData.head = true;
    this.hitMeshes.push(mouth);

    if (Math.random() < 0.48 && !isSpitter) {
      const stain = mesh(shared.stainGeometry, shared.stainMaterial, this.bodyGroup);
      stain.position.set(rand(-0.08, 0.08), 1.18 + rand(-0.1, 0.1), 0.168);
      stain.rotation.z = rand(-0.6, 0.6);
      stain.scale.set(rand(0.7, 1.2), rand(0.7, 1.3), 1);
      stain.userData.zombie = this;
      this.hitMeshes.push(stain);
    }

    if (Math.random() < 0.45 && !isBrute && !isSpitter) {
      const hair = mesh(shared.hairGeometry, choice(shared.hair), this.headGroup);
      hair.position.set(0, 0.12, -0.02);
      hair.scale.set(1.03, 0.5, 1.03);
      hair.rotation.z = rand(-0.12, 0.12);
      hair.userData.zombie = this;
      hair.userData.head = true;
      this.hitMeshes.push(hair);
    }

    this.armPivots = [];
    this.armMeshes = [];
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.38, 1.46, 0);
      this.bodyGroup.add(pivot);
      const arm = mesh(shared.armGeometry, shirtMaterial, pivot);
      arm.position.y = -0.33;
      arm.userData.zombie = this;
      this.hitMeshes.push(arm);
      const forearm = mesh(shared.forearmGeometry, skinMaterial, pivot);
      forearm.position.set(0, -0.69, 0.01);
      forearm.userData.zombie = this;
      this.hitMeshes.push(forearm);
      const hand = mesh(shared.handGeometry, skinMaterial, pivot);
      hand.position.set(0, -0.88, 0.02);
      hand.userData.zombie = this;
      hand.userData.head = false;
      this.hitMeshes.push(hand);
      this.armPivots.push({ pivot, arm, side });
      this.armMeshes.push(arm);
    }

    this.legPivots = [];
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.18, 0.85, 0);
      this.bodyGroup.add(pivot);
      const leg = mesh(shared.legGeometry, pantsMaterial, pivot);
      leg.position.y = -0.4;
      leg.userData.zombie = this;
      this.hitMeshes.push(leg);
      const foot = mesh(shared.footGeometry, shared.boots, pivot);
      foot.position.set(0, -0.8, 0.08);
      foot.userData.zombie = this;
      this.hitMeshes.push(foot);
      this.legPivots.push(pivot);
    }

    if (isSpitter) {
      const belly = mesh(shared.bellyGeometry, shared.spitterBelly, this.bodyGroup);
      belly.position.set(0, 0.99, 0.12);
      belly.scale.set(1.05, 0.95, 0.82);
      belly.userData.zombie = this;
      this.hitMeshes.push(belly);
      this.belly = belly;

      const sac = mesh(shared.sacGeometry, shared.acidSac, this.bodyGroup);
      sac.position.set(0, 1.24, -0.29);
      sac.rotation.x = 0.15;
      this.bodyGroup.add(sac);
    }

    if (isBrute) {
      for (const side of [-1, 1]) {
        const shoulder = mesh(shared.shoulderGeometry, shared.bruteArmor, this.bodyGroup);
        shoulder.position.set(side * 0.46, 1.55, 0);
        shoulder.rotation.z = side * -0.16;
        shoulder.userData.zombie = this;
        this.hitMeshes.push(shoulder);
      }
      const back = mesh(shared.shoulderGeometry, shared.bruteArmor, this.bodyGroup);
      back.scale.set(1.35, 1.1, 0.7);
      back.position.set(0, 1.28, -0.26);
      back.userData.zombie = this;
      this.hitMeshes.push(back);
    }

    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shared.shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.022;
    shadow.scale.set(isBrute ? 1.6 : 1.1, isBrute ? 1.7 : 1.2, 1);
    shadow.renderOrder = 1;
    this.root.add(shadow);
    this.shadow = shadow;

    if (isBrute) {
      this.root.scale.setScalar(1);
    }

    this.root.traverse((child) => {
      if (child.isMesh && !child.userData.zombie && child !== shadow) {
        child.userData.zombie = this;
        this.hitMeshes.push(child);
      }
    });
  }

  setTargetFromList(targets) {
    let best = null;
    let bestScore = Infinity;
    for (const target of targets) {
      if (!target || target.downed || target.alive === false) continue;
      const dx = target.position.x - this.position.x;
      const dz = target.position.z - this.position.z;
      const distanceSq = dx * dx + dz * dz;
      let score = distanceSq;
      if (target.kind === "player") score *= 0.84;
      if (score < bestScore) {
        best = target;
        bestScore = score;
      }
    }
    this.target = best;
  }

  update(dt, targets) {
    if (this.dead) {
      this.updateDeath(dt);
      return;
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt * 2.6);
    this.staggerTimer = Math.max(0, this.staggerTimer - dt);
    this.flinch = Math.max(0, this.flinch - dt * 5.5);
    this.spitCooldown = Math.max(0, this.spitCooldown - dt);
    this.retargetTimer -= dt;
    this.avoidTimer = Math.max(0, this.avoidTimer - dt);

    if (this.retargetTimer <= 0 || !this.target || this.target.downed || this.target.alive === false) {
      this.setTargetFromList(targets);
      this.retargetTimer = rand(0.35, 0.75);
    }

    const distraction = this.manager.distraction;
    let targetPosition = null;
    let attackableTarget = null;
    if (distraction && distraction.timer > 0) {
      const dx = distraction.position.x - this.position.x;
      const dz = distraction.position.z - this.position.z;
      if (dx * dx + dz * dz < 34 * 34) {
        targetPosition = distraction.position;
        this.distracted = true;
      }
    }

    if (!targetPosition && this.target) {
      targetPosition = this.target.position;
      attackableTarget = this.target;
      this.distracted = false;
    }

    if (!targetPosition) {
      this.animate(dt, 0);
      return;
    }

    const dx = targetPosition.x - this.position.x;
    const dz = targetPosition.z - this.position.z;
    const distance = Math.hypot(dx, dz);
    const dirX = distance > 0.001 ? dx / distance : 0;
    const dirZ = distance > 0.001 ? dz / distance : 0;

    if (this.staggerTimer > 0) {
      this.applyKnockback(dt);
      this.animate(dt, 2);
      this.faceDirection(dirX, dirZ, dt);
      return;
    }

    let desiredSpeed = this.speed;

    if (this.type === "spitter" && attackableTarget) {
      if (distance < 7.5) {
        desiredSpeed = -this.speed * 0.7;
      } else if (distance < 21) {
        desiredSpeed = 0;
        if (
          this.spitCooldown <= 0 &&
          this.manager.world.hasLineOfSight(this.position, targetPosition)
        ) {
          this.spitCooldown = rand(...this.config.spitCooldown);
          this.manager.spitProjectile(this, targetPosition);
          this.attackAnim = 1;
        }
      }
    }

    if (this.type === "brute" && attackableTarget && distance < 3.2) {
      desiredSpeed = Math.max(0, desiredSpeed - 0.5);
    }

    const reach = this.reach + (attackableTarget?.radius ?? 0.32);
    const inAttackRange = attackableTarget && distance <= reach;
    if (inAttackRange) {
      desiredSpeed = 0;
      if (this.attackCooldown <= 0) {
        this.attackCooldown = this.config.attackInterval * rand(0.82, 1.12);
        this.attackAnim = 1;
        this.manager.attackSurvivor(this, attackableTarget);
      }
    }

    if (this.type !== "spitter" || distance > 6.5) {
      if (this.type !== "brute" || distance > 1.9) {
        // keep moving toward the target unless already close enough to strike
      }
    }

    let moveX = 0;
    let moveZ = 0;
    if (desiredSpeed !== 0 && distance > 0.001) {
      moveX = dirX * desiredSpeed;
      moveZ = dirZ * desiredSpeed;
    }

    const separation = this.manager.getSeparation(this);
    moveX += separation.x;
    moveZ += separation.z;

    if (this.avoidTimer > 0) {
      const tangentX = -dirZ * this.avoidSign;
      const tangentZ = dirX * this.avoidSign;
      moveX += tangentX * this.speed * 0.7;
      moveZ += tangentZ * this.speed * 0.7;
    }

    const moveLength = Math.hypot(moveX, moveZ);
    if (moveLength > 0.01 && !inAttackRange) {
      const normalizer = Math.min(1, this.speed / moveLength);
      const stepX = moveX * normalizer * dt;
      const stepZ = moveZ * normalizer * dt;
      const beforeX = this.position.x;
      const beforeZ = this.position.z;
      this.manager.world.resolveMovement(this.position, stepX, stepZ, this.radius);
      this.applyKnockback(dt);
      const moved = Math.hypot(this.position.x - beforeX, this.position.z - beforeZ);
      if (moved < Math.min(0.002, this.speed * dt * 0.2)) {
        this.stuckTimer += dt;
      } else {
        this.stuckTimer = Math.max(0, this.stuckTimer - dt * 2);
      }
      if (this.stuckTimer > 0.35) {
        this.avoidTimer = rand(0.35, 0.8);
        this.avoidSign = Math.random() < 0.5 ? -1 : 1;
        this.stuckTimer = 0;
      }
    } else {
      this.applyKnockback(dt);
    }

    this.faceDirection(dirX, dirZ, dt);
    this.animate(dt, desiredSpeed === 0 ? 0 : Math.hypot(this.knockbackX, this.knockbackZ) + Math.abs(desiredSpeed));
    this.root.updateMatrixWorld(true);
  }

  applyKnockback(dt) {
    if (Math.abs(this.knockbackX) + Math.abs(this.knockbackZ) < 0.01) {
      this.knockbackX = 0;
      this.knockbackZ = 0;
      return;
    }
    this.manager.world.resolveMovement(
      this.position,
      this.knockbackX * dt,
      this.knockbackZ * dt,
      this.radius
    );
    this.knockbackX = damp(this.knockbackX, 0, 8, dt);
    this.knockbackZ = damp(this.knockbackZ, 0, 8, dt);
  }

  faceDirection(dirX, dirZ, dt) {
    if (Math.abs(dirX) + Math.abs(dirZ) < 0.001) return;
    const desired = Math.atan2(dirX, dirZ);
    this.heading = dampAngle(this.heading, desired, 7, dt);
    this.root.rotation.y = this.heading;
  }

  animate(dt, speed) {
    const scaleSpeed = clamp(speed / 3.2, 0, 2.2);
    this.walkPhase += dt * (2.2 + scaleSpeed * 3.1);
    const swing = Math.sin(this.walkPhase);
    const bob = Math.abs(Math.cos(this.walkPhase)) * 0.025 * Math.min(1.2, scaleSpeed);

    this.bodyGroup.position.y = bob;
    this.bodyGroup.rotation.z = Math.sin(this.walkPhase * 0.5) * 0.022 * Math.min(1, scaleSpeed);
    this.bodyGroup.rotation.x = -this.flinch * 0.13 + this.attackAnim * 0.06;

    this.legPivots[0].rotation.x = swing * 0.6 * Math.min(1, scaleSpeed);
    this.legPivots[1].rotation.x = -swing * 0.6 * Math.min(1, scaleSpeed);

    const attackSwing = Math.sin(this.attackAnim * Math.PI) * 0.9;
    const armBase = this.type === "brute" ? -0.35 : -1.12;
    this.armPivots[0].pivot.rotation.x =
      armBase + swing * 0.12 - attackSwing * (this.type === "brute" ? 0.2 : 0.22);
    this.armPivots[1].pivot.rotation.x =
      armBase - swing * 0.12 - attackSwing * (this.type === "brute" ? 0.2 : 0.22);
    this.armPivots[0].pivot.rotation.z = -0.12 + this.attackAnim * 0.2;
    this.armPivots[1].pivot.rotation.z = 0.12 - this.attackAnim * 0.2;

    this.headGroup.rotation.z = Math.sin(this.walkPhase * 0.55) * 0.07;
    this.headGroup.rotation.x = Math.sin(this.walkPhase * 0.36) * 0.035 - this.flinch * 0.05;

    if (this.belly) {
      this.belly.scale.set(1.05 + Math.sin(this.walkPhase * 0.8) * 0.03, 0.95, 0.82);
    }
  }

  takeDamage(amount, options = {}) {
    if (this.dead) return { killed: false, headshot: false };
    const headshot = Boolean(options.headshot);
    const multiplier = headshot ? this.config.headMultiplier : 1;
    const applied = amount * multiplier;
    this.health -= applied;
    this.flinch = Math.min(1, this.flinch + (headshot ? 0.8 : 0.3));

    if (options.direction) {
      const force = headshot ? 0.9 : 0.36;
      const resistance = this.type === "brute" ? 0.18 : 1;
      this.knockbackX += options.direction.x * force * resistance;
      this.knockbackZ += options.direction.z * force * resistance;
    }

    if (this.health <= 0) {
      this.die(options.direction, headshot, options.killer ?? null);
      return { killed: true, headshot };
    }
    return { killed: false, headshot };
  }

  shove(direction, strength) {
    if (this.dead) return;
    const resistance = this.type === "brute" ? 0.38 : 1;
    this.knockbackX += direction.x * strength * resistance;
    this.knockbackZ += direction.z * strength * resistance;
    this.staggerTimer = Math.max(this.staggerTimer, (this.type === "brute" ? 0.18 : 0.65));
    this.flinch = 1;
    this.attackAnim = 0;
  }

  die(direction, headshot, killer = null) {
    if (this.dead) return;
    this.dead = true;
    this.alive = false;
    this.deathTime = 0;
    this.manager.unregisterHitMeshes(this);
    this.fallDirection = Math.random() < 0.5 ? -1 : 1;
    if (direction) {
      const local = Math.atan2(direction.x, direction.z) - this.heading;
      this.fallDirection = Math.cos(local) > 0 ? 1 : -1;
    }
    this.manager.registerDeath(this);
    this.game.onZombieKilled(this, headshot, killer);
    this.manager.audio.zombieDie(this.manager.panFor(this.position));
  }

  updateDeath(dt) {
    this.deathTime += dt;
    const fallProgress = clamp(this.deathTime / 0.65, 0, 1);
    const eased = 1 - Math.pow(1 - fallProgress, 3);
    this.bodyGroup.rotation.x = eased * 1.45 * this.fallDirection;
    this.bodyGroup.position.y = Math.sin(eased * Math.PI) * 0.12;

    if (this.deathTime > 6.5) {
      this.root.position.y -= dt * 0.22;
    }
    if (this.deathTime > 10) {
      this.manager.removeZombie(this);
    }
  }
}
