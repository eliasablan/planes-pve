"use client";

import { useFrame } from "@react-three/fiber";
import { RigidBody, RapierRigidBody, vec3, quat } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";
import { useControls } from "@/hooks/useControls";
import { PerspectiveCamera } from "@react-three/drei";
import { supabase } from "@/lib/supabase";
import { useGameStore } from "@/store/useGameStore";

export function Airplane({ userId, username, roomName }: { userId: string, username: string, roomName: string }) {
  const rb = useRef<RapierRigidBody>(null);
  const controls = useControls();
  const hp = useGameStore((s) => s.hp);
  
  // Physics constants
  const throttlePower = 25;
  const rotationSpeed = 2;
  const damping = 0.98;
  
  // Broadcasting throttling
  const lastBroadcast = useRef(0);
  const broadcastInterval = 1000 / 30; // 30Hz

  useFrame((state, delta) => {
    if (!rb.current) return;

    const rotation = rb.current.rotation();
    const translation = rb.current.translation();
    const currentRotation = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    
    // Calculate direction vectors based on current rotation
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(currentRotation);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(currentRotation);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(currentRotation);

    // Apply forces
    if (controls.throttleUp) {
      rb.current.applyImpulse(vec3(forward).multiplyScalar(throttlePower * delta), true);
    }
    if (controls.throttleDown) {
      rb.current.applyImpulse(vec3(forward).multiplyScalar(-throttlePower * 0.5 * delta), true);
    }

    // Apply torques (Pitch, Yaw, Roll)
    const torque = new THREE.Vector3(0, 0, 0);
    
    // Pitch (Arrow Up/Down)
    if (controls.pitchUp) torque.add(right.clone().multiplyScalar(rotationSpeed * delta));
    if (controls.pitchDown) torque.add(right.clone().multiplyScalar(-rotationSpeed * delta));
    
    // Yaw (Q/E)
    if (controls.yawLeft) torque.add(up.clone().multiplyScalar(rotationSpeed * 0.5 * delta));
    if (controls.yawRight) torque.add(up.clone().multiplyScalar(-rotationSpeed * 0.5 * delta));
    
    // Roll (A/D)
    if (controls.rollLeft) torque.add(forward.clone().multiplyScalar(-rotationSpeed * delta));
    if (controls.rollRight) torque.add(forward.clone().multiplyScalar(rotationSpeed * delta));

    rb.current.applyTorqueImpulse(vec3(torque), true);

    // Apply damping to velocity
    const linVel = rb.current.linvel();
    rb.current.setLinvel(vec3(linVel).multiplyScalar(damping), true);
    
    const angVel = rb.current.angvel();
    rb.current.setAngvel(vec3(angVel).multiplyScalar(damping), true);

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
    <RigidBody
      ref={rb}
      colliders="cuboid"
      position={[0, 10, 0]}
      linearDamping={0.5}
      angularDamping={0.5}
    >
      <PerspectiveCamera makeDefault position={[0, 2, 5]} fov={75} />
      
      {/* Airplane Model Placeholder */}
      <group>
        {/* Fuselage */}
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.5, 2]} />
          <meshStandardMaterial color="gray" />
        </mesh>
        {/* Wings */}
        <mesh castShadow position={[0, 0, 0]}>
          <boxGeometry args={[3, 0.1, 0.8]} />
          <meshStandardMaterial color="darkgray" />
        </mesh>
        {/* Tail */}
        <mesh castShadow position={[0, 0.3, 0.8]}>
          <boxGeometry args={[0.8, 0.5, 0.1]} />
          <meshStandardMaterial color="darkgray" />
        </mesh>
      </group>
    </RigidBody>
  );
}
