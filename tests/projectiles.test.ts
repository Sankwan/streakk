import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {Vector3,Quaternion} from 'three';
import {ProjectileSystem,PULSE,selectLockTarget,sweepMovingBox,type ProjectileTarget} from '../src/race/projectiles.ts';
import {MAGNET,RaceSimulation} from '../src/race/simulation.ts';
import {createCourse} from '../src/track.ts';
import {EMPTY_INPUT} from '../src/vehicle.ts';
await RAPIER.init();
function target(id:string,x=0,z=-18):ProjectileTarget{return {id,previousPosition:new Vector3(x,.85,z),position:new Vector3(x,.85,z),previousRotation:new Quaternion(),rotation:new Quaternion(),eligible:true};}
function setup(aiShooter=false,wall=false){
 const world=new RAPIER.World({x:0,y:0,z:0}),sim=new RaceSimulation(world,createCourse('tema-harbour'));
 sim.countdown=0;const you=sim.player,kojo=sim.racers.get('kojo')!;kojo.isAI=aiShooter;
 you.vehicle.setSpawn(new Vector3(0,.85,aiShooter?-18:0),new Quaternion());
 kojo.vehicle.setSpawn(new Vector3(0,.85,aiShooter?0:-18),new Quaternion());
 if(wall)world.createCollider(RAPIER.ColliderDesc.cuboid(4,1,.01).setTranslation(0,.85,-8));world.step();
 const shooter=aiShooter?kojo:you,victim=aiShooter?you:kojo;shooter.inventory=['pulse'];
 return {world,sim,shooter,victim};
}
function runShot(shieldUntil=0,ai=false,wall=false){const state=setup(ai,wall);state.victim.shieldUntil=shieldUntil;const impacts=[];for(let i=0;i<30;i++){state.sim.tick({drive:EMPTY_INPUT,use:i===0&&!ai});impacts.push(...state.sim.combatImpacts);}return {...state,impacts};}

