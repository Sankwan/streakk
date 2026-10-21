import type {Group,Mesh,Material} from 'three';
export interface TaxiModel {
 root:Group; body:Group;
 contactShadow:Mesh; beamDecal:Mesh;
 setState(s:{steerAngle?:number;wheelSpinFront?:number;wheelSpinRear?:number;wheelCenters?:number[];brake?:number;reversing?:boolean;headlights?:boolean}):void;
 update(dt:number):void;
 dispose():void;
}
export function createCarModel(options?:{color?:number;accent?:number;name?:string;isPlayer?:boolean;quality?:string}):TaxiModel;
