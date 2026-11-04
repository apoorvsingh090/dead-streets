import * as THREE from "three";
import { clamp, lerp, damp, rand, createCanvasTexture } from "./utils.js";

export const WEAPONS = {
  rifle: {
    id: "rifle",
    name: "M16 RIFLE",
    category: "ASSAULT RIFLE",
    magSize: 30,
    startReserve: 120,
    maxReserve: 240,
    damage: 27,
    pellets: 1,
    range: 120,
    fireDelay: 0.095,
    reloadTime: 1.75,
    spreadHip: 0.019,
    spreadAds: 0.0045,
    spreadMoving: 0.016,
    recoilPitch: 0.0085,
    recoilYaw: 0.0032,
    shake: 0.04,
    sound: "rifle",
    auto: true,
    slot: 1,
  },
  shotgun: {
    id: "shotgun",
    name: "COMBAT SHOTGUN",
    category: "PUMP SHOTGUN",
    magSize: 8,
    startReserve: 36,
    maxReserve: 72,
    damage: 13,
    pellets: 9,
    range: 64,
    fireDelay: 0.82,
    reloadTime: 2.3,
    spreadHip: 0.072,
    spreadAds: 0.045,
    spreadMoving: 0.012,
    recoilPitch: 0.038,
    recoilYaw: 0.009,
    shake: 0.22,
    sound: "shotgun",
    auto: false,
    slot: 2,
  },
  pistol: {
    id: "pistol",
    name: "M1911",
    category: "SIDEARM",
    magSize: 15,
    startReserve: Infinity,
    maxReserve: Infinity,
    damage: 21,
    pellets: 1,
    range: 92,
    fireDelay: 0.165,
    reloadTime: 1.35,
    spreadHip: 0.022,
    spreadAds: 0.008,
    spreadMoving: 0.012,
    recoilPitch: 0.014,
    recoilYaw: 0.004,
    shake: 0.055,
    sound: "pistol",
    auto: true,
    slot: 3,
  },
};

function createMuzzleFlashTexture() {
  return createCanvasTexture(128, 128, (context, width, height) => {
    context.clearRect(0, 0, width, height);
    const gradient = context.createRadialGradient(width / 2, height / 2, 1, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, "rgba(255, 255, 225, 0.95)");
    gradient.addColorStop(0.18, "rgba(255, 220, 136, 0.9)");
    gradient.addColorStop(0.46, "rgba(255, 130, 52, 0.45)");
    gradient.addColorStop(1, "rgba(255, 100, 25, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.globalCompositeOperation = "lighter";
    context.fillStyle = "rgba(255, 233, 168, 0.7)";
    for (let i = 0; i < 7; i += 1) {
      context.save();
      context.translate(width / 2, height / 2);
      context.rotate((Math.PI * 2 * i) / 7 + rand(-0.2, 0.2));
      context.fillRect(0, -2, rand(22, 52), rand(3, 7));
      context.restore();
    }
  });
}

function buildMaterials() {
  return {
    gunmetal: new THREE.MeshStandardMaterial({
      color: 0x565b5d,
      roughness: 0.38,
      metalness: 0.38,
    }),
    darkMetal: new THREE.MeshStandardMaterial({
      color: 0x303638,
      roughness: 0.44,
      metalness: 0.32,
    }),
    polymer: new THREE.MeshStandardMaterial({
      color: 0x353b39,
      roughness: 0.74,
      metalness: 0.06,
    }),
    tanPolymer: new THREE.MeshStandardMaterial({
      color: 0x756749,
      roughness: 0.8,
      metalness: 0.04,
    }),
    wood: new THREE.MeshStandardMaterial({
      color: 0x6e4428,
      roughness: 0.82,
      metalness: 0.03,
    }),
    tape: new THREE.MeshStandardMaterial({
      color: 0xa18a5c,
      roughness: 0.95,
    }),
    glove: new THREE.MeshStandardMaterial({
      color: 0x3a3932,
      roughness: 0.95,
    }),
    skin: new THREE.MeshStandardMaterial({
      color: 0x9b7b62,
      roughness: 0.9,
    }),
    sleeve: new THREE.MeshStandardMaterial({
      color: 0x455149,
      roughness: 0.96,
    }),
    sleeveAlt: new THREE.MeshStandardMaterial({
      color: 0x70443a,
      roughness: 0.96,
    }),
  };
}

function box(width, height, depth, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function cylinder(radiusTop, radiusBottom, height, material, x = 0, y = 0, z = 0, rotationX = Math.PI / 2) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 12),
    material
  );
  mesh.position.set(x, y, z);
  mesh.rotation.x = rotationX;
  return mesh;
}