test('moving box sweep catches crossing targets that both endpoint tests miss',()=>{
 const moving=target('cross',-4,-4);moving.position.x=4;
 assert.notEqual(sweepMovingBox(new Vector3(0,.85,0),new Vector3(0,.85,-8),moving),null);
 assert.equal(sweepMovingBox(new Vector3(0,.85,0),new Vector3(0,.85,-8),target('left',-4,-4)),null);
 assert.equal(sweepMovingBox(new Vector3(0,.85,0),new Vector3(0,.85,-8),target('right',4,-4)),null);
});
test('target lock follows the most directly-ahead racer before launch',()=>{
 const owner=new Vector3(0,.85,0),rotation=new Quaternion(),a=target('a',3,-20),b=target('b',5,-18);
 assert.equal(selectLockTarget('you',owner,rotation,[a,b]),'a');
 b.position.set(0,.85,-22);b.previousPosition.copy(b.position);
 assert.equal(selectLockTarget('you',owner,rotation,[a,b]),'b');
 b.position.set(0,.85,8);b.previousPosition.copy(b.position);
 assert.equal(selectLockTarget('you',owner,rotation,[a,b]),'a');
});
test('launched pulse stores its lock and the target receives an incoming warning',()=>{
 const {world,sim,shooter,victim}=setup();sim.tick({drive:EMPTY_INPUT});assert.equal(shooter.lockTargetId,victim.id);assert.equal(victim.incomingLockFrom,shooter.id);
 assert.ok(sim.use(shooter));const shot=[...sim.projectiles.active.values()][0];assert.equal(shot.targetId,victim.id);
 sim.tick({drive:EMPTY_INPUT});assert.equal(victim.incomingLockFrom,shooter.id);world.free();
});
test('locked projectile turns toward its launch target',()=>{
 const world=new RAPIER.World({x:0,y:0,z:0}),shots=new ProjectileSystem(),victim=target('kojo',8,-24);shots.spawn('you',new Vector3(0,.85,0),new Vector3(0,0,-PULSE.speed),0,'kojo');
 let turned=false,hit=false;for(let i=1;i<=140&&shots.active.size;i++){const impacts=shots.advance(world,i/60,1/60,[victim],new Set());const shot=[...shots.active.values()][0];turned||=!!shot&&shot.velocity.x>0;hit||=impacts.some(impact=>impact.targetId==='kojo');}
 assert.ok(turned);assert.ok(hit);world.free();
});
test('magnet projects ahead of the leader, leaves escape lanes, and affects only its central strip',()=>{
 const world=new RAPIER.World({x:0,y:0,z:0}),sim=new RaceSimulation(world,createCourse('tema-harbour')),you=sim.player,kojo=sim.racers.get('kojo')!;sim.countdown=0;you.inventory=['magnet'];assert.ok(sim.use(you));
 const field=sim.magnetFields[0],sample=sim.course.sample(field.s);assert.ok(field.halfWidth<sample.width/2-3);assert.equal(field.expiresAt,sim.time+MAGNET.duration);
 kojo.vehicle.setSpawn(sample.position.clone().addScaledVector(sample.right,field.halfWidth-.5).setY(.85),new Quaternion());world.step();kojo.vehicle.capture();sim.tick({drive:EMPTY_INPUT});assert.ok(kojo.magnetUntil>sim.time);
 const outside=sample.position.clone().addScaledVector(sample.right,field.halfWidth+1).setY(.85);kojo.vehicle.setSpawn(outside,new Quaternion());world.step();kojo.vehicle.capture();kojo.magnetUntil=0;sim.tick({drive:EMPTY_INPUT});assert.equal(kojo.magnetUntil,0);world.free();
});
test('real shared simulation consumes one charge, attributes one hit, and never damages the owner',()=>{
 const {world,sim,shooter,victim,impacts}=runShot();
 assert.equal(shooter.shots,1);assert.equal(shooter.hits,1);assert.equal(shooter.health,100);assert.equal(victim.health,82);assert.equal(victim.lastHitBy,shooter.id);assert.equal(shooter.inventory.length,0);
 assert.equal(impacts.filter(i=>i.result==='hit').length,1);assert.equal(sim.projectiles.active.size,0);assert.equal(world.bodies.len(),2);world.free();
});
test('solid obstacles win before a target, including a thin wall crossed in one tick',()=>{
 const blocked=setup(false,true);assert.equal(blocked.sim.use(blocked.shooter),false);assert.deepEqual(blocked.shooter.inventory,['pulse']);assert.equal(blocked.victim.health,100);blocked.world.free();
 const w=new RAPIER.World({x:0,y:0,z:0});w.createCollider(RAPIER.ColliderDesc.cuboid(10,1,.001).setTranslation(0,.85,-5));w.step();const shots=new ProjectileSystem();shots.spawn('you',new Vector3(0,.85,0),new Vector3(0,0,-1000),0);
 const hits=shots.advance(w,1/60,1/60,[target('kojo',0,-10)],new Set());assert.equal(hits[0].kind,'wall');assert.ok(hits[0].position.z> -5);assert.equal(shots.active.size,0);w.free();
});
test('nearest target wins and a target before a wall is hit first',()=>{
 const w=new RAPIER.World({x:0,y:0,z:0});w.createCollider(RAPIER.ColliderDesc.cuboid(10,1,.1).setTranslation(0,.85,-15));w.step();const shots=new ProjectileSystem();shots.spawn('you',new Vector3(0,.85,0),new Vector3(0,0,-1000),0);
 const hits=shots.advance(w,1/60,1/60,[target('far',0,-12),target('near',0,-7)],new Set());assert.equal(hits[0].targetId,'near');w.free();
});
test('shield deadline is evaluated at swept impact time, not frame-end time',()=>{
 const baseline=runShot();const at=baseline.impacts.find(i=>i.result==='hit')!.at;baseline.world.free();
 for(const [deadline,expected] of [[at-.00001,82],[at+.00001,100]]){const {world,victim,impacts}=runShot(deadline);assert.equal(victim.health,expected);assert.equal(impacts[0].result,expected===100?'shield':'hit');world.free();}
});
test('shield absorption preserves timed protection and applies no throttle or speed disruption',()=>{
 const {world,sim,shooter,victim,impacts}=runShot(5);assert.equal(victim.health,100);assert.equal(victim.hitUntil,0);assert.equal(victim.shieldUntil,5);assert.equal(victim.shieldBlocks,1);assert.equal(shooter.hits,0);assert.equal(impacts[0].result,'shield');assert.equal(sim.projectiles.active.size,0);world.free();
});
test('AI uses the same charge and collision path, and refuses a wall-obstructed shot',()=>{
 const a=runShot(0,true);assert.equal(a.shooter.shots,1);assert.equal(a.shooter.hits,1);assert.equal(a.victim.health,82);a.world.free();
 const b=runShot(0,true,true);assert.equal(b.shooter.shots,0);assert.deepEqual(b.shooter.inventory,['pulse']);assert.equal(b.victim.health,100);b.world.free();
});
test('projectile cap and fire cooldown retain charges; reset clears shots and attribution',()=>{
 const {world,sim,shooter}=setup();for(let i=0;i<PULSE.capacity;i++)assert.ok(sim.projectiles.spawn('you',new Vector3(30,.85,0),new Vector3(0,0,-78),0));
 assert.equal(sim.use(shooter),false);assert.deepEqual(shooter.inventory,['pulse']);sim.reset();sim.countdown=0;shooter.vehicle.setSpawn(new Vector3(0,.85,0),new Quaternion());sim.racers.get('kojo')!.vehicle.setSpawn(new Vector3(0,.85,-18),new Quaternion());world.step();shooter.vehicle.capture();sim.racers.get('kojo')!.vehicle.capture();shooter.inventory=['pulse','pulse'];assert.ok(sim.use(shooter));assert.equal(sim.use(shooter),false);assert.deepEqual(shooter.inventory,['pulse']);
 sim.reset(createCourse('north-loop'));assert.equal(sim.projectiles.active.size,0);assert.equal(sim.combatImpacts.length,0);assert.equal(shooter.shots,0);assert.equal(shooter.hits,0);assert.equal(shooter.lastHitBy,null);assert.equal(world.bodies.len(),2);world.free();
});
test('lifetime clips the travelled segment and finished or recovering cars are ignored',()=>{
 const w=new RAPIER.World({x:0,y:0,z:0}),shots=new ProjectileSystem();const behind=target('ignored',0,-20);behind.eligible=false;
 shots.spawn('you',new Vector3(0,.85,0),new Vector3(0,0,-78),0);const result=shots.advance(w,3,3,[behind,target('too-far',0,-200)],new Set());assert.equal(result[0].kind,'expired');assert.ok(Math.abs(result[0].position.z+PULSE.speed*PULSE.lifetime)<1e-6);assert.equal(shots.active.size,0);assert.equal(shots.advance(w,4,1,[],new Set()).length,0);w.free();
});
test('teleport recovery does not sweep a target across an otherwise missed shot',()=>{
 const w=new RAPIER.World({x:0,y:0,z:0}),shots=new ProjectileSystem(),teleport=target('teleport',-100,-3);teleport.position.x=100;
 shots.spawn('you',new Vector3(0,.85,0),new Vector3(0,0,-78),0);assert.equal(shots.advance(w,.1,.1,[teleport],new Set()).length,0);w.free();
});
test('pulse disruption is short, bounded and applies no spin; repeated hits respect protection',()=>{
 const {world,sim,shooter,victim}=setup();victim.vehicle.body.setLinvel({x:0,y:0,z:-20},true);let applied=false;
 for(let i=0;i<60;i++){const before=victim.vehicle.body.linvel().z;sim.tick({drive:EMPTY_INPUT,use:i===0});if(sim.combatImpacts.some(hit=>hit.result==='hit')){const after=victim.vehicle.body.linvel().z;assert.ok(Math.abs(after-before)<=PULSE.maxSpeedLoss+.1);assert.ok(victim.hitUntil-sim.time<=PULSE.hitDuration+1e-9);assert.ok(Math.abs(victim.vehicle.body.angvel().y)<1e-6);applied=true;break;}}
 assert.ok(applied);const health=victim.health;
 // A second projectile contacts inside the target's brief protection window.
 shooter.fireReadyAt=0;shooter.inventory=['pulse'];assert.ok(sim.use(shooter));let protectedHit=false;
 for(let i=0;i<40;i++){sim.tick({drive:EMPTY_INPUT});if(sim.combatImpacts.some(hit=>hit.result==='protected'))protectedHit=true;}
 assert.ok(protectedHit);assert.equal(victim.health,health);assert.ok(victim.hitUntil<sim.time);world.free();
});
test('recovering a shooter cancels its in-flight projectiles',()=>{
 const {world,sim,shooter}=setup();assert.ok(sim.use(shooter));assert.equal(sim.projectiles.active.size,1);shooter.vehicle.body.setTranslation({x:0,y:-5,z:0},true);sim.tick({drive:EMPTY_INPUT});assert.equal(sim.projectiles.active.size,0);assert.ok(sim.events.some(event=>event.type==='recover'));world.free();
});
