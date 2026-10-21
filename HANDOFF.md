# Streak Development Handoff

Updated: 21 October 2026

This document is the working brief for continuing Streak in Claude or another Codex account. Start from the GitHub `development` branch. Keep `main` unchanged until Gabriel has tested a milestone and explicitly agrees to promote it.

## Repository and branch state

- Repository: `https://github.com/Sankwan/streakk`
- Continue on: `development`
- Previous validated development commit: `9e58534939f38e346c10d2e7e727200c0fe58b16`
- Current source milestone: Combat Roads 0.10.0 (camera, mine, impact feedback and third track)
- Current release baseline on `main`: `6383aa6c6502967c57843a2822eadad7b3ba2a0e`
- Current packaged build: `artifacts/Streak-v0.9.0-dbc16dcfe995.zip`
- Local working folder used during development: `/Users/gabby/Documents/Codex/2026-10-21/i-w/work/streakk-repository`

The GitHub commit was created through the GitHub app because local HTTPS Git authentication was unavailable. Its tree matches the validated local 0.9 tree, although the local commit IDs differ. Before the next push, fetch the remote `development` head and use a normal fast-forward update or the GitHub Git Data API with an expected-head lease. Never force-push.

Use short commit messages. Do not add Codex, Claude, or another assistant as a collaborator or co-author.

## Product direction

Streak is an original browser arcade combat racer inspired by the clarity and pacing of Blur. It should have its own Ghanaian identity: recognizable taxi racecars, Accra/Tema-inspired places, restrained colors, readable UI, wide roads, and power-ups that leave drivers room to evade.

Target desktop/laptop first while keeping layouts and input architecture mobile-aware. The long-term multiplayer order is:

1. A strong local single-player combat-racing loop.
2. Fully offline LAN sessions that need no internet connection.
3. Internet matchmaking, parties, and private rooms.
4. Opt-in voice chat for team communication.

Do not ship Blur assets, code, audio, names, or trademarks. Reverse-engineering evidence is for understanding behavior and file schemas. Create original implementation and assets.

## What is implemented

Version 0.9 includes:

- Rapier fixed-step vehicle physics with exactly one shared world step per simulation tick.
- Smoother digital steering, speed-sensitive steering lock, pedal smoothing, restrained collider bounce, and improved slide recovery.
- Four racers: YOU, KOJO, AMA, and MENSAH, with distinct Ghana taxi-inspired colors.
- Lane-aware AI overtaking and magnetic-field avoidance.
- Three tracks: North Loop, Tema Harbour Run and Accra Ring Night Run.
- Wide, width-aware road geometry, lane markings, barriers, pickup placement, minimap, and lap validation.
- Two-slot inventory with boost, repair, shield, pulse, and magnet pickups.
- Automatic pulse target lock, automatic lock switching to the most directly-ahead racer, guided projectile flight, obstruction checks, target reticle, and warning shown to the targeted racer.
- A magnetic strip projected ahead of the field. It pulls and slows racers inside its central strip while leaving outside escape lanes.
- Adaptive render resolution and low-detail behavior.
- Camera collision checks, smoother chase position and look target, and a modest speed-based FOV increase.
- Desktop, touch, keyboard, and gamepad input paths.

Validation at the 0.9 milestone:

- `npm test`: 45 tests passed.
- `npm run test:routes`: both routes completed with zero off-road failures.
- `npm run test:race`: all four racers completed both routes with zero recoveries/off-road ticks.
- `npm run build -- --configLoader runner`: passed.
- Browser check: 60 FPS, about 17.5 ms p95 on the test machine; roughly 87 draw calls and 274k triangles in the sampled scene.

## Next four iterations

Complete these as one tested batch before the next push.

### 1. Camera feel pass

Compare the current camera in `src/main.ts` with the useful behavior in the supplied Midnight Apex source:

`/Users/gabby/Desktop/streakk/candidates/black-star-v0.2/src/core/camera.js`

Adapt only these effects:

- Blend the chase direction partly toward velocity during a drift so the car rotates visibly inside the frame.
- Add gentle acceleration lag: acceleration pulls the camera slightly back and braking moves it slightly forward.
- Keep speed-scaled FOV, but use a smooth curve and cap it to avoid distortion.
- Add very small corner banking from yaw rate or heading change.
- Add short trauma-based shake for strong impacts. Decay trauma quickly and use squared intensity.
- Respect `prefers-reduced-motion`: disable banking and shake and retain position/FOV smoothing.

