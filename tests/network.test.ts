import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {createCourse,addPhysics} from '../src/track.ts';
import {EMPTY_INPUT} from '../src/vehicle.ts';
import {RaceSimulation} from '../src/race/simulation.ts';
import {PROTOCOL_VERSION,createRaceSnapshot,decodePlayerCommand,encodeWireMessage,parsePlayerCommand,toSimulationCommand} from '../src/network/protocol.ts';
import {CommandInbox,LocalRaceAuthority} from '../src/network/authority.ts';

await RAPIER.init();
const valid={type:'command',protocol:PROTOCOL_VERSION,racerId:'you',sequence:7,clientTick:12,drive:{throttle:.8,brake:0,steer:-.4,handbrake:false},use:false,swap:true} as const;

test('network commands validate identity, sequence and finite bounded inputs',()=>{
 assert.deepEqual(decodePlayerCommand(valid,'you'),valid);
 assert.equal(decodePlayerCommand(valid,'kojo'),null);
 assert.equal(decodePlayerCommand({...valid,protocol:99}),null);
 assert.equal(decodePlayerCommand({...valid,sequence:-1}),null);
 assert.equal(decodePlayerCommand({...valid,drive:{...valid.drive,steer:NaN}}),null);
 const bounded=decodePlayerCommand({...valid,drive:{...valid.drive,throttle:8,brake:-2,steer:4}})!;
 assert.deepEqual(bounded.drive,{throttle:1,brake:0,steer:1,handbrake:false});
 assert.deepEqual(toSimulationCommand(bounded),{drive:bounded.drive,use:false,swap:true});
 assert.deepEqual(parsePlayerCommand(encodeWireMessage(valid),'you'),valid);
 assert.equal(parsePlayerCommand('{broken','you'),null);
});

test('authority rejects duplicate or stale commands and local play uses the same gate',()=>{
 const inbox=new CommandInbox();assert.ok(inbox.accept(valid,'you'));assert.equal(inbox.accept(valid,'you'),null);assert.equal(inbox.accept({...valid,sequence:6},'you'),null);assert.ok(inbox.accept({...valid,sequence:8},'you'));
 const world=new RAPIER.World({x:0,y:-9.81,z:0}),course=createCourse('north-loop');world.timestep=1/60;addPhysics(world,course);world.step();const sim=new RaceSimulation(world,course);sim.countdown=0;
 const authority=new LocalRaceAuthority(sim);authority.step({drive:{...EMPTY_INPUT,throttle:1}});assert.equal(sim.ticks,1);assert.equal(authority.snapshot().serverTick,1);world.free();
});

test('race snapshots are versioned JSON data with stable event IDs and no engine objects',()=>{
 const world=new RAPIER.World({x:0,y:-9.81,z:0}),course=createCourse('tema-harbour');world.timestep=1/60;addPhysics(world,course);world.step();
 const sim=new RaceSimulation(world,course,4);sim.countdown=0;sim.player.inventory=['boost'];sim.tick({drive:{...EMPTY_INPUT,throttle:1},use:true});
 const snapshot=createRaceSnapshot(sim,31),copy=JSON.parse(encodeWireMessage(snapshot));
 assert.deepEqual(copy,snapshot);assert.equal(snapshot.protocol,PROTOCOL_VERSION);assert.equal(snapshot.sequence,31);assert.equal(snapshot.racers.length,4);assert.equal(snapshot.course.id,'tema-harbour');
 assert.equal(snapshot.racers[0].position.length,3);assert.equal(snapshot.racers[0].rotation.length,4);assert.ok(snapshot.events[0].id.startsWith(`${sim.raceEpoch}:${sim.ticks}:0:you:`));
 assert.equal('vehicle' in snapshot.racers[0],false);assert.equal('body' in snapshot.racers[0],false);assert.equal('world' in snapshot,false);
 const eventId=snapshot.events[0].id;sim.reset();sim.countdown=0;sim.player.inventory=['boost'];sim.tick({drive:EMPTY_INPUT,use:true});assert.notEqual(createRaceSnapshot(sim).events[0].id,eventId);
 world.free();
});

test('one authoritative tick accepts independent commands for multiple human racers',()=>{
 const world=new RAPIER.World({x:0,y:-9.81,z:0}),course=createCourse('north-loop');world.timestep=1/60;addPhysics(world,course);world.step();const sim=new RaceSimulation(world,course);sim.countdown=0;const kojo=sim.racers.get('kojo')!;kojo.isAI=false;
 sim.player.inventory=['boost','shield'];kojo.inventory=['repair','mine'];sim.tick(new Map([['you',{drive:{...EMPTY_INPUT,throttle:1},swap:true}],['kojo',{drive:{...EMPTY_INPUT,brake:1},swap:true}]]));
 assert.deepEqual(sim.player.inventory,['shield','boost']);assert.deepEqual(kojo.inventory,['mine','repair']);assert.equal(sim.ticks,1);world.free();
});
