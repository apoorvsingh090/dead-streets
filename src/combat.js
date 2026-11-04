import * as THREE from "three";
import { clamp, rand } from "./utils.js";

export class CombatSystem {
  constructor(game) {
    this.game = game;
    this.raycaster = new THREE.Raycaster();
    this.pipebombs = [];
    this.pendingBarrels = [];
    this.sharedBombGeometry = new THREE.CylinderGeometry(0.105, 0.105, 0.48, 10);
    this.sharedBandGeometry = new THREE.CylinderGeometry(0.115, 0.115, 0.05, 10);
    this.bombMaterial = new THREE.MeshStandardMaterial({
      color: 0x69221e,
      roughness: 0.58,
      metalness: 0.45,
    });
    this.bandMaterial = new THREE.MeshStandardMaterial({
      color: 0x251b18,
      roughness: 0.6,
      metalness: 0.55,
    });
  }

  fireHitscan(origin, direction, weapon, muzzle, shooter, drawTracer = true) {
    this.raycaster.far = weapon.range;
    this.raycaster.set(origin, direction);

    const zombieHit = this.game.zombies.raycast(this.raycaster);
    const environmentHits = this.game.world.raycastStatics(this.raycaster, weapon.range);
    const environmentHit = environmentHits[0] ?? null;

    const zombieDistance = zombieHit ? zombieHit.distance : Infinity;
    const environmentDistance = environmentHit ? environmentHit.distance : Infinity;
    const tracerStart = muzzle ?? origin;
    let endPoint = origin.clone().addScaledVector(direction, weapon.range);
    let hitZombie = false;
    let killed = false;
    let headshot = false;
    let hitPoint = endPoint;

    if (zombieHit && zombieDistance <= environmentDistance) {
      hitZombie = true;
      headshot = zombieHit.headshot;
      hitPoint = zombieHit.point.clone();
      const result = zombieHit.zombie.takeDamage(weapon.damage, {
        headshot,
        direction,
        killer: shooter,
      });
      killed = result.killed;
      this.game.effects.blood(hitPoint, direction, headshot);
      this.game.hud.showHitmarker(headshot, killed);
      if (weapon.pellets === 1 || drawTracer) {
        this.game.audio.hit(headshot);
      }
    } else if (environmentHit) {
      hitPoint = environmentHit.point.clone();
      const normal = this.getWorldNormal(environmentHit);
      const surface = environmentHit.object.userData.surface ?? "concrete";
      this.game.effects.impact(hitPoint, normal, surface);
      const barrel = environmentHit.object.userData.barrel;
      if (barrel?.alive) {
        this.explodeBarrel(barrel);
      }
    }

    if (drawTracer) {
      const distance = tracerStart.distanceTo(hitPoint);
      if (distance > 0.2) {
        this.game.effects.tracer(
          tracerStart,
          hitPoint,
          hitZombie ? 0xffd3a1 : 0xffcb8b,
          0.4
        );
      }
    }

    return { hitZombie, killed, headshot, point: hitPoint };
  }

  getWorldNormal(intersection) {
    if (intersection.face) {
      return intersection.face.normal
        .clone()
        .transformDirection(intersection.object.matrixWorld)
        .normalize();
    }
    return new THREE.Vector3(0, 1, 0);
  }

  explodeBarrel(barrel) {
    if (!barrel || !barrel.alive) return;
    const position = new THREE.Vector3(barrel.position.x, 0.06, barrel.position.z);
    this.game.world.destroyBarrel(barrel);
    this.game.effects.explosion(position);
    this.game.audio.explosion(this.game.zombies.panFor(position));
    this.game.zombies.damageInRadius(position, 8.2, 300, this.game.player);
    this.hurtSurvivorsInRadius(position, 7.6, 52);

    const playerDistance = this.game.player.position.distanceTo(position);
    if (playerDistance < 15) {
      this.game.player.shake = Math.min(1.5, this.game.player.shake + 0.65);
      this.game.player.shakeTime = 0.32;
    }

    for (const other of this.game.world.barrels) {
      if (!other.alive || other === barrel) continue;
      if (other.position.distanceTo(barrel.position) < 7.5) {
        this.pendingBarrels.push({ barrel: other, timer: rand(0.16, 0.32) });
      }
    }
  }

  hurtSurvivorsInRadius(position, radius, damage) {
    const targets = this.game.getSurvivorTargets();
    for (const target of targets) {
      if (!target || target.downed || target.alive === false) continue;
      const distance = Math.hypot(
        target.position.x - position.x,
        target.position.z - position.z
      );
      if (distance > radius) continue;
      const falloff = 1 - (distance / radius) * 0.6;
      this.game.damageSurvivor(target, damage * falloff, position, null);
    }
  }

