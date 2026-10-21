# Streak

A browser arcade racer with Ghana taxi racecars, wide original circuits and compact power-ups. Three.js renders the game; Rapier handles the shared vehicle simulation. The current development milestone is **Handling Pass 0.9.0**: smoother steering/pedals and chase camera, calmer contact response, plus the four-racer pack and combat systems from 0.8.

## Run from source

Use Node 22.19+ and npm:

```sh
npm ci
npm run dev
```

To build and play the local production bundle:

```sh
npm run build
python3 serve.py
```

The Python launcher opens http://127.0.0.1:8768/. Keep its Terminal open. Source checkouts do not contain `dist/` until you build. A downloaded CI build includes `dist/` and runs without npm or internet access after extraction. This is local single-player with three AI racers; LAN multiplayer is not implemented yet.

## Controls

WASD/arrows drive; Space drifts; E uses the selected item; Q swaps inventory slots; R restarts the pack; C changes camera; P/Escape pauses. Choose a circuit before starting. Sound starts muted. WATCH AI DEMO is labelled and can hand control back to the player. See [Handling Pass notes](docs/handling-pass-0.9.md) for the current control changes and evidence.

## Branches and builds

- **development** receives completed development milestones and validation evidence. A successful `verify` workflow produces a ZIP under GitHub Actions artifacts.
- **main** is the agreed release line. Promote a specific build through review only after tests, relevant playtesting/performance checks and explicit agreement from the project owner. There is no auto-merge or automatic promotion.

The initial main baseline is metadata only, not an approved game release. Workflow files document this process; they do not themselves configure GitHub branch protection. See [development and promotion](docs/development.md).

## Verify

```sh
npm test
npm run test:routes
npm run test:race
npm run build
python3 scripts/package_build.py
```

The last command creates a source-and-playable build ZIP under `artifacts/`, with version and commit metadata. `dist/`, dependencies and ZIP files stay out of Git. Existing reference validation is in [VALIDATION.txt](VALIDATION.txt) and [route-checks.json](route-checks.json); CI creates fresh results for its actual commit. Automated route controllers are feasibility tools, not human race or real-device performance results.

## Pulse combat

Collect the coral pulse icon and the game locks the most directly-ahead visible racer automatically. The lock switches before launch when another racer moves closer to the centre of your forward cone. E launches a guided pulse at the current lock; the target sees a red warning ring and HUD warning. Shields absorb shots while active.

The purple magnet pickup projects a short field ahead of the race leader. Its central strip pulls racers toward the centre and reduces drive briefly, while both outer road edges remain open escape lines. It is visual and non-solid. See [Target Lock notes](docs/target-lock-0.7.md).

The [combat lab](audit/combat.html) supplies reproducible clear-hit, shield, barrier and crossing-target checks through the same simulation and visuals. With the local launcher running, open `/audit/combat.html`.

## Next milestone

The complete continuation brief is in [HANDOFF.md](HANDOFF.md). The next tested batch covers camera feel, a compact rear mine, clearer impact feedback, and a third original Ghana-inspired track. Offline LAN, optional voice and online parties/matchmaking follow after the common local race loop is stable.

## Credits

Taxi and facade visuals are adapted from the supplied Genex/MIDNIGHT APEX candidate. See [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt). No original Blur executable, extracted models, textures or sounds are included. The setting and tracks are original fictional layouts, not geographic reconstructions.
