import { clamp } from "./utils.js";

// Standard mapping, L4D-style:
// LS move (full tilt = sprint) | RS look | RT fire | LT ADS
// A jump | B shove | X reload | Y use/revive | LB/RB weapons
// D-down medkit | D-right pipe bomb | Start pause | Back mute
export const BUTTON = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT_ANALOG: 6,
  RT_ANALOG: 7,
  BACK: 8,
  START: 9,
  L3: 10,
  R3: 11,
  D_UP: 12,
  D_DOWN: 13,
  D_LEFT: 14,
  D_RIGHT: 15,
};

export const LOOK_RATE = 165; // deg/sec at full tilt before curve
export const STICK_DEADZONE = 0.22;

const WEAPON_ORDER = ["rifle", "shotgun", "pistol"];

function cycleWeapon(player, direction) {
  const current = WEAPON_ORDER.indexOf(player.currentWeaponId);
  const next = (current + direction + WEAPON_ORDER.length) % WEAPON_ORDER.length;
  player.switchWeapon(next + 1);
}

// Pure: deadzone + quadratic response curve, preserves sign.
export function shapeAxis(value, deadzone = STICK_DEADZONE) {
  const magnitude = Math.abs(value);
  if (magnitude <= deadzone) return 0;
  const t = (magnitude - deadzone) / (1 - deadzone);
  return Math.sign(value) * t * t;
}

// Pure: stick deflection -> look degrees this frame.
export function lookDelta(axis, dt, rate = LOOK_RATE) {
  return shapeAxis(axis) * rate * dt;
}

// Pure: -1..1 stick pair -> digital move intent + sprint flag.
export function moveIntent(x, y) {
  const shapedX = shapeAxis(x);
  const shapedY = shapeAxis(y);
  const magnitude = Math.hypot(shapedX, shapedY);
  return {
    forward: shapedY < -0.08,
    back: shapedY > 0.08,
    left: shapedX < -0.08,
    right: shapedX > 0.08,
    sprint: magnitude > 0.92,
    magnitude: clamp(magnitude, 0, 1),
  };
}

function firstGamepad() {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
  for (const pad of navigator.getGamepads()) {
    if (pad && pad.connected) return pad;
  }
  return null;
}

function pressed(pad, index) {
  return Boolean(pad.buttons[index]?.pressed);
}

export class GamepadController {
  constructor() {
    this.previous = new Set();
    this.seen = false;
    this.padFiring = false;
    this.padInteracting = false;
  }

  pad() {
    return firstGamepad();
  }

  isPressed(index) {
    const pad = this.pad();
    return pad ? pressed(pad, index) : false;
  }

  // Edge-triggered: true only on the frame the button goes down.
  justPressed(index) {
    const pad = this.pad();
    if (!pad) {
      this.previous.delete(index);
      return false;
    }
    const down = pressed(pad, index);
    const was = this.previous.has(index);
    if (down) this.previous.add(index);
    else this.previous.delete(index);
    return down && !was;
  }

  announceIfNew(game) {
    if (!this.seen && this.pad()) {
      this.seen = true;
      game.hud.addKillfeed("CONTROLLER CONNECTED", false);
    }
  }

  // Clears latched button edges; call on pause/resume/start so a button
  // held across the transition does not fire on the first frame after it.
  resetEdges() {
    this.previous.clear();
  }

  updateMenu(game) {
    this.announceIfNew(game);
    if (game.state !== "menu") return;
    const startPressed = this.justPressed(BUTTON.START);
    const aPressed = this.justPressed(BUTTON.A);
    if (startPressed || aPressed) {
      game.startRun();
    }
  }

  updatePlaying(game, dt) {
    const pad = this.pad();
    this.announceIfNew(game);
    if (!pad || game.state !== "playing") return;
    const input = game.input;

    const move = moveIntent(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
    // OR-merge: a centered stick contributes nothing, so keyboard input
    // survives when a gamepad is merely connected.
    input.forward = input.forward || move.forward;
    input.back = input.back || move.back;
    input.left = input.left || move.left;
    input.right = input.right || move.right;
    input.sprint = input.sprint || move.sprint;

    // Right stick look; convert degrees to the pixel units player.look expects.
    const yawDegrees = lookDelta(pad.axes[2] ?? 0, dt);
    const pitchDegrees = lookDelta(pad.axes[3] ?? 0, dt);
    if (yawDegrees !== 0 || pitchDegrees !== 0) {
      const pxPerDegree = 1 / 0.106;
      game.player.look(yawDegrees * pxPerDegree, pitchDegrees * pxPerDegree);
    }

    const aimValue = pad.buttons[BUTTON.LT_ANALOG]?.value ?? 0;
    input.aim = input.aim || pressed(pad, BUTTON.LT_ANALOG) || aimValue > 0.35;

    const triggerValue = pad.buttons[BUTTON.RT_ANALOG]?.value ?? 0;
    const fireDown = pressed(pad, BUTTON.RT_ANALOG) || triggerValue > 0.35;
    if (fireDown && !this.padFiring) {
      this.padFiring = true;
      input.fire = true;
      game.player.setTrigger(true);
    } else if (!fireDown && this.padFiring) {
      this.padFiring = false;
      input.fire = false;
      game.player.setTrigger(false);
    }

    if (this.justPressed(BUTTON.A) && !game.player.downed) game.player.jump();
    if (this.justPressed(BUTTON.B)) game.player.shove();
    if (this.justPressed(BUTTON.X)) game.player.startReload();
    if (this.justPressed(BUTTON.Y)) {
      this.padInteracting = true;
      input.interact = true;
      game.interactPressed = true;
    } else if (this.padInteracting) {
      const yStillDown = pressed(pad, BUTTON.Y);
      if (!yStillDown) {
        this.padInteracting = false;
        input.interact = false;
      }
    }
    if (this.justPressed(BUTTON.LB)) cycleWeapon(game.player, -1);
    if (this.justPressed(BUTTON.RB)) cycleWeapon(game.player, 1);
    if (this.justPressed(BUTTON.D_DOWN)) game.player.useMedkit();
    if (this.justPressed(BUTTON.D_RIGHT)) game.player.throwPipeBomb();
    if (this.justPressed(BUTTON.BACK)) {
      const muted = game.audio.toggleMute();
      game.hud.addKillfeed(muted ? "AUDIO MUTED" : "AUDIO ENABLED", false);
    }
    if (this.justPressed(BUTTON.START)) game.pauseGame();
  }

  updatePaused(game) {
    if (game.state !== "paused") return;
    if (this.justPressed(BUTTON.START)) game.resumeGame();
  }
}
