import * as THREE from 'three';
import type {PickupKind} from './pickups.ts';
import type {RaceSimulation,Racer} from './simulation.ts';
export const PICKUP_COLORS:Record<PickupKind,number>={boost:0x69c9ed,repair:0x83d99b,shield:0xe6c777};
function iconTexture(kind:PickupKind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#142a30';ctx.strokeStyle='#'+PICKUP_COLORS[kind].toString(16).padStart(6,'0');ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(5,5,86,86,20);ctx.fill();ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.strokeStyle=ctx.fillStyle;
 if(kind==='boost'){ctx.beginPath();ctx.moveTo(54,18);ctx.lineTo(29,51);ctx.lineTo(46,51);ctx.lineTo(39,78);ctx.lineTo(69,43);ctx.lineTo(51,43);ctx.closePath();ctx.fill();}
 if(kind==='repair'){ctx.fillRect(40,23,16,50);ctx.fillRect(23,40,50,16);}
 if(kind==='shield'){ctx.beginPath();ctx.moveTo(48,21);ctx.lineTo(69,30);ctx.lineTo(65,58);ctx.quadraticCurveTo(58,69,48,76);ctx.quadraticCurveTo(38,69,31,58);ctx.lineTo(27,30);ctx.closePath();ctx.stroke();}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function pickupVisuals(scene:THREE.Scene,sim:RaceSimulation){
 const group=new THREE.Group();group.name='active-pickups';scene.add(group);
 const textures=Object.fromEntries((['boost','repair','shield'] as PickupKind[]).map(kind=>[kind,iconTexture(kind)])) as Record<PickupKind,THREE.CanvasTexture>;
 const materials=Object.fromEntries((['boost','repair','shield'] as PickupKind[]).map(kind=>[kind,new THREE.SpriteMaterial({map:textures[kind],depthWrite:false})])) as Record<PickupKind,THREE.SpriteMaterial>;
 const ringGeo=new THREE.TorusGeometry(.72,.045,4,16),ringMats=Object.fromEntries((['boost','repair','shield'] as PickupKind[]).map(kind=>[kind,new THREE.MeshBasicMaterial({color:PICKUP_COLORS[kind]})])) as Record<PickupKind,THREE.MeshBasicMaterial>;
 const nodes=new Map<string,THREE.Group>();
 function rebuild(){group.clear();nodes.clear();for(const pickup of sim.pickups){const node=new THREE.Group();node.position.copy(pickup.position);const sprite=new THREE.Sprite(materials[pickup.kind]);sprite.scale.set(1.45,1.45,1);sprite.position.y=.5;node.add(sprite);const ring=new THREE.Mesh(ringGeo,ringMats[pickup.kind]);ring.rotation.x=-Math.PI/2;ring.position.y=-.76;node.add(ring);group.add(node);nodes.set(pickup.id,node);}}
 rebuild();return {rebuild,update(){for(const pickup of sim.pickups){const node=nodes.get(pickup.id)!;node.visible=pickup.availableAt<=sim.time;node.children[0].position.y=.5+Math.sin(sim.time*2+pickup.s)*.12;}},dispose(){group.removeFromParent();ringGeo.dispose();Object.values(materials).forEach(m=>m.dispose());Object.values(ringMats).forEach(m=>m.dispose());Object.values(textures).forEach(t=>t.dispose());}};
}
export function racerEffects(root:THREE.Group,racer:Racer){
 if(racer.isAI){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d')!;ctx.font='bold 36px Arial';ctx.textAlign='center';ctx.fillStyle='#fff1cb';ctx.shadowColor='#102326';ctx.shadowBlur=6;ctx.fillText(racer.name,128,45);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));label.scale.set(2.5,.625,1);label.position.y=1.35;root.add(label);}
 const shield=new THREE.Mesh(new THREE.SphereGeometry(2.1,12,8),new THREE.MeshBasicMaterial({color:0xe6c777,wireframe:true,transparent:true,opacity:.18,depthWrite:false}));shield.scale.set(.65,.55,1.12);root.add(shield);
 const boost=new THREE.Group(),geo=new THREE.ConeGeometry(.12,.85,5),mat=new THREE.MeshBasicMaterial({color:0x69c9ed,transparent:true,opacity:.75});
 for(const x of [-.6,.6]){const plume=new THREE.Mesh(geo,mat);plume.rotation.x=-Math.PI/2;plume.position.set(x,-.4,2.25);boost.add(plume);}root.add(boost);
 return {update(time:number){shield.visible=racer.shieldUntil>time;boost.visible=racer.boostUntil>time;boost.scale.z=1+Math.sin(time*30)*.1;}};
}