  throwPipeBomb(origin, direction) {
    if (this.game.state !== "playing") return;
    const group = new THREE.Group();
    const body = new THREE.Mesh(this.sharedBombGeometry, this.bombMaterial);
    group.add(body);
    for (const y of [-0.16, 0.16]) {
      const band = new THREE.Mesh(this.sharedBandGeometry, this.bandMaterial);
      band.position.y = y;
      group.add(band);
    }

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.game.world.materials.glowTexture,
        color: 0xff5e42,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.scale.set(0.9, 0.9, 1);
    group.add(glow);

    group.position.copy(origin);
    group.position.y = Math.max(0.4, origin.y - 0.25);
    this.game.scene.add(group);

    const velocity = direction.clone().multiplyScalar(12);
    velocity.y += 3.9;

    this.pipebombs.push({
      group,
      glow,
      velocity,
      life: 3,
      beepClock: 0.12,
      active: true,
    });

    this.game.hud.addKillfeed("PIPE BOMB OUT", false);
  }

  update(dt) {
    for (let i = this.pendingBarrels.length - 1; i >= 0; i -= 1) {
      this.pendingBarrels[i].timer -= dt;
      if (this.pendingBarrels[i].timer <= 0) {
        const barrel = this.pendingBarrels[i].barrel;
        this.pendingBarrels.splice(i, 1);
        this.explodeBarrel(barrel);
      }
    }

    for (let i = this.pipebombs.length - 1; i >= 0; i -= 1) {
      const bomb = this.pipebombs[i];
      if (!bomb.active) continue;

      bomb.life -= dt;
      bomb.beepClock -= dt;
      bomb.velocity.y -= 15 * dt;

      const previous = bomb.group.position.clone();
      bomb.group.position.addScaledVector(bomb.velocity, dt);

      if (bomb.group.position.y < 0.2) {
        bomb.group.position.y = 0.2;
        if (bomb.velocity.y < 0) bomb.velocity.y *= -0.3;
        bomb.velocity.x *= 0.74;
        bomb.velocity.z *= 0.74;
      }

      if (
        this.game.world.collidesCircle(
          bomb.group.position.x,
          bomb.group.position.z,
          0.13
        )
      ) {
        bomb.group.position.x = previous.x;
        bomb.group.position.z = previous.z;
        bomb.velocity.x *= -0.42;
        bomb.velocity.z *= -0.42;
      }

      bomb.group.rotation.x += dt * 6.5;
      bomb.group.rotation.z += dt * 3.4;
      const pulse = 0.2 + (Math.sin((3 - bomb.life) * 18) * 0.5 + 0.5) * 0.32;
      bomb.glow.material.opacity = pulse;
      bomb.glow.scale.setScalar(0.8 + pulse * 0.8);

      this.game.zombies.setDistraction(bomb.group.position, 0.38);

      if (bomb.beepClock <= 0) {
        bomb.beepClock = bomb.life < 1 ? 0.22 : 0.43;
        this.game.audio.tone({
          frequency: 1450,
          endFrequency: 900,
          duration: 0.07,
          volume: 0.035,
          type: "square",
          pan: this.game.zombies.panFor(bomb.group.position),
        });
      }

      if (bomb.life <= 0) {
        this.detonatePipeBomb(bomb);
        this.pipebombs.splice(i, 1);
      }
    }
  }

  detonatePipeBomb(bomb) {
    if (!bomb.active) return;
    bomb.active = false;
    const position = bomb.group.position.clone();
    position.y = 0.04;
    this.game.scene.remove(bomb.group);
    this.game.effects.explosion(position);
    this.game.audio.explosion(this.game.zombies.panFor(position));
    this.game.zombies.damageInRadius(position, 8.8, 420, this.game.player);
    this.hurtSurvivorsInRadius(position, 6.8, 28);
    this.game.zombies.setDistraction(position, 0);

    for (const other of this.game.world.barrels) {
      if (!other.alive) continue;
      if (other.position.distanceTo(position) < 8) {
        this.pendingBarrels.push({ barrel: other, timer: rand(0.08, 0.25) });
      }
    }

    const playerDistance = this.game.player.position.distanceTo(position);
    if (playerDistance < 14) {
      this.game.player.shake = Math.min(1.5, this.game.player.shake + 0.7);
      this.game.player.shakeTime = 0.35;
    }
  }

  clear() {
    for (const bomb of this.pipebombs) {
      this.game.scene.remove(bomb.group);
      bomb.glow.material.dispose();
    }
    this.pipebombs = [];
    this.pendingBarrels = [];
  }
}
