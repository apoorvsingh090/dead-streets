import { clamp, rand } from "./utils.js";

const WAVE_DEFS = {
  one: {
    id: 1,
    gateIndex: 0,
    baseTotal: 18,
    baseInterval: 0.92,
    timeLimit: 68,
    specials: [],
    types: [
      ["walker", 0.84],
      ["runner", 0.16],
    ],
  },
  two: {
    id: 2,
    gateIndex: 1,
    baseTotal: 26,
    baseInterval: 0.82,
    timeLimit: 82,
    specials: [{ at: 6.5, type: "spitter" }],
    types: [
      ["walker", 0.7],
      ["runner", 0.3],
    ],
  },
};

export class Director {
  constructor(game) {
    this.game = game;
    this.state = "advance1";
    this.stageNumber = 1;
    this.wave = null;
    this.ambientClock = rand(4, 7);
    this.finaleTime = 0;
    this.finaleDuration = 82;
    this.finaleSpawnClock = 0;
    this.finaleSpecialClock = 22;
    this.finaleElapsed = 0;
    this.bruteSpawned = false;
    this.finaleStarted = false;
    this.lastTimerSecond = -1;
    this.threatUpdateClock = 0;
    this.specialAnnounced = new Set();
    this.escapeAnnounced = false;
    this.completed = false;
  }

  start() {
    this.state = "advance1";
    this.stageNumber = 1;
    this.hud.setObjective(
      "SECTOR 01 / THE BLOCK",
      "PUSH THROUGH THE STREET",
      "Get to the CEDA checkpoint"
    );
    this.hud.setThreat(0.05, "CALM");
    this.hud.hideTimer();
    this.game.hud.subtitle("ROOK", "Stay close. We keep moving, we live.", 3.5);
    this.game.hud.subtitle("MARA", "I hate this street.", 2.6);
    this.game.audio.setThreat(0.1);
  }

  get hud() {
    return this.game.hud;
  }

  onZombieKilled(zombie) {
    if (!this.wave || !this.wave.active || zombie.waveId !== this.wave.id) return;
    this.wave.remaining = Math.max(0, this.wave.remaining - 1);
    this.checkWaveCompletion();
  }

  update(dt) {
    if (this.completed) return;
    const player = this.game.player;

    if (this.wave?.active) {
      this.updateWave(dt);
    }

    switch (this.state) {
      case "advance1":
        if (player.position.z < 72 && !player.downed) {
          this.startWave("one");
        }
        break;
      case "advance2":
        if (player.position.z < 19 && !player.downed) {
          this.startWave("two");
        }
        break;
      case "generator":
        if (player.position.z < -52) {
          this.setStateObjective(
            "SECTOR 03 / THE SHELTER",
            "RESTORE POWER",
            "Start the generator to open the evac door"
          );
        }
        break;
      case "finale":
        this.updateFinale(dt);
        break;
      case "escape": {
        const extraction = this.game.world.extractionPosition;
        const dx = player.position.x - extraction.x;
        const dz = player.position.z - extraction.z;
        const doorOpen = this.game.world.safehouseDoor?.progress > 0.7;
        if (doorOpen && dx * dx + dz * dz < 3.2 * 3.2) {
          this.completed = true;
          this.game.endRun(true, "You made it out. This block is behind you.");
        }
        break;
      }
      default:
        break;
    }

    if (this.state !== "finale" && this.state !== "escape" && !this.wave?.active) {
      this.updateAmbientSpawns(dt);
    }

    this.threatUpdateClock -= dt;
    if (this.threatUpdateClock <= 0) {
      this.threatUpdateClock = 0.35;
      this.updateThreat();
    }
  }

  setStateObjective(stage, text, sub) {
    this.hud.setObjective(stage, text, sub);
  }

