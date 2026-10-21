export type Quality='auto'|'low'|'medium'|'high';
export const GRAPHICS={low:{ratio:1,shadows:false},medium:{ratio:1.35,shadows:true},high:{ratio:1.7,shadows:true}};
export function percentile(values:number[],fraction:number){if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*fraction)-1)];}
/** Render scale only: it never changes the fixed physics timestep. */
export class RenderBudget {
 scale=1.35;private samples:number[]=[];private windows=0;
 reset(){this.samples=[];this.windows=0;}
 observe(ms:number){
  if(!Number.isFinite(ms)||ms<=0)return null;
  this.samples.push(ms);if(this.samples.length<180)return null;
  const p95=percentile(this.samples,.95),p50=percentile(this.samples,.5);this.samples=[];
  if(p95>23){this.scale=Math.max(.7,this.scale-.15);this.windows=0;}
  else if(p95<18.5&&++this.windows>=3){this.scale=Math.min(1.35,this.scale+.1);this.windows=0;}
  else if(p95>=18.5)this.windows=0;
  return {p95,p50,scale:this.scale};
 }
}
