import { clamp } from "./utils.js";

export const BEST_KEY = "dead-streets:best";

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode etc: settings last for the session.
  }
}

export function loadNumber(key, fallback, min, max) {
  const raw = parseFloat(safeGet(key));
  if (!Number.isFinite(raw)) return fallback;
  return clamp(raw, min, max);
}

export function saveNumber(key, value) {
  safeSet(key, String(value));
}

export const SENSITIVITY_KEY = "dead-streets:sensitivity";
export const QUALITY_KEY = "dead-streets:quality";

export function loadQuality() {
  return safeGet(QUALITY_KEY) === "low" ? "low" : "high";
}

export function saveQuality(quality) {
  safeSet(QUALITY_KEY, quality);
}

export function loadBest() {
  try {
    const raw = safeGet(BEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.kills !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

// Pure: a winning run beats any loss; otherwise more kills, then longer survival.
export function isBetterRun(run, best) {
  if (!best) return true;
  if (Boolean(run.victory) !== Boolean(best.victory)) return Boolean(run.victory);
  if (run.kills !== best.kills) return run.kills > best.kills;
  return run.time >= best.time;
}

// Returns the stored best after considering run (persists when improved).
export function considerBest(run) {
  const best = loadBest();
  if (isBetterRun(run, best)) {
    const next = {
      victory: Boolean(run.victory),
      kills: run.kills,
      time: run.time,
      difficulty: run.difficulty ?? "survivor",
    };
    safeSet(BEST_KEY, JSON.stringify(next));
    return { best: next, isNewBest: true };
  }
  return { best, isNewBest: false };
}

export function formatBestLine(best) {
  if (!best) return "";
  const minutes = Math.floor(best.time / 60);
  const seconds = Math.floor(best.time % 60).toString().padStart(2, "0");
  const outcome = best.victory ? "EXTRACTED" : "FELL";
  return `BEST ${outcome} — ${best.kills} KILLS IN ${minutes}:${seconds} (${String(best.difficulty).toUpperCase()})`;
}