  startWave(key) {
    const def = WAVE_DEFS[key];
    if (!def) return;
    this.wave = {
      ...def,
      active: true,
      elapsed: 0,
      spawnClock: 0,
      spawnedBase: 0,
      spawnedSpecials: 0,
      specialIndex: 0,
      remaining: 0,
      total: def.baseTotal + def.specials.length,
    };

    this.state = `wave${def.id}`;
    this.hud.announce(
      "THE DIRECTOR",
      def.id === 1 ? "HORDE INCOMING" : "OVERRUN",
      def.id === 1 ? "The street is coming alive." : "They are climbing the barricade.",
      true,
      3.2
    );
    this.game.audio.horde();
    this.hud.setObjective(
      def.id === 1 ? "SECTOR 01 / THE CHECKPOINT" : "SECTOR 02 / THE MARKET",
      "SURVIVE THE HORDE",
      "The barricade stays sealed until the street is clear"
    );

    if (def.id === 1) {
      this.game.hud.subtitle("ROOK", "They're coming down the block!", 3);
      this.game.hud.subtitle("MARA", "Don't let them flank us.", 2.8);
    } else {
      this.game.hud.subtitle("MARA", "They're coming over the barricade!", 3);
      this.game.hud.subtitle("ROOK", "Watch for the spitter!", 2.8);
    }
  }

  updateWave(dt) {
    const wave = this.wave;
    if (!wave?.active) return;
    wave.elapsed += dt;

    while (wave.specialIndex < wave.specials.length) {
      const special = wave.specials[wave.specialIndex];
      if (wave.elapsed < special.at) break;
      if (this.game.zombies.getAliveCount() >= 38) break;
      const spawned = this.spawnWaveZombie(wave, special.type);
      if (!spawned) break;
      wave.specialIndex += 1;
      wave.spawnedSpecials += 1;
      this.announceSpecial(special.type);
    }

    wave.spawnClock -= dt;
    if (
      wave.spawnClock <= 0 &&
      wave.spawnedBase < wave.baseTotal &&
      this.game.zombies.getAliveCount() < 38
    ) {
      const type = this.pickWaveType(wave);
      if (this.spawnWaveZombie(wave, type)) {
        wave.spawnedBase += 1;
      }
      wave.spawnClock = wave.baseInterval * rand(0.72, 1.16);
    }

    if (wave.elapsed >= wave.timeLimit) {
      this.finishWave(true);
      return;
    }

    this.checkWaveCompletion();
  }

  pickWaveType(wave) {
    const roll = Math.random();
    let cumulative = 0;
    for (const [type, weight] of wave.types) {
      cumulative += weight;
      if (roll <= cumulative) return type;
    }
    return "walker";
  }

  spawnWaveZombie(wave, type) {
    const spawn = this.game.world.getSpawnPoint(
      this.game.player.position,
      type === "spitter" ? 18 : 16,
      type === "spitter" ? 27 : 30
    );
    const zombie = this.game.zombies.spawn(type, spawn, { waveId: wave.id });
    if (!zombie) return false;
    wave.remaining += 1;
    return true;
  }

  checkWaveCompletion() {
    const wave = this.wave;
    if (!wave?.active) return;
    const allSpawned =
      wave.spawnedBase >= wave.baseTotal && wave.specialIndex >= wave.specials.length;
    if (allSpawned && wave.remaining <= 0) {
      this.finishWave(false);
    }
  }

