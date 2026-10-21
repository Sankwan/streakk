# Streak — First Race 0.5

Two Ghana taxi racecars now run in one Rapier simulation. Race KOJO for two laps on Tema Harbour Run or North Loop, collect compact boost/repair/shield pickups, manage two inventory slots, and finish with a position and race time. Earlier builds remain preserved.

## Play

Open **Start Streak Race.command** in this folder, or run `python3 serve.py`. Python 3 serves the included production build at http://127.0.0.1:8768/ and opens a browser. Keep Terminal open; Ctrl+C stops it. No npm install, account or internet is required for this local single-player/AI build. Do not double-click dist/index.html. The agent's temporary development preview is not the permanent launcher.

Choose a circuit and **TAKE THE WHEEL**. After the three-second countdown, WASD/arrows drive; Space drifts; E uses the first inventory slot; Q swaps the slots; R restarts the entire two-car race; C changes camera; P/Escape pauses. Sound is opt-in. On-screen item buttons also work. **WATCH AI DEMO** drives your car using the same conservative controller; you can still use items and press TAKE CONTROL to resume manual driving. Demo mode is labelled on the HUD.

Collect an icon by driving close to it. Blue lightning = boost (three seconds of increased drive force/speed ceiling); green plus = repair (up to 35 condition points); gold shield = protection from collision damage for five seconds. A repair held at full condition is kept rather than wasted. Swap to the other slot with Q when necessary. Shield prevents condition loss, not physical collision response. Repair/shield do not yet interact with projectiles because projectile combat is the next step.

Two slots; one claimant per pickup; 12-second respawns measured in simulation time. Pickups are visual tokens with a swept collection test, not solid obstacles. Tema has sixteen active tokens in eight compact pairs; North has one pair. Outside passing space is retained. Optional hollow rings in TRACKS remain route-design guides and are distinct from the active solid icons.

Condition drops on substantial horizontal impact changes, capped at 35 points per impact, with an 0.8-second damage cooldown. A wreck recovers after two seconds; falls/out-of-bounds and a stuck AI also recover. Recovery clears items/effects, restores condition and invalidates the current lap's ordered-sector validation. A full valid circuit is then needed before a lap can count; recovery is deliberately a substantial race penalty. This is an initial heuristic collision-damage model, not detailed bodywork damage simulation.

The race ends for each car after two validated laps. Player results show position and elapsed race time, excluding the countdown. AI can finish independently. RACE AGAIN restarts both cars, timers, health, inventory and all pickup cooldowns. TRACKS pauses and resets the race on the selected circuit. Graphics presets/adaptive resolution and the taxi/shopfront integration from 0.4 are retained.

## What changed technically

- `src/race/simulation.ts` owns stable racer IDs, canonical Vehicle instances, inventory, condition, effect deadlines, lap state, standings, results, collection and recovery.
- Vehicle now exposes prepare/capture phases. Every racer submits forces first; the shared world advances exactly once per fixed tick; every racer then captures the result. The old standalone Vehicle.step remains only as a single-car harness convenience. One-car split-phase equivalence is tested. Graphics timing never sets the physics step.
- `src/race/ai.ts` is a conservative fixed-offset pure-pursuit driver with curvature-aware braking and basic recovery. It uses real Rapier forces/collisions. It has no teleport speed advantage or separate planar integrator. It is not a completed opponent with tactical overtaking or sophisticated obstacle avoidance.
- `src/race/pickups.ts` creates stable IDs from route/version/site/lane. Swept 3D collection prevents ordinary high-speed misses and airborne collection far above tokens. Discontinuous moves over ten metres per tick are rejected. Simultaneous claims use earliest swept contact, with stable ID tie-breaking. Full inventories cannot collect more items.
- `src/race/visuals.ts` supplies reused pickup textures/materials, compact sprites/rings, modest wireframe shields and boost exhaust effects. KOJO has a distinct blue/ochre livery and name label. No new remote assets or platform SDKs are imported.

## Validation and limits

See VALIDATION.txt and route-checks.json. Production TypeScript/Vite build and 25 tests pass. Tests include one shared world step with two cars, countdown freeze, unchanged single-car handling, bounded/unique inventory claims and cooldowns, use/effect deadlines, repair capping, swept collection, racer standings, plus a real Rapier wall impact with/without a shield. Earlier handling, geometry, model conversion and render-budget checks remain.

A two-car headless route run completes two laps for both racers on both circuits, with no off-road ticks or recoveries and exactly two dynamic bodies. These are feasibility/regression checks with scripted controllers, not human race results or a frame-rate benchmark. Browser checks exercise collection and E activation, the small-screen HUD, manual driving and both cars, plus a completed assisted North Loop race (57.283 s), independent AI finish and Race Again clearing both inventories. Sampled console errors/warnings were empty. Benchmark/performance observations must be tied to the actual tested view; no full-pack, real-mobile, gamepad, LAN or online performance claim is made. Frame diagnostics now retain active long stalls instead of filtering them out, and FPS uses actual elapsed frame time. The large bundled Rapier chunk warning remains (~1.86 MB compressed application JS).

Still limited to one AI opponent and flat closed circuits. No projectile/mine/area weapons, full destruction, progression, voice, LAN or online matchmaking yet. Audio remains the small opt-in prototype oscillator. City art and props remain a partial procedural integration, not a finished environment/collision world. North retains its pre-existing tight-bend geometry warning. The simulation registry is groundwork for authority, not an implemented network host; future multiplayer should use host snapshots rather than assuming deterministic cross-device lockstep.

Next: one swept projectile with obstruction checks, attribution, shield response and bounded hit disruption, followed by stronger AI passing/recovery and pack/performance qualification. Offline LAN remains after the common single-machine race loop is stable.

## Source and credits

Source: the First Race 0.5 source snapshot. Previous lab and candidate snapshots are retained outside this repository. For development after extraction use Node 22+ with `npm ci`, `npm test`, `npm run test:race`, `npm run dev`, `npm run build`. Dependencies and generated bundles are excluded from Git.

Adapted taxi/facade source retains the supplied Genex/MIDNIGHT APEX attribution in THIRD_PARTY_NOTICES.txt. No original Blur binaries, models, textures or sounds are shipped. See the preserved notices before public redistribution.
