import type {Command,RaceSimulation} from '../race/simulation.ts';
import {PROTOCOL_VERSION,createRaceSnapshot,decodePlayerCommand,toSimulationCommand,type PlayerCommand,type RaceSnapshot} from './protocol.ts';

/** Per-player monotonic command gate used by both LAN and internet hosts. */
export class CommandInbox {
 private readonly lastSequence=new Map<string,number>();
 accept(value:unknown,expectedRacerId:string){
  const command=decodePlayerCommand(value,expectedRacerId);if(!command)return null;
  if(command.sequence<=(this.lastSequence.get(expectedRacerId)??-1))return null;
  this.lastSequence.set(expectedRacerId,command.sequence);return command;
 }
 reset(){this.lastSequence.clear();}
}

/** Keeps single-player on the same command boundary the network host will use. */
export class LocalRaceAuthority {
 private sequence=0;private readonly inbox=new CommandInbox();
 readonly simulation:RaceSimulation;readonly racerId:string;
 constructor(simulation:RaceSimulation,racerId='you'){this.simulation=simulation;this.racerId=racerId;}
 step(command:Command){
  const wire:PlayerCommand={type:'command',protocol:PROTOCOL_VERSION,racerId:this.racerId,sequence:++this.sequence,clientTick:this.simulation.ticks,drive:{...command.drive},use:!!command.use,swap:!!command.swap};
  const accepted=this.inbox.accept(wire,this.racerId);if(!accepted)throw Error('Local command rejected');
  this.simulation.tick(toSimulationCommand(accepted));return accepted;
 }
 snapshot(sequence=this.simulation.ticks):RaceSnapshot{return createRaceSnapshot(this.simulation,sequence);}
}
