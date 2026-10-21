import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Euler} from 'three';
import {TAXI_SCALE,TAXI_GROUND_OFFSET,donorWheelHeight,donorSteer,chassisFitZ} from '../src/taxiPose.ts';
import {RenderBudget,percentile} from '../src/performance.ts';
import {facadeSites} from '../src/scenery.ts';
import {createCourse} from '../src/track.ts';
test('donor axis, wheel anchors and suspension map onto the existing Rapier chassis',()=>{
 const rotation=new Euler(0,Math.PI,0);
 const front=new Vector3(0,0,1).applyEuler(rotation);assert.ok(front.distanceTo(new Vector3(0,0,-1))<1e-9);
 const leftFront=new Vector3(.83,.35,1.35).multiply(new Vector3(TAXI_SCALE.x,TAXI_SCALE.y,TAXI_SCALE.z)).applyEuler(rotation);
 assert.ok(Math.abs(leftFront.x+.88)<1e-9);assert.ok(Math.abs(leftFront.z+1.4)<1e-9);
 for(const travel of [.1,.45,.65])assert.ok(Math.abs(donorWheelHeight(-.08,travel)*TAXI_SCALE.y+TAXI_GROUND_OFFSET-(-.08-travel))<1e-9);
 assert.equal(-donorSteer(.2),.2);assert.ok(Math.abs(chassisFitZ(2.285)*TAXI_SCALE.z-1.95)<1e-9);assert.equal(chassisFitZ(1.35),1.35);
});
test('render budget lowers resolution under sustained load and recovers conservatively',()=>{
 const budget=new RenderBudget();let result;
 for(let i=0;i<180;i++)result=budget.observe(30);assert.equal(result?.p95,30);assert.ok(budget.scale<1.35);
 for(let i=0;i<180*30;i++)budget.observe(40);assert.equal(budget.scale,.7);
 for(let i=0;i<180*3;i++)budget.observe(16.7);assert.ok(budget.scale>.7);
 const scale=budget.scale;budget.reset();for(let i=0;i<500;i++)budget.observe(Infinity);assert.equal(budget.scale,scale);
 assert.equal(percentile([12,60,16,20],.95),60);
});
test('adapted shopfront footprints keep a usable margin from every circuit',()=>{
 for(const id of ['tema-harbour','north-loop','accra-ring']){const course=createCourse(id),sites=facadeSites(course);assert.ok(sites.length>0&&sites.length<70);
  for(const site of sites)for(const along of [-site.hw-2,0,site.hw+2])for(const across of [-site.hd-2,0,site.hd+2]){
   const pos={x:site.x+site.ax*along-site.az*across,z:site.z+site.az*along+site.ax*across};
   const q=course.project(pos);assert.ok(q.distance>=q.width/2+4.99);
  }
 }
});

test('active long frame stalls remain visible to the render budget',()=>{const budget=new RenderBudget();let result;for(let i=0;i<180;i++)result=budget.observe(i%3===0?400:16.7);assert.equal(result?.p95,400);assert.ok(budget.scale<1.35);});
