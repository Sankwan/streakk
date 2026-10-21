// Original Streak routes. Metres, Y-up; road travel follows the point order.
export interface ControlPoint {x:number;z:number;width:number;y?:number;}
export type TrackZoneKind='boulevard'|'coast'|'town'|'squeeze'|'traffic';
export interface TrackZone {id:string;from:number;to:number;kind:TrackZoneKind;}
export interface TrackDefinition {
 id:string;version:number;name:string;subtitle:string;description:string;
 points:ControlPoint[];lanes:number;sampleCount?:number;sampleSpacing?:number;
 tension:number;arcDivisions?:number;spawnFraction:number;theme:'lab'|'harbour'|'coast';seed:number;
 zones?:TrackZone[];
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
export const ACCRA_RING:TrackDefinition={
 id:'accra-ring',version:1,name:'Accra Ring Night Run',subtitle:'Dusk city circuit',
 description:'A fictional ring-road sprint with a broad combat straight, long sweepers and a tighter market-side sector.',
 points:[[-390,130,36],[-145,220,36],[150,225,34],[360,120,34],[420,-80,32],[300,-245,30],[70,-305,28],[-135,-285,28],[-315,-195,30],[-425,-30,32]].map(([x,z,width])=>({x,z,width})),
 lanes:4,sampleSpacing:3,tension:.48,arcDivisions:4096,spawnFraction:.01,theme:'harbour',seed:104,
};
export const CAPE_COAST:TrackDefinition={
 id:'cape-coast-rush',version:2,name:'Cape Coast Rush',subtitle:'Coast-to-town combat circuit',
 description:'A fictional high-speed coastal run that changes rhythm from a broad boulevard to beachside sweepers and a short old-town squeeze.',
 points:[
  [-470,155,36],[-210,250,36],[105,265,34],[360,205,32],[500,60,30],
  [475,-170,28],[300,-315,26],[55,-345,24],[-150,-315,20],[-315,-240,15],
  [-415,-115,14],[-500,15,28],
 ].map(([x,z,width])=>({x,z,width})),
 lanes:4,sampleSpacing:3,tension:.48,arcDivisions:4096,spawnFraction:.012,theme:'coast',seed:144,
 zones:[
  {id:'castle-boulevard',from:0,to:.27,kind:'boulevard'},
  {id:'atlantic-sweep',from:.27,to:.60,kind:'coast'},
  {id:'old-town',from:.60,to:.82,kind:'town'},
  {id:'market-squeeze',from:.82,to:.90,kind:'squeeze'},
  {id:'return-road',from:.90,to:1,kind:'traffic'},
 ],
};
export const TRACKS=[NORTH_LOOP,TEMA_HARBOUR,ACCRA_RING,CAPE_COAST];
