# Streak project instructions

## Branch and publication policy

The project owner has authorized pushing completed builds to https://github.com/Sankwan/streakk without asking again for every development push.

- Keep commit messages short. Do not add AI co-author trailers or agent accounts as repository collaborators.
- Develop and push completed, validated work on `development` (or merge a bounded feature branch into it).
- Do not push game changes to `main`, merge a release PR, or enable automatic release merging until the project owner explicitly agrees to promote that specific tested build.
- Check the remote branch heads before updates. Preserve existing remote history and unrelated work. Never force-push as a shortcut.
- An initial metadata-only `main` bootstrap is not a game release approval.
- Keep code, tests, build instructions, version notes and relevant validation evidence together. Do not commit node_modules, generated dist, local credentials, private machine paths, original Blur binaries/assets or archives of unreviewed source.
- Every completed development push should have a verified remote commit SHA. Report blocked or failed pushes honestly; enabling the plugin does not prove that a repository is accessible.

## Validation

Run `npm test`, `npm run test:routes`, `npm run test:race` and `npm run build` for changes to shared simulation or race rules. Add focused checks when introducing a new gameplay interaction. Browser-check the changed player flow and record limitations. Passing build/tests alone does not establish real-device, full-pack, LAN or human playtest quality.

Promotion to main requires passing CI, relevant browser/human playtests, acceptable performance on the agreed baseline and explicit owner agreement. Keep unfinished features and known limits visible in release notes.

## Architecture

One RaceSimulation owns one Rapier world step per fixed tick. Prepare forces for every racer, advance once, then capture all results. Do not call the standalone Vehicle.step convenience inside a multi-car tick or run the old planar integrator alongside Rapier. Keep rendering/input adapters separate from canonical racer, pickup and weapon state. Retain local-only asset loading and fully offline LAN as the future multiplayer requirement.
