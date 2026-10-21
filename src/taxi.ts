import * as THREE from 'three';
import {createCarModel} from './donor/vehicle/carModel.js';
import type {Vehicle} from './vehicle.ts';
import {TAXI_SCALE,TAXI_GROUND_OFFSET,donorWheelHeight,donorSteer,chassisFitZ} from './taxiPose.ts';
export function createTaxi(options:{name?:string;color?:number;accent?:number}={}){
 const model=createCarModel({color:options.color??0x713c38,accent:options.accent??0xb58a46,name:options.name??'YOU',isPlayer:false,quality:'low'});
 const fitted=new Map<THREE.BufferGeometry,THREE.BufferGeometry>();
 model.body.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  const source=object.geometry as THREE.BufferGeometry;
  let geometry=fitted.get(source);
  if(!geometry){
   geometry=source.clone();const vertices=geometry.getAttribute('position');
   for(let i=0;i<vertices.count;i++)vertices.setZ(i,chassisFitZ(vertices.getZ(i)));
   vertices.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();fitted.set(source,geometry);
  }
  object.geometry=geometry;
 });
 const root=new THREE.Group();root.name='rapier-taxi';
 model.root.rotation.y=Math.PI;model.root.scale.set(TAXI_SCALE.x,TAXI_SCALE.y,TAXI_SCALE.z);model.root.position.y=TAXI_GROUND_OFFSET;root.add(model.root);
 // Donor ground decals assume a flat ground-origin transform. Real shadows are supplied by the renderer.
 model.contactShadow.visible=false;model.beamDecal.visible=false;
 let spin=0;const heights=[.35,.35,.35,.35];
 const paint=model.body.getObjectByName('bodyLOD');
 const wheelLod=model.root.getObjectByName('wheelLOD');
 function detail(low:boolean){
  for(const node of [paint,wheelLod])if(node instanceof THREE.LOD){node.autoUpdate=!low;if(low)node.levels.forEach((level,i)=>level.object.visible=i===node.levels.length-1);}
 }
 return {root,detail,update(vehicle:Vehicle,dt:number,brake:number){
  spin+=vehicle.forwardSpeed*dt/.34;
  for(let i=0;i<4;i++)heights[i]=donorWheelHeight(vehicle.wheels[i].y,vehicle.wheelTravel[i]);
  model.setState({steerAngle:donorSteer(vehicle.steer),wheelSpinFront:spin,wheelSpinRear:spin,wheelCenters:heights,brake,reversing:vehicle.forwardSpeed< -1,headlights:false});model.update(dt);
 },dispose:()=>{model.dispose();for(const geometry of fitted.values())geometry.dispose();}};
}
