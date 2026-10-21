# Handling Pass 0.9

This pass responds to abrupt keyboard turning and camera snap without replacing Streak's shared Rapier vehicle model.

The available evidence points to a layered control system. The supplied Genex/Midnight Apex source ramps digital steering toward lock, recentres more quickly, reduces steering lock with speed, favours stable rear grip and damps yaw/slip. The recovered Blur data exposes independent fields named `steerSmoothTime`, `steerDamping`, `steerSpringCentre`, `slideRecovery` and `antiflick`, including a 0.12 second steering smoothing candidate. Those names and values describe a tuning schema; they do not reveal Blur's equations.

Streak now filters steering at the fixed physics rate: turn-in is progressive, release/counter-steer is faster, and maximum wheel angle falls on a squared speed curve toward a safe high-speed minimum. Throttle and brake also ramp, with brake input releasing throttle promptly. Front lateral response is slightly softer than rear response for stable mild understeer. Brake force was retuned around the filtering.

For pack contact, chassis restitution drops from 0.08 to 0.02, collider friction from 0.15 to 0.12, and angular damping rises from 1.25 to 1.5. These changes reduce bounce, tyre-to-tyre snagging and sudden yaw during side contact while preserving solid barriers.

The chase camera follows a smoothed forward vector, position and look target. Reset synchronises the camera heading immediately, so the smoothing introduces no stale direction after recovery or restart.

Automated evidence: 45 tests pass; both standalone route checks remain on-road; all four racers complete both two-lap race checks with zero off-road ticks and zero recoveries. Human feel remains the deciding validation for final steering rates and camera lag.
