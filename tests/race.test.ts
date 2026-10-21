import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {Vector3} from 'three';
import {createCourse,addPhysics} from '../src/track.ts';
import {Vehicle,EMPTY_INPUT} from '../src/vehicle.ts';
import {RaceSimulation,chooseAILane,type MagnetField} from '../src/race/simulation.ts';
import {makePickups,segmentHit} from '../src/race/pickups.ts';
import {draftStrength} from '../src/race/draft.ts';
await RAPIER.init();
function setup(){const world=new RAPIER.World({x:0,y:-9.81,z:0}),course=createCourse('tema-harbour');world.timestep=1/60;addPhysics(world,course);world.step();return {world,course,sim:new RaceSimulation(world,course)};}
function active(sim:RaceSimulation){sim.countdown=0;}
test('two racers submit forces before exactly one shared world step; countdown freezes the race',()=>{
 const {world,sim}=setup();let steps=0;const step=world.step.bind(world);world.step=()=>{steps++;step();};
 sim.tick({drive:EMPTY_INPUT});assert.equal(steps,0);assert.equal(sim.time,0);
 active(sim);for(let i=0;i<120;i++)sim.tick({drive:{...EMPTY_INPUT,throttle:1}});
 assert.equal(steps,120);assert.equal(sim.ticks,120);assert.ok(sim.player.vehicle.speed>5);assert.ok(sim.racers.get('kojo')!.vehicle.speed>5);
 world.free();
});
test('four-car pack has stable identities, distinct grid slots and one shared physics step',()=>{
 const world=new RAPIER.World({x:0,y:-9.81,z:0}),course=createCourse('tema-harbour');world.timestep=1/60;addPhysics(world,course);world.step();const sim=new RaceSimulation(world,course,4);
 assert.deepEqual([...sim.racers.keys()],['you','kojo','ama','mensah']);assert.equal(world.bodies.len(),4);
 const positions=[...sim.racers.values()].map(r=>r.vehicle.currentPosition);for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++)assert.ok(positions[i].distanceTo(positions[j])>4);
 let steps=0;const step=world.step.bind(world);world.step=()=>{steps++;step();};active(sim);sim.tick({drive:EMPTY_INPUT});assert.equal(steps,1);world.free();
});
test('lane-aware AI overtakes a blocked lane and takes an outside magnet escape line',()=>{
 const world=new RAPIER.World({x:0,y:-9.81,z:0}),course=createCourse('tema-harbour');world.timestep=1/60;addPhysics(world,course);world.step();const sim=new RaceSimulation(world,course,4),racer=sim.racers.get('kojo')!,blocker=sim.racers.get('ama')!;
 const s=course.length*.3,here=course.sample(s);racer.s=s;racer.aiLane=0;racer.vehicle.currentPosition.copy(here.position);blocker.s=here.s+12;blocker.vehicle.currentPosition.copy(course.sample(blocker.s).position);
 const openLane=chooseAILane(racer,course,sim.racers.values(),[]);assert.ok(Math.abs(openLane)>1,'blocked centre line should trigger an overtake');
 blocker.finishTime=1;const field:MagnetField={id:'test',ownerId:'you',s:course.sample(s+30).s,position:course.sample(s+30).position,right:course.sample(s+30).right,halfWidth:here.width*.56/2,halfLength:12,expiresAt:10};
 const escape=chooseAILane(racer,course,sim.racers.values(),[field]);assert.ok(Math.abs(escape)>field.halfWidth,'magnet should send AI outside the active strip');assert.ok(Math.abs(escape)<=here.width/2-4+.01,'lane remains inside the barriers');world.free();
});
test('slipstream rewards a fast close follower without affecting distant or offset cars',()=>{
 assert.ok(draftStrength(45,0,100,[{s:112,lateral:.2}],1000)>.8);
 assert.equal(draftStrength(20,0,100,[{s:112,lateral:0}],1000),0);
 assert.equal(draftStrength(45,0,100,[{s:170,lateral:0}],1000),0);
 assert.equal(draftStrength(45,0,100,[{s:112,lateral:4}],1000),0);
});
test('split vehicle force/capture phases preserve the standalone handling result',()=>{
 const worlds=[new RAPIER.World({x:0,y:-9.81,z:0}),new RAPIER.World({x:0,y:-9.81,z:0})];
 const cars=worlds.map(world=>{world.timestep=1/60;world.createCollider(RAPIER.ColliderDesc.cuboid(1000,.2,1000).setTranslation(0,-.2,0));world.step();return new Vehicle(world);});
 for(let i=0;i<300;i++){const input={...EMPTY_INPUT,throttle:1,steer:i>140?.2:0};cars[0].step(input);cars[1].prepare(input);worlds[1].step();cars[1].capture();}
 assert.ok(cars[0].currentPosition.distanceTo(cars[1].currentPosition)<1e-8);worlds.forEach(world=>world.free());
});
test('pickup claims are unique, inventory bounded, cooldown uses simulation time, reset clears state',()=>{
 const {world,sim,course}=setup();active(sim);const pickup=sim.pickups[0],player=sim.player,ai=sim.racers.get('kojo')!;
 for(const racer of [player,ai]){racer.vehicle.body.setTranslation(pickup.position,true);racer.vehicle.currentPosition.copy(pickup.position);racer.vehicle.previousPosition.copy(pickup.position);}
 sim.tick({drive:EMPTY_INPUT});assert.equal(player.inventory.length+ai.inventory.length,1);assert.ok(pickup.availableAt>sim.time);
 const ready=pickup.availableAt;let extraClaims=0;for(let i=0;i<5;i++){sim.tick({drive:EMPTY_INPUT});extraClaims+=sim.events.filter(e=>e.type==='pickup').length;}assert.equal(extraClaims,0);assert.equal(pickup.availableAt,ready);
 player.inventory=['shield','repair'];const p2=sim.pickups[1];p2.position.copy(player.vehicle.currentPosition);ai.finishTime=0;sim.tick({drive:EMPTY_INPUT});assert.equal(player.inventory.length,2);
 sim.pickups=[pickup];sim.time=13;player.inventory=[];player.vehicle.body.setTranslation(pickup.position,true);player.vehicle.body.setLinvel({x:0,y:0,z:0},true);player.vehicle.currentPosition.copy(pickup.position);sim.tick({drive:EMPTY_INPUT});assert.equal(player.inventory.length,1);assert.ok(pickup.availableAt>=25);
 sim.reset(course);assert.equal(sim.player.inventory.length,0);assert.equal(sim.player.health,100);assert.equal(sim.time,0);assert.equal(sim.countdown,3);assert.ok(sim.pickups.every(p=>p.availableAt===0));assert.equal(world.bodies.len(),2);world.free();
});
test('boost and shield expire, repair is capped, finished racers cannot consume items',()=>{
 const {world,sim}=setup();active(sim);const r=sim.player;r.inventory=['boost','shield'];assert.ok(sim.use(r));assert.equal(r.boostUntil,3);assert.ok(sim.use(r));assert.equal(r.shieldUntil,5);assert.equal(sim.damage(r,50),false);assert.equal(r.health,100);
 sim.time=6;r.health=85;r.inventory=['repair'];assert.ok(sim.use(r));assert.equal(r.health,100);assert.deepEqual(r.inventory,[]);
 r.inventory=['repair'];assert.equal(sim.use(r),false);assert.equal(r.inventory.length,1);
 assert.ok(sim.damage(r,30));assert.equal(r.health,70);assert.equal(sim.damage(r,30),false);assert.ok(r.health>=65);
 r.finishTime=6;r.inventory=['boost'];assert.equal(sim.use(r),false);world.free();
});
test('swept collection catches fast crossings, rejects high airborne passes and uses stable IDs',()=>{
 assert.notEqual(segmentHit(new Vector3(-5,.85,0),new Vector3(5,.85,0),new Vector3(0,.85,0)),null);
 assert.equal(segmentHit(new Vector3(-5,5,0),new Vector3(5,5,0),new Vector3(0,.85,0)),null);
 const c=createCourse('tema-harbour'),a=makePickups(c),b=makePickups(c);assert.deepEqual(a.map(p=>p.id),b.map(p=>p.id));assert.equal(new Set(a.map(p=>p.id)).size,a.length);
 for(const p of a){const road=c.sample(p.s);assert.ok(road.width/2-Math.abs(p.lateral)-1.8>5);}
});
test('both racers obey ordered lap validation and deterministic standings',()=>{
 const {world,sim}=setup();active(sim);for(const r of sim.racers.values()){r.progress.reset(r.s);r.finishTime=null;r.completedLaps=0;}
 const ai=sim.racers.get('kojo')!;ai.s=150;sim.player.s=100;assert.equal(sim.standings()[0].id,'kojo');sim.player.completedLaps=1;assert.equal(sim.standings()[0].id,'you');
 ai.finishTime=30;sim.player.finishTime=31;assert.equal(sim.standings()[0].id,'kojo');
 world.free();
});
test('finished AI racers stay finished and are never recovered while the pack completes',()=>{
 const {world,sim}=setup();active(sim);const ai=sim.racers.get('kojo')!;ai.finishTime=1;ai.vehicle.body.setLinvel({x:0,y:0,z:0},true);ai.stuckTime=5.99;
 let recovered=false;for(let i=0;i<500;i++){sim.tick({drive:EMPTY_INPUT});recovered||=sim.events.some(e=>e.type==='recover'&&e.racerId===ai.id);}assert.equal(ai.finishTime,1);assert.equal(ai.stuckTime,0);assert.equal(recovered,false);world.free();
});
test('a real wall impact damages an unshielded racer and is absorbed with an active shield',()=>{
 for(const shielded of [false,true]){
  const {world,sim}=setup();active(sim);const r=sim.player,v=r.vehicle;sim.racers.get('kojo')!.finishTime=0;
  const forward=new Vector3(0,0,-1).applyQuaternion(v.currentRotation),wall=v.currentPosition.clone().addScaledVector(forward,3);
  world.createCollider(RAPIER.ColliderDesc.cuboid(4,1,.2).setTranslation(wall.x,.8,wall.z).setRotation(v.currentRotation));world.step();
  if(shielded)r.shieldUntil=5;v.body.setLinvel(forward.multiplyScalar(30),true);
  for(let i=0;i<15;i++)sim.tick({drive:EMPTY_INPUT});
  if(shielded)assert.equal(r.health,100);else assert.ok(r.health<100,'Impact should change condition');world.free();
 }
});
test('boost increases real Rapier acceleration and stops applying force after its deadline',()=>{
 const speeds=[];
 for(const boosted of [false,true]){const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;world.createCollider(RAPIER.ColliderDesc.cuboid(1000,.2,1000).setTranslation(0,-.2,0));world.step();const car=new Vehicle(world);
  for(let i=0;i<60;i++)car.step(EMPTY_INPUT);car.boostActive=boosted;for(let i=0;i<180;i++)car.step({...EMPTY_INPUT,throttle:1});speeds.push(car.speed);world.free();}
 assert.ok(speeds[1]>speeds[0]*1.2);
 const {world,sim}=setup();active(sim);sim.player.inventory=['boost'];sim.use(sim.player);sim.tick({drive:{...EMPTY_INPUT,throttle:1}});assert.ok(sim.player.vehicle.boostActive);sim.time=4;sim.tick({drive:EMPTY_INPUT});assert.equal(sim.player.vehicle.boostActive,false);world.free();
});