function addArm(group, side, material, gloveMaterial, options = {}) {
  const { anchorZ = -0.06, anchorX = 0.04, anchorY = -0.15, reach = 0.42 } = options;
  const forearm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.06, reach, 8),
    material
  );
  forearm.rotation.x = -1.08;
  forearm.rotation.z = side * 0.22;
  forearm.position.set(anchorX + side * 0.055, anchorY - 0.02, anchorZ + 0.14);
  group.add(forearm);

  const glove = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.18), gloveMaterial);
  glove.position.set(anchorX + side * 0.027, anchorY + 0.01, anchorZ);
  glove.rotation.x = -0.25;
  group.add(glove);
}

function buildRifle(materials, flashTexture) {
  const group = new THREE.Group();
  const receiver = box(0.11, 0.13, 0.46, materials.gunmetal, 0, 0, -0.11);
  group.add(receiver);

  const upper = box(0.1, 0.06, 0.55, materials.darkMetal, 0, 0.095, -0.19);
  group.add(upper);

  const handguard = box(0.09, 0.1, 0.36, materials.polymer, 0, 0.015, -0.48);
  group.add(handguard);
  for (let i = 0; i < 4; i += 1) {
    group.add(box(0.096, 0.012, 0.05, materials.darkMetal, 0, 0.062, -0.36 - i * 0.075));
  }

  group.add(cylinder(0.024, 0.024, 0.5, materials.darkMetal, 0, 0.04, -0.72));
  group.add(cylinder(0.037, 0.037, 0.07, materials.gunmetal, 0, 0.04, -0.95));
  group.add(box(0.075, 0.06, 0.18, materials.darkMetal, 0, 0.06, -0.97));

  const stock = box(0.1, 0.13, 0.33, materials.polymer, 0, -0.02, 0.27);
  stock.rotation.x = -0.08;
  group.add(stock);
  group.add(box(0.08, 0.16, 0.08, materials.darkMetal, 0, -0.015, 0.15));

  const grip = box(0.07, 0.17, 0.08, materials.polymer, -0.01, -0.14, 0.02);
  grip.rotation.x = 0.22;
  group.add(grip);

  const magazine = box(0.075, 0.25, 0.12, materials.darkMetal, 0, -0.16, -0.16);
  magazine.rotation.x = -0.13;
  group.add(magazine);

  const sightBase = box(0.055, 0.028, 0.2, materials.darkMetal, 0, 0.145, -0.25);
  group.add(sightBase);
  group.add(box(0.032, 0.07, 0.035, materials.darkMetal, 0, 0.19, -0.17));
  group.add(box(0.05, 0.08, 0.035, materials.darkMetal, 0, 0.18, -0.35));

  const tape = box(0.12, 0.035, 0.18, materials.tape, 0, 0.02, -0.36);
  group.add(tape);

  addArm(group, 1, materials.sleeve, materials.glove, {
    anchorZ: -0.02,
    anchorX: -0.055,
    anchorY: -0.23,
    reach: 0.5,
  });
  const support = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.055, 0.44, 8),
    materials.sleeveAlt
  );
  support.rotation.x = -1.26;
  support.rotation.z = -0.5;
  support.position.set(0.14, -0.17, -0.42);
  group.add(support);
  const supportGlove = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.17), materials.glove);
  supportGlove.position.set(0.03, -0.07, -0.48);
  supportGlove.rotation.x = -0.1;
  group.add(supportGlove);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.04, -1.01);
  group.add(muzzle);
  const flash = attachFlash(group, muzzle, flashTexture);

  group.scale.setScalar(0.71);
  return {
    group,
    muzzle,
    flash,
    basePos: new THREE.Vector3(0.29, -0.31, -0.69),
    adsPos: new THREE.Vector3(-0.005, -0.135, -0.79),
    baseRot: new THREE.Euler(0.015, -0.04, 0.012),
  };
}

