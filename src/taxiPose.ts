/** The donor faces +Z at ground origin; Rapier faces -Z at chassis centre. */
export const TAXI_SCALE={x:1.76/1.66,y:.34/.35,z:2.8/2.7};
export const TAXI_GROUND_OFFSET=-.08-.45-.34;
export function donorWheelHeight(mount:number,travel:number){return (mount-travel-TAXI_GROUND_OFFSET)/TAXI_SCALE.y;}
export function donorSteer(rapierSteer:number){return -rapierSteer;}

// Keep the donor axle positions while shortening bumper overhang to the existing collision envelope.
export function chassisFitZ(z:number){const a=Math.abs(z);return a<=1.35?z:Math.sign(z)*(1.35+(a-1.35)*(1.95/TAXI_SCALE.z-1.35)/(2.285-1.35));}
