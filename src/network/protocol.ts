import type {DriverInput} from '../vehicle.ts';
import type {Command,RaceEvent,RaceSimulation} from '../race/simulation.ts';
import type {PickupKind} from '../race/pickups.ts';

export const PROTOCOL_VERSION=2 as const;
export type Vec3=[number,number,number];
export type Quat=[number,number,number,number];

export interface PlayerCommand {
 type:'command';protocol:typeof PROTOCOL_VERSION;racerId:string;sequence:number;clientTick:number;
 drive:DriverInput;use:boolean;swap:boolean;
}

export interface RacerSnapshot {
 id:string;name:string;isAI:boolean;position:Vec3;rotation:Quat;linearVelocity:Vec3;angularVelocity:Vec3;
 s:number;health:number;inventory:PickupKind[];completedLaps:number;lapTime:number;lapTimes:number[];finishTime:number|null;
 speed:number;forwardSpeed:number;slip:number;handlingState:string;offroad:boolean;draft:number;
 boostUntil:number;shieldUntil:number;wreckUntil:number;hitUntil:number;magnetUntil:number;
 lockTargetId:string|null;incomingLockFrom:string|null;shots:number;hits:number;shieldBlocks:number;lastHitBy:string|null;
}

export interface RaceSnapshot {
 type:'snapshot';protocol:typeof PROTOCOL_VERSION;sequence:number;raceEpoch:number;serverTick:number;serverTime:number;countdown:number;
 course:{id:string;version:number;length:number};targetLaps:number;racers:RacerSnapshot[];
 pickups:{id:string;kind:PickupKind;availableAt:number}[];
 projectiles:{id:string;ownerId:string;targetId:string|null;position:Vec3;velocity:Vec3;expiresAt:number}[];
 mines:{id:string;ownerId:string;position:Vec3;armedAt:number;expiresAt:number}[];
 magnetFields:{id:string;ownerId:string;position:Vec3;right:Vec3;halfWidth:number;halfLength:number;expiresAt:number}[];
 traffic:{id:string;position:Vec3;rotation:Quat;s:number;speed:number}[];
 events:RaceEvent[];
}

const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const bounded=(value:unknown,min:number,max:number)=>finite(value)?Math.max(min,Math.min(max,value)):0;
const integer=(value:unknown)=>finite(value)&&Number.isSafeInteger(value)&&value>=0?value:null;
const id=(value:unknown)=>typeof value==='string'&&value.length>0&&value.length<=40&&/^[a-zA-Z0-9_-]+$/.test(value)?value:null;

/** Validate untrusted network input and return a fresh, bounded command. */
export function decodePlayerCommand(value:unknown,expectedRacerId?:string):PlayerCommand|null{
 if(!value||typeof value!=='object')return null;
 const raw=value as Record<string,unknown>,drive=raw.drive as Record<string,unknown>|null;
 const racerId=id(raw.racerId),sequence=integer(raw.sequence),clientTick=integer(raw.clientTick);
 if(raw.type!=='command'||raw.protocol!==PROTOCOL_VERSION||!racerId||expectedRacerId&&racerId!==expectedRacerId||sequence===null||clientTick===null||!drive||typeof drive!=='object')return null;
 if(!finite(drive.throttle)||!finite(drive.brake)||!finite(drive.steer)||typeof drive.handbrake!=='boolean'||typeof raw.use!=='boolean'||typeof raw.swap!=='boolean')return null;
 return {type:'command',protocol:PROTOCOL_VERSION,racerId,sequence,clientTick,drive:{throttle:bounded(drive.throttle,0,1),brake:bounded(drive.brake,0,1),steer:bounded(drive.steer,-1,1),handbrake:drive.handbrake},use:raw.use,swap:raw.swap};
}

export function toSimulationCommand(command:PlayerCommand):Command{return {drive:{...command.drive},use:command.use,swap:command.swap};}
const vec3=(value:{x:number;y:number;z:number}):Vec3=>[value.x,value.y,value.z];
const quat=(value:{x:number;y:number;z:number;w:number}):Quat=>[value.x,value.y,value.z,value.w];

/** Capture canonical race state without leaking Rapier, Three.js or renderer objects. */
export function createRaceSnapshot(sim:RaceSimulation,sequence=sim.ticks):RaceSnapshot{
 const racers=[...sim.racers.values()].map(racer=>{
  const body=racer.vehicle.body;
  return {id:racer.id,name:racer.name,isAI:racer.isAI,position:vec3(body.translation()),rotation:quat(body.rotation()),linearVelocity:vec3(body.linvel()),angularVelocity:vec3(body.angvel()),s:racer.s,health:racer.health,inventory:[...racer.inventory],completedLaps:racer.completedLaps,lapTime:racer.lapTime,lapTimes:[...racer.lapTimes],finishTime:racer.finishTime,speed:racer.vehicle.speed,forwardSpeed:racer.vehicle.forwardSpeed,slip:racer.vehicle.slip,handlingState:racer.vehicle.state,offroad:racer.vehicle.offroad,draft:racer.vehicle.draft,boostUntil:racer.boostUntil,shieldUntil:racer.shieldUntil,wreckUntil:racer.wreckUntil,hitUntil:racer.hitUntil,magnetUntil:racer.magnetUntil,lockTargetId:racer.lockTargetId,incomingLockFrom:racer.incomingLockFrom,shots:racer.shots,hits:racer.hits,shieldBlocks:racer.shieldBlocks,lastHitBy:racer.lastHitBy} satisfies RacerSnapshot;
 });
 return {type:'snapshot',protocol:PROTOCOL_VERSION,sequence,raceEpoch:sim.raceEpoch,serverTick:sim.ticks,serverTime:sim.time,countdown:sim.countdown,course:{id:sim.course.definition.id,version:sim.course.definition.version,length:sim.course.length},targetLaps:sim.targetLaps,racers,pickups:sim.pickups.map(p=>({id:p.id,kind:p.kind,availableAt:p.availableAt})),projectiles:[...sim.projectiles.active.values()].map(p=>({id:p.id,ownerId:p.ownerId,targetId:p.targetId??null,position:vec3(p.position),velocity:vec3(p.velocity),expiresAt:p.expiresAt})),mines:sim.mines.map(m=>({id:m.id,ownerId:m.ownerId,position:vec3(m.position),armedAt:m.armedAt,expiresAt:m.expiresAt})),magnetFields:sim.magnetFields.map(f=>({id:f.id,ownerId:f.ownerId,position:vec3(f.position),right:vec3(f.right),halfWidth:f.halfWidth,halfLength:f.halfLength,expiresAt:f.expiresAt})),traffic:sim.traffic.map(bus=>({id:bus.id,position:vec3(bus.position),rotation:quat(bus.rotation),s:bus.s,speed:bus.speed})),events:sim.events.map(event=>({...event}))};
}

export function encodeWireMessage(message:PlayerCommand|RaceSnapshot){return JSON.stringify(message);}
export function parsePlayerCommand(text:string,expectedRacerId?:string){try{return decodePlayerCommand(JSON.parse(text),expectedRacerId);}catch{return null;}}
