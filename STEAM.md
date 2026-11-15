# Dead Streets — Steam publishing checklist

The game already ships as an offline portable Windows exe (`npm run dist` -> `release/`).
This is what stands between that exe and a Steam store page.

## Already handled in-repo

- Portable Windows build via Electron + electron-builder (`release/`, gitignored).
- App loads the local `dist/` bundle: no server, no internet required after install.
- Relative Vite base (`./`) so `file://` model/texture loading works.
- Offline PWA service worker for the web build (harmless on desktop).
- No third-party accounts, DRM, or launchers in the game itself.
- All third-party art is CC0 (Quaternius, Rikindle3D, Kenney) — safe to sell; credits in README + in-game menu.

## Partner account (human required)

1. Pay the $100 Steam Direct fee and create the app (gets you an App ID).
2. Create `steam_appid.txt` containing the App ID next to the exe for local testing.
3. Configure depots: one Windows depot with the contents of `release/win-unpacked/`.
4. Fill the store page: capsules (616x353 header, 460x215 hero, 1920x620 library hero),
   5+ screenshots, trailer, description, tags (FPS, Zombies, Survival, Co-op... note: co-op here means AI teammates).
5. Content review + release review; set pricing / launch discount.

## Recommended code work before submission

- Sign the Windows binary (removes SmartScreen warnings; required for player trust).
- Steamworks integration for achievements + leaderboards. Options: `greenworks` or
  `steamworks.js`. Natural hook points:
  - `Game.endRun()` — report victory, kills, difficulty, time; unlock "EXTRACTED" / Nightmare achievements.
  - `settings.js considerBest()` — back the local best-run with Steam leaderboards/stats.
  - `Game.startRun()` — set Rich Presence ("Sector 2 — Nightmare").
- Cloud saves: Steam Auto-Cloud the `dead-streets:*` localStorage keys, or move saves to
  `userData` files. Currently: difficulty, sensitivity, volume, quality, best run.
- Playtest the packaged build on a clean Windows machine (GPU + SwiftShader fallback),
  all three difficulties, full run start to extraction.

## Store-page honesty

- Single-player with AI teammates (no online multiplayer).
- Fan-made homage; contains no Valve assets or code.
- AI content disclosure: none (all art is human-made CC0 or procedural).