function buildShotgun(materials, flashTexture) {
  const group = new THREE.Group();
  group.add(box(0.11, 0.13, 0.5, materials.gunmetal, 0, 0, -0.05));
  group.add(box(0.14, 0.06, 0.32, materials.darkMetal, 0, 0.1, -0.12));
  group.add(cylinder(0.034, 0.034, 0.86, materials.darkMetal, 0, 0.055, -0.65));
  group.add(cylinder(0.025, 0.025, 0.72, materials.gunmetal, 0, -0.02, -0.59));

  const pump = box(0.12, 0.1, 0.27, materials.wood, 0, -0.01, -0.57);
  group.add(pump);
  for (let i = 0; i < 5; i += 1) {
    const groove = new THREE.Mesh(
      new THREE.BoxGeometry(0.124, 0.012, 0.02),
      materials.darkMetal
    );
    groove.position.set(0, 0.054, -0.1 + i * 0.05);
    pump.add(groove);
  }

  const stock = box(0.1, 0.14, 0.44, materials.wood, 0, -0.035, 0.39);
  stock.rotation.x = -0.13;
  group.add(stock);
  group.add(box(0.08, 0.2, 0.08, materials.darkMetal, 0, -0.04, 0.15));

  const grip = box(0.07, 0.17, 0.09, materials.wood, -0.02, -0.15, 0.12);
  grip.rotation.x = 0.2;
  group.add(grip);

  group.add(box(0.075, 0.1, 0.08, materials.darkMetal, 0, 0.15, -0.23));
  group.add(box(0.044, 0.075, 0.035, materials.darkMetal, 0, 0.22, -0.22));

  addArm(group, 1, materials.sleeveAlt, materials.glove, {
    anchorZ: 0.04,
    anchorX: -0.055,
    anchorY: -0.23,
    reach: 0.48,
  });
  const support = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.057, 0.48, 8),
    materials.sleeve
  );
  support.rotation.x = -1.31;
  support.rotation.z = -0.42;
  support.position.set(0.14, -0.18, -0.51);
  group.add(support);
  const supportGlove = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.18), materials.glove);
  supportGlove.position.set(0.025, -0.075, -0.57);
  supportGlove.rotation.x = -0.06;
  group.add(supportGlove);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.055, -1.09);
  group.add(muzzle);
  const flash = attachFlash(group, muzzle, flashTexture, 1.2);

  group.scale.setScalar(0.69);
  return {
    group,
    muzzle,
    flash,
    basePos: new THREE.Vector3(0.29, -0.305, -0.71),
    adsPos: new THREE.Vector3(-0.005, -0.13, -0.81),
    baseRot: new THREE.Euler(0.01, -0.035, 0.01),
  };
}

