"use client";

import { useFrame } from "@react-three/fiber";
import { RigidBody, RapierRigidBody, vec3, quat } from "@react-three/rapier";
import { useRef, useState } from "react";
import * as THREE from "three";
import { useControls } from "@/hooks/useControls";
import { PerspectiveCamera, Trail } from "@react-three/drei";
import { supabase } from "@/lib/supabase";
import { useGameStore } from "@/store/useGameStore";
import { Bullet, Missile } from "./Projectiles";

export function Airplane({ userId, username, roomName }: { userId: string, username: string, roomName: string }) {
  const rb = useRef<RapierRigidBody>(null);
  const propellerRef = useRef<THREE.Mesh>(null);
  const controls = useControls();
  const { hp, selectedWeapon, ammo, missiles, flares, zoneRadius, zoneCenter } = useGameStore();
  const { useAmmo, useMissile, useFlare, setFlightData, setHp, setSelectedWeapon } = useGameStore();
  
  const [bullets, setBullets] = useState<{ id: string, pos: [number, number, number], rot: [number, number, number, number] }[]>([]);
  
  const maxThrust = 45;
  const gravityConst = 9.81;
  const stallSpeed = 15;
  const rotationSpeed = 2.8;
  const dragCoeff = 0.992;
  
  const currentThrottle = useRef(25);
  const lastBroadcast = useRef(0);
  const broadcastInterval = 1000 / 30;
  const spawnTime = useRef(Date.now());
  const invulnerabilityDuration = 3000;

  useFrame((state, delta) => {
    if (!rb.current || hp <= 0) return;

    if (controls.selectMG) setSelectedWeapon('mg');
    if (controls.selectMissile) setSelectedWeapon('missile');

    const rotation = rb.current.rotation();
    const translation = rb.current.translation();
    const currentRotation = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(currentRotation);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(currentRotation);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(currentRotation);

    const linVel = rb.current.linvel();
    const currentSpeed = Math.sqrt(linVel.x**2 + linVel.y**2 + linVel.z**2);
    
    // DEATH BY WATER
    if (translation.y < -4.5) {
      setHp(0);
      return;
    }

    // THRUST
    if (controls.throttleUp) currentThrottle.current = Math.min(currentThrottle.current + delta * 20, maxThrust);
    if (controls.throttleDown) currentThrottle.current = Math.max(currentThrottle.current - delta * 20, 0);
    if (controls.brake) currentThrottle.current = Math.max(currentThrottle.current - delta * 40, 0);
    rb.current.applyImpulse(vec3(forward).multiplyScalar(currentThrottle.current * delta), true);

    // LIFT
    const liftFactor = Math.min(currentSpeed / stallSpeed, 1.1);
    const liftForce = new THREE.Vector3(0, gravityConst, 0).multiplyScalar(liftFactor);
    const weightForce = new THREE.Vector3(0, -gravityConst, 0);
    rb.current.applyImpulse(vec3(liftForce.add(weightForce)).multiplyScalar(delta), true);

    // DRAG
    rb.current.setLinvel(vec3(rb.current.linvel()).multiplyScalar(dragCoeff), true);

    // ROTATION
    const torque = new THREE.Vector3(0, 0, 0);
    if (controls.mouseControlEnabled) {
      const targetMousePitch = -controls.mouseY * rotationSpeed * 1.5;
      const targetMouseYaw = -controls.mouseX * rotationSpeed * 1.0;
      torque.add(right.clone().multiplyScalar(targetMousePitch * delta));
      torque.add(up.clone().multiplyScalar(targetMouseYaw * delta));
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, controls.mouseX * 3, 0.08);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 2.0 - controls.mouseY, 0.08);
    }

    if (controls.pitchUp) torque.add(right.clone().multiplyScalar(rotationSpeed * delta));
    if (controls.pitchDown) torque.add(right.clone().multiplyScalar(-rotationSpeed * delta));
    if (controls.yawLeft) torque.add(up.clone().multiplyScalar(rotationSpeed * 0.8 * delta));
    if (controls.yawRight) torque.add(up.clone().multiplyScalar(-rotationSpeed * 0.8 * delta));
    if (controls.rollLeft) torque.add(forward.clone().multiplyScalar(-rotationSpeed * 1.2 * delta));
    if (controls.rollRight) torque.add(forward.clone().multiplyScalar(rotationSpeed * 1.2 * delta));

    rb.current.applyTorqueImpulse(vec3(torque), true);
    rb.current.setAngvel(vec3(rb.current.angvel()).multiplyScalar(0.96), true);

    // TELEMETRY (Sea level is approx -5, so +5 makes it 0 at water)
    const euler = new THREE.Euler().setFromQuaternion(currentRotation, 'YXZ');
    setFlightData({
      altitude: translation.y + 5, 
      speed: currentSpeed * 10,
      pitch: (euler.x * 180) / Math.PI,
      roll: (euler.z * 180) / Math.PI
    });

    if (propellerRef.current) {
      propellerRef.current.rotation.z += delta * (currentThrottle.current + currentSpeed);
    }

    // BROADCAST
    const now = Date.now();
    if (now - lastBroadcast.current > broadcastInterval) {
      lastBroadcast.current = now;
      supabase.channel(`room:${roomName}`).send({
        type: "broadcast",
        event: "move",
        payload: { id: userId, username, position: [translation.x, translation.y, translation.z], rotation: [rotation.x, rotation.y, rotation.z, rotation.w], hp }
      });
    }
  });

  const handleCollision = (e: any) => {
    if (Date.now() - spawnTime.current < invulnerabilityDuration) return;
    if (e.other.rigidBodyObject?.name === "ground") {
      setHp(0);
    }
  };

  return (
    <>
      <RigidBody ref={rb} colliders="cuboid" position={[0, 250, 0]} linearDamping={0.5} angularDamping={0.5} onCollisionEnter={handleCollision}>
        <PerspectiveCamera makeDefault position={[0, 1.5, 5]} fov={75} />
        <group>
          {/* FUSELAGE */}
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.25, 0.3, 2.5, 12]} />
            <meshStandardMaterial color="#333" metalness={0.8} />
          </mesh>
          {/* COCKPIT */}
          <mesh castShadow position={[0, 0.25, -0.2]}>
            <sphereGeometry args={[0.25, 16, 16]} scale={[1, 0.5, 1.2]} />
            <meshStandardMaterial color="#8ecae6" transparent opacity={0.5} />
          </mesh>
          {/* PROPELLER */}
          <group position={[0, 0, -1.3]}>
            <mesh ref={propellerRef}><boxGeometry args={[1.8, 0.08, 0.02]} /><meshStandardMaterial color="#111" /></mesh>
          </group>
          {/* WINGS */}
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[4, 0.04, 0.8]} />
            <meshStandardMaterial color="#444" />
          </mesh>
          {/* TAIL */}
          <group position={[0, 0, 1.1]}>
            <mesh castShadow><boxGeometry args={[1.2, 0.04, 0.5]} /><meshStandardMaterial color="#444" /></mesh>
            <mesh castShadow position={[0, 0.35, 0]}><boxGeometry args={[0.02, 0.7, 0.4]} /><meshStandardMaterial color="#444" /></mesh>
          </group>
        </group>
      </RigidBody>
      {bullets.map((b) => (
        <Bullet key={b.id} position={b.pos} rotation={b.rot} onHit={() => {}} />
      ))}
    </>
  );
}
