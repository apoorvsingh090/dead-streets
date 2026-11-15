# Dead Streets — QA playtest checklist

One full run takes ~8-12 minutes. Check each box in order; note failures with
sector, difficulty, and what was on screen.

## Boot
- [ ] `npm run dev` serves; page loads with no console errors.
- [ ] `npm run build && npm run preview` serves; `/models/ally_rook.glb`, `/models/zombie.glb`, `/manifest.webmanifest`, `/sw.js` all 200.
- [ ] Menu shows difficulty buttons (Survivor active by default), best-run line after a first run, CC0 credits.

## Menu / settings
- [ ] Difficulty persists across reload (localStorage `dead-streets:difficulty`).
- [ ] Sensitivity / FOV / volume / quality persist across reload.
- [ ] Start / A-button / Enter all start the run; pointer lock engages.

## Sector 1 (checkpoint horde)
- [ ] Wave spawns, threat HUD rises, killfeed + hitmarkers work.
- [ ] Rifle feels right at range; shotgun shreds close, falls off far.
- [ ] Pistol is semi-auto (one shot per click).
- [ ] Allies fight, follow, and call out; squad panel tracks health.
- [ ] Down an ally: hold E revives (2.2s). Kill an ally (bleedout): hold E recruits (3.5s, RECRUIT label).
- [ ] Full-team down: crawl to a bot, recruit it, it auto-revives you.

## Sector 2 (market)
- [ ] Second wave + spitter acid pools (max 8, circular, damage inside only).
- [ ] Supplies restock medkit/pipe/ammo; wave-clear heals +18.
- [ ] Dead allies rejoin after the wave with killfeed + voice line.

## Finale / escape
- [ ] Generator prompt only starts the finale in the generator stage.
- [ ] Brute arrives ~48s into the finale (retries if the spawn cap is hit).
- [ ] Door opens, timer ends, EVAC objective fires, extraction zone wins the run.
- [ ] End screen stats + NEW BEST on record runs; menu best line updates.

## Pause / gamepad
- [ ] Esc pauses (pointer unlock pauses too); sliders + quality + controls recap render.
- [ ] Controller (if available): sticks move/look, RT/LT fire/ADS, Y revive, Start pause/resume.
- [ ] Mute (M / Back) silences; volume slider scales everything.

## Desktop build
- [ ] `npm run dist` produces `release/Dead Streets *.exe`; game boots to menu.
- [ ] F11 toggles fullscreen; no console errors in the first 60 seconds.

## Perf
- [ ] No sustained hitches during finale hordes on HIGH; LOW halves pixel load.
- [ ] Tracers fade without GC spikes; corpses cap at 16.
