import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { clamp, damp, rand, dampAngle, choice } from "./utils.js";

// CC0 animated allies (Quaternius Ultimate Animated Character Pack,
// mirrored via Cinevva CDN; see README credits). Loaded async; bots fall
// back to the procedural model until the GLB arrives (or if it fails).
const ALLY_ASSETS = {
  rook: { file: "ally_rook.glb", scene: null, clips: [], state: "loading" },
  mara: { file: "ally_mara.glb", scene: null, clips: [], state: "loading" },
};

const allyLoader = new GLTFLoader();
for (const [id, asset] of Object.entries(ALLY_ASSETS)) {
  allyLoader.load(
    `${import.meta.env?.BASE_URL ?? "/"}models/${asset.file}`,
    (gltf) => {
      asset.scene = gltf.scene;
      asset.clips = gltf.animations ?? [];
      asset.state = "ready";
    },
    undefined,
    () => {
      asset.state = "failed";
    }
  );
}

const SURVIVOR_CONFIG = [
  {
    id: "rook",
    name: "ROOK",
    jacket: 0x4c5c49,
    shirt: 0x2e3530,
    pants: 0x292a25,
    skin: 0x8f6a51,
    accent: 0xb9a36a,
    damage: 15,
    interval: 0.34,
    range: 31,
    offsetSide: -2.15,
    offsetBack: 1.7,
    weapon: "rifle",
  },
  {
    id: "mara",
    name: "MARA",
    jacket: 0x733d36,
    shirt: 0x3e302e,
    pants: 0x24262a,
    skin: 0xb08368,
    accent: 0xc7b9a0,
    damage: 29,
    interval: 0.82,
    range: 24,
    offsetSide: 2.15,
    offsetBack: 1.9,
    weapon: "shotgun",
  },
];

