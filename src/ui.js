import { clamp, formatTime } from "./utils.js";

const SQUAD_CONFIG = [
  { id: "player", name: "YOU", color: "#c7a56d", letter: "Y" },
  { id: "rook", name: "ROOK", color: "#778a6a", letter: "R" },
  { id: "mara", name: "MARA", color: "#925147", letter: "M" },
];

export class HUD {
  constructor() {
    this.root = document.getElementById("hud");
    this.squadList = document.getElementById("squad-list");
    this.objectiveStage = document.getElementById("objective-stage");
    this.objectiveText = document.getElementById("objective-text");
    this.objectiveSub = document.getElementById("objective-sub");
    this.statKills = document.getElementById("stat-kills");
    this.statSpecials = document.getElementById("stat-specials");
    this.threatFill = document.getElementById("threat-fill");
    this.threatValue = document.getElementById("threat-value");
    this.directorTimer = document.getElementById("director-timer");
    this.directorTimerLabel = document.getElementById("director-timer-label");
    this.directorTimerValue = document.getElementById("director-timer-value");
    this.healthPanel = document.getElementById("health-panel");
    this.healthValue = document.getElementById("health-value");
    this.healthFill = document.getElementById("health-fill");
    this.medkitCount = document.getElementById("medkit-count");
    this.pipeCount = document.getElementById("pipe-count");
    this.downedStatus = document.getElementById("downed-status");
    this.bleedoutTimer = document.getElementById("bleedout-timer");
    this.weaponName = document.getElementById("weapon-name");
    this.ammoMag = document.getElementById("ammo-mag");
    this.ammoReserve = document.getElementById("ammo-reserve");
    this.ammoRow = this.ammoMag?.parentElement;
    this.reloadText = document.getElementById("reload-text");
    this.reloadFill = document.getElementById("reload-fill");
    this.fireMode = document.getElementById("fire-mode");
    this.crosshair = document.getElementById("crosshair");
    this.hitmarker = document.getElementById("hitmarker");
    this.damageFlash = document.getElementById("damage-flash");
    this.lowHealth = document.getElementById("low-health-overlay");
    this.interaction = document.getElementById("interaction");
    this.interactionText = document.getElementById("interaction-text");
    this.holdFill = document.getElementById("hold-fill");
    this.subtitleWrap = document.getElementById("subtitle-wrap");
    this.subtitleSpeaker = document.getElementById("subtitle-speaker");
    this.subtitleText = document.getElementById("subtitle-text");
    this.announcement = document.getElementById("announcement");
    this.announceKicker = document.getElementById("announce-kicker");
    this.announceTitle = document.getElementById("announce-title");
    this.announceSub = document.getElementById("announce-sub");
    this.killfeed = document.getElementById("killfeed");
    this.weaponToast = document.getElementById("weapon-toast");
    this.weaponToastName = document.getElementById("weapon-toast-name");
    this.weaponToastSub = document.getElementById("weapon-toast-sub");
    this.controlsStrip = document.querySelector(".controls-strip");

    this.cache = {};
    this.subtitleQueue = [];
    this.subtitleActive = false;
    this.subtitleTimer = 0;
    this.announceTimer = 0;
    this.weaponToastTimer = 0;
    this.elapsed = 0;
    this.controlsFaded = false;
    this.damageFlashTimer = null;

    this.buildSquad();
  }

  buildSquad() {
    if (!this.squadList) return;
    this.squadList.textContent = "";
    this.squadRows = new Map();

    for (const member of SQUAD_CONFIG) {
      const row = document.createElement("div");
      row.className = "squad-row";
      row.innerHTML = `
        <div class="squad-avatar" style="--squad-color:${member.color}">${member.letter}</div>
        <div class="squad-info">
          <div class="squad-topline">
            <span class="squad-name">${member.name}</span>
            <span class="squad-state">OK</span>
          </div>
          <div class="squad-bar"><span></span></div>
        </div>
      `;
      this.squadList.append(row);
      this.squadRows.set(member.id, {
        row,
        state: row.querySelector(".squad-state"),
        bar: row.querySelector(".squad-bar span"),
      });
    }
  }

