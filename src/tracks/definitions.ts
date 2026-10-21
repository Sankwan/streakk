// Original Streak routes. Metres, Y-up; road travel follows the point order.
export interface ControlPoint {x:number;z:number;width:number;y?:number;}
export interface TrackDefinition {
 id:string;version:number;name:string;subtitle:string;description:string;
 points:ControlPoint[];lanes:number;sampleCount?:number;sampleSpacing?:number;
 tension:number;arcDivisions?:number;spawnFraction:number;theme:'lab'|'harbour';seed:number;
}
export const NORTH_LOOP:TrackDefinition={
 id:'north-loop',version:1,name:'North Loop',subtitle:'Handling circuit',description:'The original compact course, preserved for handling comparisons.',
 points:[[0,90],[55,72],[76,24],[43,-12],[52,-69],[0,-100],[-64,-74],[-76,-12],[-53,57]].map(([x,z])=>({x,z,width:19})),
 lanes:2,sampleCount:360,tension:.35,spawnFraction:.008,theme:'lab',seed:13,
};
export const TEMA_HARBOUR:TrackDefinition={
 id:'tema-harbour',version:1,name:'Tema Harbour Run',subtitle:'Harbour greybox',
 description:'A fictional Ghana-inspired port circuit: wide overtaking straights, a tighter warehouse sector and a long dockside sweep.',
 points:[[-340,220,32],[-80,220,34],[240,220,34],[370,145,30],[380,-70,28],[230,-165,26],[60,-165,24],[-30,-270,24],[-260,-265,26],[-380,-145,28],[-365,30,32]].map(([x,z,width])=>({x:x*1.2,z:z*1.2,width})),
 lanes:4,sampleSpacing:3,tension:.5,arcDivisions:4096,spawnFraction:.008,theme:'harbour',seed:71,
};
export const TRACKS=[NORTH_LOOP,TEMA_HARBOUR];
