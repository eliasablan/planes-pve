import { PerspectiveCamera } from "three";
import * as THREE from "three";
import { RapierRigidBody, vec3 } from "@react-three/rapier";
import { Controls } from "@/hooks/useControls";

export const FLIGHT_MODEL = {
  maxThrust: 45,
  gravity: 9.81,
  stallSpeed: 15,
  rotationSpeed: 2.8,
  drag: 0.992,
} as const;

export type FlightBasis = {
  rotation: THREE.Quaternion;
  forward: THREE.Vector3;
  up: THREE.Vector3;
  right: THREE.Vector3;
};

export function getFlightBasis(rotation: { x: number; y: number; z: number; w: number }): FlightBasis {
  const currentRotation = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);

  return {
    rotation: currentRotation,
    forward: new THREE.Vector3(0, 0, -1).applyQuaternion(currentRotation),
    up: new THREE.Vector3(0, 1, 0).applyQuaternion(currentRotation),
    right: new THREE.Vector3(1, 0, 0).applyQuaternion(currentRotation),
  };
}

export function getBodySpeed(rb: RapierRigidBody) {
  const linVel = rb.linvel();
  return Math.sqrt(linVel.x ** 2 + linVel.y ** 2 + linVel.z ** 2);
}

export function nextThrottle(currentThrottle: number, controls: Controls, delta: number) {
  let throttle = currentThrottle;
  if (controls.throttleUp) throttle = Math.min(throttle + delta * 20, FLIGHT_MODEL.maxThrust);
  if (controls.throttleDown) throttle = Math.max(throttle - delta * 20, 0);
  if (controls.brake) throttle = Math.max(throttle - delta * 40, 0);
  return throttle;
}

export function applyFlightForces(
  rb: RapierRigidBody,
  basis: FlightBasis,
  throttle: number,
  currentSpeed: number,
  delta: number
) {
  const gravityInfluence = -basis.forward.y * FLIGHT_MODEL.gravity * 1.5;
  const totalForwardThrust = throttle + gravityInfluence;
  rb.applyImpulse(vec3(basis.forward).multiplyScalar(totalForwardThrust * delta), true);

  const liftFactor = Math.min(currentSpeed / FLIGHT_MODEL.stallSpeed, 1.1);
  const liftForce = new THREE.Vector3(0, FLIGHT_MODEL.gravity, 0).multiplyScalar(liftFactor);
  const weightForce = new THREE.Vector3(0, -FLIGHT_MODEL.gravity, 0);
  rb.applyImpulse(vec3(liftForce.add(weightForce)).multiplyScalar(delta), true);

  rb.setLinvel(vec3(rb.linvel()).multiplyScalar(FLIGHT_MODEL.drag), true);
}

export function applyFlightTorque(
  rb: RapierRigidBody,
  camera: THREE.Camera,
  basis: FlightBasis,
  controls: Controls,
  delta: number
) {
  const torque = new THREE.Vector3(0, 0, 0);

  if (controls.mouseControlEnabled) {
    const targetMousePitch = -controls.mouseY * FLIGHT_MODEL.rotationSpeed * 1.5;
    const targetMouseYaw = -controls.mouseX * FLIGHT_MODEL.rotationSpeed;
    torque.add(basis.right.clone().multiplyScalar(targetMousePitch * delta));
    torque.add(basis.up.clone().multiplyScalar(targetMouseYaw * delta));
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, controls.mouseX * 3, 0.08);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 2.0 - controls.mouseY, 0.08);
  } else {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 2.0, 0.05);
  }

  if (controls.pitchUp) torque.add(basis.right.clone().multiplyScalar(FLIGHT_MODEL.rotationSpeed * delta));
  if (controls.pitchDown) torque.add(basis.right.clone().multiplyScalar(-FLIGHT_MODEL.rotationSpeed * delta));
  if (controls.yawLeft) torque.add(basis.up.clone().multiplyScalar(FLIGHT_MODEL.rotationSpeed * 0.8 * delta));
  if (controls.yawRight) torque.add(basis.up.clone().multiplyScalar(-FLIGHT_MODEL.rotationSpeed * 0.8 * delta));
  if (controls.rollLeft) torque.add(basis.forward.clone().multiplyScalar(-FLIGHT_MODEL.rotationSpeed * 1.2 * delta));
  if (controls.rollRight) torque.add(basis.forward.clone().multiplyScalar(FLIGHT_MODEL.rotationSpeed * 1.2 * delta));

  rb.applyTorqueImpulse(vec3(torque), true);
  rb.setAngvel(vec3(rb.angvel()).multiplyScalar(0.96), true);
}

export function applySpeedCamera(camera: THREE.Camera, currentSpeed: number) {
  if (!(camera instanceof PerspectiveCamera)) return;

  const speedFactor = THREE.MathUtils.clamp(currentSpeed / (FLIGHT_MODEL.maxThrust * 1.2), 0, 1);
  camera.fov = THREE.MathUtils.lerp(75, 95, speedFactor);
  camera.updateProjectionMatrix();
}

export function getFlightTelemetry(
  translation: { y: number },
  currentSpeed: number,
  rotation: THREE.Quaternion
) {
  const euler = new THREE.Euler().setFromQuaternion(rotation, "YXZ");
  return {
    altitude: translation.y + 5,
    speed: currentSpeed * 10,
    pitch: (euler.x * 180) / Math.PI,
    roll: (euler.z * 180) / Math.PI,
    heading: (euler.y * 180) / Math.PI,
  };
}
