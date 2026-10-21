import * as THREE from 'three';
import type {PickupKind} from './pickups.ts';
import {PULSE} from './projectiles.ts';
import type {CombatImpact} from './simulation.ts';
import type {RaceSimulation,Racer} from './simulation.ts';
export const PICKUP_COLORS:Record<PickupKind,number>={boost:0x69c9ed,repair:0x83d99b,shield:0xe6c777,pulse:0xed8c78,magnet:0xb28cff,mine:0xff8b3d};
function iconTexture(kind:PickupKind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#142a30';ctx.strokeStyle='#'+PICKUP_COLORS[kind].toString(16).padStart(6,'0');ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(5,5,86,86,20);ctx.fill();ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.strokeStyle=ctx.fillStyle;
 if(kind==='boost'){ctx.beginPath();ctx.moveTo(54,18);ctx.lineTo(29,51);ctx.lineTo(46,51);ctx.lineTo(39,78);ctx.lineTo(69,43);ctx.lineTo(51,43);ctx.closePath();ctx.fill();}
 if(kind==='pulse'){ctx.beginPath();ctx.arc(48,48,22,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(40,32);ctx.lineTo(64,48);ctx.lineTo(40,64);ctx.closePath();ctx.fill();}
 if(kind==='magnet'){ctx.lineWidth=8;ctx.beginPath();ctx.arc(48,45,22,.05*Math.PI,.95*Math.PI,true);ctx.stroke();ctx.fillRect(23,44,11,21);ctx.fillRect(62,44,11,21);}
 if(kind==='repair'){ctx.fillRect(40,23,16,50);ctx.fillRect(23,40,50,16);}
 if(kind==='shield'){ctx.beginPath();ctx.moveTo(48,21);ctx.lineTo(69,30);ctx.lineTo(65,58);ctx.quadraticCurveTo(58,69,48,76);ctx.quadraticCurveTo(38,69,31,58);ctx.lineTo(27,30);ctx.closePath();ctx.stroke();}
 if(kind==='mine'){ctx.beginPath();ctx.arc(48,51,18,0,Math.PI*2);ctx.fill();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.fillRect(45+Math.cos(a)*27,48+Math.sin(a)*27,6,6);}ctx.fillStyle='#142a30';ctx.beginPath();ctx.arc(48,51,6,0,Math.PI*2);ctx.fill();}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function pickupVisuals(scene:THREE.Scene,sim:RaceSimulation){
 const group=new THREE.Group();group.name='active-pickups';scene.add(group);
 const kinds:PickupKind[]=['boost','repair','shield','pulse','magnet','mine'];
 const textures=Object.fromEntries(kinds.map(kind=>[kind,iconTexture(kind)])) as Record<PickupKind,THREE.CanvasTexture>;
 const materials=Object.fromEntries(kinds.map(kind=>[kind,new THREE.SpriteMaterial({map:textures[kind],depthWrite:false})])) as Record<PickupKind,THREE.SpriteMaterial>;
 const ringGeo=new THREE.TorusGeometry(.72,.045,4,16),ringMats=Object.fromEntries(kinds.map(kind=>[kind,new THREE.MeshBasicMaterial({color:PICKUP_COLORS[kind]})])) as Record<PickupKind,THREE.MeshBasicMaterial>;
 const nodes=new Map<string,THREE.Group>();
 function rebuild(){group.clear();nodes.clear();for(const pickup of sim.pickups){const node=new THREE.Group();node.position.copy(pickup.position);const sprite=new THREE.Sprite(materials[pickup.kind]);sprite.scale.set(1.45,1.45,1);sprite.position.y=.5;node.add(sprite);const ring=new THREE.Mesh(ringGeo,ringMats[pickup.kind]);ring.rotation.x=-Math.PI/2;ring.position.y=-.76;node.add(ring);group.add(node);nodes.set(pickup.id,node);}}
 rebuild();return {rebuild,update(){for(const pickup of sim.pickups){const node=nodes.get(pickup.id)!;node.visible=pickup.availableAt<=sim.time;node.children[0].position.y=.5+Math.sin(sim.time*2+pickup.s)*.12;}},dispose(){group.removeFromParent();ringGeo.dispose();Object.values(materials).forEach(m=>m.dispose());Object.values(ringMats).forEach(m=>m.dispose());Object.values(textures).forEach(t=>t.dispose());}};
}

export function mineVisuals(scene:THREE.Scene,sim:RaceSimulation){
 const mines=new THREE.InstancedMesh(new THREE.CylinderGeometry(.62,.78,.16,8),new THREE.MeshBasicMaterial({color:0xff8b3d}),8),rings=new THREE.InstancedMesh(new THREE.TorusGeometry(.75,.05,4,20),new THREE.MeshBasicMaterial({color:0xffcf80,transparent:true,opacity:.75}),8),bursts=new THREE.InstancedMesh(new THREE.TorusGeometry(1,.08,5,24),new THREE.MeshBasicMaterial({color:0xff7a52,transparent:true,opacity:.8,depthWrite:false}),8);
 for(const mesh of [mines,rings,bursts]){mesh.name='mine-pool';mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);}const object=new THREE.Object3D(),events:{position:THREE.Vector3;at:number;color:number}[]=[];
 return {record(){for(const event of sim.mineBursts){if(event.result==='expired')continue;if(events.length===8)events.shift();events.push({position:event.position.clone(),at:event.at,color:event.result==='shield'?0xe6c777:0xff7a52});}},reset(){events.length=0;mines.count=rings.count=bursts.count=0;},update(time:number){let i=0;for(const mine of sim.mines){const armed=time>=mine.armedAt,pulse=.92+Math.sin(time*(armed?12:5)+i)*.1;object.position.copy(mine.position);object.quaternion.identity();object.scale.set(1,1,1);object.updateMatrix();mines.setMatrixAt(i,object.matrix);object.position.y+=.1;object.rotation.set(Math.PI/2,0,0);object.scale.setScalar(pulse);object.updateMatrix();rings.setMatrixAt(i++,object.matrix);}mines.count=rings.count=i;mines.instanceMatrix.needsUpdate=rings.instanceMatrix.needsUpdate=true;let n=0;for(let j=events.length-1;j>=0;j--){const age=time-events[j].at;if(age>.45){events.splice(j,1);continue;}object.position.copy(events[j].position);object.position.y=.2;object.rotation.set(Math.PI/2,0,0);object.scale.setScalar(.5+age*8);object.updateMatrix();bursts.setMatrixAt(n,object.matrix);bursts.setColorAt(n++,new THREE.Color(events[j].color));}bursts.count=n;bursts.instanceMatrix.needsUpdate=true;if(bursts.instanceColor)bursts.instanceColor.needsUpdate=true;},dispose(){for(const mesh of [mines,rings,bursts]){mesh.removeFromParent();mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}}};
}
export function racerEffects(root:THREE.Group,racer:Racer){
 if(racer.isAI){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d')!;ctx.font='bold 36px Arial';ctx.textAlign='center';ctx.fillStyle='#fff1cb';ctx.shadowColor='#102326';ctx.shadowBlur=6;ctx.fillText(racer.name,128,45);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));label.scale.set(2.5,.625,1);label.position.y=1.35;root.add(label);}
 const shield=new THREE.Mesh(new THREE.SphereGeometry(2.1,12,8),new THREE.MeshBasicMaterial({color:0xe6c777,wireframe:true,transparent:true,opacity:.18,depthWrite:false}));shield.scale.set(.65,.55,1.12);root.add(shield);
 const boost=new THREE.Group(),geo=new THREE.ConeGeometry(.12,.85,5),mat=new THREE.MeshBasicMaterial({color:0x69c9ed,transparent:true,opacity:.75});
 for(const x of [-.6,.6]){const plume=new THREE.Mesh(geo,mat);plume.rotation.x=-Math.PI/2;plume.position.set(x,-.4,2.25);boost.add(plume);}root.add(boost);
 const magnetic=new THREE.Mesh(new THREE.TorusGeometry(1.25,.045,5,28),new THREE.MeshBasicMaterial({color:0xb28cff,transparent:true,opacity:.75,depthWrite:false}));magnetic.rotation.x=Math.PI/2;magnetic.position.y=.15;root.add(magnetic);
 const lockWarning=new THREE.Group(),lockMat=new THREE.MeshBasicMaterial({color:0xff5c55,transparent:true,opacity:.9,depthWrite:false});lockWarning.position.y=1.75;const lockRing=new THREE.Mesh(new THREE.TorusGeometry(.78,.045,5,28),lockMat);lockWarning.add(lockRing);for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const marker=new THREE.Mesh(new THREE.ConeGeometry(.1,.3,3),lockMat);marker.position.set(Math.cos(angle)*1.02,Math.sin(angle)*1.02,0);marker.rotation.z=angle-Math.PI/2;lockWarning.add(marker);}root.add(lockWarning);
 return {update(time:number){shield.visible=racer.shieldUntil>time;boost.visible=racer.boostUntil>time;magnetic.visible=racer.magnetUntil>time;lockWarning.visible=racer.incomingLockFrom!==null;lockWarning.scale.setScalar(.95+Math.sin(time*9)*.08);magnetic.rotation.z=time*4;boost.scale.z=1+Math.sin(time*30)*.1;}};
}

