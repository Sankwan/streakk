# Pulse Combat 0.6

Pulse joins boost, repair and shield in the two-slot inventory. Collect the coral arrow/ring token; E fires one straight shot along the aim marker and Q swaps items. The existing taxi cars, city presentation, road widths and shared vehicle handling remain the foundation.

## Rules

A pulse removes 18 condition points. An active shield absorbs it at the actual impact time without shortening the timer. Damage causes 0.22 seconds of reduced drive and at most 1.2 m/s speed loss, with no forced spin. Brief damage protection prevents rapid chains. Successful launches consume one item; cooldown or capacity rejection retains it. KOJO uses the same rules and needs a predicted clear shot.

Relative swept vehicle boxes account for moving targets; Rapier shape casts block shots at solid world geometry. The earliest contact wins and each shot resolves once. This is conservative box collision, not exact visual-mesh collision. Shots ignore their owner and finished/recovering cars. Recovery, finish and reset cancel owner shots. Lifetime is 1.7 seconds, with eight active shots maximum.

The renderer reuses eight cores, eight trails and 48 impact sparks. Low graphics hides trails. Projectiles add no rigid bodies, lights, solid road obstacles or extra physics steps.

## Validation

37 unit/regression tests pass, including high-speed and moving-target sweeps, thin barriers, nearest contact, owner protection, expiry, shield boundaries, AI symmetry, capacity/cooldown retention, reset, recovery cancellation and bounded disruption. Both two-car/two-lap route runs finish without off-road ticks or recovery. Tema includes one attributed AI pulse hit; its target finishes at 82 condition. Maximum dynamic bodies stays two.

Earlier browser checks of the shared combat lab confirmed clear hit (82 condition), shield absorption (100 condition), barrier obstruction (100 condition) and crossing-target hit (82 condition). The latest production build passes TypeScript and Vite. The normal race browser check confirmed pulse collection, the forward aim marker, E firing, one item consumed, one active shot and the shot counter increment. Restart cleared inventory, projectiles and shot counters. No warning/error logs appeared in that check. Driving used the labelled assisted demo; this is not a human handling playtest.

The lab at /audit/combat.html uses controlled scenarios through RaceSimulation. Effect load seeds eight projectiles directly to exercise the renderer; it is explicitly not an inventory test. Its p95/max samples cover the running scenario. The eight-shot check peaked at eight and cleared to zero, with 17.6 ms p95 and 17.7 ms maximum over the brief local browser scenario. These frame intervals include browser scheduling and are not GPU timings. A brief two-car lab does not qualify a full pack, mobile hardware or LAN. The shared Rapier/Three.js production chunk remains about 1.86 MB gzip; initial loading still needs optimisation.

## Next

Finish human pickup/fire/aim-feedback playtesting, improve AI overtaking and obstacle avoidance, then expand and measure the race pack. Follow with a track authoring/validation pipeline and additional original circuits. Fully offline LAN remains a later milestone; voice and internet parties/matchmaking follow the stable local race/combat loop. Main promotion requires owner agreement on the tested candidate.
