import type {Course} from '../tracks/compiler.ts';
import type {Racer} from './simulation.ts';

const smoothstep=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const gap=(from:number,to:number,length:number)=>{let d=to-from;if(d>length/2)d-=length;if(d< -length/2)d+=length;return d;};

export function draftStrength(speed:number,lateral:number,s:number,others:{s:number;lateral:number}[],length:number){
 if(speed<25)return 0;let draft=0;
 for(const other of others){const ahead=gap(s,other.s,length);if(ahead<4||ahead>45)continue;const across=Math.abs(other.lateral-lateral);if(across>2.4)continue;draft=Math.max(draft,(1-smoothstep(12,45,ahead))*(1-smoothstep(1,2.4,across)));}
 return draft*smoothstep(25,42,speed);
}

/** Lower aerodynamic drag for cars tucked into another racer's wake. */
export function applySlipstream(racers:Iterable<Racer>,course:Course){
 const list=[...racers],state=list.map(r=>({r,s:r.s,lateral:course.project(r.vehicle.currentPosition,r.s).lateral}));
 for(const car of state){const draft=draftStrength(car.r.vehicle.speed,car.lateral,car.s,state.filter(other=>other.r!==car.r),course.length);car.r.vehicle.draft=draft;car.r.vehicle.dragScale=1-.4*draft;}
}
