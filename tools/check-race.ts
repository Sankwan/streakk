import RAPIER from '@dimforge/rapier3d-compat';
import {createCourse,addPhysics} from '../src/track.ts';
import {RaceSimulation} from '../src/race/simulation.ts';
import {driveAI} from '../src/race/ai.ts';
await RAPIER.init();const results=[];
for(const id of ['north-loop','tema-harbour']){
 const world=new RAPIER.World({x:0,y:-9.81,z:0}),course=createCourse(id);addPhysics(world,course);world.step();const sim=new RaceSimulation(world,course,4);sim.countdown=0;
 let recoveries=0,collections=0,uses=0,magnetDeployments=0,offroadTicks=0,maxBodies=0,maxProjectiles=0,maxMagnetFields=0,weaponHits=0;
 for(let i=0;i<60*480;i++){
  const p=sim.player;sim.tick({drive:driveAI(p.vehicle,course,p.s,p.aiLane),use:p.inventory[0]!=='repair'||p.health<70});
  for(const e of sim.events){if(e.type==='recover')recoveries++;if(e.type==='pickup')collections++;if(e.type==='use'||e.type==='fire')uses++;if(e.type==='use'&&e.text.startsWith('MAGNET'))magnetDeployments++;}
  for(const r of sim.racers.values())if(course.project(r.vehicle.currentPosition,r.s).distance>course.sample(r.s).width/2)offroadTicks++;
  maxProjectiles=Math.max(maxProjectiles,sim.projectiles.active.size);maxMagnetFields=Math.max(maxMagnetFields,sim.magnetFields.length);weaponHits+=sim.combatImpacts.filter(hit=>hit.result==='hit').length;
  maxBodies=Math.max(maxBodies,world.bodies.len());if([...sim.racers.values()].every(r=>r.finishTime!==null))break;
 }
 const result={id,seconds:+sim.time.toFixed(2),recoveries,collections,uses,magnetDeployments,offroadTicks,maxBodies,maxProjectiles,maxMagnetFields,weaponHits,racers:[...sim.racers.values()].map(r=>({id:r.id,laps:r.completedLaps,finishTime:r.finishTime,health:r.health,shots:r.shots,hits:r.hits,shieldBlocks:r.shieldBlocks,inventory:r.inventory}))};results.push(result);world.free();
}
console.log(JSON.stringify(results,null,2));if(results.some(r=>r.racers.some(c=>c.finishTime===null)))process.exitCode=1;