  show() {
    this.root?.classList.remove("hidden");
    this.root?.setAttribute("aria-hidden", "false");
  }

  hide() {
    this.root?.classList.add("hidden");
    this.root?.setAttribute("aria-hidden", "true");
  }

  update(game, dt) {
    this.elapsed += dt;

    if (!this.controlsFaded && this.elapsed > 18) {
      this.controlsFaded = true;
      this.controlsStrip?.classList.add("is-faded");
    }

    this.updateTimers(dt);
    this.updateVitals(game);
    this.updateWeapon(game.player);
    this.updateSquad(game);
    this.updateStats(game);
  }

  updateTimers(dt) {
    if (this.subtitleActive) {
      this.subtitleTimer -= dt;
      if (this.subtitleTimer <= 0) {
        this.subtitleActive = false;
        this.subtitleWrap?.classList.add("hidden");
        if (this.subtitleQueue.length > 0) {
          const next = this.subtitleQueue.shift();
          this.playSubtitle(next.speaker, next.text, next.duration);
        }
      }
    } else if (this.subtitleQueue.length > 0) {
      const next = this.subtitleQueue.shift();
      this.playSubtitle(next.speaker, next.text, next.duration);
    }

    if (this.announceTimer > 0) {
      this.announceTimer -= dt;
      if (this.announceTimer <= 0) {
        this.announcement?.classList.remove("visible");
      }
    }

    if (this.weaponToastTimer > 0) {
      this.weaponToastTimer -= dt;
      if (this.weaponToastTimer <= 0) {
        this.weaponToast?.classList.remove("visible");
      }
    }
  }

  updateVitals(game) {
    const player = game.player;
    if (!player) return;
    const health = Math.ceil(player.health);
    const healthPercent = clamp(player.health / player.maxHealth, 0, 1) * 100;

    if (this.cache.health !== health) {
      this.cache.health = health;
      this.healthValue.textContent = String(health);
    }
    if (this.cache.healthPercent !== healthPercent) {
      this.cache.healthPercent = healthPercent;
      this.healthFill.style.width = `${healthPercent}%`;
    }

    this.healthPanel.classList.toggle("is-hurt", healthPercent <= 60 && healthPercent > 30);
    this.healthPanel.classList.toggle("is-critical", healthPercent <= 30);
    this.lowHealth?.classList.toggle("active", player.health <= 34 && !player.downed);

    if (this.cache.medkits !== player.medkits) {
      this.cache.medkits = player.medkits;
      this.medkitCount.textContent = String(player.medkits);
    }
    if (this.cache.pipebombs !== player.pipebombs) {
      this.cache.pipebombs = player.pipebombs;
      this.pipeCount.textContent = String(player.pipebombs);
    }

    const downed = player.downed;
    if (this.cache.downed !== downed) {
      this.cache.downed = downed;
      this.downedStatus.classList.toggle("hidden", !downed);
      this.crosshair?.classList.toggle("is-hidden", downed);
    }
    if (downed) {
      const seconds = Math.max(0, Math.ceil(player.bleedout));
      if (this.cache.bleedout !== seconds) {
        this.cache.bleedout = seconds;
        this.bleedoutTimer.textContent = String(seconds);
      }
    }
  }