  finishWave(timedOut = false) {
    const wave = this.wave;
    if (!wave || !wave.active) return;
    wave.active = false;

    const gate = this.game.world.gates[wave.gateIndex];
    if (gate) {
      this.game.world.openGate(gate);
      this.game.audio.gate();
    }
    this.game.survivors.healAll(18);

    if (wave.id === 1) {
      this.state = "advance2";
      this.stageNumber = 2;
      this.setStateObjective(
        "SECTOR 02 / THE MARKET",
        "PUSH TO THE MARKET",
        timedOut ? "Move. The barricade is lifting." : "Checkpoint cache ahead"
      );
      this.game.hud.announce(
        "WAY CLEAR",
        "CHECKPOINT OPEN",
        timedOut ? "Move before more arrive." : "Push up. Stay together.",
        false,
        2.8
      );
      this.game.hud.subtitle("ROOK", timedOut ? "No time left. Move!" : "Gate's open. Move!", 2.8);
      this.ambiguousEnemiesAfterWave(wave);
    } else if (wave.id === 2) {
      this.state = "generator";
      this.stageNumber = 3;
      this.setStateObjective(
        "SECTOR 03 / THE SHELTER",
        "GET TO THE GENERATOR",
        "The evac shelter needs power"
      );
      this.game.hud.announce(
        "WAY CLEAR",
        "MARKET OPEN",
        "The shelter is two blocks south.",
        false,
        3
      );
      this.game.hud.subtitle("MARA", "Generator's south. Stay sharp.", 3);
      this.game.hud.subtitle("ROOK", "We're close. Nobody stops moving.", 2.6);
      this.ambiguousEnemiesAfterWave(wave);
    }
  }

  ambiguousEnemiesAfterWave(wave) {
    for (const zombie of this.game.zombies.zombies) {
      if (zombie.waveId === wave.id) {
        zombie.waveId = null;
      }
    }
  }

  startFinale() {
    if (this.finaleStarted || this.state === "escape" || this.state === "done") return;
    this.finaleStarted = true;
    this.state = "finale";
    this.stageNumber = 4;
    this.finaleTime = this.finaleDuration;
    this.finaleElapsed = 0;
    this.finaleSpawnClock = 1.4;
    this.finaleSpecialClock = 20;
    this.bruteSpawned = false;
    this.wave = null;
    this.game.world.activateGenerator();
    this.hud.announce(
      "FINAL STAND",
      "POWER ONLINE",
      "Hold the street until the evac door opens.",
      true,
      3.5
    );
    this.hud.setObjective(
      "SECTOR 04 / THE SHELTER",
      "DEFEND THE GENERATOR",
      "Hold out until the evac door is powered"
    );
    this.game.audio.finale();
    this.game.hud.subtitle("ROOK", "Generator's live! That door is our way out!", 3.2);
    this.game.hud.subtitle("MARA", "Here they come. All of them.", 3.2);
    this.game.hud.showTimer("DOOR OPENS IN", this.finaleTime, false);
    this.lastTimerSecond = Math.ceil(this.finaleTime);
  }

  updateFinale(dt) {
    const player = this.game.player;
    this.finaleTime = Math.max(0, this.finaleTime - dt);
    this.finaleElapsed += dt;

    this.finaleSpawnClock -= dt;
    const alive = this.game.zombies.getAliveCount();
    if (this.finaleSpawnClock <= 0 && alive < 33) {
      const difficulty = clamp(this.finaleElapsed / this.finaleDuration, 0, 1);
      const groupSize = alive < 12 ? 4 : alive < 24 ? 3 : 2;
      for (let i = 0; i < groupSize; i += 1) {
        if (this.game.zombies.getAliveCount() >= 38) break;
        const type = Math.random() < 0.12 + difficulty * 0.22 ? "runner" : "walker";
        const spawn = this.game.world.getSpawnPoint(player.position, 15, 31);
        this.game.zombies.spawn(type, spawn, { waveId: "finale" });
      }
      this.finaleSpawnClock = 5.8 - difficulty * 2.1;
    }

    this.finaleSpecialClock -= dt;
    if (this.finaleSpecialClock <= 0) {
      this.finaleSpecialClock = rand(18, 27);
      const specials = this.game.zombies.getCounts().specials;
      if (specials < 2 && this.game.zombies.getAliveCount() < 37) {
        const type = Math.random() < 0.55 ? "spitter" : "runner";
        const spawn = this.game.world.getSpawnPoint(player.position, 19, 30);
        const zombie = this.game.zombies.spawn(type, spawn, { waveId: "finale" });
        if (zombie) this.announceSpecial(type);
      }
    }

    if (!this.bruteSpawned && this.finaleElapsed >= 48) {
      this.bruteSpawned = true;
      const spawn = this.game.world.getSpawnPoint(player.position, 24, 32);
      const brute = this.game.zombies.spawn("brute", spawn, { waveId: "finale" });
      if (brute) {
        this.game.hud.announce(
          "SPECIAL INFECTED",
          "BRUTE",
          "It's built like a wall. Bring it down.",
          true,
          3
        );
        this.game.audio.specialAlert();
        this.game.hud.subtitle("MARA", "That's a big one. Hit the head!", 3);
      }
    }

    const second = Math.ceil(this.finaleTime);
    if (second !== this.lastTimerSecond) {
      this.lastTimerSecond = second;
      this.hud.showTimer("DOOR OPENS IN", second, second <= 15);
    }

    if (this.bruteSpawned && !this.specialAnnounced.has("brute-final")) {
      this.specialAnnounced.add("brute-final");
    }

    if (this.finaleTime <= 0) {
      this.startEscape();
    }
  }

