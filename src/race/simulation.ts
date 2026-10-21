import RAPIER from '@dimforge/rapier3d-compat';
import {Vector3,Quaternion,MathUtils} from 'three';
import {Vehicle,EMPTY_INPUT,type DriverInput} from '../vehicle.ts';
import {STEP} from '../math.ts';
import type {Course} from '../tracks/compiler.ts';
import {LapProgress} from '../tracks/lap.ts';
import {driveAI} from './ai.ts';
import {makePickups,segmentHit,PICKUP_NAMES,type PickupKind,type Pickup} from './pickups.ts';
export interface Racer {
 id:string;name:string;isAI:boolean;vehicle:Vehicle;progress:LapProgress;s:number;
 health:number;inventory:PickupKind[];boostUntil:number;shieldUntil:number;damageReadyAt:number;
 completedLaps:number;lapTime:number;lapTimes:number[];finishTime:number|null;
 previousVelocity:Vector3;stuckTime:number;wreckUntil:number;
}
export interface Command {drive:DriverInput;use?:boolean;swap?:boolean;}
export interface RaceEvent {type:'pickup'|'use'|'damage'|'lap'|'finish'|'recover'|'notice';racerId:string;text:string;}
export class RaceSimulation {
 readonly racers=new Map<string,Racer>();
 course:Course;pickups:Pickup[]=[];time=0;countdown=3;ticks=0;events:RaceEvent[]=[];
 readonly targetLaps=2;
 readonly world:RAPIER.World;
 constructor(world:RAPIER.World,course:Course){
  this.world=world;
  this.course=course;this.world.timestep=STEP;
  this.addRacer('you','YOU',false);this.addRacer('kojo','KOJO',true);this.reset(course);
 }
 private addRacer(id:string,name:string,isAI:boolean){
  if(this.racers.has(id))throw Error('Duplicate racer ID');
  const vehicle=new Vehicle(this.world);
  this.racers.set(id,{id,name,isAI,vehicle,progress:new LapProgress(),s:0,health:100,inventory:[],boostUntil:0,shieldUntil:0,damageReadyAt:0,completedLaps:0,lapTime:0,lapTimes:[],finishTime:null,previousVelocity:new Vector3(),stuckTime:0,wreckUntil:0});
 }
 get player(){return this.racers.get('you')!;}
 reset(course=this.course){
  this.course=course;this.time=0;this.countdown=3;this.ticks=0;this.events=[];this.pickups=makePickups(course);
  for(const racer of this.racers.values()){
   const s=course.length*course.definition.spawnFraction+(racer.isAI?18:0),p=course.sample(s);
   const lane=racer.isAI?3.2:-3.2;
   const pos=p.position.addScaledVector(p.right,lane).setY(.85);
   const q=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.atan2(-p.forward.x,-p.forward.z));
   racer.vehicle.setSpawn(pos,q);racer.s=p.s;racer.progress.reset(p.s);
   racer.health=100;racer.inventory=[];racer.boostUntil=racer.shieldUntil=racer.damageReadyAt=0;
   racer.completedLaps=0;racer.lapTime=0;racer.lapTimes=[];racer.finishTime=null;racer.stuckTime=0;racer.wreckUntil=0;
  }
 }
 use(racer:Racer){
  if(this.countdown>0||racer.finishTime!==null||racer.wreckUntil>this.time)return false;
  const kind=racer.inventory[0];if(!kind)return false;
  if(kind==='repair'){if(racer.health>=100){this.emit('notice',racer,'Condition is already full · Q to swap');return false;}racer.health=Math.min(100,racer.health+35);}
  if(kind==='boost'){if(racer.boostUntil>this.time){this.emit('notice',racer,'Boost is already active');return false;}racer.boostUntil=this.time+3;}
  if(kind==='shield'){if(racer.shieldUntil>this.time){this.emit('notice',racer,'Shield is already active');return false;}racer.shieldUntil=this.time+5;}
  racer.inventory.shift();this.emit('use',racer,PICKUP_NAMES[kind]+' activated');return true;
 }
 damage(racer:Racer,amount:number){
  if(!Number.isFinite(amount)||amount<=0||this.countdown>0||racer.finishTime!==null||racer.damageReadyAt>this.time||racer.wreckUntil>this.time)return false;
  racer.damageReadyAt=this.time+.8;
  if(racer.shieldUntil>this.time){this.emit('damage',racer,'Shield absorbed the impact');return false;}
  racer.health=Math.max(0,racer.health-MathUtils.clamp(amount,0,35));this.emit('damage',racer,'Impact · '+Math.round(racer.health)+'% condition');
  if(racer.health===0){racer.wreckUntil=this.time+2;racer.inventory=[];racer.boostUntil=racer.shieldUntil=0;}
  return true;
 }
 private emit(type:RaceEvent['type'],racer:Racer,text:string){this.events.push({type,racerId:racer.id,text});}
 private recover(racer:Racer){
  const p=this.course.sample(racer.s-5),pos=p.position.addScaledVector(p.right,racer.isAI?3.2:-3.2).setY(.85);
  const rotation=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.atan2(-p.forward.x,-p.forward.z));
  racer.vehicle.setSpawn(pos,rotation);racer.s=p.s;racer.progress.reset(p.s);racer.health=100;
  racer.stuckTime=0;racer.wreckUntil=0;racer.boostUntil=racer.shieldUntil=0;racer.inventory=[];racer.damageReadyAt=this.time+1;
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
  this.events=[];
  if(this.countdown>0){this.countdown=Math.max(0,this.countdown-STEP);return;}
  this.time+=STEP;this.ticks++;
  if(command.swap&&this.player.inventory.length===2)this.player.inventory.reverse();
  for(const racer of this.racers.values()){
   if(racer.wreckUntil>0&&racer.wreckUntil<=this.time)this.recover(racer);
   const vehicle=racer.vehicle,p=this.course.project(vehicle.currentPosition,racer.s);racer.s=p.s;vehicle.offroad=p.distance>p.width/2-.15;
   if(racer.isAI&&racer.inventory.length){
    const ahead=this.course.sample(racer.s+60);
    const slot=racer.inventory.findIndex(kind=>kind==='repair'?racer.health<75:kind==='boost'?ahead.forward.dot(this.course.sample(racer.s).forward)>.98:vehicle.currentPosition.distanceTo(this.player.vehicle.currentPosition)<15);
    if(slot>=0){if(slot===1)racer.inventory.reverse();this.use(racer);}
   }
   else if(!racer.isAI&&command.use)this.use(racer);
   vehicle.boostActive=racer.boostUntil>this.time;
   const drive=racer.finishTime!==null||racer.wreckUntil>this.time?{...EMPTY_INPUT,brake:vehicle.forwardSpeed>1?1:0}:racer.isAI?driveAI(vehicle,this.course,racer.s):command.drive;
   racer.previousVelocity.copy(vehicle.body.linvel());vehicle.prepare(drive);
  }
  // All forces have been submitted. Every car sees the same world time.
  this.world.step();
  for(const racer of this.racers.values()){
   const vehicle=racer.vehicle;vehicle.capture();
   const velocity=new Vector3().copy(vehicle.body.linvel());
   const impact=Math.hypot(velocity.x-racer.previousVelocity.x,velocity.z-racer.previousVelocity.z);
   if(impact>5.5)this.damage(racer,(impact-5.5)*2.5);
   const p=this.course.project(vehicle.currentPosition,racer.s);racer.s=p.s;
   if(racer.finishTime===null){
    racer.lapTime+=STEP;
    if(racer.progress.update(p.s,this.course.length,p.distance<p.width/2-.15)){
     racer.completedLaps++;racer.lapTimes.push(racer.lapTime);racer.lapTime=0;this.emit('lap',racer,'Lap '+racer.completedLaps+' complete');
     if(racer.completedLaps>=this.targetLaps){racer.finishTime=this.time;this.emit('finish',racer,'Finished · '+this.time.toFixed(2)+' s');}
    }
   }
   racer.stuckTime=racer.isAI&&vehicle.speed<1?racer.stuckTime+STEP:0;
   const b=this.course.bounds;
   if(vehicle.currentPosition.y< -3||vehicle.currentPosition.x<b.min.x-60||vehicle.currentPosition.x>b.max.x+60||vehicle.currentPosition.z<b.min.z-60||vehicle.currentPosition.z>b.max.z+60||racer.stuckTime>6)this.recover(racer);
  }
  this.collect();
 }
}
