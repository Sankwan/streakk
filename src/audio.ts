export interface RaceAudioState {speed:number;throttle:number;nearestRival:number;running:boolean;paused:boolean;finalLap:boolean;countdown:number;}
export function raceIntensity(state:RaceAudioState){if(!state.running||state.paused)return 0;const speed=Math.min(1,Math.max(0,state.speed/54)),pressure=Math.min(1,Math.max(0,(24-state.nearestRival)/18));return Math.min(1,speed*.7+pressure*.2+(state.finalLap ? .1 : 0));}

/** Original lightweight WebAudio synthesis. No downloaded or extracted samples. */
export class RaceAudio {
 readonly context:AudioContext;readonly master:GainNode;private engine:OscillatorNode;private harmonic:OscillatorNode;private engineGain:GainNode;private harmonicGain:GainNode;private windGain:GainNode;private rival:OscillatorNode;private rivalGain:GainNode;private lastCountdown=4;
 constructor(){
  const context=this.context=new AudioContext(),master=this.master=context.createGain();master.gain.value=0;master.connect(context.destination);
  const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=720;filter.Q.value=.7;filter.connect(master);
  this.engine=context.createOscillator();this.engine.type='sawtooth';this.engineGain=context.createGain();this.engineGain.gain.value=0;this.engine.connect(this.engineGain).connect(filter);this.engine.start();
  this.harmonic=context.createOscillator();this.harmonic.type='triangle';this.harmonicGain=context.createGain();this.harmonicGain.gain.value=0;this.harmonic.connect(this.harmonicGain).connect(filter);this.harmonic.start();
  const noise=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=noise.getChannelData(0);let seed=173;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/2147483648-1)*.55;}const wind=context.createBufferSource(),windFilter=context.createBiquadFilter();wind.buffer=noise;wind.loop=true;windFilter.type='bandpass';windFilter.frequency.value=1050;windFilter.Q.value=.5;this.windGain=context.createGain();this.windGain.gain.value=0;wind.connect(windFilter).connect(this.windGain).connect(master);wind.start();
  this.rival=context.createOscillator();this.rival.type='square';this.rivalGain=context.createGain();this.rivalGain.gain.value=0;const rivalFilter=context.createBiquadFilter();rivalFilter.type='lowpass';rivalFilter.frequency.value=430;this.rival.connect(this.rivalGain).connect(rivalFilter).connect(master);this.rival.start();
 }
 async enable(){await this.context.resume();}
  setAudible(value:boolean){this.master.gain.setTargetAtTime(value ? .11 : 0,this.context.currentTime,.08);}
 cue(kind:'count'|'go'|'final'|'hit'){
  if(this.context.state!=='running')return;const now=this.context.currentTime,osc=this.context.createOscillator(),gain=this.context.createGain();osc.type=kind==='final'?'sawtooth':'sine';osc.frequency.setValueAtTime(kind==='go'?660:kind==='final'?420:kind==='hit'?125:330,now);osc.frequency.exponentialRampToValueAtTime(kind==='go'?920:kind==='final'?620:kind==='hit'?75:360,now+.16);gain.gain.setValueAtTime(kind==='hit' ? .045 : .07,now);gain.gain.exponentialRampToValueAtTime(.0001,now+(kind==='final' ? .42 : .2));osc.connect(gain).connect(this.master);osc.start(now);osc.stop(now+(kind==='final' ? .44 : .22));
 }
 update(state:RaceAudioState){
  const now=this.context.currentTime,intensity=raceIntensity(state),active=state.running&&!state.paused,count=Math.ceil(state.countdown);
  if(active&&count!==this.lastCountdown){if(count>0&&count<=3)this.cue('count');else if(count===0)this.cue('go');this.lastCountdown=count;}
  const rpm=48+state.speed*4.4+state.throttle*18;this.engine.frequency.setTargetAtTime(rpm,now,.045);this.harmonic.frequency.setTargetAtTime(rpm*2.03,now,.05);this.engineGain.gain.setTargetAtTime(active ? .18+state.throttle*.055 : 0,now,.07);this.harmonicGain.gain.setTargetAtTime(active ? .03+state.throttle*.025 : 0,now,.08);this.windGain.gain.setTargetAtTime(active?Math.pow(Math.min(state.speed/54,1),1.6)*.15:0,now,.12);
  const close=active?Math.min(1,Math.max(0,(20-state.nearestRival)/15)):0;this.rival.frequency.setTargetAtTime(72+intensity*55,now,.1);this.rivalGain.gain.setTargetAtTime(close*.025,now,.12);
 }
}