  updateWeapon(player) {
    if (!player) return;
    const weapon = player.weapon;
    const ammo = player.ammo;

    if (this.cache.weaponId !== weapon.id) {
      this.cache.weaponId = weapon.id;
      this.weaponName.textContent = weapon.name;
      this.fireMode.textContent =
        weapon.sound === "shotgun" ? "PUMP" : weapon.auto ? "AUTO" : "SEMI";
    }

    if (this.cache.ammoMag !== ammo.mag) {
      this.cache.ammoMag = ammo.mag;
      this.ammoMag.textContent = String(ammo.mag);
    }

    const reserveText = ammo.reserve === Infinity ? "∞" : String(ammo.reserve);
    if (this.cache.ammoReserve !== reserveText) {
      this.cache.ammoReserve = reserveText;
      this.ammoReserve.textContent = reserveText;
    }

    this.ammoRow?.classList.toggle("is-low", ammo.mag <= Math.max(2, Math.floor(weapon.magSize * 0.25)));

    if (this.cache.reloading !== player.reloading) {
      this.cache.reloading = player.reloading;
      this.reloadText.classList.toggle("hidden", !player.reloading);
    }

    const progress = player.reloading
      ? 1 - player.reloadTimer / Math.max(0.01, player.reloadDuration)
      : 0;
    this.reloadFill.style.width = `${clamp(progress, 0, 1) * 100}%`;
  }

  updateSquad(game) {
    const player = game.player;
    const bots = game.survivors?.bots ?? [];

    const values = [
      {
        id: "player",
        health: player.health,
        maxHealth: player.maxHealth,
        downed: player.downed,
        alive: true,
      },
      ...bots.map((bot) => ({
        id: bot.id,
        health: bot.health,
        maxHealth: bot.maxHealth,
        downed: bot.downed,
        alive: bot.alive,
      })),
    ];

    for (const value of values) {
      const row = this.squadRows.get(value.id);
      if (!row) continue;
      const percent = clamp(value.health / value.maxHealth, 0, 1) * 100;
      row.bar.style.width = `${percent}%`;
      row.row.classList.toggle("is-hurt", percent <= 60 && percent > 30);
      row.row.classList.toggle("is-critical", percent <= 30);
      row.row.classList.toggle("is-downed", value.downed || !value.alive);

      let state = "OK";
      if (!value.alive) state = "DEAD";
      else if (value.downed) state = "DOWN";
      else if (percent <= 30) state = "CRITICAL";
      else if (percent <= 60) state = "HURT";
      if (row.state.textContent !== state) row.state.textContent = state;
    }
  }

  updateStats(game) {
    if (this.cache.kills !== game.stats.kills) {
      this.cache.kills = game.stats.kills;
      this.statKills.textContent = String(game.stats.kills);
    }
    if (this.cache.specials !== game.stats.specials) {
      this.cache.specials = game.stats.specials;
      this.statSpecials.textContent = String(game.stats.specials);
    }
  }

  setObjective(stage, text, sub) {
    this.objectiveStage.textContent = stage;
    this.objectiveText.textContent = text;
    this.objectiveSub.textContent = sub;
  }

  setThreat(value, label) {
    const percent = clamp(value, 0, 1) * 100;
    this.threatFill.style.width = `${percent}%`;
    this.threatValue.textContent = label;
  }

  setSpread(gap) {
    this.crosshair?.style.setProperty("--gap", `${clamp(gap, 3, 34).toFixed(1)}px`);
  }

  setSpreadFromValue(value) {
    this.setSpread(value * 0.6 + 4);
  }

  setReload(progress, active) {
    this.reloadFill.style.width = `${clamp(progress, 0, 1) * 100}%`;
    this.reloadText.classList.toggle("hidden", !active);
  }

  setDowned(downed, bleedout = 0) {
    this.downedStatus.classList.toggle("hidden", !downed);
    this.crosshair?.classList.toggle("is-hidden", downed);
    if (downed) {
      this.bleedoutTimer.textContent = String(Math.max(0, Math.ceil(bleedout)));
      this.lowHealth?.classList.add("active");
    } else if (this.cache.health > 34) {
      this.lowHealth?.classList.remove("active");
    }
  }

