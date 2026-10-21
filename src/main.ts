import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PRESETS, type Tuning, type DriverInput } from './vehicle.ts';
import { createCourse, addPhysics, buildEnvironment, disposeEnvironment } from './track.ts';
import {TRACKS} from './tracks/definitions.ts';
import {RaceSimulation} from './race/simulation.ts';
import {driveAI} from './race/ai.ts';
import {pickupVisuals,racerEffects,projectileVisuals,magnetVisuals} from './race/visuals.ts';
import { FixedClock, approach, clamp } from './math.ts';
import {createTaxi} from './taxi.ts';
import {addGhanaFrontage} from './scenery.ts';
import {RenderBudget,GRAPHICS,type Quality} from './performance.ts';
import './style.css';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const keys = new Set<string>(), touches = new Set<string>();
let running = false, paused = false, cameraMode = 0, sound = false;
let audio: AudioContext | undefined, oscillator: OscillatorNode | undefined, gain: GainNode | undefined;
let toastTimer: ReturnType<typeof setTimeout>;
function notify(text: string) { $('toast').textContent = text; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2300); }
function formatTime(t: number) { return `${Math.floor(t / 60).toString().padStart(2,'0')}:${(t%60).toFixed(3).padStart(6,'0')}`; }
async function main() {
 const bootAt=performance.now();
 await RAPIER.init();
 const scene = new THREE.Scene(); scene.background = new THREE.Color(0x20373b); scene.fog = new THREE.FogExp2(0x20373b,.0032);
 const renderer = new THREE.WebGLRenderer({canvas: $('world') as HTMLCanvasElement,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
 const camera=new THREE.PerspectiveCamera(57,innerWidth/innerHeight,.1,1600);
 scene.add(new THREE.HemisphereLight(0xc4e4e5,0x1c352d,2.4));
 const sun=new THREE.DirectionalLight(0xffe0ad,3.8);sun.position.set(-50,90,40);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-125;sun.shadow.camera.right=125;sun.shadow.camera.top=130;sun.shadow.camera.bottom=-130;sun.shadow.camera.far=240;sun.shadow.normalBias=.035;scene.add(sun);
 let initialTrack='tema-harbour';try{const saved=localStorage.getItem('streak-track-v1');if(TRACKS.some(t=>t.id===saved))initialTrack=saved!;}catch{}
 let course=createCourse(initialTrack);const environment=new THREE.Group();scene.add(environment);let pickupPreview=buildEnvironment(environment,course);
 function applyTheme(){const harbour=course.definition.theme==='harbour';const color=harbour?0x9caeb3:0x20373b;scene.background=new THREE.Color(color);scene.fog=new THREE.FogExp2(color,harbour?.0011:.0032);renderer.toneMappingExposure=harbour?1.04:1.35;}
 applyTheme();
 const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;let trackColliders=addPhysics(world,course);world.step();
 const simulation=new RaceSimulation(world,course,4);const player=simulation.player,vehicle=player.vehicle,opponents=[...simulation.racers.values()].filter(r=>r.isAI);let useQueued=false,swapQueued=false,assisted=false;
 const rivalLooks=[{color:0x40566a,accent:0xb27a3d},{color:0x6a3940,accent:0xc6a867},{color:0x31594c,accent:0xc98445}];
 const rivalCars=opponents.map((racer,i)=>{const model=createTaxi({name:racer.name,...rivalLooks[i]});scene.add(model.root);return {racer,model,effects:racerEffects(model.root,racer)};});
 const pulseFX=projectileVisuals(scene,simulation),magnetFX=magnetVisuals(scene,simulation);const activePickups=pickupVisuals(scene,simulation);
 const taxiAt=performance.now();const taxi=createTaxi(),car=taxi.root;$('taxi-build-time').textContent=((performance.now()-taxiAt)/1000).toFixed(2)+' s';scene.add(car);const playerEffects=racerEffects(car,player);
 const sceneryAt=performance.now();let frontage=addGhanaFrontage(environment,course);$('scenery-build-time').textContent=((performance.now()-sceneryAt)/1000).toFixed(2)+' s';$('scene-build-time').textContent=((performance.now()-bootAt)/1000).toFixed(2)+' s';
 const renderBudget=new RenderBudget();let quality:Quality='auto',lowDetail=false,warmup=3;
 const qualitySelect=$<HTMLSelectElement>('graphics-quality');
 try{const saved=localStorage.getItem('streak-graphics-v1');if(['auto','low','medium','high'].includes(saved||''))quality=saved as Quality;}catch{}
 function applyQuality(){const setting=quality==='auto'?{ratio:renderBudget.scale,shadows:true}:GRAPHICS[quality];lowDetail=quality==='low';const ratio=Math.min(devicePixelRatio,setting.ratio);if(renderer.getPixelRatio()!==ratio||renderer.domElement.width!==Math.floor(innerWidth*ratio)||renderer.domElement.height!==Math.floor(innerHeight*ratio)){renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight);}if(renderer.shadowMap.enabled!==setting.shadows){renderer.shadowMap.enabled=setting.shadows;scene.traverse(o=>{if(o instanceof THREE.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.needsUpdate=true);}});}taxi.detail(lowDetail);rivalCars.forEach(({model})=>model.detail(lowDetail));qualitySelect.value=quality;$('render-scale').textContent=renderer.getPixelRatio().toFixed(2)+'×';}
 qualitySelect.onchange=()=>{quality=qualitySelect.value as Quality;renderBudget.reset();warmup=3;$('frame-p95').textContent='Sampling…';$('frame-p50').textContent='—';applyQuality();try{localStorage.setItem('streak-graphics-v1',quality);}catch{}};
 applyQuality();
 $('graphics').onclick=()=>{const panel=$('graphics-panel');panel.hidden=!panel.hidden;$('graphics').setAttribute('aria-expanded',String(!panel.hidden));};
 $('close-graphics').onclick=()=>{$('graphics-panel').hidden=true;$('graphics').setAttribute('aria-expanded','false');};
 const skidPositions=new Float32Array(2400*6);const skidGeo=new THREE.BufferGeometry();skidGeo.setAttribute('position',new THREE.BufferAttribute(skidPositions,3));skidGeo.setDrawRange(0,0);const skids=new THREE.LineSegments(skidGeo,new THREE.LineBasicMaterial({color:0x10191c,transparent:true,opacity:.55}));skids.frustumCulled=false;scene.add(skids);let skidIndex=0,skidCount=0;const lastSkid:(THREE.Vector3|null)[]=[null,null];
 const clock=new FixedClock();const visualPos=new THREE.Vector3(),visualRot=new THREE.Quaternion(),cameraForward=new THREE.Vector3(0,0,-1).applyQuaternion(course.rotation);const cameraPosition=course.spawn.clone().add(new THREE.Vector3(-10,7,6)),lookTarget=course.spawn.clone();camera.position.copy(cameraPosition);
 const tuningDefs: {key:keyof Tuning;name:string;min:number;max:number;step:number;hint:string}[]=[
  {key:'grip',name:'Tire grip',min:.8,max:2,step:.01,hint:'Lower values let the car slide sooner.'},
  {key:'driftGrip',name:'Rear grip while drifting',min:.2,max:.9,step:.02,hint:'Lower values make the rear slide wider.'},
  {key:'steer',name:'Steering response',min:.3,max:.65,step:.01,hint:'Adjust the maximum steering angle.'},
  {key:'recovery',name:'Slide recovery',min:2,max:14,step:.5,hint:'How quickly rear grip returns after a drift.'},
  {key:'power',name:'Drive force',min:7500,max:14000,step:100,hint:'Changes acceleration, not a hidden speed boost.'},
 ];
 const sliders=$('sliders');for(const def of tuningDefs){const row=document.createElement('div');row.className='slider-row';row.innerHTML=`<label for="${def.key}">${def.name}<output id="${def.key}-value"></output></label><small>${def.hint}</small><input id="${def.key}" type="range" min="${def.min}" max="${def.max}" step="${def.step}">`;sliders.append(row);}
 function refreshTuning(){for(const def of tuningDefs){($<HTMLInputElement>(def.key)).value=String(vehicle.tuning[def.key]);$(def.key+'-value').textContent=def.key==='power'?`${(vehicle.tuning.power/1000).toFixed(1)} kN`:vehicle.tuning[def.key].toFixed(2);}}
 function saveTuning(){try{localStorage.setItem('streak-tuning-v1',JSON.stringify(vehicle.tuning));}catch{}}
 try{const stored=JSON.parse(localStorage.getItem('streak-tuning-v1')||'null');if(stored)for(const d of tuningDefs){if(typeof stored[d.key]==='number'&&Number.isFinite(stored[d.key]))vehicle.tuning[d.key]=clamp(stored[d.key],d.min,d.max);}}catch{}
 refreshTuning();
 for(const def of tuningDefs)$<HTMLInputElement>(def.key).addEventListener('input',e=>{vehicle.tuning[def.key]=Number((e.target as HTMLInputElement).value);refreshTuning();saveTuning();document.querySelectorAll('[data-preset]').forEach(b=>b.classList.remove('selected'));});
 function preset(name:string){vehicle.tuning={...PRESETS[name]};refreshTuning();saveTuning();document.querySelectorAll<HTMLElement>('[data-preset]').forEach(b=>b.classList.toggle('selected',b.dataset.preset===name));}
 document.querySelectorAll<HTMLElement>('[data-preset]').forEach(b=>b.addEventListener('click',()=>preset(b.dataset.preset!)));$('default-tune').onclick=()=>preset('balanced');
 function toggleTune(){const panel=$('tuning');panel.hidden=!panel.hidden;$('tune').setAttribute('aria-expanded',String(!panel.hidden));}
 $('tune').onclick=toggleTune;$('close-tune').onclick=toggleTune;
 let elapsed=0,best=Infinity,lap=1,progressS=course.length*course.definition.spawnFraction;const bestByTrack=new Map<string,number>();
 function reset(){keys.clear();touches.clear();simulation.reset(course);pulseFX.reset();magnetFX.reset();activePickups.rebuild();useQueued=swapQueued=false;elapsed=0;lap=1;progressS=player.s;cameraForward.set(0,0,-1).applyQuaternion(vehicle.currentRotation);clock.reset();lastSkid.fill(null);notify('Two laps · four-car pack · E use / Q swap');}
 function pause(next:boolean){if(!running)return;paused=next;keys.clear();touches.clear();useQueued=swapQueued=false;clock.reset();warmup=3;renderBudget.reset();$('pause-overlay').hidden=!paused;$('pause').setAttribute('aria-pressed',String(paused));if(gain&&audio)gain.gain.setTargetAtTime(paused?0:sound?.025:0,audio.currentTime,.1);}
 function startRace(demo=false){assisted=demo;running=true;document.body.classList.add('running');reset();$('start').blur();}
 $('start').onclick=()=>startRace();$('demo').onclick=()=>{startRace(true);$('demo').blur();};$('pause').onclick=()=>pause(!paused);$('resume').onclick=()=>pause(false);$('reset').onclick=reset;$('camera').onclick=()=>{cameraMode=(cameraMode+1)%3;notify(['Chase camera','Low chase camera','Overhead camera'][cameraMode]);};
 $('sound').onclick=async()=>{try{if(!audio){audio=new AudioContext();oscillator=audio.createOscillator();oscillator.type='triangle';const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;gain=audio.createGain();gain.gain.value=0;oscillator.connect(filter);filter.connect(gain);gain.connect(audio.destination);oscillator.start();}await audio.resume();sound=!sound;$('sound').textContent=sound?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-pressed',String(sound));if(gain)gain.gain.setTargetAtTime(sound&&!paused?.025:0,audio.currentTime,.1);}catch{notify('Audio is unavailable in this browser');}};
 window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!e.repeat){if(e.code==='KeyR')reset();if(e.code==='KeyP'||e.code==='Escape')pause(!paused);if(e.code==='KeyT')toggleTune();if(e.code==='KeyC')$('camera').click();if(e.code==='KeyE'&&running&&!paused)useQueued=true;if(e.code==='KeyQ'&&running&&!paused)swapQueued=true;}keys.add(e.code);});
 window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();touches.clear();if(running)pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
 document.querySelectorAll<HTMLElement>('[data-control]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touches.add(b.dataset.control!);};b.onpointerup=b.onpointercancel=()=>touches.delete(b.dataset.control!);});
 function input():DriverInput{const pressed=(...codes:string[])=>codes.some(c=>keys.has(c)||touches.has(c));let throttle=pressed('KeyW','ArrowUp','throttle')?1:0,brake=pressed('KeyS','ArrowDown','brake')?1:0,steer=(pressed('KeyA','ArrowLeft','left')?1:0)-(pressed('KeyD','ArrowRight','right')?1:0),handbrake=pressed('Space','handbrake');const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);if(pad){if(Math.abs(pad.axes[0])>.12)steer=-pad.axes[0];throttle=Math.max(throttle,pad.buttons[7]?.value||0);brake=Math.max(brake,pad.buttons[6]?.value||0);handbrake||=pad.buttons[0]?.pressed||false;}return {throttle,brake,steer,handbrake};}
 $('take-control').onclick=()=>{assisted=false;keys.clear();touches.clear();$('take-control').blur();notify('You have the wheel');};
 $('use-item').onclick=()=>{if(running&&!paused)useQueued=true;};$('swap-item').onclick=()=>{if(running&&!paused)swapQueued=true;};
 const map=$<HTMLCanvasElement>('map'),ctx=map.getContext('2d')!;
 function refreshTrackInfo(){
  const widths=course.definition.points.map(p=>p.width),min=Math.min(...widths),max=Math.max(...widths);
  $('track-name').textContent=course.definition.name;$('map-name').textContent=course.definition.name.toUpperCase();
  $('track-summary').textContent=`${(course.length/1000).toFixed(2)} km · ${min===max?min:min+'–'+max} m wide · ${course.definition.lanes} racing lanes`;
  $('track-description').textContent=course.definition.description;
  $<HTMLSelectElement>('track-select').value=course.definition.id;
  $('track-status').textContent=course.warnings.length?course.warnings.join(' · '):'Geometry checks passed · Flat road';
  $('pickup-stats').textContent=`${simulation.pickups.length} active pickups · compact pairs with outside passing space`;
  document.querySelectorAll<HTMLElement>('[data-track]').forEach(b=>b.classList.toggle('selected',b.dataset.track===course.definition.id));
 }
 function switchTrack(id:string){
  if(id===course.definition.id)return;const next=createCourse(id);
  bestByTrack.set(course.definition.id,best);keys.clear();touches.clear();clock.reset();
  for(const collider of trackColliders)world.removeCollider(collider,true);
  disposeEnvironment(environment);course=next;trackColliders=addPhysics(world,course);pickupPreview=buildEnvironment(environment,course);pickupPreview.visible=$<HTMLInputElement>('pickup-preview').checked;
  simulation.reset(course);world.step();best=bestByTrack.get(id)??Infinity;lap=1;skidPositions.fill(0);skidCount=skidIndex=0;skidGeo.attributes.position.needsUpdate=true;skidGeo.setDrawRange(0,0);reset();
  visualPos.copy(vehicle.currentPosition);visualRot.copy(vehicle.currentRotation);const back=new THREE.Vector3(0,0,1).applyQuaternion(course.rotation);camera.position.copy(course.spawn).addScaledVector(back,10).add(new THREE.Vector3(0,5,0));lookTarget.copy(course.spawn);applyTheme();frontage=addGhanaFrontage(environment,course);warmup=3;renderBudget.reset();refreshTrackInfo();
  try{localStorage.setItem('streak-track-v1',id);}catch{}notify(course.definition.name+' loaded');
 }
 for(const def of TRACKS){const option=document.createElement('option');option.value=def.id;option.textContent=def.name;$('track-select').append(option);const button=document.createElement('button');button.dataset.track=def.id;button.textContent=def.name;button.onclick=()=>switchTrack(def.id);$('track-options').append(button);}
 $<HTMLSelectElement>('track-select').onchange=e=>switchTrack((e.target as HTMLSelectElement).value);
 $('tracks').onclick=()=>{const panel=$('track-panel');panel.hidden=!panel.hidden;$('tracks').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden&&running)pause(true);};
 $('close-tracks').onclick=()=>{$('track-panel').hidden=true;$('tracks').setAttribute('aria-expanded','false');};
 $<HTMLInputElement>('pickup-preview').onchange=e=>{pickupPreview.visible=(e.target as HTMLInputElement).checked;$('preview-note').hidden=!pickupPreview.visible;};
 $('race-again').onclick=()=>{reset();pause(false);};
 refreshTrackInfo();
 function minimap(){ctx.clearRect(0,0,180,150);const b=course.bounds,size=b.getSize(new THREE.Vector3());const scale=Math.min(160/size.x,130/size.z),center=b.getCenter(new THREE.Vector3());const point=(p:{x:number;z:number})=>[90+(p.x-center.x)*scale,75+(p.z-center.z)*scale];ctx.lineWidth=4;ctx.lineJoin='round';ctx.strokeStyle='#7d9588';ctx.beginPath();course.samples.forEach((p,i)=>{const [x,y]=point(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.stroke();if(pickupPreview.visible){ctx.fillStyle='#cfbc7e';for(const site of course.pickupOpportunities){const [x,y]=point(course.sample(site.s).position);ctx.fillRect(x-1,y-1,2,2);}}ctx.fillStyle='#e6ba74';for(const rival of opponents){const [ex,ey]=point(rival.vehicle.currentPosition);ctx.beginPath();ctx.arc(ex,ey,3,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#d4f05b';const [x,y]=point(vehicle.currentPosition);ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}
 let last=performance.now(),frameCount=0,fpsTime=0;
 function animate(now:number){const rawMs=now-last,dt=Math.min(rawMs/1000,.1);last=now;warmup=Math.max(0,warmup-dt);if(running&&!paused&&warmup===0){const stats=renderBudget.observe(rawMs);if(stats){$('frame-p95').textContent=stats.p95.toFixed(1)+' ms';$('frame-p50').textContent=stats.p50.toFixed(1)+' ms';if(quality==='auto')applyQuality();}}frameCount++;fpsTime+=Math.max(0,rawMs)/1000;if(fpsTime>=.5){$('fps').textContent=String(Math.round(frameCount/fpsTime));frameCount=0;fpsTime=0;}
  let alpha=1;
  if(running&&!paused){alpha=clock.advance(dt,()=>{
    simulation.tick({drive:assisted?driveAI(vehicle,course,player.s,-3.2):input(),use:useQueued,swap:swapQueued});pulseFX.record(simulation.combatImpacts);useQueued=swapQueued=false;
    progressS=player.s;elapsed=player.lapTime;lap=Math.min(simulation.targetLaps,player.completedLaps+1);
    for(const event of simulation.events){if(event.racerId==='you'){notify(event.text);if(event.type==='lap'){best=Math.min(best,player.lapTimes.at(-1)!);}}}

   });}
  visualPos.lerpVectors(vehicle.previousPosition,vehicle.currentPosition,alpha);visualRot.slerpQuaternions(vehicle.previousRotation,vehicle.currentRotation,alpha);car.position.copy(visualPos);car.quaternion.copy(visualRot);
  taxi.update(vehicle,running&&!paused&&simulation.countdown===0?dt:0,input().brake);
  for(const {racer,model,effects} of rivalCars){model.root.position.lerpVectors(racer.vehicle.previousPosition,racer.vehicle.currentPosition,alpha);model.root.quaternion.slerpQuaternions(racer.vehicle.previousRotation,racer.vehicle.currentRotation,alpha);model.update(racer.vehicle,running&&!paused&&simulation.countdown===0?dt:0,0);effects.update(simulation.time);}
  playerEffects.update(simulation.time);activePickups.update();pulseFX.update(alpha,lowDetail);magnetFX.update(simulation.time);frontage.update(visualPos,lowDetail);
  if(running&&!paused&&vehicle.state==='DRIFT'&&vehicle.contacts>=3){for(let j=0;j<2;j++){const v=vehicle.wheels[j+2].clone();v.y-=vehicle.wheelTravel[j+2]+.31;v.applyQuaternion(visualRot).add(visualPos);v.y=.035;if(lastSkid[j]&&lastSkid[j]!.distanceTo(v)<4){const start=skidIndex*6;skidPositions.set([lastSkid[j]!.x,.035,lastSkid[j]!.z,v.x,.035,v.z],start);skidIndex=(skidIndex+1)%2400;skidCount=Math.min(skidCount+1,2400);}lastSkid[j]=v;}skidGeo.attributes.position.needsUpdate=true;skidGeo.setDrawRange(0,skidCount*2);}else lastSkid.fill(null);
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(visualRot);forward.y=0;forward.normalize();cameraForward.lerp(forward,1-Math.exp(-dt*4.2)).normalize();
  const desired=visualPos.clone();if(!running){desired.add(new THREE.Vector3(-9,6,-6));lookTarget.lerp(visualPos.clone().add(new THREE.Vector3(-2,0,0)),1-Math.exp(-dt*7));}else if(cameraMode===2){desired.y+=Math.max(31,course.sample(progressS).width*1.2/camera.aspect);desired.addScaledVector(cameraForward,-9);}else {desired.addScaledVector(cameraForward,cameraMode===1?-5.5:-6.4-vehicle.speed*.015);desired.y+=cameraMode===1?1.9:2.6;}
  // Keep the chase camera inside the barriers using a Rapier scene query.
  if(running&&cameraMode!==2){const origin=visualPos.clone().add(new THREE.Vector3(0,1,0)),delta=desired.clone().sub(origin),len=delta.length();const hit=world.castRay(new RAPIER.Ray(origin,delta.clone().normalize()),len,true,undefined,undefined,vehicle.collider,vehicle.body);if(hit)desired.copy(origin).addScaledVector(delta.normalize(),Math.max(1,hit.timeOfImpact-.4));}
  camera.position.lerp(desired,1-Math.exp(-dt*4.2));if(running){const desiredLook=visualPos.clone().addScaledVector(cameraForward,5.5).add(new THREE.Vector3(0,.75,0));lookTarget.lerp(desiredLook,1-Math.exp(-dt*7));}camera.lookAt(lookTarget);camera.fov=approach(camera.fov,57+Math.min(vehicle.speed*.12,7),3,dt);camera.updateProjectionMatrix();
  $('mode-note').hidden=!assisted;$('take-control').hidden=!assisted;const order=simulation.standings(),rival=order.find(r=>r.id!=='you')!;$('race-position').textContent=(order.findIndex(r=>r.id==='you')+1)+'/'+order.length;$('opponent-status').textContent=rival.name+' · LAP '+Math.min(2,rival.completedLaps+1)+(rival.finishTime!==null?' · FINISHED':'');
  $('condition').textContent=Math.round(player.health)+'%';$('item-one').textContent=player.inventory[0]?.toUpperCase()??'EMPTY';$('item-two').textContent=player.inventory[1]?.toUpperCase()??'EMPTY';
  document.body.classList.toggle('pulse-hit',player.hitUntil>simulation.time);
  $('active-effect').textContent=player.incomingLockFrom?'TARGETED BY '+(simulation.racers.get(player.incomingLockFrom)?.name??'RIVAL'):player.hitUntil>simulation.time?'PULSE HIT · RECOVERING':player.magnetUntil>simulation.time?'MAGNETIC PULL':player.wreckUntil>simulation.time?'RECOVERING':player.boostUntil>simulation.time?'BOOST '+(player.boostUntil-simulation.time).toFixed(1)+'s':player.shieldUntil>simulation.time?'SHIELD '+(player.shieldUntil-simulation.time).toFixed(1)+'s':player.inventory[0]==='pulse'?(simulation.lockedTarget(player)?'TARGET LOCKED · E FIRE':'SEEKING TARGET'):player.inventory[0]==='magnet'?'MAGNET · E PROJECT':'E USE · Q SWAP';
  $<HTMLButtonElement>('use-item').disabled=paused||!player.inventory.length||simulation.countdown>0||player.finishTime!==null;
  $<HTMLButtonElement>('swap-item').disabled=paused||player.inventory.length<2||simulation.countdown>0||player.finishTime!==null;
  $('countdown').hidden=!running||simulation.countdown===0;$('countdown').textContent=String(Math.ceil(simulation.countdown));
  $('race-result').hidden=player.finishTime===null;if(player.finishTime!==null)$('result-text').textContent='POSITION '+(order.findIndex(r=>r.id==='you')+1)+'/'+order.length+' · '+formatTime(player.finishTime);
  $('speed').textContent=Math.round(vehicle.speed*3.6).toString().padStart(3,'0');$('gear').textContent=vehicle.forwardSpeed< -1?'R':vehicle.speed<1?'N':String(Math.min(6,1+Math.floor(vehicle.speed/9)));$('state').textContent=paused?'PAUSED':running?vehicle.state:'READY';$('state').style.color=vehicle.state==='DRIFT'?'#ffb96b':'#d4f05b';$('surface').textContent=vehicle.offroad?'RUNOFF':'ASPHALT';$('slip').textContent=Math.abs(vehicle.slip*180/Math.PI).toFixed(0)+'°';$('contact').textContent=`${vehicle.contacts}/4`;$('speed-fill').style.width=Math.min(vehicle.speed/54*100,100)+'%';$('time').textContent=formatTime(elapsed);$('best').textContent=Number.isFinite(best)?formatTime(best):'—';$('lap').textContent=lap.toString().padStart(2,'0')+'/02';minimap();
  if(audio&&oscillator&&gain){oscillator.frequency.setTargetAtTime(38+vehicle.speed*3.5+(input().throttle*12),audio.currentTime,.08);gain.gain.setTargetAtTime(sound&&!paused&&running?.02:0,audio.currentTime,.12);}
  sun.position.copy(visualPos).add(new THREE.Vector3(-50,90,40));sun.target.position.copy(visualPos);sun.target.updateMatrixWorld();
  renderer.render(scene,camera);if(fpsTime<dt*1.1){$('draw-calls').textContent=String(renderer.info.render.calls);$('triangles').textContent=Math.round(renderer.info.render.triangles/1000)+'k';$('frontage-count').textContent=String(frontage.count);}$('projectile-count').textContent=simulation.projectiles.active.size+'/8';$('pulse-stats').textContent=player.shots+' / '+player.hits;
  const aim=$('aim-reticle'),lockId=player.inventory[0]==='pulse'?simulation.lockedTarget(player):null,locked=lockId?simulation.racers.get(lockId):null,aimPoint=locked?locked.vehicle.currentPosition.clone().add(new THREE.Vector3(0,1.15,0)).project(camera):new THREE.Vector3(2,2,2);aim.hidden=!running||paused||simulation.countdown>0||player.finishTime!==null||!locked||Math.abs(aimPoint.x)>1||Math.abs(aimPoint.y)>1||aimPoint.z>1||aimPoint.z< -1;if(!aim.hidden){aim.dataset.target=locked!.name;aim.setAttribute('aria-label','Target locked: '+locked!.name);aim.style.left=((aimPoint.x+1)*innerWidth/2)+'px';aim.style.top=((1-aimPoint.y)*innerHeight/2)+'px';}
  $('graphics-state').textContent=quality==='auto'?'AUTO':quality.toUpperCase();requestAnimationFrame(animate);
 }
 window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyQuality();warmup=3;renderBudget.reset();});
 requestAnimationFrame(animate);
}
main().catch(e=>{$('error').hidden=false;$('error').textContent='Streak could not start.\nPlease use a browser with WebGL2 enabled.\n\n'+String(e);console.error(e);});