function buildPistol(materials, flashTexture) {
  const group = new THREE.Group();
  group.add(box(0.095, 0.1, 0.37, materials.gunmetal, 0, 0.01, -0.16));
  group.add(box(0.084, 0.035, 0.31, materials.darkMetal, 0, 0.08, -0.18));
  group.add(cylinder(0.019, 0.019, 0.13, materials.darkMetal, 0, 0.015, -0.39));
  group.add(box(0.078, 0.15, 0.09, materials.polymer, 0, -0.105, -0.01));

  const grip = box(0.072, 0.2, 0.085, materials.polymer, 0, -0.15, 0.015);
  grip.rotation.x = -0.14;
  group.add(grip);

  group.add(box(0.06, 0.018, 0.072, materials.darkMetal, 0, 0.11, -0.22));
  group.add(box(0.018, 0.035, 0.025, materials.darkMetal, 0.029, 0.11, -0.09));
  group.add(box(0.018, 0.035, 0.025, materials.darkMetal, -0.029, 0.11, -0.09));

  const tape = box(0.1, 0.025, 0.14, materials.tape, 0, -0.015, -0.2);
  group.add(tape);

  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.18), materials.glove);
  hand.position.set(0, -0.17, 0.04);
  hand.rotation.x = 0.04;
  group.add(hand);

  const forearm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.064, 0.5, 8),
    materials.sleeve
  );
  forearm.rotation.x = -1.05;
  forearm.rotation.z = 0.35;
  forearm.position.set(0.12, -0.33, 0.24);
  group.add(forearm);

  const support = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, 0.17), materials.glove);
  support.position.set(-0.04, -0.14, -0.01);
  support.rotation.z = -0.25;
  group.add(support);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.015, -0.46);
  group.add(muzzle);
  const flash = attachFlash(group, muzzle, flashTexture, 0.72);

  group.scale.setScalar(0.76);
  return {
    group,
    muzzle,
    flash,
    basePos: new THREE.Vector3(0.25, -0.275, -0.58),
    adsPos: new THREE.Vector3(-0.005, -0.12, -0.65),
    baseRot: new THREE.Euler(0.01, -0.04, 0.01),
  };
}

function attachFlash(group, muzzle, texture, scale = 1) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    color: 0xffd38a,
    toneMapped: false,
  });
  const flash = new THREE.Sprite(material);
  flash.position.copy(muzzle.position);
  flash.scale.setScalar(0.32 * scale);
  flash.visible = false;
  flash.renderOrder = 30;
  group.add(flash);
  return flash;
}

export class WeaponView {
  constructor(camera) {
    this.camera = camera;
    this.root = new THREE.Group();
    this.root.position.set(0, 0, 0);
    camera.add(this.root);

    const materials = buildMaterials();
    const flashTexture = createMuzzleFlashTexture();

    this.models = {
      rifle: buildRifle(materials, flashTexture),
      shotgun: buildShotgun(materials, flashTexture),
      pistol: buildPistol(materials, flashTexture),
    };

    for (const model of Object.values(this.models)) {
      model.group.visible = false;
      model.group.traverse((child) => {
        if (child.isMesh) {
          child.renderOrder = 5;
          child.frustumCulled = false;
        }
      });
      this.root.add(model.group);
    }

    this.currentId = null;
    this.kick = 0;
    this.switchOffset = 0;
    this.bobPhase = rand(0, Math.PI * 2);
    this.lookSwayX = 0;
    this.lookSwayY = 0;
    this.muzzleTimer = 0;
    this.shoveTimer = 0;
    this.adsProgress = 0;
    this.reloadProgress = 0;
    this.reloadActive = false;
    this.sprintOffset = 0;
    this.time = 0;
    this.setWeapon("rifle", true);
  }

  setWeapon(id, force = false) {
    if (!this.models[id] || (this.currentId === id && !force)) return;
    if (this.currentId) this.models[this.currentId].group.visible = false;
    this.currentId = id;
    const model = this.models[id];
    model.group.visible = true;
    model.group.position.copy(model.basePos);
    model.group.rotation.copy(model.baseRot);
    this.switchOffset = force ? 0 : 0.17;
    this.kick = 0;
    this.muzzleTimer = 0;
    model.flash.visible = false;
  }

  addLook(dx, dy) {
    this.lookSwayX = clamp(this.lookSwayX + dx * 0.0024, -0.5, 0.5);
    this.lookSwayY = clamp(this.lookSwayY + dy * 0.002, -0.4, 0.4);
  }

  fire() {
    this.kick = Math.min(1.2, this.kick + 0.95);
    this.muzzleTimer = 0.055;
    const model = this.models[this.currentId];
    if (model) {
      model.flash.visible = true;
      model.flash.material.rotation = rand(0, Math.PI * 2);
      model.flash.scale.setScalar(rand(0.22, 0.38) * (this.currentId === "shotgun" ? 1.4 : 1));
    }
  }