export function magnetVisuals(scene:THREE.Scene,sim:RaceSimulation){
 const group=new THREE.Group();group.name='magnet-field';scene.add(group);
 const pad=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0x7b53c6,transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide}));pad.rotation.x=-Math.PI/2;group.add(pad);
 const rings=Array.from({length:3},(_,i)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(.5,.028,4,28),new THREE.MeshBasicMaterial({color:0xd5bdff,transparent:true,opacity:.72,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.position.y=.08+i*.06;group.add(ring);return ring;});
 return {reset(){group.visible=false;},update(time:number){const field=sim.magnetFields[0];group.visible=!!field;if(!field)return;const forward=new THREE.Vector3(field.right.z,0,-field.right.x);group.position.copy(field.position);group.position.y=.035;group.rotation.y=Math.atan2(forward.x,forward.z);pad.scale.set(field.halfWidth*2,field.halfLength*2,1);for(let i=0;i<rings.length;i++){const wave=(time*4+i*.34)%1;rings[i].scale.setScalar((field.halfWidth*.7)*(1-wave*.65));(rings[i].material as THREE.MeshBasicMaterial).opacity=.25+.55*wave;}},dispose(){group.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();(object.material as THREE.Material).dispose();}});group.removeFromParent();}};
}

/** Fixed GPU pools: eight pulse cores/trails and at most 48 short impact sparks. */
export function projectileVisuals(scene:THREE.Scene,sim:RaceSimulation){
 const cores=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial({color:0xffc4ad}),PULSE.capacity);
 const trails=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,5),new THREE.MeshBasicMaterial({color:0xed8c78,transparent:true,opacity:.5,depthWrite:false}),PULSE.capacity);
 const sparks=new THREE.InstancedMesh(new THREE.OctahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:0xffffff}),48);
 for(const mesh of [cores,trails,sparks]){mesh.name='pulse-pool';mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);}
 const impacts:{position:THREE.Vector3;time:number;color:number}[]=[];const object=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
 function record(events:CombatImpact[]){for(const event of events){if(event.result==='expired')continue;if(impacts.length===12)impacts.shift();impacts.push({position:event.position.clone(),time:event.at,color:event.result==='shield'?0xe6c777:event.result==='protected'?0x91afa4:0xed8c78});}}
 return {record,reset(){impacts.length=0;cores.count=trails.count=sparks.count=0;},update(alpha=1,low=false){
  let index=0;for(const shot of sim.projectiles.active.values()){
   const position=shot.previousPosition.clone().lerp(shot.position,alpha),direction=shot.velocity.clone().normalize();
   object.position.copy(position);object.quaternion.identity();object.scale.setScalar(.18);object.updateMatrix();cores.setMatrixAt(index,object.matrix);
   object.position.copy(position).addScaledVector(direction,-1.05);object.quaternion.setFromUnitVectors(up,direction);object.scale.set(.045,2.1,.045);object.updateMatrix();trails.setMatrixAt(index++,object.matrix);
  }
  cores.count=trails.count=index;trails.visible=!low;cores.instanceMatrix.needsUpdate=trails.instanceMatrix.needsUpdate=true;
  let spark=0;for(let i=impacts.length-1;i>=0;i--){const impact=impacts[i],age=Math.max(0,sim.time-impact.time);if(age>.35){impacts.splice(i,1);continue;}
   for(let j=0;j<4;j++){const angle=j*Math.PI/2+i*.7;object.position.copy(impact.position).add(new THREE.Vector3(Math.cos(angle)*age*2,age*1.4,Math.sin(angle)*age*2));object.quaternion.identity();object.scale.setScalar(.12*(1-age/.35));object.updateMatrix();sparks.setMatrixAt(spark,object.matrix);sparks.setColorAt(spark++,new THREE.Color(impact.color));}
  }
  sparks.count=spark;sparks.instanceMatrix.needsUpdate=true;if(sparks.instanceColor)sparks.instanceColor.needsUpdate=true;
 },dispose(){for(const mesh of [cores,trails,sparks]){mesh.removeFromParent();mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}}};
}
