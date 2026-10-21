import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {createCourse,addPhysics} from '../src/track.ts';
import {EMPTY_INPUT} from '../src/vehicle.ts';
import {RaceSimulation,chooseAILane} from '../src/race/simulation.ts';
import {createRaceSnapshot} from '../src/network/protocol.ts';

await RAPIER.init();
function setup(){const world=new RAPIER.World({x:0,y:-9.81,z:0}),course=createCourse('cape-coast-rush');world.timestep=1/60;addPhysics(world,course);world.step();return {world,course,sim:new RaceSimulation(world,course,4)};}

test('Cape Coast traffic is bounded, opposing, deterministic and snapshot-ready',()=>{
 const a=setup(),b=setup();for(const x of [a,b])x.sim.countdown=0;
 assert.deepEqual(a.sim.traffic.map(t=>t.id),['trotro-1','trotro-2']);assert.equal(a.world.bodies.len(),6);
 const start=a.course.definition.zones!.find(z=>z.kind==='traffic')!.from*a.course.length,end=a.course.length;
 const before=a.sim.traffic.map(t=>t.s);for(let i=0;i<180;i++){a.sim.tick({drive:EMPTY_INPUT});b.sim.tick({drive:EMPTY_INPUT});}
 for(let i=0;i<a.sim.traffic.length;i++){const bus=a.sim.traffic[i];assert.ok(bus.s>=start&&bus.s<=end);assert.ok(bus.s<before[i]);assert.ok(bus.position.distanceTo(b.sim.traffic[i].position)<1e-9);const road=a.course.project(bus.position,bus.s);assert.ok(road.lateral>0);assert.ok(road.width/2-road.lateral>3.5);}
 const snapshot=createRaceSnapshot(a.sim);assert.equal(snapshot.traffic.length,2);assert.deepEqual(snapshot.traffic.map(t=>t.id),['trotro-1','trotro-2']);assert.equal('body' in snapshot.traffic[0],false);
 a.sim.reset(a.course);assert.equal(a.world.bodies.len(),6,'reset replaces rather than leaks traffic bodies');a.sim.reset(createCourse('tema-harbour'));assert.equal(a.sim.traffic.length,0);assert.equal(a.world.bodies.len(),4);
 a.world.free();b.world.free();
});

test('AI selects a separated escape line around an approaching trotro',()=>{
 const {world,course,sim}=setup(),racer=sim.racers.get('kojo')!,bus=sim.traffic[0];racer.s=bus.s-55;racer.aiLane=bus.lateral;racer.vehicle.currentPosition.copy(course.sample(racer.s).position).addScaledVector(course.sample(racer.s).right,bus.lateral);
 const lane=chooseAILane(racer,course,sim.racers.values(),[],[],sim.traffic);assert.ok(Math.abs(lane-bus.lateral)>5.2);assert.ok(Math.abs(lane)<=course.sample(racer.s).width/2-4+.01);world.free();
});
