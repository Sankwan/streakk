# Development and promotion

The project owner authorizes pushing completed builds to `development` as work progresses. No further approval is needed for routine development pushes. This does not authorize promoting builds to `main` before agreement.

## Every completed development milestone

1. Inspect the current remote head; preserve existing work and history.
2. Make the change, keep source credits and version notes, and run relevant tests.
3. Run all shared-race checks before completing a simulation milestone: unit/regression tests, standalone route checks, four-car race checks, and the production build.
4. Exercise the changed player flow in a browser. Record device/performance and human-playtest gaps rather than presenting automated success as complete qualification.
5. Commit and push to `development`; verify the remote commit SHA and CI result. A completed local build is not a successful GitHub push.
6. Download the matching artifact for playtesting. Record bugs against the exact commit/build.

`verify` runs for pushes to development/main and PRs targeting either branch. It checks/tests/builds, then produces a ZIP containing source, production assets, validation output, launcher and build metadata. No workflow merges branches or publishes a website.

## Promoting a release

- Open a release PR from development to main with the exact version/commit, resulting behaviour, validation and known limits.
- Require passing verify checks and relevant browser/human playtesting.
- Measure busy scenes/pack/combat frame times on the agreed device baseline when the change affects graphics or simulation cost.
- Obtain explicit project-owner agreement for that specific candidate.
- Merge only after that agreement, then verify the resulting main commit and build artifact. Never enable auto-merge as a substitute for agreement.

Repository policy is recorded in AGENTS.md. Server-enforced protection is a separate GitHub setting: require pull requests and the verify status on main, disable force pushes and deletion, and select an appropriate human review policy for the team. Those settings are not claimed as configured until read back successfully. Do not require a solo author to approve their own PR as the only approval route.

## Current evidence and limitations

Cape Coast 0.13 adds a 2.64 km original mixed-rhythm circuit. Shared route zones drive the coastal art, local lane count, frontage density, safe pickup placement and the future traffic sector. The broad road reads as four lanes, town streets as two and the roughly 211 m squeeze as one undivided lane. Sand, water and palms use two ribbon meshes and two instanced meshes. Fifty-five tests pass; route and four-car race checks complete all four circuits with zero recoveries or off-road ticks. Browser feel and live performance still require the current manual playtest.

Combat Roads 0.10 adds the velocity-aware/impact-responsive camera, compact rear mines with AI avoidance, rate-limited hit feedback, and Accra Ring Night Run. Forty-eight local tests pass. Standalone controllers and every four-car pack complete all three tracks with zero off-road ticks or recoveries. The production build passes; interactive browser control was unavailable for this validation run, so camera comfort, mine readability and current live performance still need a human browser playtest before promotion.

LAN Foundation 0.11 routes local play through the same validated command boundary intended for network clients. Protocol v1 defines bounded player commands and plain-data race snapshots. The authoritative simulation can accept independent commands for several human racers while retaining one shared Rapier step. Monotonic sequence checks reject duplicate and stale inputs, and race epochs prevent event IDs from colliding after a reset. Fifty-two local tests, all route checks, all four-car race checks and the production build pass. Interactive browser automation remains disabled in Work settings; the live Vite build is available for manual playtesting.

Rush Pack 0.12 removes the 90 km/h full-circuit AI ceiling. Tema Harbour and Accra Ring now use predictive corner-speed previews, individual pace variation and restrained catch-up assistance. Slipstream reduces aerodynamic drag for any racer following closely in the same lane and is included in network snapshots. North Loop retains its conservative driver because its narrow handling layout is not a full-speed race circuit. A finish-state bug that recovered parked rivals while the pack completed was fixed. Fifty-four tests pass; the full four-car run finishes all circuits with zero recoveries and off-road ticks.

Handling Pass 0.9 smooths digital steering and pedals, adds stronger speed-sensitive steering lock, biases grip toward stable mild understeer, lowers chassis bounce/friction for pack contact, and smooths both chase heading and look target. Forty-five local tests pass. Both route checks stay on-road and every racer completes both four-car races without a recovery. This remains an automated/assisted check pending hands-on tuning on more hardware.

Pack Racing 0.8 runs YOU, KOJO, AMA and MENSAH in one shared Rapier world. AI racers reassess four legal lanes, pass a slower car and choose the narrow outside escape lines when a magnetic field lies ahead. Forty-three local tests pass. Both four-car/two-lap checks finish without recoveries or off-road ticks; Tema exercises six magnetic fields and three guided hits. A local browser run displayed all four markers/cars and held 60 FPS at 1.35× render scale with 17.4 ms p95 frame interval, 126 draw calls and 557k triangles on the current desktop. This single-machine assisted run is not mobile qualification or a human handling test.

Pulse Combat 0.6 has 37 passing local tests, complete two-car/two-lap checks on both tracks without off-road ticks/recoveries, and a successful production build. Controlled browser cases previously confirmed hits, shield absorption, solid barriers and moving targets. The normal race browser check confirmed collection, aim marker, E firing and restart cleanup. The short eight-shot lab recorded 17.6 ms p95 / 17.7 ms max; see pulse-combat-0.6.md for scope. Two-car checks do not qualify an eight-car pack or offline LAN.

First Race 0.5 was pushed to development at dbb781e1e2a3ed3ec75baeca9e5d44523fdf4638; GitHub Actions run 39606286497 passed. Each subsequent push needs its own verified remote head and CI result.

Workflow actions follow their official documentation:
- https://github.com/actions/checkout
- https://github.com/actions/setup-node
- https://github.com/actions/upload-artifact
