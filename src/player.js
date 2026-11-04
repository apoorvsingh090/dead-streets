import * as THREE from "three";
import { clamp, damp, lerp, rand } from "./utils.js";
import { WEAPONS, WeaponView } from "./weapons.js";

export class Player {
  constructor(game, camera, world, viewCamera = camera) {
    this.game = game;
    this.camera = camera;
    this.viewCamera = viewCamera;
    this.world = world;

    this.position = world.startPosition.clone();
    this.position.y = 0;
    this.radius = 0.34;
    this.eyeHeight = 1.68;
    this.crouchHeight = 0.72;
    this.yaw = 0;
    this.pitch = -0.01;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.shake = 0;
    this.shakeTime = 0;
    this.roll = 0;
    this.velocityX = 0;
    this.velocityZ = 0;
    this.verticalVelocity = 0;
    this.jumpOffset = 0;
    this.onGround = true;
    this.stepDistance = 0;
    this.stepPhase = 0;
    this.baseFov = 76;
    this.currentFov = this.baseFov;
    this.sensitivity = 1;

    this.maxHealth = 100;
    this.health = 100;
    this.downed = false;
    this.bleedout = 0;
    this.medkits = 2;
    this.pipebombs = 1;
    this.maxMedkits = 2;
    this.maxPipebombs = 2;

    this.currentWeaponId = "rifle";
    this.weaponStates = {};
    for (const weapon of Object.values(WEAPONS)) {
      this.weaponStates[weapon.id] = {
        mag: weapon.magSize,
        reserve: weapon.startReserve,
      };
    }

    this.reloading = false;
    this.reloadTimer = 0;
    this.reloadDuration = 0;
    this.fireCooldown = 0;
    this.triggerDown = false;
    this.shoveCooldown = 0;
    this.sprinting = false;
    this.moving = false;
    this.adsTarget = 0;
    this.adsProgress = 0;
    this.lastDamageTime = -10;
    this.flashlightOn = true;
    this.time = 0;

    this.view = new WeaponView(viewCamera);
    this.view.setWeapon(this.currentWeaponId, true);

    if (!camera.parent) this.game.scene.add(camera);
    camera.rotation.order = "YXZ";

    const flashlightTarget = new THREE.Object3D();
    flashlightTarget.position.set(0, -0.12, -7);
    camera.add(flashlightTarget);
    this.flashlight = new THREE.SpotLight(0xffe3b4, 46, 34, 0.56, 0.66, 1.4);
    this.flashlight.position.set(0.16, -0.08, 0.02);
    this.flashlight.target = flashlightTarget;
    camera.add(this.flashlight);

    this.camera.position.set(this.position.x, this.eyeHeight, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  get weapon() {
    return WEAPONS[this.currentWeaponId];
  }

  get ammo() {
    return this.weaponStates[this.currentWeaponId];
  }

  get forwardVector() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  setSensitivity(value) {
    this.sensitivity = value;
  }

  look(dx, dy) {
    const adsMultiplier = lerp(1, 0.7, this.adsProgress);
    const sensitivity = 0.00185 * this.sensitivity * adsMultiplier;
    this.yaw -= dx * sensitivity;
    this.pitch -= dy * sensitivity;
    this.pitch = clamp(this.pitch, -1.32, 1.28);
    this.view.addLook(dx, dy);
    if (Math.abs(dx) + Math.abs(dy) > 2) {
      this.recoilYaw *= 0.88;
    }
  }

  setTrigger(down) {
    this.triggerDown = down;
    if (down) this.tryFire();
  }

  tryFire() {
    if (this.downed || this.reloading || this.game.state !== "playing") return;
    if (this.fireCooldown > 0) return;

    const weapon = this.weapon;
    const ammo = this.ammo;
    if (ammo.mag <= 0) {
      this.fireCooldown = 0.22;
      this.game.audio.dryFire();
      if (ammo.reserve > 0) this.startReload();
      return;
    }

    ammo.mag -= 1;
    this.fireCooldown = weapon.fireDelay;
    this.game.stats.shotsFired += 1;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const origin = this.camera.position.clone().addScaledVector(forward, 0.08);
    const muzzle = this.getMuzzleWorldPosition(new THREE.Vector3());

    const moveSpread =
      (Math.abs(this.velocityX) + Math.abs(this.velocityZ)) > 1.2
        ? weapon.spreadMoving * clamp((Math.abs(this.velocityX) + Math.abs(this.velocityZ)) / 7, 0.2, 1)
        : 0;
    const spread =
      lerp(weapon.spreadHip, weapon.spreadAds, this.adsProgress) +
      moveSpread * (1 - this.adsProgress * 0.4) +
      (this.sprinting ? 0.014 : 0);

    let anyHit = false;
    for (let i = 0; i < weapon.pellets; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * spread;
      const direction = forward
        .clone()
        .addScaledVector(right, Math.cos(angle) * radius)
        .addScaledVector(up, Math.sin(angle) * radius)
        .normalize();
      const result = this.game.fireHitscan(
        origin,
        direction,
        weapon,
        muzzle,
        this,
        i === 0
      );
      if (result && result.hitZombie) anyHit = true;
    }

    if (anyHit) this.game.stats.shotsHit += 1;

    this.view.fire();
    this.game.audio.shot(weapon.sound);
    this.game.effects.muzzle(muzzle, 0xffc477);
    this.recoilPitch += weapon.recoilPitch * rand(0.75, 1.2);
    this.recoilYaw += rand(-weapon.recoilYaw, weapon.recoilYaw);
    this.shake = Math.min(1.2, this.shake + weapon.shake);
    this.shakeTime = 0.1;
    this.game.hud.setSpreadFromValue(spread);
  }

  startReload() {
    if (this.downed || this.reloading) return;
    const ammo = this.ammo;
    if (ammo.mag >= this.weapon.magSize || ammo.reserve <= 0) return;

    this.reloading = true;
    this.reloadDuration = this.weapon.reloadTime;
    this.reloadTimer = this.reloadDuration;
    this.triggerDown = false;
    this.game.audio.reload(this.weapon.reloadTime);
  }

  finishReload() {
    const ammo = this.ammo;
    const missing = this.weapon.magSize - ammo.mag;
    const transfer = ammo.reserve === Infinity ? missing : Math.min(missing, ammo.reserve);
    ammo.mag += transfer;
    if (ammo.reserve !== Infinity) ammo.reserve -= transfer;
    this.reloading = false;
    this.reloadTimer = 0;
    this.game.audio.switchWeapon();
  }

  cancelReload() {
    this.reloading = false;
    this.reloadTimer = 0;
    this.reloadDuration = 0;
  }

  switchWeapon(index) {
    if (this.downed) return;
    const id = index === 1 ? "rifle" : index === 2 ? "shotgun" : index === 3 ? "pistol" : null;
    if (!id || id === this.currentWeaponId) return;
    this.cancelReload();
    this.currentWeaponId = id;
    this.fireCooldown = 0.26;
    this.view.setWeapon(id);
    this.game.audio.switchWeapon();
    this.game.hud.showWeaponToast(this.weapon.name, this.weapon.category);
  }

  shove() {
    if (this.downed || this.shoveCooldown > 0) return;
    this.shoveCooldown = 1.35;
    this.view.shove();
    this.game.audio.shove();
    const direction = this.forwardVector;
    this.game.zombies.shoveFrom(this.position, direction, 3.35, 7.4);
    this.shake = Math.min(1, this.shake + 0.08);
    this.shakeTime = 0.08;
  }

  useMedkit() {
    if (this.downed || this.medkits <= 0 || this.health >= this.maxHealth) return;
    this.medkits -= 1;
    this.health = Math.min(this.maxHealth, this.health + 70);
    this.game.audio.heal();
    this.game.hud.flashDamage(-0.25);
    this.game.hud.subtitle("YOU", "That's better. Keep moving.", 2.4);
  }

  throwPipeBomb() {
    if (this.downed || this.pipebombs <= 0) return;
    this.pipebombs -= 1;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const origin = this.camera.position.clone().addScaledVector(direction, 0.45);
    this.game.throwPipeBomb(origin, direction);
    this.view.shove();
    this.game.audio.shove();
  }

  jump() {
    if (this.downed || !this.onGround) return;
    this.verticalVelocity = 5.4;
    this.onGround = false;
  }

  toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    this.flashlight.intensity = this.flashlightOn ? 46 : 0;
    this.game.audio.click(this.game.audio.context?.currentTime ?? 0, 0.05, 1300);
  }

  update(dt, input) {
    this.time += dt;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.shoveCooldown = Math.max(0, this.shoveCooldown - dt);
    this.shake = Math.max(0, this.shake - dt * 4.8);
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    this.recoilPitch = damp(this.recoilPitch, 0, 12, dt);
    this.recoilYaw = damp(this.recoilYaw, 0, 11, dt);

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) this.finishReload();
    }

