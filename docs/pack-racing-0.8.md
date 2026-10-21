# Pack Racing 0.8

Streak now starts a four-car field: YOU, KOJO, AMA and MENSAH. Each taxi has its own grid slot, livery, world body, minimap marker, race progress and combat state. The race still advances Rapier exactly once per fixed tick after all four vehicles submit their forces.

AI racers reassess lane choice every 0.45 seconds. They score four legal lane centres against nearby cars, avoid overlap beside or ahead of them, retain some lane-change hysteresis, and move to an outside line when a projected magnetic field blocks the centre. Lane centres retain a four-metre barrier margin.

The automatic pulse lock now has a live pack to resolve. It selects the visible eligible racer closest to the forward centreline, can switch before launch as another racer crosses in front, and stores the selected target when fired. The target receives both the attached red warning ring and HUD warning.

Automated validation covers pack identity/grid separation, a single shared world step, overtaking, magnet avoidance, lock switching and the earlier combat/vehicle/track cases. Both four-car races finish two laps without recovery or off-road ticks. The current desktop browser sample reports 60 FPS, 17.4 ms p95 frame interval at 1.35× scale, 126 draw calls and 557k triangles. These figures are a local assisted-demo snapshot, not a mobile or broad hardware benchmark.

The mine remains intentionally undefined because the requested placement sentence was incomplete. LAN, voice and online matchmaking remain later milestones.
