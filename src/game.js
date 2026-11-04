import * as THREE from "three";
import { clamp, formatTime } from "./utils.js";
import { World } from "./world.js";
import { Effects } from "./effects.js";
import { HUD } from "./ui.js";
import { Soundscape } from "./audio.js";
import { Player } from "./player.js";
import { ZombieManager } from "./zombies.js";
import { Survivors } from "./survivors.js";
import { Director } from "./director.js";
import { CombatSystem } from "./combat.js";

export class Game {
  constructor() {
    this.state = "menu";
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.player = null;
    this.stats = this.createEmptyStats();
    this.runElapsed = 0;
    this.menuTime = 0;
    this.hasPointerLock = false;
    this.lastFrameTime = performance.now();
    this.raycaster = new THREE.Raycaster();
    this.interactPressed = false;
    this.currentInteraction = null;
    this.reviveHold = 0;
    
    this.input = {
      forward: false,
      back: false,
      left: false,
      right: false,
      sprint: false,
      fire: false,
      aim: false,
      interact: false,
    };

    this.dom = {
      menu: document.getElementById("screen-menu"),
      pause: document.getElementById("screen-pause"),
      end: document.getElementById("screen-end"),
      endCard: document.querySelector(".end-card"),
      endKicker: document.getElementById("end-kicker"),
      endTitle: document.getElementById("end-title"),
      endCopy: document.getElementById("end-copy"),
      endKills: document.getElementById("end-kills"),
      endSpecials: document.getElementById("end-specials"),
      endTime: document.getElementById("end-time"),
      endAccuracy: document.getElementById("end-accuracy"),
      start: document.getElementById("start-button"),
      resume: document.getElementById("resume-button"),
      restart: document.getElementById("restart-button"),
      quit: document.getElementById("quit-button"),
      retry: document.getElementById("retry-button"),
      menuButton: document.getElementById("menu-button"),
      sensitivity: document.getElementById("sensitivity"),
      sensitivityOutput: document.getElementById("sensitivity-output"),
      boot: document.getElementById("boot-screen"),
    };

    this.initRenderer();
    this.initWorld();

    this.audio = new Soundscape();
    this.hud = new HUD();
    this.effects = new Effects(this.scene);
    this.world = new World(this.scene);

    this.zombies = new ZombieManager(this);
    this.player = new Player(this, this.camera, this.world, this.viewCamera);
    this.survivors = new Survivors(this);
    this.combat = new CombatSystem(this);
    this.director = new Director(this);

    this.player.view.root.visible = false;
    this.player.flashlight.intensity = 0;
    this.camera.fov = 68;
    this.camera.updateProjectionMatrix();
    this.setMenuCamera();

    this.bindUI();
    this.bindInput();

    window.addEventListener("resize", () => this.onResize());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === "playing") this.pauseGame();
    });

    this.hud.hide();
    this.animate();
    requestAnimationFrame(() => {
      this.dom.boot?.classList.add("is-ready");
      setTimeout(() => this.dom.boot?.remove(), 600);
    });

    window.__deadStreets = this;
  }

  createEmptyStats() {
    return {
      kills: 0,
      specials: 0,
      shotsFired: 0,
      shotsHit: 0,
      startTime: performance.now(),
    };
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    this.renderer.domElement.id = "game-canvas";
    this.renderer.domElement.setAttribute("aria-label", "Dead Streets game viewport");
    document.getElementById("game-root").appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080c0f);
    this.scene.fog = new THREE.FogExp2(0x0b1114, 0.0182);

    this.camera = new THREE.PerspectiveCamera(
      76,
      window.innerWidth / window.innerHeight,
      0.04,
      230
    );
    this.camera.rotation.order = "YXZ";

    this.viewScene = new THREE.Scene();
    this.viewCamera = new THREE.PerspectiveCamera(
      62,
      window.innerWidth / window.innerHeight,
      0.01,
      10
    );
    this.viewScene.add(this.viewCamera);
    this.setupViewLighting();
  }

  setupViewLighting() {
    const ambient = new THREE.AmbientLight(0xb9ab98, 2);
    this.viewScene.add(ambient);

    const key = new THREE.DirectionalLight(0xffe2bd, 3.6);
    key.position.set(1.4, 2.6, 1.2);
    key.target.position.set(0, 0, -0.8);
    this.viewScene.add(key);
    this.viewScene.add(key.target);

    const rim = new THREE.DirectionalLight(0x86a9ba, 2.4);
    rim.position.set(-2.2, 0.8, -1.3);
    rim.target.position.set(0, 0, -0.8);
    this.viewScene.add(rim);
    this.viewScene.add(rim.target);

    const fill = new THREE.PointLight(0xffd19a, 1.6, 5, 2);
    fill.position.set(0.6, 0.25, 0.35);
    this.viewScene.add(fill);
  }

  initWorld() {
    this.raycaster.far = 150;
  }

  bindUI() {
    this.dom.start?.addEventListener("click", () => this.startRun());
    this.dom.resume?.addEventListener("click", () => this.resumeGame());
    this.dom.restart?.addEventListener("click", () => window.location.reload());
    this.dom.quit?.addEventListener("click", () => window.location.reload());
    this.dom.retry?.addEventListener("click", () => window.location.reload());
    this.dom.menuButton?.addEventListener("click", () => window.location.reload());

    const sensitivity = this.dom.sensitivity;
    if (sensitivity) {
      sensitivity.addEventListener("input", () => {
        const value = parseFloat(sensitivity.value);
        this.player.setSensitivity(value);
        this.dom.sensitivityOutput.textContent = value.toFixed(2);
      });
    }

    this.renderer.domElement.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    this.renderer.domElement.addEventListener("mousedown", (event) => {
      if (this.state !== "playing") return;
      if (document.pointerLockElement !== this.renderer.domElement) {
        this.requestPointerLock();
      }
      if (event.button === 0) {
        this.input.fire = true;
        this.player.setTrigger(true);
      } else if (event.button === 2) {
        this.input.aim = true;
      }
    });

    window.addEventListener("mouseup", (event) => {
      if (event.button === 0) {
        this.input.fire = false;
        this.player?.setTrigger(false);
      } else if (event.button === 2) {
        this.input.aim = false;
      }
    });

    document.addEventListener("mousemove", (event) => {
      if (
        this.state === "playing" &&
        document.pointerLockElement === this.renderer.domElement &&
        this.player
      ) {
        this.player.look(event.movementX, event.movementY);
      }
    });

    document.addEventListener("pointerlockchange", () => {
      const locked = document.pointerLockElement === this.renderer.domElement;
      if (locked) {
        this.hasPointerLock = true;
      } else {
        const wasLocked = this.hasPointerLock;
        this.hasPointerLock = false;
        if (wasLocked && this.state === "playing") {
          this.pauseGame();
        }
      }
    });

    document.addEventListener("pointerlockerror", () => {
      this.hasPointerLock = false;
    });

    window.addEventListener("blur", () => {
      if (this.state === "playing") {
        this.releaseInput();
      }
    });
  }

  bindInput() {
    window.addEventListener("keydown", (event) => {
      if (event.code === "Tab") event.preventDefault();

      if (this.state === "menu" && (event.code === "Enter" || event.code === "Space")) {
        event.preventDefault();
        this.startRun();
        return;
      }

      if (this.state === "paused") {
        if (event.code === "Escape") {
          event.preventDefault();
          this.resumeGame();
        }
        return;
      }

      if (this.state !== "playing") return;

      if (event.repeat) {
        if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"].includes(event.code)) {
          return;
        }
      }

      switch (event.code) {
        case "KeyW":
          this.input.forward = true;
          break;
        case "KeyS":
          this.input.back = true;
          break;
        case "KeyA":
          this.input.left = true;
          break;
        case "KeyD":
          this.input.right = true;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          this.input.sprint = true;
          break;
        case "Space":
          event.preventDefault();
          if (!event.repeat) this.player.jump();
          break;
        case "KeyR":
          if (!event.repeat) this.player.startReload();
          break;
        case "KeyQ":
          if (!event.repeat) this.player.shove();
          break;
        case "KeyF":
          if (!event.repeat) this.player.useMedkit();
          break;
        case "KeyG":
          if (!event.repeat) this.player.throwPipeBomb();
          break;
        case "KeyE":
          this.input.interact = true;
          if (!event.repeat) this.interactPressed = true;
          break;
        case "Digit1":
          if (!event.repeat) this.player.switchWeapon(1);
          break;
        case "Digit2":
          if (!event.repeat) this.player.switchWeapon(2);
          break;
        case "Digit3":
          if (!event.repeat) this.player.switchWeapon(3);
          break;
        case "KeyM":
          if (!event.repeat) {
            const muted = this.audio.toggleMute();
            this.hud.addKillfeed(muted ? "AUDIO MUTED" : "AUDIO ENABLED", false);
          }
          break;
        case "Escape":
          if (document.pointerLockElement !== this.renderer.domElement) {
            this.pauseGame();
          }
          break;
        default:
          break;
      }
    });

    window.addEventListener("keyup", (event) => {
      switch (event.code) {
        case "KeyW":
          this.input.forward = false;
          break;
        case "KeyS":
          this.input.back = false;
          break;
        case "KeyA":
          this.input.left = false;
          break;
        case "KeyD":
          this.input.right = false;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          this.input.sprint = false;
          break;
        case "KeyE":
          this.input.interact = false;
          this.reviveHold = 0;
          break;
        default:
          break;
      }
    });
  }

  setMenuCamera() {
    this.camera.position.set(0, 2.35, 92.5);
    this.camera.lookAt(0, 1.9, 20);
    this.camera.rotation.order = "YXZ";
  }

  startRun(options = {}) {
    if (this.state !== "menu") return;
    this.state = "playing";
    this.hasPointerLock = false;
    this.runElapsed = 0;
    this.stats = this.createEmptyStats();
    this.input.fire = false;
    this.input.aim = false;
    this.interactPressed = false;
    this.currentInteraction = null;
    this.reviveHold = 0;

    if (options.audio !== false) {
      try {
        this.audio.init();
        this.audio.setPaused(false);
      } catch (error) {
        console.warn("Audio could not start:", error);
      }
    }

    this.dom.menu?.classList.add("is-leaving");
    setTimeout(() => this.dom.menu?.classList.add("hidden"), 560);

    this.hud.show();
    this.hud.setInteraction("", false, 0);
    this.hud.flashDamage(-1);
    this.hud.hideTimer();
    this.hud.setDowned(false, 0);

    this.player.position.copy(this.world.startPosition);
    this.player.health = this.player.maxHealth;
    this.player.downed = false;
    this.player.bleedout = 0;
    this.player.yaw = 0;
    this.player.pitch = -0.015;
    this.player.recoilPitch = 0;
    this.player.recoilYaw = 0;
    this.player.velocityX = 0;
    this.player.velocityZ = 0;
    this.player.verticalVelocity = 0;
    this.player.jumpOffset = 0;
    this.player.onGround = true;
    this.player.view.setWeapon("rifle", true);
    this.player.view.root.visible = true;
    this.player.flashlight.intensity = this.player.flashlightOn ? 46 : 0;
    this.player.currentFov = this.player.baseFov;
    this.camera.fov = this.player.baseFov;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(
      this.player.position.x,
      this.player.eyeHeight,
      this.player.position.z
    );
    this.camera.rotation.set(this.player.pitch, this.player.yaw, 0);

    this.director.start();
    this.hud.announce(
      "SECTOR 01",
      "THE BLOCK",
      "Push to the CEDA checkpoint.",
      false,
      2.8
    );

    if (options.lock !== false) {
      this.requestPointerLock();
      setTimeout(() => {
        if (this.state === "playing" && !this.hasPointerLock) {
          this.hud.subtitle("SYSTEM", "Click the viewport to capture your mouse.", 5);
        }
      }, 700);
    }

    this.lastFrameTime = performance.now();
  }

  requestPointerLock() {
    if (!this.renderer?.domElement) return;
    try {
      const result = this.renderer.domElement.requestPointerLock();
      if (result && typeof result.catch === "function") {
        result.catch(() => {});
      }
    } catch (error) {
      // Pointer lock can be unavailable in embedded or headless contexts.
    }
  }

  pauseGame() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.releaseInput();
    this.hud.setInteraction("", false, 0);
    this.audio.setPaused(true);
    this.dom.pause?.classList.remove("hidden");
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
  }

  resumeGame() {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.dom.pause?.classList.add("hidden");
    this.audio.setPaused(false);
    this.requestPointerLock();
    this.lastFrameTime = performance.now();
  }

  releaseInput() {
    this.input.forward = false;
    this.input.back = false;
    this.input.left = false;
    this.input.right = false;
    this.input.sprint = false;
    this.input.fire = false;
    this.input.aim = false;
    this.input.interact = false;
    this.reviveHold = 0;
    this.player?.setTrigger(false);
  }

  endRun(victory, reason) {
    if (this.state !== "playing" && this.state !== "paused") return;
    this.state = victory ? "victory" : "gameover";
    this.releaseInput();
    this.player.view.root.visible = false;
    this.hud.hide();
    this.hud.setInteraction("", false, 0);
    this.dom.pause?.classList.add("hidden");

    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }

    const accuracy =
      this.stats.shotsFired > 0
        ? Math.round(clamp(this.stats.shotsHit / this.stats.shotsFired, 0, 1) * 100)
        : 0;

    this.dom.endCard?.classList.toggle("is-victory", victory);
    if (this.dom.endKicker) {
      this.dom.endKicker.textContent = victory ? "RUN COMPLETE" : "THE RUN IS OVER";
    }
    if (this.dom.endTitle) this.dom.endTitle.textContent = victory ? "YOU MADE IT" : "YOU DIED";
    if (this.dom.endCopy) {
      this.dom.endCopy.textContent =
        reason ??
        (victory
          ? "The shelter door shuts behind you."
          : "The street keeps what it kills.");
    }
    if (this.dom.endKills) this.dom.endKills.textContent = String(this.stats.kills);
    if (this.dom.endSpecials) this.dom.endSpecials.textContent = String(this.stats.specials);
    if (this.dom.endTime) this.dom.endTime.textContent = formatTime(this.runElapsed);
    if (this.dom.endAccuracy) this.dom.endAccuracy.textContent = `${accuracy}%`;

    this.dom.end?.classList.remove("hidden");
    if (victory) this.audio.victory();
    this.audio.setPaused(true);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.viewCamera.aspect = window.innerWidth / window.innerHeight;
    this.viewCamera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    if (this.state === "menu") {
      this.updateMenu(dt);
    } else if (this.state === "playing") {
      this.updatePlaying(dt);
    }

    this.renderer.autoClear = true;
    this.renderer.render(this.scene, this.camera);

    if (this.state === "playing" && this.player && !this.player.downed) {
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.viewScene, this.viewCamera);
      this.renderer.autoClear = true;
    }
  }

  updateMenu(dt) {
    this.menuTime += dt;
    const t = this.menuTime;
    this.camera.position.set(
      Math.sin(t * 0.075) * 2.5,
      2.3 + Math.sin(t * 0.14) * 0.08,
      92.5 + Math.sin(t * 0.052) * 3.2
    );
    this.camera.lookAt(0, 2.0, 20 + Math.sin(t * 0.1) * 2.5);
    this.world.update(dt, this.camera.position);
    this.effects.update(dt, this.camera.position);
    this.world.setLightning(this.effects.lightningFlash);
  }

  updatePlaying(dt) {
    this.runElapsed += dt;

    this.player.update(dt, this.input);
    if (this.state !== "playing") return;

    this.survivors.update(dt);
    this.zombies.update(dt);
    this.combat.update(dt);
    this.director.update(dt);
    if (this.state !== "playing") return;

    this.updateInteraction(dt);

    this.world.setLightning(this.effects.lightningFlash);
    this.world.update(dt, this.player.position);
    this.effects.update(dt, this.camera.position);
    this.audio.update(
      dt,
      this.director.currentThreat ?? 0.1,
      this.player.health <= 30 || this.player.downed
    );
    this.hud.update(this, dt);

    this.interactPressed = false;
  }

  // ---------------------------------------------------------------------
  // Combat and survivor events
  // ---------------------------------------------------------------------

  fireHitscan(origin, direction, weapon, muzzle, shooter, drawTracer = true) {
    return this.combat.fireHitscan(origin, direction, weapon, muzzle, shooter, drawTracer);
  }

  throwPipeBomb(origin, direction) {
    this.combat.throwPipeBomb(origin, direction);
  }

  onZombieKilled(zombie, headshot = false, killer = null) {
    this.director.onZombieKilled(zombie);
    if (killer === this.player) {
      this.stats.kills += 1;
      if (zombie.isSpecial) this.stats.specials += 1;
      this.hud.addKillfeed(
        `${zombie.displayName} DOWN${headshot ? " - HEADSHOT" : ""}`,
        zombie.isSpecial
      );
      this.audio.kill();
    } else if (killer?.name) {
      this.hud.addKillfeed(`${killer.name} KILLED ${zombie.displayName}`, zombie.isSpecial);
    }

    if (zombie.type === "spitter" && this.state === "playing") {
      this.zombies.createAcidPool(zombie.position, 1.7, 4.8);
    }
  }

  onPlayerDowned() {
    this.input.fire = false;
    this.input.aim = false;
    this.player.setTrigger(false);
    this.hud.announce(
      "INCAPACITATED",
      "YOU ARE DOWN",
      "Stay alive. Your team is coming.",
      true,
      3
    );
    const available = this.survivors.bots.filter((bot) => bot.alive && !bot.downed);
    if (available.length > 0) {
      this.hud.subtitle(available[0].name, "I see you! Hold on!", 3);
    }
  }

  onBotDowned(bot) {
    this.hud.addKillfeed(`${bot.name} IS DOWN`, true);
    if (!this.player.downed) {
      this.hud.subtitle(
        bot.name === "ROOK" ? "MARA" : "ROOK",
        `${bot.name === "ROOK" ? "Rook" : "Mara"} is down! Get them up!`,
        3
      );
    }
  }

  onBotDied(bot) {
    this.hud.addKillfeed(`${bot.name} DIED`, true);
    if (!this.player.downed) {
      this.hud.subtitle("ROOK", "They're gone. Keep moving.", 3);
    }
  }

  damageSurvivor(target, amount, source, zombie = null, options = {}) {
    if (!target || target.downed || target.alive === false) return;
    if (target.kind === "player") {
      this.player.takeDamage(amount, source, options);
    } else if (target.entity) {
      target.entity.takeDamage(amount, source);
    }
  }

  getSurvivorTargets() {
    const botTargets = this.survivors?.getTargets() ?? [];
    return [
      {
        kind: "player",
        entity: this.player,
        name: "YOU",
        position: this.player.position,
        downed: this.player.downed,
        alive: true,
        radius: this.player.radius,
      },
      ...botTargets,
    ];
  }

  // ---------------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------------

  updateInteraction(dt) {
    if (this.player.downed) {
      this.currentInteraction = null;
      this.reviveHold = 0;
      this.hud.setInteraction("", false, 0);
      return;
    }

    const downedBot = this.survivors.getNearbyDowned(this.player.position, 2.25);
    if (downedBot) {
      this.currentInteraction = { type: "revive", bot: downedBot };
      if (this.input.interact) {
        this.reviveHold += dt;
      } else {
        this.reviveHold = Math.max(0, this.reviveHold - dt * 2.5);
      }

      const progress = clamp(this.reviveHold / 2.2, 0, 1);
      this.hud.setInteraction(`REVIVE ${downedBot.name}`, true, progress);
      if (progress >= 1) {
        this.survivors.revive(downedBot);
        this.reviveHold = 0;
        this.currentInteraction = null;
        this.hud.setInteraction("", false, 0);
      }
      return;
    }

    const point = this.world.getNearbyInteractable(this.player.position, 2.8);
    if (point) {
      this.currentInteraction = { type: point.type, point };
      const label = point.type === "generator" ? "START THE GENERATOR" : "TAKE SUPPLIES";

      if (this.interactPressed) {
        if (point.type === "supply") {
          this.world.useSupply(point);
          this.player.useSupplies();
          this.survivors.healAll(22);
          this.hud.addKillfeed("SUPPLIES TAKEN", false);
          this.audio.pickup();
        } else if (point.type === "generator" && this.director.state === "generator") {
          this.director.startFinale();
        }
        this.interactPressed = false;
        this.currentInteraction = null;
        this.hud.setInteraction("", false, 0);
        return;
      }

      this.hud.setInteraction(label, true, 0);
      return;
    }

    this.currentInteraction = null;
    this.reviveHold = 0;
    this.hud.setInteraction("", false, 0);
  }
}

export function bootGame() {
  return new Game();
}

