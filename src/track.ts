import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {compileTrack,type Course} from './tracks/compiler.ts';
import {NORTH_LOOP,TRACKS} from './tracks/definitions.ts';
export type {Course};
export function createCourse(id=NORTH_LOOP.id){const def=TRACKS.find(t=>t.id===id);if(!def)throw Error('Unknown track: '+id);return compileTrack(def);}
export function nearestSample(position:{x:number;z:number},course:Course){return course.project(position);}
export function roadEdge(course:Course,index:number,side:number,extra=0){const p=course.road[index%course.road.length];return p.position.clone().addScaledVector(p.right,side*(p.width/2+extra));}
export function addPhysics(world:RAPIER.World,course:Course){
 const colliders:RAPIER.Collider[]=[];const size=course.bounds.getSize(new THREE.Vector3()),center=course.bounds.getCenter(new THREE.Vector3());
 colliders.push(world.createCollider(RAPIER.ColliderDesc.cuboid(size.x/2+80,.2,size.z/2+80).setTranslation(center.x,-.2,center.z).setFriction(.7)));
 for(let i=0;i<course.road.length;i++)for(const side of [-1,1]){const a=roadEdge(course,i,side,.6),b=roadEdge(course,(i+1)%course.road.length,side,.6),delta=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5);const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(delta.x,delta.z));colliders.push(world.createCollider(RAPIER.ColliderDesc.cuboid(.3,.55,delta.length()/2+.09).setTranslation(mid.x,.55,mid.z).setRotation(q).setFriction(.15).setRestitution(.12)));}
 return colliders;
}
export function buildRoadGeometry(course:Course,from:(width:number)=>number,to:(width:number)=>number,y:number){
 const vertices:number[]=[],indices:number[]=[];
 for(let i=0;i<=course.road.length;i++){const p=course.road[i%course.road.length];for(const offset of [from(p.width),to(p.width)]){const v=p.position.clone().addScaledVector(p.right,offset);vertices.push(v.x,y,v.z);}if(i<course.road.length){const j=i*2;indices.push(j,j+2,j+1,j+1,j+2,j+3);}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
const material=(color:number,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness,side:THREE.DoubleSide});
export function buildEnvironment(group:THREE.Group,course:Course){
 const harbour=course.definition.theme==='harbour',size=course.bounds.getSize(new THREE.Vector3()),center=course.bounds.getCenter(new THREE.Vector3());
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(size.x+160,size.z+160),material(harbour?0x777b70:0x17282b));ground.rotation.x=-Math.PI/2;ground.position.set(center.x,-.03,center.z);ground.receiveShadow=true;group.add(ground);
 const road=new THREE.Mesh(buildRoadGeometry(course,w=>-w/2,w=>w/2,.012),material(harbour?0x424b4d:0x303b40));road.receiveShadow=true;group.add(road);
 for(const sign of [-1,1]){group.add(new THREE.Mesh(buildRoadGeometry(course,w=>sign*(w/2-.18),w=>sign*(w/2-.32),.025),material(0xd4d4be)));group.add(new THREE.Mesh(buildRoadGeometry(course,w=>sign*(w/2+.2),w=>sign*(w/2+.8),.016),material(0x939a8b)));}
 const barriers=new THREE.InstancedMesh(new THREE.BoxGeometry(.6,1.1,1),material(0x9aafa6),course.road.length*2),o=new THREE.Object3D();let n=0;
 for(let i=0;i<course.road.length;i++)for(const sign of [-1,1]){const a=roadEdge(course,i,sign,.6),b=roadEdge(course,(i+1)%course.road.length,sign,.6),delta=b.clone().sub(a);o.position.copy(a).add(b).multiplyScalar(.5);o.position.y=.55;o.rotation.set(0,Math.atan2(delta.x,delta.z),0);o.scale.set(1,1,delta.length()+.15);o.updateMatrix();barriers.setMatrixAt(n,o.matrix);barriers.setColorAt(n++,new THREE.Color(Math.floor(i*course.step/14)%5===0?(harbour?0xc0a46f:0xc8ec4b):0x85918a));}
 barriers.castShadow=true;barriers.receiveShadow=true;group.add(barriers);
 // Lane count is a route property. Width changes propagate to markings and road edges together.
 const count=Math.floor(course.length/12),dash=new THREE.InstancedMesh(new THREE.PlaneGeometry(.16,3.6),new THREE.MeshBasicMaterial({color:0xc9cbbd}),count*(course.definition.lanes-1));n=0;dash.name='lane-markings';
 for(let lane=1;lane<course.definition.lanes;lane++)for(let i=0;i<count;i++){const p=course.sample(i*course.length/count),v=p.position.clone().addScaledVector(p.right,p.width*(lane/course.definition.lanes-.5));o.position.set(v.x,.03,v.z);o.rotation.set(-Math.PI/2,0,Math.atan2(p.forward.x,p.forward.z));o.scale.set(1,1,1);o.updateMatrix();dash.setMatrixAt(n++,o.matrix);}group.add(dash);
 if(harbour){for(const offset of [-.16,.16])group.add(new THREE.Mesh(buildRoadGeometry(course,()=>offset-.045,()=>offset+.045,.032),new THREE.MeshBasicMaterial({color:0xb4aa87,side:THREE.DoubleSide})));}
 const rng=(()=>{let seed=course.definition.seed;return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};})();
 const shapes=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material(harbour?0x8d9389:0x33484b),harbour?75:90);let placed=0,attempts=0;
 while(placed<shapes.count&&attempts++<20000){const x=course.bounds.min.x+rng()*size.x,z=course.bounds.min.z+rng()*size.z;const pr=course.project({x,z});if(pr.distance<pr.width/2+(harbour?18:14))continue;const h=harbour?4+rng()*7:3+rng()*16;o.position.set(x,h/2,z);o.rotation.set(0,harbour?0:rng()*.4,0);o.scale.set(harbour?15+rng()*28:4+rng()*10,h,harbour?12+rng()*20:4+rng()*10);o.updateMatrix();shapes.setMatrixAt(placed,o.matrix);if(harbour)shapes.setColorAt(placed,new THREE.Color([0x95917e,0x7a817c,0x9c8c75,0x75868b][placed%4]));placed++;}shapes.name='greybox-buildings';shapes.count=placed;shapes.castShadow=true;shapes.receiveShadow=true;group.add(shapes);
 if(harbour){
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(1500,420),new THREE.MeshStandardMaterial({color:0x416b75,roughness:.7}));sea.rotation.x=-Math.PI/2;sea.position.set(center.x,-.1,course.bounds.max.z+210);group.add(sea);
  const containerGeo=new THREE.BoxGeometry(12,2.6,2.6),containers=new THREE.InstancedMesh(containerGeo,material(0x596d6b),66);let c=0;
  for(let i=0;i<22;i++){const x=-430+i*39,z=course.bounds.max.z-8;for(let j=0;j<3;j++){o.position.set(x,1.3+j*2.6,z+(i%2)*4);o.rotation.set(0,0,0);o.scale.set(1,1,1);o.updateMatrix();containers.setMatrixAt(c,o.matrix);containers.setColorAt(c++,new THREE.Color([0x736550,0x506b72,0x7b5145,0x65705a][(i+j)%4]));}}containers.castShadow=true;group.add(containers);
  for(const x of [-330,-80,170,390]){const crane=new THREE.Group();crane.position.set(x,0,course.bounds.max.z+15);const steel=material(0x897c59);for(const [w,h,d,px,py,pz] of [[1.3,27,1.3,-7,13.5,0],[1.3,27,1.3,7,13.5,0],[37,1.2,1.5,0,27,0],[.18,18,.18,14,18,0]]){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),steel);m.position.set(px,py,pz);m.castShadow=true;crane.add(m);}group.add(crane);}
 }
 const start=course.sample(0),gate=new THREE.Group();gate.position.copy(start.position);gate.rotation.y=Math.atan2(start.forward.x,start.forward.z);const gateMat=material(harbour?0xc0aa77:0xc8ec4b),half=start.width/2+1;
 for(const x of [-half,half]){const pole=new THREE.Mesh(new THREE.BoxGeometry(.35,6,.35),gateMat);pole.position.set(x,3,0);gate.add(pole);}const beam=new THREE.Mesh(new THREE.BoxGeometry(half*2+.35,.6,.5),gateMat);beam.position.y=6;gate.add(beam);
 const tiles=Math.floor(start.width);for(let i=0;i<tiles;i++)for(let j=0;j<2;j++){const tile=new THREE.Mesh(new THREE.PlaneGeometry(start.width/tiles,.95),new THREE.MeshBasicMaterial({color:(i+j)%2?0x263936:0xd9dbc9}));tile.rotation.x=-Math.PI/2;tile.position.set(-start.width/2+(i+.5)*start.width/tiles,.04,(j-.5)*.95);gate.add(tile);}group.add(gate);
 // These are design markers, not active combat pickups.
 const preview=new THREE.Group();preview.name='pickup-preview';preview.visible=false;
 const markerGeo=new THREE.TorusGeometry(.8,.07,5,16),markerMat=new THREE.MeshBasicMaterial({color:0xc3b170,transparent:true,opacity:.8});
 for(const site of course.pickupOpportunities){const p=course.sample(site.s);for(const lane of site.lanes){const token=new THREE.Mesh(markerGeo,markerMat);token.position.copy(p.position).addScaledVector(p.right,lane);token.position.y=1.15;token.rotation.y=Math.atan2(p.forward.x,p.forward.z);preview.add(token);}}group.add(preview);
 return preview;
}
export function disposeEnvironment(group:THREE.Group){const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();group.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>{for(const texture of (m.userData.ownedTextures??[]) as THREE.Texture[])texture.dispose();m.dispose();});group.clear();}
