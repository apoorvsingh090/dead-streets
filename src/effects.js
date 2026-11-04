import * as THREE from "three";
import { rand, randInt, clamp, createCanvasTexture, choice } from "./utils.js";

const particleVertexShader = /* glsl */ `
  attribute float size;
  attribute float alpha;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (260.0 / max(1.0, -mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float distanceToCenter = length(center);
    if (distanceToCenter > 0.5) discard;
    float softness = smoothstep(0.5, 0.08, distanceToCenter);
    gl_FragColor = vec4(vColor, vAlpha * softness);
  }
`;

class ParticlePool {
  constructor(scene, capacity, blending) {
    this.capacity = capacity;
    this.cursor = 0;
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.sizes = new Float32Array(capacity);
    this.alphas = new Float32Array(capacity);
    this.velocities = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.active = new Uint8Array(capacity);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute("alpha", new THREE.BufferAttribute(this.alphas, 1));
    geometry.setDrawRange(0, capacity);

    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    scene.add(this.points);
    this.geometry = geometry;

    for (let i = 0; i < capacity; i += 1) {
      this.positions[i * 3 + 1] = -1000;
      this.alphas[i] = 0;
    }
  }

  spawn(position, velocity, color, size, life, gravity = 0, drag = 0) {
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    const offset = index * 3;
    this.positions[offset] = position.x;
    this.positions[offset + 1] = position.y;
    this.positions[offset + 2] = position.z;
    this.velocities[offset] = velocity.x;
    this.velocities[offset + 1] = velocity.y;
    this.velocities[offset + 2] = velocity.z;
    this.colors[offset] = color.r;
    this.colors[offset + 1] = color.g;
    this.colors[offset + 2] = color.b;
    this.sizes[index] = size;
    this.alphas[index] = 1;
    this.life[index] = life;
    this.maxLife[index] = life;
    this.gravity[index] = gravity;
    this.drag[index] = drag;
    this.active[index] = 1;
  }

  update(dt) {
    let changed = false;
    for (let i = 0; i < this.capacity; i += 1) {
      if (!this.active[i]) continue;
      changed = true;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.active[i] = 0;
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        continue;
      }
      const offset = i * 3;
      this.velocities[offset + 1] += this.gravity[i] * dt;
      const drag = Math.max(0, 1 - this.drag[i] * dt);
      this.velocities[offset] *= drag;
      this.velocities[offset + 1] *= drag;
      this.velocities[offset + 2] *= drag;
      this.positions[offset] += this.velocities[offset] * dt;
      this.positions[offset + 1] += this.velocities[offset + 1] * dt;
      this.positions[offset + 2] += this.velocities[offset + 2] * dt;
      if (this.positions[offset + 1] < 0.02) {
        this.positions[offset + 1] = 0.02;
        this.velocities[offset + 1] *= -0.18;
        this.velocities[offset] *= 0.55;
        this.velocities[offset + 2] *= 0.55;
      }
      const lifeRatio = this.life[i] / this.maxLife[i];
      this.alphas[i] = clamp(lifeRatio * 1.35, 0, 1);
    }

    if (changed) {
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.alpha.needsUpdate = true;
      this.geometry.attributes.size.needsUpdate = true;
      this.geometry.attributes.color.needsUpdate = true;
    }
  }

  clear() {
    for (let i = 0; i < this.capacity; i += 1) {
      this.active[i] = 0;
      this.alphas[i] = 0;
      this.sizes[i] = 0;
      this.positions[i * 3 + 1] = -1000;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.alpha.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }
}