    if (this.downed) {
      this.updateDowned(dt, input);
      this.updateCamera(dt, input, 0);
      this.updateFov(dt);
      this.view.update(dt, { downed: true });
      return;
    }

    const moveInput = this.getMoveInput(input);
    const moving = moveInput.lengthSq() > 0.001;
    this.moving = moving;

    const wantsAds = input.aim && !this.sprinting && !this.reloading;
    this.adsTarget = wantsAds ? 1 : 0;
    this.adsProgress = damp(this.adsProgress, this.adsTarget, 13, dt);

    const sprinting =
      input.sprint &&
      moving &&
      !input.aim &&
      !this.reloading &&
      this.fireCooldown <= 0.08 &&
      this.onGround;
    this.sprinting = sprinting;

    const baseSpeed = this.adsProgress > 0.3 ? 3.25 : sprinting ? 8.2 : 5.55;
    const speed = baseSpeed * (this.reloading ? 0.86 : 1);
    const targetVX = moveInput.x * speed;
    const targetVZ = moveInput.z * speed;
    const acceleration = moving ? 12 : 16;
    this.velocityX = damp(this.velocityX, targetVX, acceleration, dt);
    this.velocityZ = damp(this.velocityZ, targetVZ, acceleration, dt);

    if (Math.abs(this.velocityX) < 0.02) this.velocityX = 0;
    if (Math.abs(this.velocityZ) < 0.02) this.velocityZ = 0;

