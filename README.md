# Streak

A browser arcade racer with Ghana taxi racecars, wide original circuits and compact power-ups. Three.js renders the game; Rapier handles the shared vehicle simulation. The current development milestone is **First Race 0.5.0**: two racers, two laps, KOJO AI, boost/repair/shield, collision condition, standings and results.

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

The Python launcher opens http://127.0.0.1:8768/. Keep its Terminal open. Source checkouts do not contain `dist/` until you build. A downloaded CI build includes `dist/` and runs without npm or internet access after extraction. This is local single-player with one AI, not LAN multiplayer yet.

## Controls

WASD/arrows drive; Space drifts; E uses the selected item; Q swaps inventory slots; R restarts both racers; C changes camera; P/Escape pauses. Choose a circuit before starting. Sound starts muted. WATCH AI DEMO is labelled and can hand control back to the player. See [First Race notes](docs/first-race-0.5.md) for item rules and limitations.

## Branches and builds

- **development** receives completed development milestones and validation evidence. A successful `verify` workflow produces a ZIP under GitHub Actions artifacts.
- **main** is the agreed release line. Promote a specific build through review only after tests, relevant playtesting/performance checks and explicit agreement from the project owner. There is no auto-merge or automatic promotion.

The initial main baseline contains repository policy, not an approved game release. Workflow files document this process; they do not themselves configure GitHub branch protection. See [development and promotion](docs/development.md).

## Verify

```sh
npm test
npm run test:routes
npm run test:race
npm run build
python3 scripts/package_build.py
```

The last command creates a source-and-playable build ZIP under `artifacts/`, with version and commit metadata. `dist/`, dependencies and ZIP files stay out of Git. Existing reference validation is in [VALIDATION.txt](VALIDATION.txt) and [route-checks.json](route-checks.json); CI creates fresh results for its actual commit. Automated route controllers are feasibility tools, not human race or real-device performance results.

## Next milestone

Implement one projectile with swept collision, world obstruction, owner/target attribution, shield interaction and short bounded hit feedback. Then improve AI overtaking/avoidance and qualify a larger pack. Offline LAN, optional voice and online parties/matchmaking come after the common local race loop is stable.

## Credits

Taxi and facade visuals are adapted from the supplied Genex/MIDNIGHT APEX candidate. See [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt). No original Blur executable, extracted models, textures or sounds are included. The setting and tracks are original fictional layouts, not geographic reconstructions.