Keep all effects subtle. Driving clarity and motion comfort take priority. Do not import Midnight Apex's post-processing stack. Avoid new per-frame allocations where practical and retain the Rapier camera obstruction query.

Suggested acceptance checks:

- No hard camera cut after reset, track switch, collision, or drift recovery.
- Horizon bank remains below roughly 2 degrees.
- Ordinary road motion does not shake the camera.
- A barrier impact produces one short response rather than repeated shaking while scraping.
- FOV returns smoothly after slowing.

### 2. Rear mine pickup

Add an original compact mine; do not block the full road.

Recommended rules:

- Deploy 3.0–3.2 metres behind the car, projected back onto the valid road surface.
- Arm after 0.55 seconds.
- Owner is immune to their own mine.
- Lifetime: about 14 seconds.
- Global cap: 8 active mines; remove the oldest when the cap is exceeded.
- Trigger radius: about 2.1 metres.
- Damage: about 24 condition points.
- Short disruption: about 1 second, with at most 5 m/s speed loss and no forced spin.
- Shield absorbs it. Existing brief damage protection prevents repeated stacking.
- Give it a low, bright, readable visual and an armed pulse. It must be visible early enough to dodge.
- AI should consider mines during lane selection and choose an open lane when possible.
- Mine state must reset on race/track reset and must not create Rapier rigid bodies or extra world steps.

Add focused tests for arming delay, owner immunity, shield absorption, one-hit removal, global cap, reset, AI avoidance, and bounded speed loss. Update pickup icon/color tables, active pickup visuals, HUD copy, and race simulation together.

### 3. Impact and combat feedback

Make hits readable without a heavy full-screen effect:

- Feed strong wall impacts, pulse hits, and mine hits into the camera trauma system.
- Add a brief edge vignette or HUD border pulse; keep it under roughly 250 ms.
- Differentiate shield absorption from damage using color and sound/UI text.
- Rate-limit collision feedback so barrier scraping does not strobe.
- Keep existing pooled projectile sparks and add pooled mine burst rings/sparks.
- Show the attacker/weapon in the victim notice when available.
- Add a low-health state below 30% condition without obscuring the road.

Performance acceptance: no unbounded particle allocation, no new draw call per active spark, and no persistent full-screen blur.

### 4. Third track

Build a new original Ghana-inspired route using the existing compiler in `src/tracks/definitions.ts` and the shared environment pipeline in `src/track.ts`.

Recommended concept: **Accra Ring Night Run**.

- Four lanes on the fastest sections, narrowing to three or two effective racing lines through technical corners.
- Approximate length: 2.0–2.8 km.
- Road width: roughly 26–36 m on major sections and never below the compiler's safe limits.
- Include one long double-lane straight for combat, a broad sweeping turn, a technical market/underpass sector, and a finish approach with clear sight lines.
- No self-crossings until bridge/elevation collision decks exist.
- Place pickup opportunities on straights and corner exits. Preserve at least one clear bypass corridor around every group.
- Reuse instancing, procedural frontage, and existing materials. Add atmosphere through layout, signs, lighting/color, and landmark silhouettes rather than many high-poly assets.
- Add compiler/projection tests, route driving validation, four-racer completion tests, and a browser performance sample.

If night lighting is too expensive or harms visibility, ship a dusk version first.

## Work after the next batch

### Offline LAN milestone

Use a host-authoritative model. One player's browser hosts race authority through a small local companion server or packaged host executable; other devices connect over the same Wi-Fi/LAN. Browser-only discovery is unreliable, so provide a room code and local IP/QR join flow. The game must run without internet access.

Separate simulation state from rendering before networking. Send compact input commands to the host, simulate at a fixed tick, broadcast snapshots, interpolate remote cars, and reconcile the local player. Keep weapons, pickup claims, lap validation, damage, and respawns authoritative on the host.

Suggested first LAN scope:

- 2–4 players.
- One track and one car class.
- Private room code/local address join.
- Ready lobby, synchronized countdown, race, results, rematch.
- Text status and connection quality indicators.
- No voice in the first LAN slice.

### Internet multiplayer