function createBloodTexture() {
  return createCanvasTexture(256, 256, (context, width, height) => {
    context.clearRect(0, 0, width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const gradient = context.createRadialGradient(centerX, centerY, 8, centerX, centerY, width * 0.44);
    gradient.addColorStop(0, "rgba(74, 5, 5, 0.96)");
    gradient.addColorStop(0.42, "rgba(57, 4, 4, 0.8)");
    gradient.addColorStop(0.72, "rgba(42, 2, 2, 0.36)");
    gradient.addColorStop(1, "rgba(25, 1, 1, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(centerX, centerY, width * 0.44, height * 0.38, 0.2, 0, Math.PI * 2);
    context.fill();

    for (let i = 0; i < 24; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = rand(width * 0.14, width * 0.46);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const size = rand(2, 16);
      context.fillStyle = `rgba(${randInt(35, 78)}, 2, 3, ${rand(0.18, 0.64)})`;
      context.beginPath();
      context.ellipse(x, y, size, size * rand(0.35, 0.9), angle, 0, Math.PI * 2);
      context.fill();
    }
  });
}

function createGlowTexture() {
  return createCanvasTexture(128, 128, (context, width, height) => {
    const gradient = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, "rgba(255, 239, 190, 1)");
    gradient.addColorStop(0.1, "rgba(255, 194, 96, 0.8)");
    gradient.addColorStop(0.35, "rgba(224, 94, 38, 0.24)");
    gradient.addColorStop(1, "rgba(160, 40, 12, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  });
}

const BLOOD_COLORS = [
  new THREE.Color(0x5b0908),
  new THREE.Color(0x740d0a),
  new THREE.Color(0x3b0505),
  new THREE.Color(0x8b1b12),
];

const SPARK_COLORS = [
  new THREE.Color(0xffc16a),
  new THREE.Color(0xff8e3a),
  new THREE.Color(0xffe5a8),
];

const DEBRIS_COLORS = [
  new THREE.Color(0x6c6557),
  new THREE.Color(0x514c42),
  new THREE.Color(0x857c69),
  new THREE.Color(0x36312b),
];

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.gore = new ParticlePool(scene, 900, THREE.NormalBlending);
    this.sparks = new ParticlePool(scene, 500, THREE.AdditiveBlending);
    this.tracers = [];
    this.flashes = [];
    this.decals = [];
    this.decalCursor = 0;
    this.time = 0;
    this.rain = null;
    this.lightningTimer = rand(16, 32);
    this.lightningFlash = 0;
    this.buildDecalPool();
    this.buildRain();
    this.glowTexture = createGlowTexture();
  }

  buildDecalPool() {
    const texture = createBloodTexture();
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      color: 0xb55049,
    });
    const geometry = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 42; i += 1) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = Math.random() * Math.PI;
      mesh.scale.setScalar(rand(0.7, 2.5));
      mesh.position.set(0, 0.022, 0);
      mesh.visible = false;
      mesh.renderOrder = 1;
      this.scene.add(mesh);
      this.decals.push(mesh);
    }
  }

  buildRain() {
    this.rainCount = 680;
    const positions = new Float32Array(this.rainCount * 6);
    this.rainDrops = [];
    for (let i = 0; i < this.rainCount; i += 1) {
      this.rainDrops.push({
        x: rand(-32, 32),
        y: rand(0, 28),
        z: rand(-44, 16),
        length: rand(0.45, 1.25),
        speed: rand(22, 36),
        driftX: rand(-1.6, -0.7),
        driftZ: rand(0.2, 1.1),
      });
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: 0x93a5b1,
      transparent: true,
      opacity: 0.19,
      depthWrite: false,
      fog: true,
    });
    this.rain = new THREE.LineSegments(geometry, material);
    this.rain.frustumCulled = false;
    this.rain.renderOrder = 2;
    this.scene.add(this.rain);
  }

  updateRain(dt, cameraPosition) {
    if (!this.rain) return;
    const positions = this.rain.geometry.attributes.position.array;
    for (let i = 0; i < this.rainCount; i += 1) {
      const drop = this.rainDrops[i];
      drop.y -= drop.speed * dt;
      drop.x += drop.driftX * dt;
      drop.z += drop.driftZ * dt;
      if (
        drop.y < -0.2 ||
        Math.abs(drop.x) > 36 ||
        drop.z < -52 ||
        drop.z > 26
      ) {
        drop.x = rand(-32, 32);
        drop.y = rand(14, 30);
        drop.z = rand(-44, 16);
      }
      const offset = i * 6;
      positions[offset] = drop.x;
      positions[offset + 1] = drop.y;
      positions[offset + 2] = drop.z;
      positions[offset + 3] = drop.x + drop.driftX * 0.03;
      positions[offset + 4] = drop.y - drop.length;
      positions[offset + 5] = drop.z + drop.driftZ * 0.03;
    }
    this.rain.position.set(cameraPosition.x, 0, cameraPosition.z);
    this.rain.geometry.attributes.position.needsUpdate = true;
  }

  update(dt, cameraPosition) {
    this.time += dt;
    this.gore.update(dt);
    this.sparks.update(dt);
    this.updateRain(dt, cameraPosition);
    this.updateTracers(dt);
    this.updateFlashes(dt);
    this.lightningTimer -= dt;
    if (this.lightningTimer <= 0) {
      this.lightningTimer = rand(20, 42);
      this.lightningFlash = 1;
    }
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 5.5);
    }
  }

  updateTracers(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
      const tracer = this.tracers[i];
      tracer.life -= dt;
      tracer.material.opacity = Math.max(0, tracer.life / tracer.maxLife) * tracer.opacity;
      if (tracer.life <= 0) {
        this.scene.remove(tracer.line);
        tracer.line.geometry.dispose();
        tracer.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }

  updateFlashes(dt) {
    for (let i = this.flashes.length - 1; i >= 0; i -= 1) {
      const flash = this.flashes[i];
      flash.life -= dt;
      flash.light.intensity = Math.max(0, flash.light.intensity - dt * flash.decay);
      if (flash.effect === "shockwave" && flash.mesh) {
        const progress = 1 - flash.life / flash.maxLife;
        flash.mesh.scale.setScalar(1 + progress * 8.5);
        flash.mesh.material.opacity = flash.baseOpacity * (1 - progress);
      }
      if (flash.life <= 0) {
        this.scene.remove(flash.light);
        if (flash.mesh) {
          this.scene.remove(flash.mesh);
          flash.mesh.geometry.dispose();
          flash.mesh.material.dispose();
        }
        this.flashes.splice(i, 1);
      }
    }
  }

  tracer(from, to, color = 0xffd49a, opacity = 0.52) {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.renderOrder = 4;
    this.scene.add(line);
    const maxLife = rand(0.045, 0.09);
    this.tracers.push({ line, material, life: maxLife, maxLife, opacity });
  }

  impact(position, normal, material = "concrete") {
    const normalVector = normal ? normal.clone().normalize() : new THREE.Vector3(0, 1, 0);
    const dustColor = material === "metal" ? choice(SPARK_COLORS) : choice(DEBRIS_COLORS);
    const amount = material === "flesh" ? 5 : 6;

    for (let i = 0; i < amount; i += 1) {
      const velocity = new THREE.Vector3(
        normalVector.x * rand(0.4, 3) + rand(-2.2, 2.2),
        normalVector.y * rand(0.5, 2.5) + rand(0.5, 3.4),
        normalVector.z * rand(0.4, 3) + rand(-2.2, 2.2)
      );
      this.gore.spawn(
        position,
        velocity,
        material === "flesh" ? choice(BLOOD_COLORS) : dustColor,
        material === "flesh" ? rand(0.055, 0.16) : rand(0.03, 0.1),
        rand(0.25, 0.7),
        material === "flesh" ? 8 : 7,
        0.5
      );
    }

    if (material === "metal") {
      for (let i = 0; i < 6; i += 1) {
        this.sparks.spawn(
          position,
          new THREE.Vector3(rand(-4, 4), rand(0.5, 5), rand(-4, 4)),
          choice(SPARK_COLORS),
          rand(0.04, 0.11),
          rand(0.15, 0.42),
          8,
          0.1
        );
      }
    }
  }

  blood(position, direction, headshot = false) {
    const dir = direction ? direction.clone().normalize() : new THREE.Vector3(0, 0, 1);
    const count = headshot ? 18 : 9;
    for (let i = 0; i < count; i += 1) {
      const velocity = new THREE.Vector3(
        dir.x * rand(1.5, 6) + rand(-2.5, 2.5),
        dir.y * rand(0.5, 4) + rand(0.3, 3.6),
        dir.z * rand(1.5, 6) + rand(-2.5, 2.5)
      );
      this.gore.spawn(
        position,
        velocity,
        choice(BLOOD_COLORS),
        rand(0.05, headshot ? 0.22 : 0.14),
        rand(0.35, headshot ? 0.9 : 0.65),
        9,
        0.35
      );
    }
    if (headshot) {
      this.sparks.spawn(
        position,
        new THREE.Vector3(rand(-1, 1), rand(1, 2), rand(-1, 1)),
        new THREE.Color(0xa9150b),
        0.16,
        0.16,
        1,
        0
      );
    }
  }

  bloodPool(position, scale = 1) {
    const mesh = this.decals[this.decalCursor];
    this.decalCursor = (this.decalCursor + 1) % this.decals.length;
    mesh.position.set(position.x, 0.024, position.z);
    mesh.rotation.z = Math.random() * Math.PI * 2;
    mesh.scale.set(rand(0.9, 1.9) * scale, rand(0.65, 1.5) * scale, 1);
    mesh.visible = true;
  }

  acidSplash(position) {
    const acidColor = new THREE.Color(0x9cc752);
    for (let i = 0; i < 22; i += 1) {
      this.gore.spawn(
        position,
        new THREE.Vector3(rand(-4, 4), rand(1.5, 7), rand(-4, 4)),
        i % 3 === 0 ? new THREE.Color(0xd1ed77) : acidColor,
        rand(0.06, 0.24),
        rand(0.45, 1.1),
        11,
        0.2
      );
    }
    const splash = new THREE.Mesh(
      new THREE.CircleGeometry(rand(1.2, 2.2), 24),
      new THREE.MeshBasicMaterial({
        color: 0x7c9c32,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      })
    );
    splash.rotation.x = -Math.PI / 2;
    splash.position.set(position.x, 0.026, position.z);
    this.scene.add(splash);
    this.flashes.push({
      light: new THREE.PointLight(0x94c23d, 0, 6),
      life: 0.01,
      decay: 0,
      mesh: splash,
    });
  }

  explosion(position) {
    const flashLight = new THREE.PointLight(0xff8a36, 160, 26, 3.4);
    flashLight.position.copy(position).add(new THREE.Vector3(0, 1.5, 0));
    this.scene.add(flashLight);
    this.flashes.push({ light: flashLight, life: 0.24, decay: 620, mesh: null });

    for (let i = 0; i < 75; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(2, 18);
      this.sparks.spawn(
        position.clone().add(new THREE.Vector3(0, rand(0.2, 1.2), 0)),
        new THREE.Vector3(
          Math.cos(angle) * speed,
          rand(2, 14),
          Math.sin(angle) * speed
        ),
        choice(SPARK_COLORS),
        rand(0.05, 0.2),
        rand(0.4, 1.4),
        13,
        0.2
      );
    }

    for (let i = 0; i < 44; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(0.4, 6);
      this.gore.spawn(
        position.clone().add(new THREE.Vector3(0, rand(0.1, 1.8), 0)),
        new THREE.Vector3(Math.cos(angle) * speed, rand(0.8, 6), Math.sin(angle) * speed),
        choice([new THREE.Color(0x26211d), new THREE.Color(0x3f362e), new THREE.Color(0x7a3d1e)]),
        rand(0.12, 0.38),
        rand(0.9, 2.1),
        1.2,
        0.55
      );
    }

    const shockwave = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.1, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffa461,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    shockwave.rotation.x = -Math.PI / 2;
    shockwave.position.copy(position);
    shockwave.position.y = 0.06;
    shockwave.userData.effect = "shockwave";
    this.scene.add(shockwave);
    this.flashes.push({
      light: new THREE.PointLight(0x000000, 0, 1),
      life: 0.42,
      maxLife: 0.42,
      decay: 0,
      mesh: shockwave,
      effect: "shockwave",
      baseOpacity: 0.65,
    });
  }

  muzzle(position, color = 0xffb45e) {
    this.sparks.spawn(
      position,
      new THREE.Vector3(rand(-0.4, 0.4), rand(-0.1, 0.4), rand(-0.4, 0.4)),
      new THREE.Color(color),
      0.3,
      0.08,
      0,
      1
    );
  }

  clear() {
    this.gore.clear();
    this.sparks.clear();
    this.decals.forEach((decal) => {
      decal.visible = false;
    });
    this.tracers.forEach((tracer) => {
      this.scene.remove(tracer.line);
      tracer.line.geometry.dispose();
      tracer.material.dispose();
    });
    this.tracers.length = 0;
    this.flashes.forEach((flash) => {
      this.scene.remove(flash.light);
      if (flash.mesh) {
        this.scene.remove(flash.mesh);
        flash.mesh.geometry.dispose();
        flash.mesh.material.dispose();
      }
    });
    this.flashes.length = 0;
  }
}
