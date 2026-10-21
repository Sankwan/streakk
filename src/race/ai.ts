import {Vector3,MathUtils} from 'three';
import type {Course} from '../tracks/compiler.ts';
import type {Vehicle,DriverInput} from '../vehicle.ts';
/** Conservative first opponent. No positional shortcuts or separate movement integrator. */
export function driveAI(vehicle:Vehicle,course:Course,s:number,lane=3.2):DriverInput {
 const look=10+vehicle.speed*.75;
 const point=course.sample(s+look);
 const target=point.position.addScaledVector(point.right,MathUtils.clamp(lane,-point.width/2+4,point.width/2-4)).sub(vehicle.currentPosition);
 const right=new Vector3(1,0,0).applyQuaternion(vehicle.currentRotation);
 const angle=-Math.atan(5.6*target.dot(right)/(look*look));
 const a=course.sample(s+10).forward,b=course.sample(s+65).forward;
 const curvature=Math.acos(MathUtils.clamp(a.dot(b),-1,1))/55;
 const desired=Math.min(vehicle.boostActive?31:25,Math.sqrt(6/Math.max(.001,curvature)));
 return {throttle:MathUtils.clamp((desired-vehicle.speed)*.45,0,1),brake:MathUtils.clamp((vehicle.speed-desired)*.25,0,1),steer:MathUtils.clamp(angle/(vehicle.tuning.steer/(1+vehicle.speed/24)),-1,1),handbrake:false};
}
