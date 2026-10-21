# Cape Coast 0.13

Cape Coast Rush is a new original 2.64 km circuit built on Streak's shared track compiler. It starts on a 36 m boulevard, follows a fast coastal section, narrows through town and reaches a brief 14–15 m market squeeze before the return road. It is a fictional racing layout rather than a geographic reconstruction.

Named route zones are part of the compiled course. The same deterministic zone data controls effective lane markings, coastal scenery, building placement, pickup safety and the reserved future traffic sector. Pickups never spawn in the one-lane squeeze. Four-lane markings collapse to two lanes as the road narrows and disappear through the undivided section.

The coastal treatment stays within a small rendering budget: one sand ribbon, one water ribbon, one instanced palm-trunk mesh and one instanced palm-crown mesh. Existing procedural frontage is omitted beside the beach and inside the squeeze to preserve sight lines and avoid redundant geometry.

## Validation

- `npm test`: 55 tests passed.
- `npm run test:routes`: Cape Coast finished in 110.05 seconds with zero off-road ticks.
- `npm run test:race`: the four-car, two-lap pack finished in 155.85 seconds with zero recoveries and zero off-road ticks.
- Existing North Loop, Tema Harbour and Accra Ring checks remain clean.
- Production TypeScript and Vite build passes.

The automated controllers establish route feasibility and deterministic race completion. The open browser build still needs manual assessment of the route rhythm, coast readability, narrow-section comfort and frame time on the target hardware.
