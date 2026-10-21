import * as THREE from 'three';
import type {TrackDefinition,TrackZone} from './definitions.ts';
export interface RoadSample {position:THREE.Vector3;forward:THREE.Vector3;right:THREE.Vector3;width:number;s:number;}
export interface Projection {s:number;distance:number;lateral:number;width:number;index:number;position:THREE.Vector3;}
export interface PickupOpportunity {s:number;lanes:number[];width:number;clearCorridor:number;}
const wrap=(s:number,L:number)=>((s%L)+L)%L;
export function compileTrack(def:TrackDefinition){
 if(!/^[a-z0-9-]+$/.test(def.id)||!Number.isInteger(def.version)||def.version<1)throw Error('Track requires a stable ID and positive integer version');
 if(def.points.length<4)throw Error('A closed circuit needs at least four control points');
 if(!Number.isInteger(def.lanes)||def.lanes<1||def.lanes>6)throw Error('Lane count must be 1–6');
 for(const p of def.points){if(![p.x,p.z,p.width,p.y??0].every(Number.isFinite)||p.width<12||p.width>60)throw Error('Invalid point or road width (12–60 m supported)');if(Math.abs(p.y??0)>.001)throw Error('Elevation is gated until road collision decks are implemented');}
 for(let i=0;i<def.points.length;i++)if(Math.hypot(def.points[i].x-def.points[(i+1)%def.points.length].x,def.points[i].z-def.points[(i+1)%def.points.length].z)<2)throw Error('Adjacent control points are too close');
 const zoneIds=new Set<string>();
 for(const zone of def.zones??[]){if(!/^[a-z0-9-]+$/.test(zone.id)||zoneIds.has(zone.id))throw Error('Track zones require unique stable IDs');zoneIds.add(zone.id);if(!Number.isFinite(zone.from)||!Number.isFinite(zone.to)||zone.from<0||zone.to>1||zone.from>=zone.to)throw Error('Track zone bounds must increase within 0–1');}
 const curve=new THREE.CatmullRomCurve3(def.points.map(p=>new THREE.Vector3(p.x,0,p.z)),true,'catmullrom',def.tension);
 if(def.arcDivisions)curve.arcLengthDivisions=def.arcDivisions;
 const length=curve.getLength();if(!Number.isFinite(length)||length<100||length>12000)throw Error('Track length must be 100–12,000 m');
 const count=def.sampleCount??Math.ceil(length/(def.sampleSpacing??3));if(count<32||count>6000)throw Error('Invalid sample budget');
 const samples=curve.getSpacedPoints(count);samples.pop();const step=length/count;
 function widthAt(u:number){const raw=curve.getUtoTmapping(wrap(u,1),0)*def.points.length;const i=Math.floor(raw)%def.points.length;const t=raw-Math.floor(raw);return THREE.MathUtils.lerp(def.points[i].width,def.points[(i+1)%def.points.length].width,t);}
 const road:RoadSample[]=samples.map((position,i)=>{const forward=samples[(i+1)%count].clone().sub(samples[(i-1+count)%count]).normalize();return {position,forward,right:new THREE.Vector3(-forward.z,0,forward.x),width:widthAt(i/count),s:i*step};});
 const bounds=new THREE.Box3().setFromPoints(samples).expandByScalar(Math.max(...def.points.map(p=>p.width))/2+40);
 // Buckets hold every segment whose AABB touches the cell, including seam segments.
 const cell=32,grid=new Map<string,number[]>();
 road.forEach((a,i)=>{const b=road[(i+1)%count];for(let x=Math.floor(Math.min(a.position.x,b.position.x)/cell);x<=Math.floor(Math.max(a.position.x,b.position.x)/cell);x++)for(let z=Math.floor(Math.min(a.position.z,b.position.z)/cell);z<=Math.floor(Math.max(a.position.z,b.position.z)/cell);z++){const key=`${x},${z}`,list=grid.get(key)||[];list.push(i);grid.set(key,list);}});
 function sample(s:number){const f=wrap(s,length)/step,i=Math.floor(f)%count,t=f-i,a=road[i],b=road[(i+1)%count];const forward=a.forward.clone().lerp(b.forward,t).normalize();return {position:a.position.clone().lerp(b.position,t),forward,right:new THREE.Vector3(-forward.z,0,forward.x),width:THREE.MathUtils.lerp(a.width,b.width,t),s:wrap(s,length)};}
 function zoneAt(s:number):TrackZone|undefined{const f=wrap(s,length)/length;return def.zones?.find(zone=>f>=zone.from&&f<zone.to);}
 function project(pos:{x:number;z:number},hint?:number):Projection{
  const candidates=new Set<number>();const gx=Math.floor(pos.x/cell),gz=Math.floor(pos.z/cell);
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const i of grid.get(`${gx+dx},${gz+dz}`)||[])candidates.add(i);
  if(hint!==undefined){const i=Math.floor(wrap(hint,length)/step);for(let k=-4;k<=4;k++)candidates.add((i+k+count)%count);}
  function closest(indices:Iterable<number>){let best:Projection|undefined;for(const i of indices){const a=road[i],b=road[(i+1)%count];const dx=b.position.x-a.position.x,dz=b.position.z-a.position.z;const t=THREE.MathUtils.clamp(((pos.x-a.position.x)*dx+(pos.z-a.position.z)*dz)/(dx*dx+dz*dz||1),0,1);const position=a.position.clone().lerp(b.position,t),distance=Math.hypot(pos.x-position.x,pos.z-position.z);if(!best||distance<best.distance){const right=a.right.clone().lerp(b.right,t).normalize();best={s:wrap((i+t)*step,length),distance,lateral:(pos.x-position.x)*right.x+(pos.z-position.z)*right.z,width:THREE.MathUtils.lerp(a.width,b.width,t),index:i,position};}}return best;}
  let result=closest(candidates);
  // Outside this local region, use the full route to guarantee a meaningful reset query.
  if(!result||result.distance>cell)result=closest(road.keys());
  return result!;
 }
 // A flat-route compiler cannot safely accept crossings without a junction/elevation graph.
 const tested=new Set<string>();
 for(let i=0;i<count;i++){
  const a=road[i].position,b=road[(i+1)%count].position;
  const candidates=new Set<number>();
  for(let x=Math.floor(Math.min(a.x,b.x)/cell);x<=Math.floor(Math.max(a.x,b.x)/cell);x++)for(let z=Math.floor(Math.min(a.z,b.z)/cell);z<=Math.floor(Math.max(a.z,b.z)/cell);z++)for(const j of grid.get(`${x},${z}`)||[])candidates.add(j);
  for(const j of candidates){if(Math.min(Math.abs(i-j),count-Math.abs(i-j))<=2)continue;const key=[Math.min(i,j),Math.max(i,j)].join(':');if(tested.has(key))continue;tested.add(key);
   const c=road[j].position,d=road[(j+1)%count].position,rx=b.x-a.x,rz=b.z-a.z,sx=d.x-c.x,sz=d.z-c.z,den=rx*sz-rz*sx;if(Math.abs(den)<1e-9)continue;
   const t=((c.x-a.x)*sz-(c.z-a.z)*sx)/den,u=((c.x-a.x)*rz-(c.z-a.z)*rx)/den;
   if(t>=0&&t<=1&&u>=0&&u<=1)throw Error('Flat road self-crossing requires a validated junction or bridge');
  }
 }
 const warnings:string[]=[];
 for(let i=0;i<count;i++){const a=road[(i-1+count)%count],b=road[(i+1)%count];const angle=Math.acos(THREE.MathUtils.clamp(a.forward.dot(b.forward),-1,1));const radius=angle>1e-5?2*step/angle:Infinity;if(radius<road[i].width*.65){warnings.push(`Tight offset road at ${Math.round(i*step)} m`);break;}}
 const spawn=curve.getPointAt(def.spawnFraction);spawn.y=.85;
 const tangent=curve.getTangentAt(def.id==='north-loop'?0:def.spawnFraction);
 const rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(-tangent.x,-tangent.z));
 const sectors=Array.from({length:12},(_,i)=>i*length/12);
 const pickupOpportunities:PickupOpportunity[]=[];
 for(let s=150;s<length-100;s+=280){const p=sample(s),ahead=sample(s+55),zone=zoneAt(s);if(p.forward.dot(ahead.forward)<.91||zone?.kind==='squeeze')continue;const n=p.width>=30?3:p.width>=24?2:1;const offsets=n===3?[-p.width*.28,0,p.width*.28]:n===2?[-p.width*.23,p.width*.23]:[p.width*.22];
  // Compact tokens leave space between them and a full outside escape corridor.
  const clearCorridor=p.width/2-Math.max(...offsets.map(Math.abs))-1.8;
  if(clearCorridor>=3.5)pickupOpportunities.push({s,lanes:offsets,width:p.width,clearCorridor});
 }
 return {definition:def,curve,length,step,samples,road,bounds,spawn,rotation,sectors,pickupOpportunities,warnings,sample,project,zoneAt};
}
export type Course=ReturnType<typeof compileTrack>;
