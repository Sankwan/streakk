// Headless single-car route feasibility check. This is a test driver, not production opponent AI.
import RAPIER from '@dimforge/rapier3d-compat';import * as THREE from 'three';
import {createCourse,addPhysics} from '../src/track.ts';import {Vehicle} from '../src/vehicle.ts';import {LapProgress} from '../src/tracks/lap.ts';import {TRACKS} from '../src/tracks/definitions.ts';
await RAPIER.init();const results=[];
for(const {id} of TRACKS){
 const track=createCourse(id),world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;addPhysics(world,track);world.step();const car=new Vehicle(world);car.setSpawn(track.spawn,track.rotation);const laps=new LapProgress();let s=track.length*track.definition.spawnFraction,maxLateral=0,finished=false,ticks=0,offroad=0;
 for(;ticks<60*280;ticks++){
  const p=track.project(car.currentPosition,s);s=p.s;
  const q=car.currentRotation,forward=new THREE.Vector3(0,0,-1).applyQuaternion(q),right=new THREE.Vector3(1,0,0).applyQuaternion(q);
  const look=10+car.speed*.75,target=track.sample(s+look).position.clone().sub(car.currentPosition);const steering=-Math.atan(5.6*target.dot(right)/(look*look))/(car.tuning.steer/(1+car.speed/24));
  const a=track.sample(s+10).forward,b=track.sample(s+65).forward,k=Math.acos(THREE.MathUtils.clamp(a.dot(b),-1,1))/55;
  const desired=Math.min(25,Math.sqrt(7/Math.max(.001,k)));const throttle=THREE.MathUtils.clamp((desired-car.speed)*.45,0,1),brake=THREE.MathUtils.clamp((car.speed-desired)*.25,0,1);
  car.offroad=p.distance>p.width/2;car.step({throttle,brake,steer:THREE.MathUtils.clamp(steering,-1,1),handbrake:false});
  const next=track.project(car.currentPosition,s);maxLateral=Math.max(maxLateral,Math.abs(next.lateral));if(next.distance>next.width/2)offroad++;
  if(laps.update(next.s,track.length,next.distance<next.width/2-.15)){finished=true;break;}
 }
 const result={id,finished,seconds:+(ticks/60).toFixed(2),maxLateral:+maxLateral.toFixed(2),offroadTicks:offroad};results.push(result);world.free();
}
console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.finished||r.offroadTicks>0))process.exitCode=1;
