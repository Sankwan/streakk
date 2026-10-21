// Ordered sectors plus a bounded forward finish crossing. Reset cannot grant a lap.
export class LapProgress {
 expected=1;previousS=0;initialized=false;
 reset(s=0){this.expected=1;this.previousS=s;this.initialized=false;}
 update(s:number,length:number,onRoad:boolean){
  if(!this.initialized){this.previousS=s;this.initialized=true;return false;}
  const previous=this.previousS;this.previousS=s;let delta=s-previous;
  if(delta< -length/2)delta+=length;else if(delta>length/2)delta-=length;
  if(!onRoad||delta< -.1||delta>Math.max(12,length*.025)){this.expected=1;return false;}
  const sector=Math.min(11,Math.floor(s/length*12));
  if(sector===this.expected&&this.expected<12)this.expected++;
  if(this.expected===12&&previous>length*.9&&s<length*.1&&delta>0){this.expected=1;return true;}
  return false;
 }
}