  startEscape() {
    if (this.state === "escape") return;
    this.state = "escape";
    this.game.world.openSafehouse();
    this.hud.hideTimer();
    this.hud.setObjective(
      "SECTOR 05 / EVAC",
      "GET TO THE EVAC DOOR",
      "The shelter is open. Move now"
    );
    this.hud.announce("EVAC OPEN", "GET TO THE SHELTER", "Run. Do not look back.", false, 3.6);
    this.game.audio.gate();
    this.game.hud.subtitle("MARA", "The door's open! Move!", 3);
    this.game.hud.subtitle("ROOK", "Go! I'll cover you!", 2.8);
    this.escapeAnnounced = true;
  }

  updateAmbientSpawns(dt) {
    this.ambientClock -= dt;
    if (this.ambientClock > 0) return;
    this.ambientClock = rand(7, 12);
    if (this.game.zombies.getAliveCount() >= 14) return;
    if (this.game.player.position.z < -66) return;
    const spawn = this.game.world.getSpawnPoint(this.game.player.position, 22, 34);
    const type = Math.random() < 0.16 ? "runner" : "walker";
    this.game.zombies.spawn(type, spawn);
  }

  announceSpecial(type) {
    if (type === "spitter") {
      this.game.hud.announce(
        "SPECIAL INFECTED",
        "SPITTER",
        "Acid pools. Keep moving.",
        true,
        2.4
      );
      this.game.audio.specialAlert();
      if (!this.specialAnnounced.has("spitter")) {
        this.specialAnnounced.add("spitter");
        this.game.hud.subtitle("ROOK", "Spitter! Don't stand in the acid!", 3);
      }
    } else if (type === "brute") {
      this.game.hud.announce("SPECIAL INFECTED", "BRUTE", "Heavy. Headshots.", true, 2.8);
      this.game.audio.specialAlert();
    }
  }

  updateThreat() {
    const counts = this.game.zombies.getCounts();
    let threat = 0.08 + Math.min(0.32, counts.alive * 0.018);
    let label = "CALM";

    if (counts.alive > 6) label = "RISING";
    if (this.wave?.active) {
      threat = 0.6 + clamp(1 - this.wave.elapsed / this.wave.timeLimit, 0, 1) * 0.3;
      label = "HORDE";
    } else if (this.state === "finale") {
      threat = 0.72 + Math.sin(this.finaleElapsed * 0.35) * 0.1;
      label = "OVERRUN";
    } else if (this.state === "escape") {
      threat = 0.55;
      label = "ESCAPE";
    } else if (counts.alive > 12) {
      threat = 0.58;
      label = "HEAVY";
    }

    this.currentThreat = clamp(threat, 0, 1);
    this.hud.setThreat(this.currentThreat, label);
    this.game.audio.setThreat(this.currentThreat);
  }
}
