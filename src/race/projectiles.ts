import RAPIER from '@dimforge/rapier3d-compat';
import {Vector3,Quaternion,MathUtils} from 'three';

export const PULSE={speed:78,radius:.16,lifetime:2.2,capacity:8,damage:18,fireInterval:.4,hitDuration:.22,maxSpeedLoss:1.2,lockRange:95,lockAngle:Math.PI*.24,turnRate:3.8};
export interface Projectile {
 id:string;ownerId:string;targetId?:string;position:Vector3;previousPosition:Vector3;velocity:Vector3;bornAt:number;expiresAt:number;
}
export interface ProjectileTarget {
 id:string;previousPosition:Vector3;position:Vector3;previousRotation:Quaternion;rotation:Quaternion;eligible:boolean;
}
export interface ProjectileImpact {
 projectileId:string;ownerId:string;targetId?:string;kind:'target'|'wall'|'expired';position:Vector3;at:number;
}
const HALF=new Vector3(.91,.27,1.95),IDENTITY=new Quaternion();

export function selectLockTarget(ownerId:string,position:Vector3,rotation:Quaternion,targets:ProjectileTarget[]){
 const forward=new Vector3(0,0,-1).applyQuaternion(rotation).setY(0).normalize();
 let best:{id:string;angle:number;distance:number}|null=null;
 for(const target of targets){
  if(target.id===ownerId||!target.eligible)continue;
  const delta=target.position.clone().sub(position).setY(0),distance=delta.length();
  if(distance<2||distance>PULSE.lockRange)continue;
  const ahead=delta.dot(forward);if(ahead<=0)continue;
  const angle=Math.acos(MathUtils.clamp(ahead/distance,-1,1));if(angle>PULSE.lockAngle)continue;
  if(!best||angle<best.angle-1e-4||Math.abs(angle-best.angle)<=1e-4&&distance<best.distance)best={id:target.id,angle,distance};
 }
 return best?.id??null;
}

/** Relative-motion slab test. Mid-orientation bounds expand to contain rotation during the tick. */
export function sweepMovingBox(start:Vector3,end:Vector3,target:ProjectileTarget,radius=PULSE.radius){
 const rotation=target.previousRotation.clone().slerp(target.rotation,.5).invert();
 const a=start.clone().sub(target.previousPosition).applyQuaternion(rotation);
 const b=end.clone().sub(target.position).applyQuaternion(rotation),delta=b.sub(a);
 const rotationMargin=2*HALF.length()*Math.sin(target.previousRotation.angleTo(target.rotation)/4);
 let enter=0,leave=1;
 for(const axis of ['x','y','z'] as const){
  const bound=HALF[axis]+radius+rotationMargin;
  if(Math.abs(delta[axis])<1e-10){if(Math.abs(a[axis])>bound)return null;continue;}
  let near=(-bound-a[axis])/delta[axis],far=(bound-a[axis])/delta[axis];
  if(near>far)[near,far]=[far,near];enter=Math.max(enter,near);leave=Math.min(leave,far);
  if(enter>leave)return null;
 }
 return enter;
}