function createBotModel(shared, config) {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const jacket = new THREE.MeshStandardMaterial({ color: config.jacket, roughness: 0.95 });
  const shirt = new THREE.MeshStandardMaterial({ color: config.shirt, roughness: 0.96 });
  const pants = new THREE.MeshStandardMaterial({ color: config.pants, roughness: 0.97 });
  const skin = new THREE.MeshStandardMaterial({ color: config.skin, roughness: 0.9 });
  const hair = new THREE.MeshStandardMaterial({ color: config.id === "mara" ? 0x2a1b15 : 0x2a241d, roughness: 1 });
  const boot = shared.boots;
  const accent = new THREE.MeshStandardMaterial({ color: config.accent, roughness: 0.86 });
  const gunMetal = new THREE.MeshStandardMaterial({ color: 0x232728, roughness: 0.42, metalness: 0.74 });

  const torso = new THREE.Mesh(shared.torsoGeometry, jacket);
  torso.position.y = 1.22;
  torso.scale.set(0.86, 1.0, 0.82);
  bodyGroup.add(torso);

  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 0.1), accent);
  vest.position.set(0, 1.24, 0.16);
  bodyGroup.add(vest);
  // Vest straps so it reads as gear, not a floating plate.
  const strapGeo = new THREE.BoxGeometry(0.09, 0.5, 0.11);
  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(strapGeo, shirt);
    strap.position.set(side * 0.16, 1.24, 0.155);
    bodyGroup.add(strap);
  }

  const neck = new THREE.Mesh(shared.neckGeometry, skin);
  neck.position.y = 1.66;
  neck.scale.set(0.9, 0.8, 0.9);
  bodyGroup.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.82, 0.02);
  bodyGroup.add(headGroup);
  const head = new THREE.Mesh(shared.headGeometry, skin);
  // Narrower skull reads human under the low-poly shading.
  head.scale.set(0.8, 0.92, 0.84);
  headGroup.add(head);

  const hairMesh = new THREE.Mesh(shared.hairGeometry, hair);
  hairMesh.position.y = 0.06;
  hairMesh.scale.set(0.86, 0.5, 0.88);
  headGroup.add(hairMesh);

  if (config.id === "rook") {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x394438, roughness: 0.98 })
    );
    cap.scale.set(1, 0.45, 1);
    cap.position.y = 0.1;
    headGroup.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.19), cap.material);
    brim.position.set(0, 0.08, 0.2);
    headGroup.add(brim);
  } else {
    const ponytail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.03, 0.28, 6),
      hair
    );
    ponytail.position.set(0, 0.02, -0.22);
    ponytail.rotation.x = -0.45;
    headGroup.add(ponytail);
  }

  const armPivots = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.33, 1.52, 0);
    bodyGroup.add(pivot);
    const arm = new THREE.Mesh(shared.armGeometry, jacket);
    arm.position.y = -0.3;
    arm.scale.set(0.9, 0.95, 0.9);
    pivot.add(arm);
    // Hands meet in front of the chest where the gun sits.
    const hand = new THREE.Mesh(shared.handGeometry, skin);
    hand.position.set(-side * 0.07, -0.62, 0.16);
    hand.scale.setScalar(0.9);
    pivot.add(hand);
    armPivots.push(pivot);
    // Low-ready carry, slight asymmetry so they don't mirror like mannequins.
    pivot.rotation.x = side < 0 ? -0.72 : -0.62;
    pivot.rotation.z = side * -0.12;
  }

  const legPivots = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.16, 0.92, 0);
    bodyGroup.add(pivot);
    const leg = new THREE.Mesh(shared.legGeometry, pants);
    leg.position.y = -0.44;
    leg.scale.set(0.88, 1.05, 0.88);
    pivot.add(leg);
    const foot = new THREE.Mesh(shared.footGeometry, boot);
    foot.position.set(0, -0.88, 0.1);
    pivot.add(foot);
    legPivots.push(pivot);
  }

  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.5, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x2a2923, roughness: 0.97 })
  );
  backpack.position.set(0, 1.26, -0.24);
  bodyGroup.add(backpack);

  const gun = new THREE.Group();
  const body = new THREE.Mesh(
    config.weapon === "shotgun"
      ? new THREE.BoxGeometry(0.09, 0.13, 0.55)
      : new THREE.BoxGeometry(0.09, 0.13, 0.48),
    gunMetal
  );
  gun.add(body);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, config.weapon === "shotgun" ? 0.75 : 0.58, 8),
    gunMetal
  );
  // Character forward is +Z (face, stain and eyes all sit at +Z), so the
  // barrel must point +Z, not into the carrier's own chest.
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, 0.52);
  gun.add(barrel);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.3), gunMetal);
  stock.position.set(0, -0.02, -0.3);
  gun.add(stock);
  // Tucked into the chest between both hands.
  gun.position.set(0.1, 1.28, 0.32);
  gun.rotation.x = 0.02;
  bodyGroup.add(gun);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.04, 0.92);
  gun.add(muzzle);

  const flash = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: shared.flashTexture,
      color: 0xffd38a,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  flash.scale.setScalar(0.28);
  flash.position.copy(muzzle.position);
  flash.visible = false;
  gun.add(flash);

  const shadow = new THREE.Mesh(
    shared.shadowGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.022;
  shadow.scale.set(1.1, 1.2, 1);
  root.add(shadow);

  return {
    root,
    bodyGroup,
    headGroup,
    armPivots,
    legPivots,
    gun,
    muzzle,
    flash,
    shadow,
    backpack,
    downedRotation: 0,
  };
}

class SurvivorBot {
  constructor(game, config, index) {
    this.game = game;
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.index = index;
    this.radius = 0.34;
    this.maxHealth = 100;
    this.health = 100;
    this.alive = true;
    this.downed = false;
    this.bleedout = 0;
    this.position = new THREE.Vector3();
    this.velocityX = 0;
    this.velocityZ = 0;
    this.heading = Math.PI;
    this.walkPhase = rand(0, Math.PI * 2);
    this.fireCooldown = rand(0.2, 0.9);
    this.targetTimer = rand(0, 0.2);
    this.target = null;
    this.reviveTimer = 0;
    this.reviveCallout = false;
    this.flashTimer = 0;
    this.staggered = 0;
    this.followDistance = 0;
    this.deadTime = 0;
    this.lookTarget = new THREE.Vector3();

    const shared = game.zombies.shared;
    shared.flashTexture = shared.flashTexture || createAllyFlashTexture(game);
    this.shared = shared;
    this.skinned = null;
    this.model = createBotModel(shared, config);
    this.root = this.model.root;
    this.game.scene.add(this.root);

    this.setSpawn(index);
    this.maybeUpgradeToSkinned();
  }

