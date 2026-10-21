# Trotro Run 0.14

Cape Coast's final return-road sector now carries two oncoming trotros. They run deterministic fixed schedules in the authoritative simulation, use solid kinematic Rapier bodies and submit their movement before the same single world step as the racers. Resetting or changing track replaces the bodies without leaking them.

Both vehicles share one opposing line. Their collider is 2.36 m wide; the route leaves more than 3.5 m beyond that line as well as the open remainder of the road. AI evaluates approaching traffic up to 125 m ahead and refreshes its escape choice faster inside a traffic race. The trotros do not enter the narrow market squeeze.

The complete traffic visual costs three fixed draw calls: instanced bodies, windows and stripes with a capacity of two. Protocol v2 snapshots carry stable traffic IDs, position, rotation, route progress and speed so offline LAN clients can render host state rather than invent local traffic.

## Validation

- `npm test`: 57 tests pass, including deterministic schedules, bounds, escape clearance, AI avoidance, reset cleanup and plain-data snapshots.
- `npm run test:routes`: all four standalone route checks remain on-road.
- `npm run test:race`: all four Cape Coast racers finish two laps in 156.12 seconds with zero recoveries and off-road ticks; the world peaks at six bodies (four racers and two trotros).
- Production TypeScript and Vite build passes.

Manual playtesting should judge sight distance, perceived fairness, visual scale and whether the traffic section feels tense without becoming a collision lottery.
