import RAPIER from '@dimforge/rapier3d-compat';
import {Vector3,Quaternion,MathUtils} from 'three';
import {Vehicle,EMPTY_INPUT,type DriverInput} from '../vehicle.ts';
import {STEP} from '../math.ts';
import {ProjectileSystem,PULSE,selectLockTarget,type ProjectileTarget,type ProjectileImpact} from './projectiles.ts';
import type {Course} from '../tracks/compiler.ts';
import {LapProgress} from '../tracks/lap.ts';
import {driveAI} from './ai.ts';
import {makePickups,segmentHit,PICKUP_NAMES,type PickupKind,type Pickup} from './pickups.ts';
export interface Racer {
 id:string;name:string;isAI:boolean;vehicle:Vehicle;progress:LapProgress;s:number;
 health:number;inventory:PickupKind[];boostUntil:number;shieldUntil:number;damageReadyAt:number;
 completedLaps:number;lapTime:number;lapTimes:number[];finishTime:number|null;
 gridIndex:number;laneBias:number;aiLane:number;laneDecisionAt:number;previousVelocity:Vector3;stuckTime:number;wreckUntil:number;fireReadyAt:number;hitUntil:number;magnetUntil:number;lockTargetId:string|null;incomingLockFrom:string|null;shots:number;hits:number;shieldBlocks:number;lastHitBy:string|null;
}
export const MAGNET={duration:5.5,ahead:58,halfLength:12,widthFraction:.56,pullPerTick:.075,slowPerTick:.035,driveScale:.58};
export interface MagnetField {id:string;ownerId:string;s:number;position:Vector3;right:Vector3;halfWidth:number;halfLength:number;expiresAt:number;}
const signedGap=(from:number,to:number,length:number)=>{let gap=to-from;if(gap>length/2)gap-=length;if(gap< -length/2)gap+=length;return gap;};
export function chooseAILane(racer:Racer,course:Course,racers:Iterable<Racer>,fields:MagnetField[]){
 const here=course.sample(racer.s),margin=4,extent=Math.max(1,here.width/2-margin);
 const candidates=course.definition.lanes>=4?[-.9,-.3,.3,.9].map(n=>n*extent):[-.62,.62].map(n=>n*extent);
 let best=candidates[0],bestScore=Infinity;
 for(const lane of candidates){
  let score=Math.abs(lane-here.width*racer.laneBias)*.16;
  for(const other of racers){if(other.id===racer.id||other.finishTime!==null||other.wreckUntil>0)continue;const gap=signedGap(racer.s,other.s,course.length);if(gap< -8||gap>36)continue;const lateral=course.project(other.vehicle.currentPosition,other.s).lateral,overlap=Math.max(0,1-Math.abs(lateral-lane)/4.2);if(!overlap)continue;score+=overlap*(Math.abs(gap)<8?70:26*(1-gap/36));}
  for(const field of fields){const gap=signedGap(racer.s,field.s,course.length);if(gap>=-field.halfLength&&gap<90&&Math.abs(lane)<field.halfWidth+.8)score+=32;}
  score+=Math.abs(lane-racer.aiLane)*.08;
  if(score<bestScore-1e-6){best=lane;bestScore=score;}
 }
 return best;
}
export interface Command {drive:DriverInput;use?:boolean;swap?:boolean;}
export interface RaceEvent {type:'pickup'|'use'|'damage'|'lap'|'finish'|'recover'|'notice'|'fire'|'hit'|'shield-hit';racerId:string;text:string;}
export interface CombatImpact extends ProjectileImpact {result:'hit'|'shield'|'protected'|'wall'|'expired';}
export class RaceSimulation {
 readonly racers=new Map<string,Racer>();
 readonly projectiles=new ProjectileSystem();
 magnetFields:MagnetField[]=[];
 combatImpacts:CombatImpact[]=[];
 course:Course;pickups:Pickup[]=[];time=0;countdown=3;ticks=0;events:RaceEvent[]=[];
 readonly targetLaps=2;
 readonly world:RAPIER.World;
 constructor(world:RAPIER.World,course:Course,packSize=2){
  this.world=world;
  this.course=course;this.world.timestep=STEP;
  const roster=[['you','YOU',false,-.28],['kojo','KOJO',true,.28],['ama','AMA',true,-.09],['mensah','MENSAH',true,.09]] as const;
  for(const [id,name,isAI,laneBias] of roster.slice(0,MathUtils.clamp(Math.round(packSize),2,roster.length)))this.addRacer(id,name,isAI,laneBias);
  this.reset(course);
 }
 private addRacer(id:string,name:string,isAI:boolean,laneBias:number){
  if(this.racers.has(id))throw Error('Duplicate racer ID');
  const vehicle=new Vehicle(this.world);
  if(isAI){vehicle.tuning.steer=.48;vehicle.steeringFloor=.075;vehicle.steeringFalloff=15;}
  this.racers.set(id,{id,name,isAI,vehicle,progress:new LapProgress(),s:0,health:100,inventory:[],boostUntil:0,shieldUntil:0,damageReadyAt:0,completedLaps:0,lapTime:0,lapTimes:[],finishTime:null,gridIndex:this.racers.size,laneBias,aiLane:0,laneDecisionAt:0,previousVelocity:new Vector3(),stuckTime:0,wreckUntil:0,fireReadyAt:0,hitUntil:0,magnetUntil:0,lockTargetId:null,incomingLockFrom:null,shots:0,hits:0,shieldBlocks:0,lastHitBy:null});
 }
 get player(){return this.racers.get('you')!;}
 reset(course=this.course){
  this.projectiles.reset();this.magnetFields=[];this.combatImpacts=[];this.course=course;this.time=0;this.countdown=3;this.ticks=0;this.events=[];this.pickups=makePickups(course);
  for(const racer of this.racers.values()){
   const s=course.length*course.definition.spawnFraction+racer.gridIndex*8,p=course.sample(s);
   const lane=MathUtils.clamp(p.width*racer.laneBias,-p.width/2+4,p.width/2-4);racer.aiLane=lane;racer.laneDecisionAt=0;
   const pos=p.position.addScaledVector(p.right,lane).setY(.85);
   const q=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.atan2(-p.forward.x,-p.forward.z));
   racer.vehicle.setSpawn(pos,q);racer.s=p.s;racer.progress.reset(p.s);
   racer.health=100;racer.inventory=[];racer.boostUntil=racer.shieldUntil=racer.damageReadyAt=0;
   racer.shots=racer.hits=racer.shieldBlocks=0;racer.lastHitBy=racer.lockTargetId=racer.incomingLockFrom=null;
   racer.completedLaps=0;racer.lapTime=0;racer.lapTimes=[];racer.finishTime=null;racer.stuckTime=0;racer.wreckUntil=0;racer.hitUntil=racer.fireReadyAt=racer.magnetUntil=0;
  }
 }
 use(racer:Racer){
  if(this.countdown>0||racer.finishTime!==null||racer.wreckUntil>this.time)return false;
  const kind=racer.inventory[0];if(!kind)return false;
  if(kind==='repair'){if(racer.health>=100){this.emit('notice',racer,'Condition is already full · Q to swap');return false;}racer.health=Math.min(100,racer.health+35);}
  if(kind==='boost'){if(racer.boostUntil>this.time){this.emit('notice',racer,'Boost is already active');return false;}racer.boostUntil=this.time+3;}
  if(kind==='shield'){if(racer.shieldUntil>this.time){this.emit('notice',racer,'Shield is already active');return false;}racer.shieldUntil=this.time+5;}
  if(kind==='pulse'){
   if(!this.lockedTarget(racer)){this.emit('notice',racer,'No racer in target lock · item retained');return false;}
   if(!this.firePulse(racer)){this.emit('notice',racer,'Pulse recharging · item retained');return false;}
  }
  if(kind==='magnet')this.deployMagnet(racer);
  racer.inventory.shift();this.emit(kind==='pulse'?'fire':'use',racer,PICKUP_NAMES[kind]+(kind==='pulse'?' fired':' activated'));return true;
 }
 damage(racer:Racer,amount:number,at=this.time){
  if(!Number.isFinite(amount)||amount<=0||this.countdown>0||racer.finishTime!==null||racer.damageReadyAt>at||racer.wreckUntil>this.time)return false;
  racer.damageReadyAt=at+.8;
  if(racer.shieldUntil>at){this.emit('damage',racer,'Shield absorbed the impact');return false;}
  racer.health=Math.max(0,racer.health-MathUtils.clamp(amount,0,35));this.emit('damage',racer,'Impact · '+Math.round(racer.health)+'% condition');
  if(racer.health===0){racer.wreckUntil=this.time+2;this.projectiles.cancelOwner(racer.id);racer.inventory=[];racer.boostUntil=racer.shieldUntil=0;}
  return true;
 }
 private emit(type:RaceEvent['type'],racer:Racer,text:string){this.events.push({type,racerId:racer.id,text});}
 private projectileTargets(predict=0):ProjectileTarget[]{
  return [...this.racers.values()].map(r=>{const v=r.vehicle;return {id:r.id,previousPosition:predict?v.currentPosition.clone():v.previousPosition,position:predict?v.currentPosition.clone().addScaledVector(new Vector3().copy(v.body.linvel()),predict):v.currentPosition,previousRotation:predict?v.currentRotation:v.previousRotation,rotation:v.currentRotation,eligible:r.finishTime===null&&r.wreckUntil<=this.time};});
 }
 private racerHandles(){return new Set([...this.racers.values()].map(r=>r.vehicle.collider.handle));}
 private muzzle(racer:Racer){const v=racer.vehicle,forward=new Vector3(0,0,-1).applyQuaternion(v.currentRotation);return {position:v.currentPosition.clone().addScaledVector(forward,2.4).add(new Vector3(0,.04,0)),velocity:forward.multiplyScalar(PULSE.speed+Math.min(45,Math.max(0,v.forwardSpeed))*.6)};}
 lockedTarget(racer:Racer){
  const shot=this.muzzle(racer),targets=this.projectileTargets(),id=selectLockTarget(racer.id,shot.position,racer.vehicle.currentRotation,targets);
  if(!id)return null;const target=targets.find(t=>t.id===id)!;
  return this.projectiles.obstruction(this.world,shot.position,target.position,this.racerHandles())===null?id:null;
 }
 canHitPulse(racer:Racer){return this.lockedTarget(racer)!==null;}
 private updateLocks(){
  for(const racer of this.racers.values()){racer.lockTargetId=null;racer.incomingLockFrom=null;}
  for(const racer of this.racers.values())if(racer.inventory[0]==='pulse'&&racer.finishTime===null&&racer.wreckUntil<=this.time){racer.lockTargetId=this.lockedTarget(racer);const target=racer.lockTargetId&&this.racers.get(racer.lockTargetId);if(target)target.incomingLockFrom=racer.id;}
  for(const shot of this.projectiles.active.values()){const target=shot.targetId&&this.racers.get(shot.targetId);if(target)target.incomingLockFrom=shot.ownerId;}
 }
 private firePulse(racer:Racer){
  if(this.countdown>0||racer.finishTime!==null||racer.wreckUntil>this.time||racer.fireReadyAt>this.time)return false;
  const shot=this.muzzle(racer),targetId=this.lockedTarget(racer);if(!targetId||!this.projectiles.spawn(racer.id,shot.position,shot.velocity,this.time,targetId))return false;
  racer.fireReadyAt=this.time+PULSE.fireInterval;racer.shots++;return true;
 }
 private deployMagnet(racer:Racer){
  const leader=this.standings().find(r=>r.finishTime===null)??racer,p=this.course.sample(leader.s+MAGNET.ahead);
  this.magnetFields=[{id:`magnet-${this.ticks}-${racer.id}`,ownerId:racer.id,s:p.s,position:p.position.clone(),right:p.right.clone(),halfWidth:p.width*MAGNET.widthFraction/2,halfLength:MAGNET.halfLength,expiresAt:this.time+MAGNET.duration}];
 }
 private fieldFor(racer:Racer){
  const p=this.course.project(racer.vehicle.currentPosition,racer.s),half=this.course.length/2;
  for(const field of this.magnetFields){let along=p.s-field.s;if(along>half)along-=this.course.length;if(along< -half)along+=this.course.length;if(Math.abs(along)<=field.halfLength&&Math.abs(p.lateral)<=field.halfWidth)return {field,p};}
  return null;
 }
 private applyProjectile(impact:ProjectileImpact){
  if(impact.kind!=='target'){this.combatImpacts.push({...impact,result:impact.kind});return;}
  const target=this.racers.get(impact.targetId!)!,owner=this.racers.get(impact.ownerId)!;
  if(target.finishTime!==null||target.wreckUntil>this.time){this.combatImpacts.push({...impact,result:'protected'});return;}
  if(target.shieldUntil>impact.at){target.shieldBlocks++;this.combatImpacts.push({...impact,result:'shield'});this.emit('shield-hit',target,'Shield absorbed '+owner.name+"'s pulse");this.emit('shield-hit',owner,target.name+' shield blocked your pulse');return;}
  if(!this.damage(target,PULSE.damage,impact.at)){this.combatImpacts.push({...impact,result:'protected'});this.emit('notice',owner,target.name+' has brief impact protection');return;}
  target.hitUntil=this.time+PULSE.hitDuration;target.lastHitBy=owner.id;owner.hits++;
  const velocity=new Vector3().copy(target.vehicle.body.linvel());velocity.y=0;
  const loss=Math.min(PULSE.maxSpeedLoss,velocity.length()*.035);if(loss>0)target.vehicle.body.applyImpulse(velocity.normalize().multiplyScalar(-target.vehicle.mass*loss),true);
  this.combatImpacts.push({...impact,result:'hit'});this.emit('hit',owner,'PULSE HIT · '+target.name+' −'+PULSE.damage);this.emit('hit',target,owner.name+' hit you · '+Math.round(target.health)+'% condition');
 }
 private recover(racer:Racer){
  this.projectiles.cancelOwner(racer.id);
  const p=this.course.sample(racer.s-5),lane=MathUtils.clamp(p.width*racer.laneBias,-p.width/2+4,p.width/2-4),pos=p.position.addScaledVector(p.right,lane).setY(.85);
  const rotation=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.atan2(-p.forward.x,-p.forward.z));
  racer.vehicle.setSpawn(pos,rotation);racer.s=p.s;racer.progress.reset(p.s);racer.health=100;
  racer.stuckTime=0;racer.wreckUntil=0;racer.hitUntil=racer.fireReadyAt=racer.magnetUntil=0;racer.boostUntil=racer.shieldUntil=0;racer.inventory=[];racer.damageReadyAt=this.time+1;
  this.emit('recover',racer,'Recovered · lap progress revalidated from next full circuit');
 }
 standings(){return [...this.racers.values()].sort((a,b)=>{
  if(a.finishTime!==null||b.finishTime!==null){if(a.finishTime===null)return 1;if(b.finishTime===null)return -1;return a.finishTime-b.finishTime||a.id.localeCompare(b.id);}
  return (b.completedLaps*this.course.length+b.s)-(a.completedLaps*this.course.length+a.s)||a.id.localeCompare(b.id);
 });}
 private collect(){
  for(const pickup of this.pickups){
   if(pickup.availableAt>this.time)continue;
   const claims:{racer:Racer;t:number}[]=[];
   for(const racer of this.racers.values()){
    if(racer.inventory.length>=2||racer.finishTime!==null||racer.wreckUntil>this.time)continue;
    const v=racer.vehicle;
    // Recovery/teleport cannot sweep through a line of pickups.
    if(v.previousPosition.distanceToSquared(v.currentPosition)>100)continue;
    const t=segmentHit(v.previousPosition,v.currentPosition,pickup.position);
    if(t!==null)claims.push({racer,t});
   }
   claims.sort((a,b)=>a.t-b.t||a.racer.id.localeCompare(b.racer.id));
   const winner=claims[0]?.racer;if(!winner)continue;
   winner.inventory.push(pickup.kind);pickup.availableAt=this.time+12;this.emit('pickup',winner,PICKUP_NAMES[pickup.kind]+' collected');
  }
 }
 tick(command:Command){
  this.events=[];this.combatImpacts=[];
  if(this.countdown>0){this.countdown=Math.max(0,this.countdown-STEP);return;}
  this.time+=STEP;this.ticks++;
  this.magnetFields=this.magnetFields.filter(field=>field.expiresAt>this.time);
  this.updateLocks();
  if(command.swap&&this.player.inventory.length===2)this.player.inventory.reverse();
  for(const racer of this.racers.values()){
   if(racer.wreckUntil>0&&racer.wreckUntil<=this.time)this.recover(racer);
   const vehicle=racer.vehicle,p=this.course.project(vehicle.currentPosition,racer.s);racer.s=p.s;vehicle.offroad=p.distance>p.width/2-.15;
   if(racer.isAI&&racer.inventory.length){
    const ahead=this.course.sample(racer.s+60);
    const slot=racer.inventory.findIndex(kind=>kind==='pulse'?this.canHitPulse(racer):kind==='magnet'?this.standings()[0]?.id!==racer.id:kind==='repair'?racer.health<75:kind==='boost'?ahead.forward.dot(this.course.sample(racer.s).forward)>.98:vehicle.currentPosition.distanceTo(this.player.vehicle.currentPosition)<15);
    if(slot>=0){if(slot===1)racer.inventory.reverse();this.use(racer);}
   }
   else if(racer.id===this.player.id&&command.use)this.use(racer);
   if(racer.isAI&&racer.laneDecisionAt<=this.time){racer.aiLane=chooseAILane(racer,this.course,this.racers.values(),this.magnetFields);racer.laneDecisionAt=this.time+.45;}
   vehicle.boostActive=racer.boostUntil>this.time;
   let drive=racer.finishTime!==null||racer.wreckUntil>this.time?{...EMPTY_INPUT,brake:vehicle.forwardSpeed>1?1:0}:racer.isAI?driveAI(vehicle,this.course,racer.s,racer.aiLane):command.drive;
   const magnetic=this.fieldFor(racer);if(magnetic){
    racer.magnetUntil=this.time+STEP*2;drive={...drive,throttle:drive.throttle*MAGNET.driveScale};
    const lateralImpulse=this.course.sample(magnetic.p.s).right.multiplyScalar(MathUtils.clamp(-magnetic.p.lateral*MAGNET.pullPerTick,-MAGNET.pullPerTick*4,MAGNET.pullPerTick*4)*vehicle.mass);
    const velocity=new Vector3().copy(vehicle.body.linvel()).setY(0);if(velocity.lengthSq()>1)lateralImpulse.addScaledVector(velocity.normalize(),-MAGNET.slowPerTick*vehicle.mass);
    vehicle.body.applyImpulse(lateralImpulse,true);
   }
   racer.previousVelocity.copy(vehicle.body.linvel());vehicle.prepare(racer.hitUntil>this.time?{...drive,throttle:drive.throttle*.65}:drive);
  }
  // All forces have been submitted. Every car sees the same world time.
  this.world.step();
  for(const racer of this.racers.values())racer.vehicle.capture();
  for(const impact of this.projectiles.advance(this.world,this.time,STEP,this.projectileTargets(),this.racerHandles()))this.applyProjectile(impact);
  this.updateLocks();
  for(const racer of this.racers.values()){
   const vehicle=racer.vehicle;
   const velocity=new Vector3().copy(vehicle.body.linvel());
   const impact=Math.hypot(velocity.x-racer.previousVelocity.x,velocity.z-racer.previousVelocity.z);
   if(impact>5.5)this.damage(racer,(impact-5.5)*2.5);
   const p=this.course.project(vehicle.currentPosition,racer.s);racer.s=p.s;
   if(racer.finishTime===null){
    racer.lapTime+=STEP;
    if(racer.progress.update(p.s,this.course.length,p.distance<p.width/2-.15)){
     racer.completedLaps++;racer.lapTimes.push(racer.lapTime);racer.lapTime=0;this.emit('lap',racer,'Lap '+racer.completedLaps+' complete');
     if(racer.completedLaps>=this.targetLaps){racer.finishTime=this.time;this.projectiles.cancelOwner(racer.id);this.emit('finish',racer,'Finished · '+this.time.toFixed(2)+' s');}
    }
   }
   racer.stuckTime=racer.isAI&&vehicle.speed<1?racer.stuckTime+STEP:0;
   const b=this.course.bounds;
   if(vehicle.currentPosition.y< -3||vehicle.currentPosition.x<b.min.x-60||vehicle.currentPosition.x>b.max.x+60||vehicle.currentPosition.z<b.min.z-60||vehicle.currentPosition.z>b.max.z+60||racer.stuckTime>6)this.recover(racer);
  }
  this.collect();
 }
}
