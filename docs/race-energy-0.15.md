# Race Energy 0.15

The placeholder engine tone has been replaced by an original procedural WebAudio mix. It layers a filtered saw engine fundamental, a triangle harmonic, deterministic filtered wind noise and a quiet close-rival pulse. Speed, throttle, rival distance and final-lap state shape the mix. Sound remains muted until the player explicitly enables it, and pausing fades the master bus.

Countdown, launch, impact and final-lap cues are short synthesized tones. No Blur audio or supplied archive audio is included. The final lap also receives a clear central callout and warm HUD emphasis. A low-opacity CSS speed pattern rises only at high speed and is disabled under `prefers-reduced-motion`; it adds no WebGL draw call or particle allocation.

## Validation

- `npm test`: 58 tests pass, including bounded intensity behavior and pause/running gates.
- `npm run build -- --configLoader runner`: TypeScript and Vite production build pass.
- Game code remains 15.60 kB gzip; the shared Three.js/Rapier chunk is unchanged at about 1.86 MB gzip.
- Race simulation state and protocol v2 are unchanged from the validated Trotro Run build.

Manual playtesting is required for engine pitch, overall volume, headphone comfort, callout timing and whether the speed overlay feels useful rather than distracting.
