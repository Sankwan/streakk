import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicle, EMPTY_INPUT } from '../src/vehicle.ts';
import { FixedClock, STEP } from '../src/math.ts';
await RAPIER.init();
function setup(){const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=STEP;world.createCollider(RAPIER.ColliderDesc.cuboid(1000,.2,1000).setTranslation(0,-.2,0));world.step();return {world,car:new Vehicle(world)};}
test('suspension settles, acceleration moves forward, brakes stop the car',()=>{const {world,car}=setup();for(let i=0;i<120;i++)car.step(EMPTY_INPUT);assert.equal(car.contacts,4);assert.ok(car.currentPosition.y>.5&&car.currentPosition.y<1.2);for(let i=0;i<360;i++)car.step({...EMPTY_INPUT,throttle:1});const speed=car.speed;assert.ok(speed>18,`speed ${speed}`);assert.ok(car.currentPosition.z< -40);for(let i=0;i<90;i++)car.step({...EMPTY_INPUT,brake:1});assert.ok(car.speed<speed*.35,`speed after braking ${car.speed}`);world.free();});
test('same fixed-step inputs produce the same result at 30 and 144 render FPS',()=>{function replay(fps:number){const {world,car}=setup();const clock=new FixedClock();let ticks=0;for(let f=0;f<fps*6;f++)clock.advance(1/fps,()=>{car.step({...EMPTY_INPUT,throttle:1,steer:ticks>180?.3:0});ticks++;});const p={...car.body.translation()},v={...car.body.linvel()};world.free();return {ticks,p,v};}const a=replay(30),b=replay(144);assert.equal(a.ticks,360);assert.equal(b.ticks,360);for(const k of ['x','y','z'] as const){assert.ok(Math.abs(a.p[k]-b.p[k])<1e-5);assert.ok(Math.abs(a.v[k]-b.v[k])<1e-5);}});
test('reset clears motion and long render stalls do not cause unbounded catch-up',()=>{const {world,car}=setup();for(let i=0;i<120;i++)car.step({...EMPTY_INPUT,throttle:1});car.reset();assert.ok(Math.hypot(...Object.values(car.body.linvel()))<1e-5);assert.equal(car.currentPosition.z,0);const clock=new FixedClock();let ticks=0;clock.advance(8,()=>ticks++);assert.ok(ticks<=6);world.free();});
test('chassis cannot pass through a solid barrier',()=>{const {world,car}=setup();world.createCollider(RAPIER.ColliderDesc.cuboid(25,2,.4).setTranslation(0,2,-35));for(let i=0;i<480;i++)car.step({...EMPTY_INPUT,throttle:1});assert.ok(car.currentPosition.z> -35,`barrier crossed: ${car.currentPosition.z}`);assert.ok(Number.isFinite(car.speed));world.free();});

test('handbrake creates a wider slide, then grip recovers after release',()=>{function run(handbrake:boolean){const {world,car}=setup();for(let i=0;i<300;i++)car.step({...EMPTY_INPUT,throttle:1});let peak=0;for(let i=0;i<120;i++){car.step({...EMPTY_INPUT,throttle:1,steer:.65,handbrake});peak=Math.max(peak,Math.abs(car.slip));}for(let i=0;i<180;i++)car.step({...EMPTY_INPUT,throttle:1});const result={peak,recovered:Math.abs(car.slip),contacts:car.contacts};world.free();return result;}const grip=run(false),drift=run(true);assert.ok(drift.peak>grip.peak+.2);assert.ok(drift.recovered<.1);assert.equal(drift.contacts,4);});

test('digital steering builds progressively, self-centres faster and trims lock at speed',()=>{
 const {world,car}=setup();for(let i=0;i<6;i++)car.step({...EMPTY_INPUT,steer:1});assert.ok(car.steerInput>.35&&car.steerInput<.55);const lowAngle=car.steer;
 for(let i=0;i<6;i++)car.step({...EMPTY_INPUT,steer:0});assert.ok(car.steerInput<.2,'steering should return faster than it builds');
 for(let i=0;i<120;i++)car.step({...EMPTY_INPUT,steer:1});const fullLowAngle=car.steer;assert.ok(fullLowAngle>lowAngle*3);
 car.reset();car.body.setLinvel({x:0,y:0,z:-30},true);for(let i=0;i<30;i++)car.step({...EMPTY_INPUT,steer:1});assert.ok(car.steer<fullLowAngle*.55,`high-speed angle ${car.steer} should be below low-speed ${fullLowAngle}`);world.free();
});

test('contact tuning uses low bounce and restrained chassis friction',()=>{const {world,car}=setup();assert.ok(Math.abs(car.collider.restitution()-.02)<1e-6);assert.ok(Math.abs(car.collider.friction()-.12)<1e-6);world.free();});
