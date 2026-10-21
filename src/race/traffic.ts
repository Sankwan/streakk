import RAPIER from '@dimforge/rapier3d-compat';
import {Quaternion,Vector3} from 'three';
import type {Course} from '../tracks/compiler.ts';
import {STEP} from '../math.ts';

export interface TrafficVehicle {
 id:string;s:number;speed:number;lateral:number;
 body:RAPIER.RigidBody;collider:RAPIER.Collider;
 previousPosition:Vector3;position:Vector3;rotation:Quaternion;
}

const trafficZone=(course:Course)=>course.definition.zones?.find(zone=>zone.kind==='traffic');

/** Two fixed-schedule oncoming vehicles occupy one line and preserve a wide escape side. */
export function createTraffic(world:RAPIER.World,course:Course){
 const zone=trafficZone(course);if(!zone)return [];
 const start=zone.from*course.length,end=zone.to*course.length,span=end-start;
 return [0,.52].map((phase,index)=>{
  const s=end-span*phase,p=course.sample(s),lateral=Math.min(5.5,p.width*.24),position=p.position.clone().addScaledVector(p.right,lateral).setY(.92);
  const rotation=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.atan2(p.forward.x,p.forward.z));
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(position.x,position.y,position.z).setRotation(rotation));
  const collider=world.createCollider(RAPIER.ColliderDesc.cuboid(1.18,.9,2.85).setFriction(.15).setRestitution(.02),body);
  return {id:`trotro-${index+1}`,s,speed:9.5+index*1.25,lateral,body,collider,previousPosition:position.clone(),position,rotation} satisfies TrafficVehicle;
 });
}

export function advanceTraffic(traffic:TrafficVehicle[],course:Course){
 const zone=trafficZone(course);if(!zone)return;const start=zone.from*course.length,end=zone.to*course.length;
 for(const bus of traffic){
  bus.previousPosition.copy(bus.position);let next=bus.s-bus.speed*STEP,wrapped=false;if(next<start){next=end-(start-next)%(end-start);wrapped=true;}bus.s=next;
  const p=course.sample(bus.s);bus.lateral=Math.min(5.5,p.width*.24);bus.position.copy(p.position).addScaledVector(p.right,bus.lateral).setY(.92);bus.rotation.setFromAxisAngle(new Vector3(0,1,0),Math.atan2(p.forward.x,p.forward.z));
  if(wrapped){bus.body.setTranslation(bus.position,false);bus.body.setRotation(bus.rotation,false);bus.previousPosition.copy(bus.position);}
  bus.body.setNextKinematicTranslation(bus.position);bus.body.setNextKinematicRotation(bus.rotation);
 }
}

export function removeTraffic(world:RAPIER.World,traffic:TrafficVehicle[]){for(const bus of traffic)world.removeRigidBody(bus.body);traffic.length=0;}
