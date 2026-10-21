import * as THREE from 'three';
import type {Course} from './tracks/compiler.ts';
import {BlockAcc,buildBlock,createAccraBuildingMaterial,WALL_COLORS} from './donor/world/accraBuildings.js';
import {mulberry32} from './donor/world/textures.js';
export function facadeSites(course:Course){
 const sites:{s:number;x:number;z:number;ax:number;az:number;hw:number;hd:number;side:number}[]=[];
 for(let s=65;s<course.length-40;s+=85)for(const side of [-1,1]){
  const p=course.sample(s),hw=9,hd=6;
  const zone=course.zoneAt(s);if(zone?.kind==='coast'||zone?.kind==='squeeze')continue;
  const c=p.position.clone().addScaledVector(p.right,side*(p.width/2+hd+9));
  // Sample the complete expanded footprint, not just a point on the road's current segment.
  let safe=true;
  for(let u=-hw-2;u<=hw+2;u+=2)for(let v=-hd-2;v<=hd+2;v+=2){const pos=c.clone().addScaledVector(p.forward,u).addScaledVector(p.right,v),q=course.project(pos);if(q.distance<q.width/2+5)safe=false;}
  if(safe)sites.push({s,x:c.x,z:c.z,ax:p.forward.x,az:p.forward.z,hw,hd,side});
 }
 return sites;
}
export function addGhanaFrontage(parent:THREE.Group,course:Course){
 const placeholder=parent.getObjectByName('greybox-buildings');if(placeholder)placeholder.visible=false;
 const group=new THREE.Group();group.name='ghana-frontage';parent.add(group);
 const {material}=createAccraBuildingMaterial(),rng=mulberry32(course.definition.seed+414);
 const chunks=new Map<number,InstanceType<typeof BlockAcc>>();
 const sites=facadeSites(course);
 sites.forEach((site,i)=>{
  const key=Math.floor(site.s/170);if(!chunks.has(key))chunks.set(key,new BlockAcc());
  buildBlock(chunks.get(key)!,{cx:site.x,cz:site.z,ax:site.ax,az:site.az,hw:site.hw,hd:site.hd,floors:i%4===0?2:1,wall:WALL_COLORS[i%WALL_COLORS.length],seed:i+7,office:false,front:false,store:true,streetSide:-1},rng,[]);
 });
 for(const [key,acc] of chunks){const mesh=new THREE.Mesh(acc.build(),material);mesh.name='frontage-chunk-'+key;mesh.castShadow=true;mesh.receiveShadow=true;mesh.geometry.computeBoundingSphere();group.add(mesh);}
 return {count:sites.length,update(position:THREE.Vector3,low:boolean){const range=low?260:480;for(const mesh of group.children as THREE.Mesh[]){const sphere=mesh.geometry.boundingSphere!;mesh.visible=sphere.center.distanceToSquared(position)<(range+sphere.radius)**2;}}};
}
