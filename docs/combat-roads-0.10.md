# Combat Roads 0.10

This milestone completes four connected iterations on the validated 0.9 race loop.

## Camera

The chase camera now blends toward travel direction during a slide, reacts gently to acceleration and braking, widens its field of view on a smooth speed curve, and banks by no more than about two degrees. Strong player impacts add a short, decaying trauma response. Reduced-motion preference disables shake and banking while preserving smooth tracking and FOV.

## Rear mine

The orange mine deploys behind the car, projects onto the valid road, arms after 0.55 seconds, expires after 14 seconds and uses a global pool of eight. Its owner is immune. A hit removes the mine, deals 24 condition damage and applies a bounded one-second disruption with no forced spin. Shields and damage protection use the same authoritative rules as pulse hits. AI lane scoring avoids armed mines where a safe racing line exists.

## Impact feedback

Wall and weapon events feed one rate-limited camera response and a short edge color pulse. Shield feedback remains visually distinct. Condition below 30% gets a clear HUD treatment without covering the road. Mine meshes, armed rings and burst rings use fixed instanced pools.

## Accra Ring Night Run

The third original circuit is a 2–2.8 km four-lane dusk route with a broad combat straight, long sweepers and a tighter market-side sector. It uses the same validated track compiler, width-aware barriers, lane markings, pickup corridor rules, procedural frontage and instanced scenery as the existing circuits.

## Validation target

- Unit/integration suite, including mine timing, immunity, shield, cap, reset and route geometry.
- Headless single-car completion on all three tracks with zero off-road ticks.
- Four-racer completion on all three tracks with zero recoveries and zero off-road ticks.
- TypeScript and production bundle build.
- Browser check for camera comfort, mine readability, route selection and live performance counters.