  maybeUpgradeToSkinned() {
    if (this.skinned) return;
    const asset = ALLY_ASSETS[this.id];
    if (!asset || asset.state !== "ready" || !asset.scene) return;
    try {
      this.upgradeToSkinned(asset);
    } catch (error) {
      console.warn(`Ally ${this.id} skinned upgrade failed, keeping procedural:`, error);
    }
  }

  upgradeToSkinned(asset) {
    // Swap the procedural body for the CC0 skinned character. Keep the same
    // root position/heading so the bot doesn't teleport.
    this.game.scene.remove(this.root);
    const root = new THREE.Group();
    root.name = `ally-${this.id}`;
    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    const clone = cloneSkinned(asset.scene);
    // Quaternius soldiers are ~1.84m tall; our eye/hearing heights assume ~1.8m.
    clone.scale.setScalar(0.98);
    bodyGroup.add(clone);

    const mixer = new THREE.AnimationMixer(clone);
    const actions = {};
    for (const clip of asset.clips) {
      actions[clip.name] = mixer.clipAction(clip);
    }
    const play = (name, force = false) => {
      const next = actions[name];
      if (!next) return;
      if (this.skinned.current === next && !force) return;
      if (this.skinned.current) this.skinned.current.fadeOut(0.22);
      next.reset().fadeIn(0.22).play();
      this.skinned.current = next;
      this.skinned.currentName = name;
    };

    // Strap a simple gun into the right fist so tracers/muzzle match the hands.
    const gunMetal = new THREE.MeshStandardMaterial({ color: 0x232728, roughness: 0.42, metalness: 0.74 });
    const gun = new THREE.Group();
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.5), gunMetal);
    gun.add(gunBody);
    const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 8), gunMetal);
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.set(0, 0.03, 0.42);
    gun.add(gunBarrel);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.03, 0.68);
    gun.add(muzzle);
    const fist = clone.getObjectByName("FistR");
    if (fist) {
      gun.position.set(0, -0.02, 0.12);
      fist.add(gun);
    } else {
      gun.position.set(0.22, 1.3, 0.4);
      bodyGroup.add(gun);
    }
    const flash = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.shared.flashTexture,
        color: 0xffd38a,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    flash.scale.setScalar(0.3);
    flash.position.copy(muzzle.position);
    flash.visible = false;
    gun.add(flash);

    const shadow = new THREE.Mesh(
      this.shared.shadowGeometry,
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.022;
    shadow.scale.set(1.1, 1.2, 1);
    root.add(shadow);

    root.position.copy(this.position);
    root.rotation.y = this.heading;
    this.game.scene.add(root);

    this.root = root;
    this.model = {
      root,
      bodyGroup,
      headGroup: clone.getObjectByName("Head") ?? new THREE.Group(),
      armPivots: [],
      legPivots: [],
      gun,
      muzzle,
      flash,
      shadow,
      backpack: null,
      downedRotation: 0,
    };
    this.skinned = { mixer, actions, play, current: null, currentName: "", deathPlayed: false };
    play(this.downed || !this.alive ? "Death" : "Idle", true);
    if (!this.alive || this.downed) {
      this.model.gun.visible = false;
    }
  }

  setSpawn(index) {
    const player = this.game.player;
    const side = this.config.offsetSide;
    this.position.set(
      player.position.x + side,
      0,
      player.position.z + this.config.offsetBack
    );
    this.root.position.copy(this.position);
  }

  getSnapshot() {
    return {
      id: this.id,
      name: this.name,
      health: Math.ceil(this.health),
      maxHealth: this.maxHealth,
      downed: this.downed,
      alive: this.alive,
      bleedout: this.bleedout,
    };
  }

  update(dt) {
    this.maybeUpgradeToSkinned();
    if (!this.alive) {
      this.updateDead(dt);
      return;
    }

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.targetTimer -= dt;
    this.reviveTimer = Math.max(0, this.reviveTimer - dt * 0.1);
    this.staggered = Math.max(0, this.staggered - dt);
    this.updateFlash(dt);

    if (this.downed) {
      this.updateDowned(dt);
      return;
    }

    if (this.targetTimer <= 0 || !this.target || this.target.dead) {
      this.target = this.game.zombies.getNearestAlive(this.position, this.config.range, true);
      this.targetTimer = rand(0.28, 0.55);
    }

    const player = this.game.player;
    const playerDowned = player.downed;
    let desiredX;
    let desiredZ;
    let speed = 5.3;

    if (playerDowned) {
      desiredX = player.position.x + (this.index === 0 ? -0.9 : 0.9);
      desiredZ = player.position.z;
      speed = 6.2;
      const dx = player.position.x - this.position.x;
      const dz = player.position.z - this.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 1.75) {
        this.velocityX = damp(this.velocityX, 0, 12, dt);
        this.velocityZ = damp(this.velocityZ, 0, 12, dt);
        this.reviveTimer += dt;
        if (!this.reviveCallout) {
          this.reviveCallout = true;
          this.game.hud.subtitle(this.name, "Hold on. I've got you.", 3);
        }
        if (this.reviveTimer >= 2.8) {
          this.reviveTimer = 0;
          this.reviveCallout = false;
          this.game.player.revive(45);
          this.game.hud.addKillfeed(`${this.name} REVIVED YOU`, false);
        }
        this.facePosition(player.position, dt, true);
        this.animate(dt, 0);
            return;
      }
    } else {
      const forwardX = -Math.sin(player.yaw);
      const forwardZ = -Math.cos(player.yaw);
      const rightX = Math.cos(player.yaw);
      const rightZ = -Math.sin(player.yaw);
      desiredX = player.position.x + rightX * this.config.offsetSide - forwardX * this.config.offsetBack;
      desiredZ = player.position.z + rightZ * this.config.offsetSide - forwardZ * this.config.offsetBack;
      if (Math.hypot(desiredX - this.position.x, desiredZ - this.position.z) > 10) {
        speed = 7.4;
      }
      this.reviveCallout = false;
      this.reviveTimer = 0;
    }

    let dx = desiredX - this.position.x;
    let dz = desiredZ - this.position.z;
    const followDistance = Math.hypot(dx, dz);
    this.followDistance = followDistance;

    if (followDistance > 1.4) {
      dx /= followDistance;
      dz /= followDistance;
      this.velocityX = damp(this.velocityX, dx * speed, 8, dt);
      this.velocityZ = damp(this.velocityZ, dz * speed, 8, dt);
    } else {
      this.velocityX = damp(this.velocityX, 0, 12, dt);
      this.velocityZ = damp(this.velocityZ, 0, 12, dt);
    }

    if (followDistance > 26 && !this.target) {
      const teleportX = player.position.x + this.config.offsetSide;
      const teleportZ = player.position.z + this.config.offsetBack;
      if (!this.game.world.collidesCircle(teleportX, teleportZ, this.radius)) {
        this.position.set(teleportX, 0, teleportZ);
        this.velocityX = 0;
        this.velocityZ = 0;
      }
    }

    this.game.world.resolveMovement(
      this.position,
      this.velocityX * dt,
      this.velocityZ * dt,
      this.radius
    );

    const moveSpeed = Math.hypot(this.velocityX, this.velocityZ);
    const faceTarget = this.target && !this.target.dead ? this.target.position : null;
    if (faceTarget && moveSpeed < 1.2) {
      this.facePosition(faceTarget, dt, true);
    } else if (moveSpeed > 0.2) {
      this.heading = dampAngle(this.heading, Math.atan2(this.velocityX, this.velocityZ), 8, dt);
      this.root.rotation.y = this.heading;
    }

    this.tryShoot(dt);
    this.animate(dt, moveSpeed);
    this.root.position.copy(this.position);
  }

  updateDowned(dt) {
    this.bleedout -= dt;
    this.health = 0;
    this.velocityX = damp(this.velocityX, 0, 9, dt);
    this.velocityZ = damp(this.velocityZ, 0, 9, dt);
    const player = this.game.player;
    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 2.2) {
      this.velocityX = damp(this.velocityX, (dx / distance) * 1.1, 5, dt);
      this.velocityZ = damp(this.velocityZ, (dz / distance) * 1.1, 5, dt);
      this.game.world.resolveMovement(
        this.position,
        this.velocityX * dt,
        this.velocityZ * dt,
        this.radius
      );
    } else {
      this.velocityX = 0;
      this.velocityZ = 0;
    }

    this.model.bodyGroup.rotation.z = damp(this.model.bodyGroup.rotation.z, -1.15, 8, dt);
    this.model.bodyGroup.rotation.x = damp(this.model.bodyGroup.rotation.x, 0.16, 8, dt);
    this.model.bodyGroup.position.y = damp(this.model.bodyGroup.position.y, 0.36, 8, dt);
    this.model.gun.visible = false;
    this.root.position.copy(this.position);

    if (this.skinned) {
      if (!this.skinned.deathPlayed) {
        this.skinned.deathPlayed = true;
        const death = this.skinned.actions.Death;
        if (death) {
          if (this.skinned.current) this.skinned.current.fadeOut(0.2);
          death.reset().setLoop(THREE.LoopOnce, 1);
          death.clampWhenFinished = true;
          death.fadeIn(0.25).play();
          this.skinned.current = death;
          this.skinned.currentName = "Death";
        }
      }
      this.skinned.mixer.update(dt);
      if (this.bleedout <= 0) {
        this.die();
      }
      return;
    }

    this.model.bodyGroup.rotation.z = damp(this.model.bodyGroup.rotation.z, -1.15, 8, dt);
    this.model.bodyGroup.rotation.x = damp(this.model.bodyGroup.rotation.x, 0.16, 8, dt);
    this.model.bodyGroup.position.y = damp(this.model.bodyGroup.position.y, 0.36, 8, dt);
    this.model.gun.visible = false;
    this.root.position.copy(this.position);

    if (this.bleedout <= 0) {
      this.die();
    }
  }

  tryShoot(dt) {
    if (!this.target || this.target.dead || this.fireCooldown > 0) return;
    if (this.game.state !== "playing") return;
    if (!this.game.world.hasLineOfSight(this.position, this.target.position)) {
      this.target = null;
      return;
    }

    this.fireCooldown = this.config.interval * rand(0.82, 1.18);
    this.facePosition(this.target.position, dt, true);
    this.flashTimer = 0.055;
    this.model.flash.visible = true;
    this.model.flash.material.rotation = rand(0, Math.PI * 2);
    this.model.flash.scale.setScalar(rand(0.2, 0.34));

    const muzzle = new THREE.Vector3();
    this.model.muzzle.getWorldPosition(muzzle);
    const targetPoint = this.target.position
      .clone()
      .add(new THREE.Vector3(0, 1.28 + rand(-0.15, 0.2), 0));
    const direction = targetPoint.clone().sub(muzzle).normalize();
    this.game.effects.tracer(muzzle, targetPoint, 0xffe1a0, 0.32);

    const hitChance = this.config.weapon === "shotgun" ? 0.82 : 0.88;
    if (Math.random() < hitChance) {
      const headshot = Math.random() < 0.08;
      const result = this.target.takeDamage(this.config.damage * rand(0.85, 1.1), {
        headshot,
        direction,
        killer: this,
      });
      this.game.effects.blood(targetPoint, direction, headshot);
      if (result.killed) {
        this.target = null;
      }
    } else {
      this.game.effects.impact(
        new THREE.Vector3(
          targetPoint.x + rand(-1.4, 1.4),
          rand(0.2, 1.7),
          targetPoint.z + rand(-1.4, 1.4)
        ),
        new THREE.Vector3(0, 1, 0),
        "concrete"
      );
    }

    this.game.audio.allyShot(this.game.zombies.panFor(this.position), this.config.weapon === "shotgun");
  }

  facePosition(position, dt, fast = false) {
    const dx = position.x - this.position.x;
    const dz = position.z - this.position.z;
    if (Math.abs(dx) + Math.abs(dz) < 0.001) return;
    this.heading = dampAngle(this.heading, Math.atan2(dx, dz), fast ? 12 : 8, dt);
    this.root.rotation.y = this.heading;
  }

  animate(dt, speed) {
    if (this.skinned) {
      this.skinned.mixer.update(dt);
      const loco = speed < 0.5 ? "Idle" : speed < 4 ? "Walk_Carry" : "Run_Carry";
      this.skinned.play(loco);
      const action = this.skinned.actions[loco];
      if (action && speed >= 0.5) {
        const base = loco === "Run_Carry" ? 5.2 : 2.1;
        action.timeScale = clamp(speed / base, 0.7, 1.5);
      }
      this.root.position.copy(this.position);
      return;
    }
    this.walkPhase += dt * (2.3 + clamp(speed, 0, 8) * 1.15);
    const swing = Math.sin(this.walkPhase);
    const swing2 = Math.sin(this.walkPhase + 0.5);
    const moving = clamp(speed / 5, 0, 1);
    const idle = 1 - moving;
    // Legs stride, idle settles straight.
    this.model.legPivots[0].rotation.x = swing * 0.55 * moving;
    this.model.legPivots[1].rotation.x = -swing2 * 0.55 * moving;
    // Arms carry low-ready: gentle counter-swing while walking, breathing sway idle.
    const breathe = Math.sin(this.walkPhase * 0.45) * 0.02;
    this.model.armPivots[0].rotation.x = -0.72 + swing * 0.22 * moving + breathe * idle;
    this.model.armPivots[1].rotation.x = -0.62 - swing2 * 0.22 * moving - breathe * idle;
    this.model.armPivots[0].rotation.z = -0.12 - moving * 0.02;
    this.model.armPivots[1].rotation.z = 0.12 + moving * 0.02;
    this.model.bodyGroup.position.y =
      Math.abs(Math.cos(this.walkPhase)) * 0.028 * moving + Math.sin(this.walkPhase * 0.45) * 0.006 * idle;
    this.model.bodyGroup.rotation.z = Math.sin(this.walkPhase * 0.5) * 0.02 * moving;
    // Torso leans into the run, gun bobs with the stride.
    this.model.bodyGroup.rotation.x = moving * 0.05;
    this.model.gun.position.y = 1.28 + Math.abs(Math.sin(this.walkPhase)) * 0.012 * moving;
    this.model.headGroup.rotation.z = Math.sin(this.walkPhase * 0.35) * 0.035;
    this.model.headGroup.rotation.x = moving * 0.04;
    this.root.position.copy(this.position);
  }

  updateFlash(dt) {
    if (this.flashTimer <= 0) {
      this.model.flash.visible = false;
      return;
    }
    this.flashTimer -= dt;
    if (this.flashTimer <= 0) this.model.flash.visible = false;
  }

  updateDead(dt) {
    this.deadTime += dt;
    this.model.gun.visible = false;
    if (this.skinned) {
      // Death clip already playing from downed; keep settling it.
      this.skinned.mixer.update(dt);
      this.root.position.copy(this.position);
      return;
    }
    this.model.bodyGroup.rotation.z = damp(this.model.bodyGroup.rotation.z, -1.4, 3, dt);
    this.model.bodyGroup.position.y = damp(this.model.bodyGroup.position.y, 0.28, 3, dt);
    this.root.position.copy(this.position);
  }

  takeDamage(amount, sourcePosition = null) {
    if (!this.alive || this.downed) return;
    this.health = Math.max(0, this.health - amount);
    if (sourcePosition) {
      const dx = this.position.x - sourcePosition.x;
      const dz = this.position.z - sourcePosition.z;
      const distance = Math.max(0.01, Math.hypot(dx, dz));
      this.position.x += (dx / distance) * 0.08;
      this.position.z += (dz / distance) * 0.08;
    }
    if (this.health <= 0) {
      this.goDown();
    }
  }

  goDown() {
    if (this.downed || !this.alive) return;
    this.downed = true;
    this.health = 0;
    this.bleedout = 38;
    this.velocityX = 0;
    this.velocityZ = 0;
    this.model.gun.visible = false;
    if (this.skinned) {
      this.skinned.deathPlayed = false;
    } else {
      this.model.bodyGroup.rotation.z = 0;
    }
    this.game.onBotDowned(this);
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.downed = false;
    if (this.skinned) {
      this.model.gun.visible = false;
      if (!this.skinned.deathPlayed) {
        this.skinned.deathPlayed = true;
        const death = this.skinned.actions.Death;
        if (death) {
          if (this.skinned.current) this.skinned.current.fadeOut(0.2);
          death.reset().setLoop(THREE.LoopOnce, 1);
          death.clampWhenFinished = true;
          death.fadeIn(0.25).play();
          this.skinned.current = death;
          this.skinned.currentName = "Death";
        }
      }
    }
    this.game.onBotDied(this);
  }

  revive(health = 50) {
    if (!this.alive || !this.downed) return;
    this.downed = false;
    this.health = health;
    this.bleedout = 0;
    this.reviveTimer = 0;
    this.reviveCallout = false;
    this.model.gun.visible = true;
    if (this.skinned) {
      this.skinned.deathPlayed = false;
      this.skinned.play("Idle", true);
    } else {
      this.model.bodyGroup.rotation.z = 0;
      this.model.bodyGroup.rotation.x = 0;
      this.model.bodyGroup.position.y = 0;
    }
    this.game.hud.subtitle(this.name, "I'm up. Let's move.", 2.6);
  }
}

