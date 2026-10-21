# LAN Foundation 0.11

This milestone prepares the existing race simulation for an authoritative LAN host without changing its handling or combat rules.

## Implemented

- Protocol version 1 with serializable player commands and complete race snapshots.
- Strict command validation, finite input checks and control-range clamping.
- Per-racer monotonic sequence gates that reject duplicated and stale commands.
- Independent commands for multiple human racers in one shared simulation tick.
- Plain JSON snapshots for racers, pickups, projectiles, mines, magnetic fields and events. No Rapier, Three.js or renderer objects cross the boundary.
- Stable event IDs containing a race epoch, tick and within-tick index, so resets and rematches cannot collide in a client's deduplication set.
- A local authority adapter used by the normal browser game. Single-player now exercises the same command gate the LAN host will use.

## Validation

- `npm test`: 52 passed, 0 failed.
- `npm run test:routes`: all three tracks completed with zero off-road ticks.
- `npm run test:race`: all four racers completed two laps on all three tracks with zero recoveries and zero off-road ticks.
- `npm run build -- --configLoader runner`: passed.
- The existing Vite server continues to serve the game on `http://127.0.0.1:5179/`.

Browser automation is disabled in the current Work settings, so hands-on driving remains a manual check. This milestone does not yet open a network port, create a lobby or synchronize a second browser.

## Next

Build a Node.js/TypeScript host process with a 2–4 player room, ready state, local-IP/QR join flow and WebSocket transport. The host must work with the internet disconnected and must remain authoritative for simulation, pickups, combat, laps and results.