export class ProjectileSystem {
 readonly active=new Map<string,Projectile>();
 private sequence=0;private epoch=0;private shape=new RAPIER.Ball(PULSE.radius);
 reset(){this.active.clear();this.sequence=0;this.epoch++;}
 cancelOwner(ownerId:string){for(const [id,shot] of this.active)if(shot.ownerId===ownerId)this.active.delete(id);}
 spawn(ownerId:string,position:Vector3,velocity:Vector3,time:number,targetId?:string){
  if(this.active.size>=PULSE.capacity||!Number.isFinite(time)||![...position.toArray(),...velocity.toArray()].every(Number.isFinite)||velocity.lengthSq()<1e-8)return null;
  const shot:Projectile={id:`pulse-${this.epoch}-${++this.sequence}`,ownerId,targetId,position:position.clone(),previousPosition:position.clone(),velocity:velocity.clone(),bornAt:time,expiresAt:time+PULSE.lifetime};
  this.active.set(shot.id,shot);return shot;
 }
 obstruction(world:RAPIER.World,start:Vector3,end:Vector3,racerHandles:Set<number>){
  const delta=end.clone().sub(start);
  const hit=world.castShape(start,IDENTITY,delta,this.shape,0,1,true,undefined,undefined,undefined,undefined,c=>!c.isSensor()&&!racerHandles.has(c.handle));
  return hit?MathUtils.clamp(hit.time_of_impact,0,1):null;
 }
 /** Planning query only; firing still travels straight and can miss a changing target. */
 hasClearShot(world:RAPIER.World,ownerId:string,start:Vector3,velocity:Vector3,targets:ProjectileTarget[],racerHandles:Set<number>){
  const end=start.clone().addScaledVector(velocity,PULSE.lifetime);let best=Infinity;
  for(const target of targets){if(target.id===ownerId||!target.eligible)continue;const hit=sweepMovingBox(start,end,target);if(hit!==null)best=Math.min(best,hit);}
  if(!Number.isFinite(best))return false;
  const wall=this.obstruction(world,start,end,racerHandles);return wall===null||best<wall-1e-6;
 }
 advance(world:RAPIER.World,now:number,dt:number,targets:ProjectileTarget[],racerHandles:Set<number>){
  const impacts:ProjectileImpact[]=[];
  for(const [id,shot] of this.active){
   const begin=Math.max(now-dt,shot.bornAt),endTime=Math.min(now,shot.expiresAt),duration=endTime-begin;
   if(duration<=0){if(now>=shot.expiresAt){this.active.delete(id);impacts.push({projectileId:id,ownerId:shot.ownerId,kind:'expired',position:shot.position.clone(),at:shot.expiresAt});}continue;}
   shot.previousPosition.copy(shot.position);
   const locked=shot.targetId?targets.find(target=>target.id===shot.targetId&&target.eligible):undefined;
   if(locked){
    const desired=locked.position.clone().sub(shot.position).normalize(),current=shot.velocity.clone().normalize();
    const angle=current.angleTo(desired),turn=Math.min(angle,PULSE.turnRate*duration);
    if(turn>1e-6){const axis=current.clone().cross(desired);if(axis.lengthSq()>1e-8)current.applyAxisAngle(axis.normalize(),turn);shot.velocity.copy(current.multiplyScalar(shot.velocity.length()));}
   }
   const end=shot.position.clone().addScaledVector(shot.velocity,duration);
   let first=this.obstruction(world,shot.position,end,racerHandles)??Infinity,targetId:string|undefined;
   for(const target of targets){
    if(target.id===shot.ownerId||!target.eligible)continue;
    // Teleport/recovery discontinuities never create a swept hit across the whole course.
    if(target.previousPosition.distanceToSquared(target.position)>100)continue;
    const a=MathUtils.clamp((begin-(now-dt))/dt,0,1),b=MathUtils.clamp((endTime-(now-dt))/dt,0,1);
    const partial={...target,previousPosition:target.previousPosition.clone().lerp(target.position,a),position:target.previousPosition.clone().lerp(target.position,b),previousRotation:target.previousRotation.clone().slerp(target.rotation,a),rotation:target.previousRotation.clone().slerp(target.rotation,b)};
    const hit=sweepMovingBox(shot.position,end,partial);
    // Solid world wins ties, preventing shots through a car touching a wall.
    if(hit!==null&&(hit<first-1e-6||(targetId!==undefined&&Math.abs(hit-first)<1e-6&&target.id<targetId))){first=hit;targetId=target.id;}
   }
   if(Number.isFinite(first)){
    shot.position.lerp(end,first);this.active.delete(id);
    impacts.push({projectileId:id,ownerId:shot.ownerId,targetId,kind:targetId?'target':'wall',position:shot.position.clone(),at:begin+duration*first});
   }else{shot.position.copy(end);if(now>=shot.expiresAt){this.active.delete(id);impacts.push({projectileId:id,ownerId:shot.ownerId,kind:'expired',position:shot.position.clone(),at:shot.expiresAt});}}
  }
  return impacts.sort((a,b)=>a.at-b.at||a.projectileId.localeCompare(b.projectileId));
 }
}