function createAllyFlashTexture(game) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 226, 1)");
  gradient.addColorStop(0.25, "rgba(255, 210, 122, 0.9)");
  gradient.addColorStop(1, "rgba(255, 138, 46, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class Survivors {
  constructor(game) {
    this.game = game;
    this.bots = SURVIVOR_CONFIG.map((config, index) => new SurvivorBot(game, config, index));
  }

  update(dt) {
    for (const bot of this.bots) {
      bot.update(dt);
    }
  }

  getTargets() {
    return this.bots
      .filter((bot) => bot.alive)
      .map((bot) => ({
        kind: "bot",
        entity: bot,
        name: bot.name,
        position: bot.position,
        downed: bot.downed,
        alive: bot.alive,
        radius: bot.radius,
      }));
  }

  getSnapshots() {
    return this.bots.map((bot) => bot.getSnapshot());
  }

  getNearbyDowned(position, maxDistance = 2.2) {
    let best = null;
    let bestDistance = maxDistance;
    for (const bot of this.bots) {
      if (!bot.alive || !bot.downed) continue;
      const distance = Math.hypot(
        bot.position.x - position.x,
        bot.position.z - position.z
      );
      if (distance < bestDistance) {
        best = bot;
        bestDistance = distance;
      }
    }
    return best;
  }

  revive(bot) {
    if (!bot || !bot.downed) return false;
    bot.revive(50);
    this.game.hud.addKillfeed(`${bot.name} REVIVED`, false);
    return true;
  }

  healAll(amount) {
    for (const bot of this.bots) {
      if (!bot.alive || bot.downed) continue;
      bot.health = clamp(bot.health + amount, 0, bot.maxHealth);
    }
  }

  getAliveCount() {
    return this.bots.filter((bot) => bot.alive && !bot.downed).length;
  }

  getTeamAliveCount() {
    return this.bots.filter((bot) => bot.alive).length;
  }

  clear() {
    for (const bot of this.bots) {
      if (bot.root.parent) this.game.scene.remove(bot.root);
    }
    this.bots = [];
  }
}
