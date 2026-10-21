# Development and promotion

The project owner authorizes pushing completed builds to `development` as work progresses. No further approval is needed for routine development pushes. This does not authorize promoting builds to `main` before agreement.

## Every completed development milestone

1. Inspect the current remote head; preserve existing work and history.
2. Make the change, keep source credits and version notes, and run relevant tests.
3. Run all shared-race checks before completing a simulation milestone: unit/regression tests, standalone route checks, two-car race checks, and the production build.
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

First Race 0.5 has 25 passing local tests, complete two-car/two-lap headless runs on both tracks without off-road ticks/recoveries, and browser evidence of manual driving, pickup collection/use, assisted race completion and restart. These records predate repository CI and are not a claim that GitHub Actions has run.

The next projectile pass must check tunnelling, solid-world obstruction, self-hit protection, duplicate hits, shield timing, damage attribution and bounded disruption. Test player/AI symmetry and preserve exactly one shared world step per tick. The maximum two-car test is not a qualification for an eight-car pack or offline LAN.

Workflow actions follow their official documentation:
- https://github.com/actions/checkout
- https://github.com/actions/setup-node
- https://github.com/actions/upload-artifact
