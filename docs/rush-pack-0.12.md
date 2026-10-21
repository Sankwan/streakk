# Rush Pack 0.12

This milestone raises competitive pressure without teleporting rivals or giving them a separate movement model.

## Changes

- Full-circuit AI now previews several points over the next 112 metres and selects the fastest speed that can still brake for the approaching curvature.
- The old 25 m/s full-circuit ceiling is replaced with a roughly 49 m/s target before boosts, pace variation and corner limits.
- Rivals have small pace differences and receive at most 4.5% planned-speed assistance when substantially behind the player. Leaders are not slowed down.
- Any car can enter another car's slipstream above 90 km/h. The wake is strongest at close distance in the same lane and fades by 45 metres or about 2.4 metres of lateral separation.
- Slipstream reduces only the speed-dependent drag term and is included in authoritative snapshots. The HUD displays its current strength.
- North Loop retains its conservative driver because it is a narrow handling circuit rather than a high-speed race route.
- Finished AI cars no longer accumulate stuck time or recover while waiting for the remaining pack.

## Evidence

- `npm test`: 54 passed, 0 failed.
- All four racers finish two laps on all three circuits with zero recoveries and zero off-road ticks.
- Tema Harbour pack completion improved from about 231.55 seconds to 169.10 seconds.
- Accra Ring pack completion improved from about 192.35 seconds to 134.70 seconds.
- The first three cars on Tema finish within about 1.5 seconds; the Accra leaders finish within about 0.4 seconds. The final rival remains within roughly six seconds on both routes.

The automated pack uses AI for the player slot and proves stability and relative pace. It does not prove the exact difficulty against a human driver; manual testing should decide whether the 4.5% catch-up ceiling needs adjustment.

## Next four builds

1. Cape Coast Rush mixed-sector track.
2. Deterministic low-cost trotro traffic.
3. Original audio and race-energy feedback.
4. Fully offline LAN lobby and host.
