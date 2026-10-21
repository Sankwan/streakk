# Target Lock 0.7

Pulse targeting no longer asks the driver to steer the car and manually aim at the same time. While pulse is selected, Streak continually chooses the eligible visible racer whose direction is closest to the firing car's forward centreline within a 95 m cone. A closer-to-centre racer takes the lock immediately before launch, so a crossing racer can replace the previous target. Solid world geometry prevents a lock.

The shooter sees a labelled screen-space lock ring attached to the target. The targeted racer sees a pulsing red ring on the car and a TARGETED BY HUD warning. That warning remains while the lock is held and while a guided shot is in flight. The launched pulse keeps the target selected at launch and turns at a capped rate; ordinary swept collision can still make it hit a different car or a wall first.

## Magnetic field

MAGNET is a fifth pickup. E projects one non-solid field 58 m ahead of the current race leader for 5.5 seconds. The active strip is 56% of the local road width and 24 m long. Racers inside it are pulled laterally toward the road centre, receive reduced throttle and a small bounded speed reduction. The outer 44% of the road remains free, split between both edges, so an early swerve avoids the effect.

Only one field is active at a time in this milestone. It affects any racer who enters, including its owner. The purple road decal shows the exact affected strip; it does not create collision geometry or add another physics step.

## Validation and limits

Forty-one automated checks pass. They cover lock switching before launch, behind-car rejection, stored launch targets, incoming warnings, guided turning/collision, wall refusal, magnet placement ahead of the leader, central-strip effect and an unaffected outer escape lane. Both tracks and both two-car/two-lap runs complete without off-road ticks or recoveries; Tema records one guided hit. The current game has two racers, so the three-racer crossing case is tested directly in the lock selector until the larger pack is implemented.

The browser check confirms the labelled lock ring follows KOJO, the HUD reports TARGET LOCKED, MAGNET can be collected and activated, and the purple field leaves both outer escape lanes open. No browser warning/error logs appeared.

The mine mentioned during planning is not included because its requested behavior was incomplete. AI overtaking, larger-pack performance, offline LAN and human multiplayer playtests remain later milestones.
