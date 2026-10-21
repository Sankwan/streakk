import {Vector3,MathUtils} from 'three';
import type {Course} from '../tracks/compiler.ts';
export type PickupKind='boost'|'repair'|'shield'|'pulse'|'magnet'|'mine';
export interface Pickup {id:string;kind:PickupKind;s:number;lateral:number;position:Vector3;availableAt:number;}
export const PICKUP_NAMES:Record<PickupKind,string>={boost:'BOOST',repair:'REPAIR',shield:'SHIELD',pulse:'PULSE',magnet:'MAGNET',mine:'MINE'};
export function makePickups(course:Course):Pickup[]{
 const kinds:PickupKind[]=['pulse','boost','mine','magnet','repair','shield'];
 return course.pickupOpportunities.flatMap((site,i)=>{
  const p=course.sample(site.s),offset=Math.min(3.2,site.width/2-4);
  return [-offset,offset].map((lateral,lane)=>({id:`${course.definition.id}:v${course.definition.version}:${i}:${lane}`,kind:kinds[(i+lane)%kinds.length],s:site.s,lateral,position:p.position.clone().addScaledVector(p.right,lateral).setY(.85),availableAt:0}));
 });
}
export function segmentHit(start:Vector3,end:Vector3,center:Vector3,radius=1.8){
 const delta=end.clone().sub(start),lengthSq=delta.lengthSq();
 const t=lengthSq>1e-9?MathUtils.clamp(center.clone().sub(start).dot(delta)/lengthSq,0,1):0;
 return start.clone().addScaledVector(delta,t).distanceToSquared(center)<=radius*radius?t:null;
}
