# Next gameplay milestone: one readable projectile

Build one original Streak projectile before adding several weapons or a larger pack. Keep the current taxi presentation, wide roads, shared Rapier tick and active support pickups.

## Player flow

Collect a projectile item in the existing two-slot inventory. E consumes it and fires forward; Q continues to swap items. Display a distinct compact icon, clear launch direction, a short trail and clear hit/shield feedback. Player and KOJO use the same simulation API. Initial AI firing needs a forward target and a clear line of sight; it must not fire continuously from an invisible inventory.

## Simulation rules

- RaceSimulation owns projectile IDs, owner, pose, speed, lifetime, hit state and attribution. Renderers never apply damage.
- Advance projectiles at the fixed timestep. Use swept collision rather than endpoint overlap; compare the earliest world obstruction with the earliest eligible target hit, including target movement across the segment.
- Ignore the owner's car, expired projectiles and cars already finished/recovering. Remove a projectile after its first blocking impact or expiry; never apply duplicate hits.
- An active shield at impact absorbs the projectile. An expired shield does not. Preserve the documented timed shield rule.
- Start with modest condition loss and brief, capped disruption. Do not force a spin, teleport a car, create a solid obstacle or block the whole road.
- Cap projectile count, trail particles and lifetime. Reuse visual resources. Reset/replay/track switching must clear all weapon state and visuals.
- Projectile gameplay must not add a second Rapier world step.

## Acceptance before pushing the completed milestone

1. High-speed projectile hits do not tunnel through a car or solid barrier.
2. A wall blocks a target behind it; the nearer hit wins.
3. Crossing/moving targets, self-hit protection, expiry and duplicate-hit cases pass focused tests.
4. Shield on/off/expiry timing and hit ownership behave identically for player and AI.
5. A short two-car race remains finishable, and reset/switch/replay leave no projectiles behind.
6. Browser playtest shows understandable pickup, firing, shield and hit feedback without obscuring the road.
7. Existing handling/route/race checks and production build pass; record busy-scene frame-time and effect limits.
8. Push the completed milestone to development and verify the remote SHA/CI. Promotion to main still requires the owner's agreement.

After this pass, improve AI overtaking/obstacle avoidance, then expand the pack and qualify performance. Add more polished tracks and fully offline LAN after the common race/combat loop is stable.