    this.world.resolveMovement(
      this.position,
      this.velocityX * dt,
      this.velocityZ * dt,
      this.radius
    );

    const movedSpeed = Math.hypot(this.velocityX, this.velocityZ);
    this.updateFootsteps(dt, movedSpeed);

    if (!this.onGround) {
      this.verticalVelocity -= 17.5 * dt;
      this.jumpOffset += this.verticalVelocity * dt;
      if (this.jumpOffset <= 0) {
        this.jumpOffset = 0;
        this.verticalVelocity = 0;
        this.onGround = true;
      }
    }

    if (this.triggerDown && this.weapon.auto) {
      this.tryFire();
    }

    this.updateCamera(dt, input, movedSpeed);
    this.updateFov(dt);

    this.view.update(dt, {
      speed: movedSpeed,
      ads: this.adsProgress,
      sprinting: this.sprinting,
      reloading: this.reloading,
      reloadProgress: this.reloading
        ? 1 - clamp(this.reloadTimer / Math.max(0.01, this.reloadDuration), 0, 1)
        : 0,
      downed: false,
      lowered: false,
    });

    this.game.hud.setSpread(this.getCrosshairSpread());
    this.game.hud.setReload(this.reloading ? 1 - this.reloadTimer / this.reloadDuration : 0, this.reloading);
  }

  getMoveInput(input) {
    const forward = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const move = new THREE.Vector3();
    if (forward === 0 && strafe === 0) return move;

    const forwardVector = this.forwardVector;
    const rightVector = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    move.addScaledVector(forwardVector, forward);
    move.addScaledVector(rightVector, strafe);
    move.normalize();
    return move;
  }

  updateFootsteps(dt, speed) {
    if (speed < 0.5) {
      this.stepDistance = 0;
      return;
    }
    this.stepDistance += speed * dt;
    const interval = this.sprinting ? 2.25 : 2.9;
    if (this.stepDistance >= interval) {
      this.stepDistance = 0;
      this.game.audio.playerStep(this.sprinting);
    }
  }

  updateCamera(dt, input, speed) {
    const speedRatio = clamp(speed / 8.2, 0, 1);
    this.stepPhase += dt * (3 + speedRatio * 9);
    const bobStrength = this.adsProgress > 0.5 ? 0.35 : 1;
    const bob = Math.sin(this.stepPhase * 2) * 0.023 * speedRatio * bobStrength;
    const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const targetRoll = -strafe * 0.009 + Math.sin(this.stepPhase) * 0.0025 * speedRatio;
    this.roll = damp(this.roll, targetRoll, 9, dt);

    const eye = (this.downed ? this.crouchHeight : this.eyeHeight) + this.jumpOffset + bob;
    this.camera.position.set(this.position.x, eye, this.position.z);

    const shakeAmount = this.shake * this.shake * (this.shakeTime > 0 ? 1 : 0.2);
    const shakePitch = Math.sin(this.time * 47.3) * shakeAmount * 0.014;
    const shakeYaw = Math.cos(this.time * 39.1) * shakeAmount * 0.016;
    this.camera.rotation.x = this.pitch + this.recoilPitch + shakePitch;
    this.camera.rotation.y = this.yaw + this.recoilYaw + shakeYaw;
    this.camera.rotation.z = this.roll + Math.sin(this.time * 31.7) * shakeAmount * 0.012;
  }

  updateFov(dt) {
    const targetFov = this.baseFov - this.adsProgress * 23 + (this.sprinting ? 3.5 : 0);
    this.currentFov = damp(this.currentFov, targetFov, 10, dt);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.01) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }

  getCrosshairSpread() {
    if (this.downed) return 16;
    const moveSpeed = Math.hypot(this.velocityX, this.velocityZ);
    const base = lerp(this.weapon.spreadHip, this.weapon.spreadAds, this.adsProgress);
    return clamp(
      (base + moveSpeed * 0.0012 + (this.sprinting ? 0.004 : 0)) * 500 + 4,
      4,
      30
    );
  }

  updateDowned(dt, input) {
    this.bleedout -= dt;
    this.health = 0;
    this.sprinting = false;
    this.reloading = false;
    this.adsProgress = damp(this.adsProgress, 0, 8, dt);
    this.game.hud.setDowned(true, Math.max(0, this.bleedout));

    if (this.bleedout <= 0) {
      this.game.endRun(false, "You bled out in the street.");
      return;
    }

    const move = this.getMoveInput(input);
    const crawlSpeed = 1.35;
    this.velocityX = damp(this.velocityX, move.x * crawlSpeed, 9, dt);
    this.velocityZ = damp(this.velocityZ, move.z * crawlSpeed, 9, dt);
    this.world.resolveMovement(
      this.position,
      this.velocityX * dt,
      this.velocityZ * dt,
      this.radius
    );

    if (this.bleedout < 6) {
      this.shake = Math.max(this.shake, 0.22);
    }
  }

  takeDamage(amount, source = null, options = {}) {
    if (this.downed || this.game.state !== "playing") return;
    this.health = Math.max(0, this.health - amount);
    this.lastDamageTime = this.time;
    this.shake = Math.min(1.5, this.shake + (options.quiet ? 0.08 : 0.3));
    this.shakeTime = 0.22;
    if (!options.quiet) this.game.audio.hurt();
    this.game.hud.flashDamage(clamp(amount / 30, options.quiet ? 0.04 : 0.15, 1));

    if (source) {
      const dx = source.x - this.position.x;
      const dz = source.z - this.position.z;
      const forwardX = -Math.sin(this.yaw);
      const forwardZ = -Math.cos(this.yaw);
      const rightX = Math.cos(this.yaw);
      const rightZ = -Math.sin(this.yaw);
      const relativeX = dx * rightX + dz * rightZ;
      const relativeZ = dx * forwardX + dz * forwardZ;
      this.game.hud.showDamageDirection(Math.atan2(relativeX, relativeZ));
    }

    if (this.health <= 0) {
      this.enterDownedState();
    }
  }

  heal(amount) {
    if (this.downed) return;
    this.health = clamp(this.health + amount, 0, this.maxHealth);
  }

  enterDownedState() {
    if (this.downed) return;
    this.downed = true;
    this.health = 0;
    this.bleedout = 26;
    this.triggerDown = false;
    this.reloading = false;
    this.adsProgress = 0;
    this.velocityX = 0;
    this.velocityZ = 0;
    this.verticalVelocity = 0;
    this.jumpOffset = 0;
    this.game.hud.setDowned(true, this.bleedout);
    this.game.hud.flashDamage(1);
    this.game.audio.hurt();
    this.game.onPlayerDowned();
  }

  revive(health = 45) {
    if (!this.downed) return;
    this.downed = false;
    this.health = health;
    this.bleedout = 0;
    this.lastDamageTime = this.time;
    this.game.hud.setDowned(false, 0);
    this.game.hud.flashDamage(-0.5);
    this.game.hud.subtitle("SURVIVOR", "On your feet. We're not done yet.", 3);
    this.game.audio.heal();
  }

  addAmmo(amount = 45) {
    for (const weapon of Object.values(WEAPONS)) {
      if (weapon.startReserve === Infinity) continue;
      const state = this.weaponStates[weapon.id];
      state.reserve = Math.min(weapon.maxReserve, state.reserve + amount);
    }
  }

  useSupplies() {
    this.medkits = Math.min(this.maxMedkits, this.medkits + 1);
    this.pipebombs = Math.min(this.maxPipebombs, this.pipebombs + 1);
    this.addAmmo(60);
    this.game.audio.pickup();
  }

  getMuzzleWorldPosition(target) {
    const hip = new THREE.Vector3(0.19, -0.15, -0.72);
    const ads = new THREE.Vector3(0.0, -0.07, -0.62);
    const offset = hip.lerp(ads, this.adsProgress);
    return target
      .copy(offset)
      .applyQuaternion(this.camera.quaternion)
      .add(this.camera.position);
  }

  getSnapshot() {
    return {
      health: Math.ceil(this.health),
      maxHealth: this.maxHealth,
      downed: this.downed,
      bleedout: this.bleedout,
      medkits: this.medkits,
      pipebombs: this.pipebombs,
      weapon: this.weapon,
      ammo: this.ammo,
      reloading: this.reloading,
      reloadProgress: this.reloading
        ? 1 - this.reloadTimer / Math.max(0.01, this.reloadDuration)
        : 0,
      ads: this.adsProgress,
      sprinting: this.sprinting,
      position: this.position,
      flashlightOn: this.flashlightOn,
    };
  }
}