  setInteraction(text, visible, holdProgress = 0) {
    if (!this.interaction) return;
    this.interaction.classList.toggle("hidden", !visible);
    if (visible && text) this.interactionText.textContent = text;
    this.interaction.classList.toggle("is-holding", visible && holdProgress > 0);
    this.holdFill.style.width = `${clamp(holdProgress, 0, 1) * 100}%`;
  }

  showHitmarker(headshot = false, killed = false) {
    if (!this.hitmarker) return;
    this.hitmarker.classList.remove("show");
    this.hitmarker.classList.toggle("is-headshot", headshot);
    this.hitmarker.classList.toggle("is-kill", killed);
    void this.hitmarker.offsetWidth;
    this.hitmarker.classList.add("show");
    this.crosshair?.classList.add("is-hit");
    clearTimeout(this.crosshairHitTimer);
    this.crosshairHitTimer = setTimeout(() => {
      this.crosshair?.classList.remove("is-hit");
    }, 90);
  }

  flashDamage(intensity = 0.5) {
    if (!this.damageFlash) return;
    if (intensity <= 0) {
      this.damageFlash.style.opacity = "0";
      return;
    }
    const current = parseFloat(this.damageFlash.style.opacity || "0");
    const next = clamp(Math.max(current, intensity * 0.82), 0, 0.9);
    this.damageFlash.style.transition = "none";
    this.damageFlash.style.opacity = String(next);
    void this.damageFlash.offsetWidth;
    this.damageFlash.style.transition = "opacity 0.42s ease-out";
    this.damageFlash.style.opacity = "0";
  }

  showDamageDirection(relativeAngle) {
    if (!this.root) return;
    const marker = document.createElement("div");
    marker.className = "damage-direction";
    marker.style.setProperty("--damage-angle", `${relativeAngle}rad`);
    this.root.append(marker);
    setTimeout(() => marker.remove(), 700);
  }

  subtitle(speaker, text, duration = 3.4) {
    if (this.subtitleActive) {
      if (this.subtitleQueue.length < 4) {
        this.subtitleQueue.push({ speaker, text, duration });
      }
      return;
    }
    this.playSubtitle(speaker, text, duration);
  }

  playSubtitle(speaker, text, duration) {
    this.subtitleActive = true;
    this.subtitleTimer = duration;
    this.subtitleSpeaker.textContent = speaker;
    this.subtitleText.textContent = text;
    this.subtitleSpeaker.style.color =
      speaker === "MARA" ? "#cda08f" : speaker === "ROOK" ? "#b7c69e" : "#e04e43";
    this.subtitleWrap.classList.remove("hidden");
  }

  announce(kicker, title, sub = "", danger = false, duration = 3.2) {
    this.announceKicker.textContent = kicker;
    this.announceTitle.textContent = title;
    this.announceSub.textContent = sub;
    this.announcement.classList.toggle("is-danger", danger);
    this.announcement.classList.remove("visible");
    void this.announcement.offsetWidth;
    this.announcement.classList.add("visible");
    this.announceTimer = duration;
  }

  addKillfeed(text, special = false) {
    if (!this.killfeed) return;
    const item = document.createElement("div");
    item.className = `feed-item${special ? " special" : ""}`;
    item.textContent = text;
    this.killfeed.prepend(item);
    while (this.killfeed.children.length > 5) {
      this.killfeed.lastElementChild.remove();
    }
    setTimeout(() => {
      item.classList.add("is-out");
      setTimeout(() => item.remove(), 360);
    }, 4200);
  }

  showWeaponToast(name, category) {
    this.weaponToastName.textContent = name;
    this.weaponToastSub.textContent = category;
    this.weaponToast.classList.add("visible");
    this.weaponToastTimer = 1.8;
  }

  showTimer(label, seconds, critical = false) {
    this.directorTimer.classList.remove("hidden");
    this.directorTimerLabel.textContent = label;
    this.directorTimerValue.textContent = formatTime(seconds);
    this.directorTimer.classList.toggle("is-critical", critical);
  }

  hideTimer() {
    this.directorTimer.classList.add("hidden");
  }
}
