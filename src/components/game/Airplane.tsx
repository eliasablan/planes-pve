"use client";

import { useFrame } from "@react-three/fiber";
import { RigidBody, RapierRigidBody, vec3, quat } from "@react-three/rapier";
import { useRef, useState } from "react";
import * as THREE from "three";
import { useControls } from "@/hooks/useControls";
import { PerspectiveCamera, Trail, Float } from "@react-three/drei";
import { supabase } from "@/lib/supabase";
import { useGameStore } from "@/store/useGameStore";
import { Bullet, Missile } from "./Projectiles";

export function Airplane({ userId, username, roomName }: { userId: string, username: string, roomName: string }) {
  const rb = useRef<RapierRigidBody>(null);
  const controls = useControls();
  const hp = useGameStore((s) => s.hp);
  const { useAmmo, useMissile, useFlare } = useGameStore();
  
  // Local state for projectiles (to avoid global store lag for visuals)
  const [bullets, setBullets] = useState<{ id: string, pos: [number, number, number], rot: [number, number, number, number] }[]>([]);
  
  // Physics constants
  const throttlePower = 25;
  const rotationSpeed = 2;
  const damping = 0.98;
  
  // Combat timers
  const lastShot = useRef(0);
  const mgInterval = 150; // ms

  useFrame((state, delta) => {
    if (!rb.current || hp <= 0) return;

    const rotation = rb.current.rotation();
    const translation = rb.current.translation();
    const currentRotation = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    
    // Calculate direction vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(currentRotation);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(currentRotation);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(currentRotation);

    // Apply movement physics (Throttle, Pitch, Yaw, Roll)
    if (controls.throttleUp) rb.current.applyImpulse(vec3(forward).multiplyScalar(throttlePower * delta), true);
    if (controls.throttleDown) rb.current.applyImpulse(vec3(forward).multiplyScalar(-throttlePower * 0.5 * delta), true);

    const torque = new THREE.Vector3(0, 0, 0);
    if (controls.pitchUp) torque.add(right.clone().multiplyScalar(rotationSpeed * delta));
    if (controls.pitchDown) torque.add(right.clone().multiplyScalar(-rotationSpeed * delta));
    if (controls.yawLeft) torque.add(up.clone().multiplyScalar(rotationSpeed * 0.5 * delta));
    if (controls.yawRight) torque.add(up.clone().multiplyScalar(-rotationSpeed * 0.5 * delta));
    if (controls.rollLeft) torque.add(forward.clone().multiplyScalar(-rotationSpeed * delta));
    if (controls.rollRight) torque.add(forward.clone().multiplyScalar(rotationSpeed * delta));

    rb.current.applyTorqueImpulse(vec3(torque), true);

    // Apply damping
    rb.current.setLinvel(vec3(rb.current.linvel()).multiplyScalar(damping), true);
    rb.current.setAngvel(vec3(rb.current.angvel()).multiplyScalar(damping), true);

    // Shooting logic
    if (controls.fireMG && Date.now() - lastShot.current > mgInterval) {
      lastShot.current = Date.now();
      useAmmo();
      const bulletId = crypto.randomUUID();
      const bulletPos: [number, number, number] = [translation.x, translation.y, translation.z];
      const bulletRot: [number, number, number, number] = [rotation.x, rotation.y, rotation.z, rotation.w];
      
      setBullets((prev) => [...prev, { id: bulletId, pos: bulletPos, rot: bulletRot }]);
      setTimeout(() => setBullets((prev) => prev.filter(b => b.id !== bulletId)), 2000);
      
      // Raycast or Broadcast hit would go here
    }

    // Broadcast position
    const now = Date.now();
    if (now - lastBroadcast.current > broadcastInterval) {
      lastBroadcast.current = now;
      supabase.channel(`room:${roomName}`).send({
        type: "broadcast",
        event: "move",
        payload: {
          id: userId,
          username,
          position: [translation.x, translation.y, translation.z],
          rotation: [rotation.x, rotation.y, rotation.z, rotation.w],
          hp,
        }
      });
    }
  });

  return (
    <>
      <RigidBody
        ref={rb}
        colliders="cuboid"
        position={[0, 10, 0]}
        linearDamping={0.5}
        angularDamping={0.5}
      >
        <PerspectiveCamera makeDefault position={[0, 2, 5]} fov={75} />
        
        <group>
          {/* Smoke Trails based on HP */}
          {hp < 75 && (
            <Trail
              width={1}
              length={5}
              color={hp < 40 ? "black" : "white"}
              attenuation={(t) => t * t}
            >
              <mesh position={[0, 0, 1]} />
            </Trail>
          )}

          {/* Fuselage */}
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.5, 2]} />
            <meshStandardMaterial color={hp < 15 ? "darkred" : "gray"} />
          </mesh>
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[3, 0.1, 0.8]} />
            <meshStandardMaterial color="darkgray" />
          </mesh>
        </group>
      </RigidBody>

      {/* Render local bullets */}
      {bullets.map((b) => (
        <Bullet key={b.id} position={b.pos} rotation={b.rot} onHit={() => {}} />
      ))}
    </>
  );
}
