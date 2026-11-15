export const DIFFICULTIES = {
  civilian: {
    id: "civilian",
    name: "CIVILIAN",
    sub: "A gentler street",
    healthScale: 0.8,
    speedScale: 0.92,
    spawnScale: 1.15,
  },
  survivor: {
    id: "survivor",
    name: "SURVIVOR",
    sub: "The intended street",
    healthScale: 1,
    speedScale: 1,
    spawnScale: 1,
  },
  nightmare: {
    id: "nightmare",
    name: "NIGHTMARE",
    sub: "No mercy given",
    healthScale: 1.35,
    speedScale: 1.08,
    spawnScale: 0.85,
  },
};

export const DIFFICULTY_KEY = "dead-streets:difficulty";

export function safeStoredDifficulty() {
  try {
    return localStorage.getItem(DIFFICULTY_KEY) ?? "survivor";
  } catch {
    return "survivor";
  }
}

export function storeDifficulty(id) {
  try {
    localStorage.setItem(DIFFICULTY_KEY, id);
  } catch {
    // Private mode etc: selection just lasts for the session.
  }
}
