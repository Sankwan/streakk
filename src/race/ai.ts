import {Vector3,MathUtils} from 'three';
import type {Course} from '../tracks/compiler.ts';
import type {Vehicle,DriverInput} from '../vehicle.ts';

export interface AIContext {pace?:number;catchup?:number;}
const PREVIEW=[0,18,36,58,84,112];

function curvature(course:Course,s:number,span=12){
 const a=course.sample(s-span).forward,b=course.sample(s+span).forward;
 return Math.acos(MathUtils.clamp(a.dot(b),-1,1))/(span*2);
}

/** Fastest speed that can still brake for every sampled corner ahead. */
export function plannedSpeed(course:Course,s:number,topSpeed:number){
 let desired=topSpeed;
 for(const distance of PREVIEW){
  const corner=Math.min(topSpeed,Math.sqrt(9.2/Math.max(.00035,curvature(course,s+distance))));
  desired=Math.min(desired,Math.sqrt(corner*corner+2*10.5*distance));
 }
 return desired;
}

/** Predictive pure-pursuit rival driver. It uses the same Rapier vehicle and forces as the player. */
export function driveAI(vehicle:Vehicle,course:Course,s:number,lane=3.2,context:AIContext={}):DriverInput {
 if(course.definition.id==='north-loop'){
  const look=10+vehicle.speed*.75,point=course.sample(s+look),target=point.position.addScaledVector(point.right,MathUtils.clamp(lane,-point.width/2+4,point.width/2-4)).sub(vehicle.currentPosition),right=new Vector3(1,0,0).applyQuaternion(vehicle.currentRotation);
  const angle=-Math.atan(5.6*target.dot(right)/(look*look)),a=course.sample(s+10).forward,b=course.sample(s+65).forward,k=Math.acos(MathUtils.clamp(a.dot(b),-1,1))/55,desired=Math.min(vehicle.boostActive?31:25,Math.sqrt(6/Math.max(.001,k))),error=desired-vehicle.speed;
  return {throttle:MathUtils.clamp(error*.45,0,1),brake:MathUtils.clamp(-error*.25,0,1),steer:MathUtils.clamp(angle/(vehicle.tuning.steer/(1+vehicle.speed/24)),-1,1),handbrake:false};
 }
 const pace=MathUtils.clamp(context.pace??1,.94,1.06),catchup=MathUtils.clamp(context.catchup??0,0,1);
 const look=MathUtils.clamp(12+vehicle.speed*.62,12,45),point=course.sample(s+look);
 const target=point.position.addScaledVector(point.right,MathUtils.clamp(lane,-point.width/2+4,point.width/2-4)).sub(vehicle.currentPosition);
 const right=new Vector3(1,0,0).applyQuaternion(vehicle.currentRotation);
 const angle=-Math.atan(5.8*target.dot(right)/(look*look));
 const top=(vehicle.boostActive?57:49)*pace*(1+.045*catchup),desired=plannedSpeed(course,s,top);
 const steeringLimit=vehicle.steeringFloor+(vehicle.tuning.steer-vehicle.steeringFloor)/(1+(vehicle.speed/vehicle.steeringFalloff)**2);
 const error=desired-vehicle.speed;
 return {throttle:MathUtils.clamp(error*.32+.18,0,1),brake:MathUtils.clamp(-error*.2,0,1),steer:MathUtils.clamp(angle/steeringLimit,-1,1),handbrake:false};
}
