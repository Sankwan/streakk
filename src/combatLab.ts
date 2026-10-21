import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {RaceSimulation} from './race/simulation.ts';
import {createCourse} from './track.ts';
import {createTaxi} from './taxi.ts';
import {projectileVisuals,racerEffects} from './race/visuals.ts';
import {FixedClock} from './math.ts';
import {EMPTY_INPUT,PRESETS} from './vehicle.ts';
import {percentile} from './performance.ts';
const $=(id:string)=>document.getElementById(id)!;
async function main(){
 await RAPIER.init();
 const sceneHeight=()=>innerWidth<650?Math.max(180,innerHeight-350):innerHeight;
 const renderer=new THREE.WebGLRenderer({canvas:$('lab-world') as HTMLCanvasElement,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.setSize(innerWidth,sceneHeight());renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x8b9da0);scene.fog=new THREE.Fog(0x8b9da0,70,140);
 scene.add(new THREE.HemisphereLight(0xe3e8df,0x55594c,2.6));const sun=new THREE.DirectionalLight(0xffe8c6,3);sun.position.set(30,50,20);scene.add(sun);
 const camera=new THREE.PerspectiveCamera(52,innerWidth/sceneHeight(),.1,250);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(110,160),new THREE.MeshStandardMaterial({color:0x555e5c,roughness:.9}));ground.rotation.x=-Math.PI/2;ground.position.z=-25;scene.add(ground);
 const grid=new THREE.GridHelper(100,20,0x9eac9b,0x68796f);grid.position.set(0,.01,-20);scene.add(grid);
 const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;world.createCollider(RAPIER.ColliderDesc.cuboid(55,.2,80).setTranslation(0,-.2,-25));world.step();
 const sim=new RaceSimulation(world,createCourse('tema-harbour')),you=sim.player,kojo=sim.racers.get('kojo')!;
 const taxi=createTaxi(),enemy=createTaxi({name:'KOJO',color:0x40566a,accent:0xb27a3d});scene.add(taxi.root,enemy.root);
 const effects=[racerEffects(taxi.root,you),racerEffects(enemy.root,kojo)],fx=projectileVisuals(scene,sim),clock=new FixedClock();
 let selected='hit',fire=false,started=false,peak=0,wallCollider:RAPIER.Collider|undefined;
 const wallMesh=new THREE.Mesh(new THREE.BoxGeometry(6,2,.2),new THREE.MeshStandardMaterial({color:0x957a61,roughness:.9}));wallMesh.position.set(0,1,-9);wallMesh.visible=false;scene.add(wallMesh);
 function reset(kind:string){
  selected=kind;started=true;clock.reset();sim.reset();sim.countdown=0;fx.reset();peak=0;caseFrames=[];$('lab-p95').textContent='Sampling';
  if(wallCollider){world.removeCollider(wallCollider,true);wallCollider=undefined;}
  for(const r of [you,kojo]){r.isAI=false;r.vehicle.tuning={...PRESETS.balanced};r.vehicle.setSpawn(new THREE.Vector3(r===kojo&&kind==='cross'?-6:0,.85,r===you?0:kind==='cross'?-14:-18),new THREE.Quaternion());}
  if(kind==='shield')kojo.shieldUntil=5;
  wallMesh.visible=kind==='wall';if(kind==='wall')wallCollider=world.createCollider(RAPIER.ColliderDesc.cuboid(3,1,.1).setTranslation(0,1,-9));
  world.step();for(const r of [you,kojo]){r.vehicle.capture();r.vehicle.previousPosition.copy(r.vehicle.currentPosition);}
  if(kind==='cross'){kojo.vehicle.tuning.grip=0;kojo.vehicle.body.setLinvel({x:35,y:0,z:0},true);}
  you.inventory=['pulse'];fire=kind!=='load';if(kind==='load'){for(let i=0;i<8;i++)sim.projectiles.spawn('you',new THREE.Vector3((i-3.5)*1.2,1,2),new THREE.Vector3(0,0,-78),0);peak=8;}$('expected').textContent=kind==='load'?'MAX 8 PULSES':kind==='shield'?'SHIELD · 100%':kind==='wall'?'BLOCKED · 100%':'HIT · 82%';$('result').textContent=kind==='load'?'GRAPHICS LOAD · NOT AN INVENTORY TEST':'Pulse launched…';
 }
 document.querySelectorAll<HTMLButtonElement>('[data-case]').forEach(button=>button.onclick=()=>reset(button.dataset.case!));$('replay').onclick=()=>reset(selected);
 let previous=performance.now(),frames:number[]=[],caseFrames:number[]=[];
 function animate(now:number){
  const ms=now-previous;previous=now;if(ms>0)frames.push(ms);if(!started&&frames.length>=120){$('lab-p95').textContent=percentile(frames,.95).toFixed(1)+' ms';frames=[];}if(started&&sim.time<2.3&&ms>0){caseFrames.push(ms);if(caseFrames.length>=30)$('lab-p95').textContent=percentile(caseFrames,.95).toFixed(1)+' / '+Math.max(...caseFrames).toFixed(1)+' ms';}if(frames.length>120)frames=[];
  const alpha=started&&sim.time<2.3?clock.advance(ms/1000,()=>{sim.tick({drive:EMPTY_INPUT,use:fire});fire=false;fx.record(sim.combatImpacts);peak=Math.max(peak,sim.projectiles.active.size);for(const hit of sim.combatImpacts)if(hit.result!=='expired'&&selected!=='load')$('result').textContent=hit.result==='hit'?'HIT CONFIRMED':hit.result==='shield'?'SHIELD ABSORBED':hit.result==='wall'?'BARRIER STOPPED PULSE':'BRIEF HIT PROTECTION';}):1;
  for(const [r,model] of [[you,taxi],[kojo,enemy]] as const){model.root.position.lerpVectors(r.vehicle.previousPosition,r.vehicle.currentPosition,alpha);model.root.quaternion.slerpQuaternions(r.vehicle.previousRotation,r.vehicle.currentRotation,alpha);model.update(r.vehicle,sim.time<2.3?Math.min(ms/1000,.1):0,0);}
  effects.forEach(effect=>effect.update(sim.time));fx.update(alpha);$('health').textContent=kojo.health+'%';$('stats').textContent=you.shots+' / '+you.hits;$('blocks').textContent=String(kojo.shieldBlocks);$('active').textContent=sim.projectiles.active.size+'/8 · peak '+peak;
  camera.position.set(innerWidth<650?12:17,innerWidth<650?8:11,innerWidth<650?8:15);camera.lookAt(2,0,-8);renderer.render(scene,camera);requestAnimationFrame(animate);
 }
 window.addEventListener('resize',()=>{renderer.setSize(innerWidth,sceneHeight());camera.aspect=innerWidth/sceneHeight();camera.updateProjectionMatrix();clock.reset();});
 reset('hit');fire=false;started=false;$('expected').textContent='—';$('result').textContent='Choose a scenario.';
 requestAnimationFrame(animate);
}
main().catch(error=>{$('error').hidden=false;$('error').textContent=String(error);console.error(error);});
