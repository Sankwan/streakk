import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import { approach, clamp, STEP } from './math.ts';

// Original Streak tuning. Schema research informs the questions, not these equations.
export interface Tuning { grip: number; driftGrip: number; steer: number; recovery: number; power: number; }
export const PRESETS: Record<string, Tuning> = {
  balanced: { grip: 1.35, driftGrip: .48, steer: .48, recovery: 7, power: 10600 },
  planted: { grip: 1.65, driftGrip: .64, steer: .43, recovery: 10, power: 10000 },
  loose: { grip: 1.2, driftGrip: .34, steer: .53, recovery: 4, power: 11000 },
};
export interface DriverInput { throttle: number; brake: number; steer: number; handbrake: boolean; }
export const EMPTY_INPUT: DriverInput = { throttle: 0, brake: 0, steer: 0, handbrake: false };
const UP = new Vector3(0, 1, 0);
export class Vehicle {
  world: RAPIER.World;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  tuning: Tuning = { ...PRESETS.balanced };
  mass = 1150;
  steer = 0;
  gripResponse = 10;
  wheels = [new Vector3(-.88, -.08, -1.4), new Vector3(.88, -.08, -1.4), new Vector3(-.88, -.08, 1.4), new Vector3(.88, -.08, 1.4)];
  wheelTravel = [.45, .45, .45, .45];
  contacts = 0;
  speed = 0;
  forwardSpeed = 0;
  slip = 0;
  state = 'GRIP';
  offroad = false;
  boostActive = false;
  previousPosition = new Vector3();
  currentPosition = new Vector3();
  previousRotation = new Quaternion();
  currentRotation = new Quaternion();
  spawnPosition = new Vector3(0, .85, 0);
  spawnRotation = new Quaternion();
  constructor(world: RAPIER.World) {
    this.world = world;
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, .85, 0).setLinearDamping(.04).setAngularDamping(1.25).setCcdEnabled(true));
    this.collider = world.createCollider(RAPIER.ColliderDesc.cuboid(.91, .27, 1.95).setMass(this.mass).setFriction(.15).setRestitution(.08), this.body);
    this.reset();
  }
  setSpawn(position: Vector3, rotation: Quaternion) { this.spawnPosition.copy(position); this.spawnRotation.copy(rotation); this.reset(); }
  reset() {
    this.body.setTranslation(this.spawnPosition, true); this.body.setRotation(this.spawnRotation, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true); this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.resetForces(true); this.body.resetTorques(true);
    this.boostActive = false; this.steer = 0; this.speed = 0; this.forwardSpeed = 0; this.slip = 0; this.contacts = 0;
    this.previousPosition.copy(this.spawnPosition); this.currentPosition.copy(this.spawnPosition);
    this.previousRotation.copy(this.spawnRotation); this.currentRotation.copy(this.spawnRotation);
  }
  // Standalone harness convenience. Multi-car races use prepare -> one world.step -> capture.
  step(input: DriverInput) {
    this.prepare(input); this.world.step(); this.capture();
  }
  prepare(input: DriverInput) {
    this.previousPosition.copy(this.currentPosition); this.previousRotation.copy(this.currentRotation);
    const pos = new Vector3().copy(this.body.translation());
    const rot = new Quaternion().copy(this.body.rotation());
    const forward = new Vector3(0, 0, -1).applyQuaternion(rot);
    const right = new Vector3(1, 0, 0).applyQuaternion(rot);
    const up = UP.clone().applyQuaternion(rot);
    const vel = new Vector3().copy(this.body.linvel());
    const av = this.body.angvel();
    this.forwardSpeed = vel.dot(forward); this.speed = Math.hypot(vel.x, vel.z);
    this.slip = Math.atan2(vel.dot(right), Math.max(2, Math.abs(this.forwardSpeed)));
    const steeringLimit = this.tuning.steer / (1 + this.speed / 24);
    this.steer = approach(this.steer, clamp(input.steer, -1, 1) * steeringLimit, 9, STEP);
    this.gripResponse = approach(this.gripResponse, input.handbrake ? 2.2 : 11, this.tuning.recovery, STEP);
    this.body.resetForces(true); this.body.resetTorques(true); this.contacts = 0;
    const reverse = input.brake > 0 && this.forwardSpeed < .8 && input.throttle === 0;
    const throttle = reverse ? -input.brake * .48 : input.throttle;
    const brake = reverse ? 0 : input.brake;
    const speedLimit = throttle < 0 ? 12 : this.boostActive ? 62 : 54;
    const engine = this.tuning.power * throttle * Math.max(0, 1 - Math.max(0, this.forwardSpeed * Math.sign(throttle)) / speedLimit) * (this.offroad ? .55 : 1) * (this.boostActive ? 1.65 : 1);
    for (let i = 0; i < 4; i++) {
      const mount = this.wheels[i].clone().applyQuaternion(rot).add(pos);
      const ray = new RAPIER.Ray(mount, up.clone().negate());
      const hit = this.world.castRayAndGetNormal(ray, 1.05, true, undefined, undefined, this.collider, this.body);
      if (!hit || hit.normal.y < .35) { this.wheelTravel[i] = .65; continue; }
      this.contacts++;
      const normal = new Vector3().copy(hit.normal);
      const contact = new Vector3().copy(ray.pointAt(hit.timeOfImpact));
      const pv = new Vector3().copy(this.body.velocityAtPoint(contact));
      const compression = .5 + .34 - hit.timeOfImpact;
      const spring = clamp(compression * 38000 - pv.dot(normal) * 3800, 0, 13000);
      this.wheelTravel[i] = clamp(hit.timeOfImpact - .34, .1, .65);
      this.body.addForceAtPoint(normal.clone().multiplyScalar(spring), mount, true);
      const front = i < 2;
      const wheelForward = forward.clone().applyAxisAngle(up, front ? this.steer : 0).projectOnPlane(normal).normalize();
      const wheelRight = wheelForward.clone().cross(normal).normalize();
      const longitudinal = pv.dot(wheelForward), lateral = pv.dot(wheelRight);
      let fx = engine / 4;
      fx -= Math.sign(longitudinal) * Math.min(Math.abs(longitudinal) * this.mass / (4 * STEP), brake * 17000 / 4);
      if (input.handbrake && !front) fx -= Math.sign(longitudinal) * Math.min(Math.abs(longitudinal) * this.mass / (4 * STEP), 1700);
      const response = front ? 11 : this.gripResponse;
      const fy = -lateral * (this.mass / 4) * response;
      const mu = this.tuning.grip * ((!front && input.handbrake) ? this.tuning.driftGrip : 1) * (this.offroad ? .65 : 1);
      const capacity = spring * mu;
      const scale = Math.min(1, capacity / Math.max(.001, Math.hypot(fx, fy)));
      // Tire forces act slightly above the contact patch to restrain excessive roll.
      const forcePoint = contact.clone().addScaledVector(normal, .25);
      this.body.addForceAtPoint(wheelForward.multiplyScalar(fx * scale).add(wheelRight.multiplyScalar(fy * scale)), forcePoint, true);
    }
    this.state = this.contacts < 2 ? 'AIR' : input.handbrake && this.speed > 4 ? 'DRIFT' : Math.abs(this.slip) > .16 ? 'RECOVER' : 'GRIP';
    const resistance = vel.clone().multiplyScalar(-(.6 * this.speed + 32));
    if (this.contacts > 1) resistance.y -= this.speed * this.speed * 1.25;
    this.body.addForce(resistance, true);
    const stability = up.clone().cross(UP).multiplyScalar(this.mass * (this.contacts > 1 ? 12 : 2));
    stability.x -= av.x * this.mass * 2; stability.z -= av.z * this.mass * 2;
    this.body.addTorque(stability, true);
  }
  capture() {
    this.currentPosition.copy(this.body.translation()); this.currentRotation.copy(this.body.rotation());
  }
}