  shove() {
    this.shoveTimer = 1;
  }

  getMuzzleWorldPosition(target) {
    const model = this.models[this.currentId];
    if (!model) return target.set(0, 0, 0);
    model.group.updateWorldMatrix(true, false);
    return model.muzzle.getWorldPosition(target);
  }

  update(dt, options = {}) {
    this.time += dt;
    const {
      speed = 0,
      ads = 0,
      sprinting = false,
      reloading = false,
      reloadProgress = 0,
      downed = false,
      lowered = false,
    } = options;

    this.adsProgress = damp(this.adsProgress, ads, 14, dt);
    this.reloadActive = reloading;
    this.reloadProgress = reloadProgress;
    this.sprintOffset = damp(this.sprintOffset, sprinting ? 1 : 0, 10, dt);
    this.kick = damp(this.kick, 0, 13, dt);
    this.switchOffset = damp(this.switchOffset, 0, 11, dt);
    this.lookSwayX = damp(this.lookSwayX, 0, 8, dt);
    this.lookSwayY = damp(this.lookSwayY, 0, 8, dt);
    this.shoveTimer = Math.max(0, this.shoveTimer - dt * 2.8);

    this.root.visible = !downed && !lowered;
    if (!this.root.visible) {
      this.muzzleTimer = 0;
      return;
    }

    const model = this.models[this.currentId];
    if (!model) return;

    const movementIntensity = clamp(speed / 7.8, 0, 1.2);
    this.bobPhase += dt * (4.4 + movementIntensity * 8.4);
    const bobScale = (1 - this.adsProgress * 0.72) * (0.25 + movementIntensity);
    const bobX = Math.sin(this.bobPhase) * 0.0082 * bobScale;
    const bobY = Math.abs(Math.cos(this.bobPhase)) * 0.0085 * bobScale;
    const breatheY = Math.sin(this.time * 1.45) * 0.0014 * (1 - movementIntensity * 0.5);
    const reloadArc = reloading ? Math.sin(clamp(reloadProgress, 0, 1) * Math.PI) : 0;
    const switchArc = this.switchOffset;
    const shoveArc = Math.sin(clamp(this.shoveTimer, 0, 1) * Math.PI);

    const basePos = model.basePos;
    const targetX = lerp(basePos.x, model.adsPos.x, this.adsProgress) + bobX - this.lookSwayX * 0.012;
    const targetY =
      lerp(basePos.y, model.adsPos.y, this.adsProgress) -
      bobY +
      breatheY -
      reloadArc * 0.13 -
      switchArc * 0.9 -
      this.sprintOffset * 0.04 +
      this.kick * 0.028;
    const targetZ =
      lerp(basePos.z, model.adsPos.z, this.adsProgress) +
      this.kick * 0.07 -
      shoveArc * 0.18;

    model.group.position.x = damp(model.group.position.x, targetX, 18, dt);
    model.group.position.y = damp(model.group.position.y, targetY, 18, dt);
    model.group.position.z = damp(model.group.position.z, targetZ, 18, dt);

    const targetRotX =
      model.baseRot.x +
      this.kick * 0.045 +
      reloadArc * 0.34 -
      switchArc * 0.55 +
      this.sprintOffset * 0.12;
    const targetRotY =
      model.baseRot.y -
      this.lookSwayX * 0.03 -
      this.adsProgress * 0.02 +
      shoveArc * 0.5;
    const targetRotZ =
      model.baseRot.z +
      this.lookSwayY * 0.02 +
      reloadArc * 0.28 +
      this.sprintOffset * 0.1 -
      shoveArc * 0.18;

    model.group.rotation.x = damp(model.group.rotation.x, targetRotX, 16, dt);
    model.group.rotation.y = damp(model.group.rotation.y, targetRotY, 16, dt);
    model.group.rotation.z = damp(model.group.rotation.z, targetRotZ, 16, dt);

    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= dt;
      if (this.muzzleTimer <= 0) {
        for (const item of Object.values(this.models)) {
          item.flash.visible = false;
        }
      }
    }
  }
}