After LAN is stable, add a dedicated authoritative server, matchmaking service, parties/private rooms, regional routing, reconnect handling, telemetry, abuse controls, and version compatibility. WebRTC data channels may help peer connectivity, but authoritative race state should not rely on an untrusted peer for public matchmaking.

### Voice chat

Implement voice as an opt-in WebRTC audio feature after multiplayer sessions are reliable. Require microphone permission only when the player enables voice. Provide push-to-talk, mute, per-player mute, input device selection, visible speaking indicators, and a clear no-microphone fallback. Public matchmaking also needs reporting/blocking and voice moderation planning.

## Important files

- `src/main.ts`: app boot, renderer, camera, input, UI binding, track switching.
- `src/vehicle.ts`: current Rapier vehicle behavior and handling tune.
- `src/race/simulation.ts`: authoritative local race/combat state and the single shared physics step.
- `src/race/projectiles.ts`: pulse targeting, guidance, swept collision, obstruction.
- `src/race/pickups.ts`: pickup types and deterministic placement.
- `src/race/visuals.ts`: pickup, racer, magnet, projectile, and impact visuals.
- `src/race/ai.ts`: route-following driver control.
- `src/tracks/definitions.ts`: route definitions.
- `src/tracks/compiler.ts`: route validation, projection, samples, pickup opportunities.
- `src/track.ts`: road, barriers, lane markings, environment, and track colliders.
- `src/scenery.ts`: Ghana-inspired frontage placement.
- `src/performance.ts`: adaptive render budget and quality modes.
- `tests/`: unit and integration coverage.
- `tools/drive-course.ts`, `tools/check-race.ts`: headless route/race checks.
- `AGENTS.md`: branch, validation, and fixed-step rules.

## Research and supplied references

Treat these as references, not redistributable game assets:

- `/Users/gabby/Downloads/Blur.exe`
- `/Users/gabby/Downloads/blur_static_analysis.zip`
- `/Users/gabby/Downloads/blur_advanced_camera.ct`
- `/Users/gabby/Downloads/streak-source.zip`
- `/Users/gabby/Desktop/streakk/candidates/black-star-v0.2`
- `/Users/gabby/Desktop/streakk/research/reference/racingphysics.json`
- `/Users/gabby/Desktop/streakk/research/reference/carsettings-candidate-897d10.asm.txt`
- `/Users/gabby/Desktop/streakk/docs/physics-research-fields.csv`

The Blur analysis established useful field/schema evidence such as steering smoothing, damping, spring centering, low-speed steering, slide recovery, anti-flick, grip, and combined-slip concepts. It did not recover a complete original physics equation. Keep Streak's implementation original and tune it through measured playtests.

Relevant public repositories previously reviewed or identified:

- `Aib0t/blur-hooks-rs`
- `Aib0t/blur_stuff`
- `Sankwan/blur-community-wiki`
- `MdPro64/blur-map-builder`
- `morluto/rea`
- `NationalSecurityAgency/ghidra`
- `rizinorg/cutter`
- `ange-yaghi/engine-sim`

REA is configured for targeted native-binary questions. Use it only when a specific binary behavior cannot be answered from existing notes/source. Do not let reverse engineering delay the original playable game loop.

## Validation and packaging

Run these before every development push:

```bash
npm install
npm test
npm run test:routes
npm run test:race
npm run build -- --configLoader runner
```

Then perform a browser playtest for:

- steering smoothness and camera comfort;
- every pickup, target warning, shield response, and mine avoidance;
- all racers completing every track;
- track switching and race reset;
- keyboard, gamepad, and touch controls;
- graphics quality changes;
- FPS, p50/p95 frame time, draw calls, and triangle count.

Package only after the working tree is clean and validation passes. Update `README.md`, `VALIDATION.txt`, `docs/development.md`, the visible build label, `package.json`, and a milestone note together. Push the completed milestone to `development`. Promote to `main` only after Gabriel tests it and explicitly agrees.

## Immediate start prompt for the next assistant

> Continue Streak from `Sankwan/streakk` branch `development`. Read `AGENTS.md`, `HANDOFF.md` and `docs/combat-roads-0.10.md`. Begin the offline LAN milestone with a host-authoritative 2–4 player room slice while preserving the local single-player loop and one shared Rapier world step per fixed tick. Validate all tests/routes/races/build plus browser playtests, use short commit messages, push validated milestones to `development`, and do not modify `main` without Gabriel's explicit agreement.
