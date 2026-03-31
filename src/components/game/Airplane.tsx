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
  const propellerRef = useRef<THREE.Mesh>(null);
  const controls = useControls();
  const hp = useGameStore((s) => s.hp);
  const { useAmmo, useMissile, useFlare, setFlightData, setHp } = useGameStore();
  
  // Local state for projectiles
  const [bullets, setBullets] = useState<{ id: string, pos: [number, number, number], rot: [number, number, number, number] }[]>([]);
  
  // Physics constants
  const throttlePower = 35;
  const minSpeed = 15; // Stall speed
  const maxSpeed = 80;
  const rotationSpeed = 2.5;
  const damping = 0.99;
  
  // Broadcasting throttling
  const lastBroadcast = useRef(0);
  const broadcastInterval = 1000 / 30; // 30Hz

  // Combat timers
  const lastShot = useRef(0);
  const mgInterval = 150; // ms

  useFrame((state, delta) => {
    if (!rb.current || hp <= 0) return;

    const rotation = rb.current.rotation();
    const translation = rb.current.translation();
    const currentRotation = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    
    // Rotate propeller
    if (propellerRef.current) {
      propellerRef.current.rotation.z += delta * 30;
    }

    // Calculate direction vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(currentRotation);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(currentRotation);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(currentRotation);

    // Calculate flight data
    const linVel = rb.current.linvel();
    const currentSpeed = Math.sqrt(linVel.x**2 + linVel.y**2 + linVel.z**2);
    
    // Apply Minimum Speed (Force forward impulse if below minSpeed)
    if (currentSpeed < minSpeed) {
      rb.current.applyImpulse(vec3(forward).multiplyScalar(throttlePower * 0.5 * delta), true);
    }

    // Dynamic FOV and Camera Shake based on speed
    const speedFactor = THREE.MathUtils.clamp((currentSpeed - minSpeed) / (maxSpeed - minSpeed), 0, 1);
    const camera = state.camera as THREE.PerspectiveCamera;
    if (camera.fov !== undefined) {
      camera.fov = THREE.MathUtils.lerp(75, 95, speedFactor);
      camera.updateProjectionMatrix();
    }

    // Subtle Camera Shake
    if (speedFactor > 0.5) {
      const shakeAmount = (speedFactor - 0.5) * 0.05;
      state.camera.position.x += (Math.random() - 0.5) * shakeAmount;
      state.camera.position.y += (Math.random() - 0.5) * shakeAmount;
    }

    // Calculate Pitch and Roll
    const euler = new THREE.Euler().setFromQuaternion(currentRotation, 'YXZ');
    setFlightData({
      altitude: translation.y,
      speed: currentSpeed * 3.6,
      pitch: (euler.x * 180) / Math.PI,
      roll: (euler.z * 180) / Math.PI
    });

    // Apply movement physics
    if (controls.throttleUp) rb.current.applyImpulse(vec3(forward).multiplyScalar(throttlePower * delta), true);
    if (controls.throttleDown) rb.current.applyImpulse(vec3(forward).multiplyScalar(-throttlePower * 0.5 * delta), true);

    const torque = new THREE.Vector3(0, 0, 0);
    
    // Smooth mouse steering (Reduced sensitivity for better control)
    const targetMousePitch = -controls.mouseY * rotationSpeed * 1.2;
    const targetMouseYaw = -controls.mouseX * rotationSpeed * 0.8;
    
    // We add mouse influence to existing keyboard controls
    torque.add(right.clone().multiplyScalar(targetMousePitch * delta));
    torque.add(up.clone().multiplyScalar(targetMouseYaw * delta));

    // Dynamic camera offset based on mouse (displacement)
    const camTarget = state.camera.position;
    const lerpFactor = 0.05;
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, controls.mouseX * 2, lerpFactor);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 2 - controls.mouseY, lerpFactor);

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

  const handleCollision = (e: any) => {
    // If we hit something hard (like the ground) at high speed
    if (e.other.rigidBodyObject?.name === "ground") {
      setHp(0); // Instant death on ground collision
    }
  };

  return (
    <>
      <RigidBody
        ref={rb}
        colliders="cuboid"
        position={[0, 50, 0]}
        linearDamping={0.5}
        angularDamping={0.5}
        onCollisionEnter={handleCollision}
      >
        <PerspectiveCamera makeDefault position={[0, 2, 6]} fov={75} />
        
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

          {/* FUSELAGE */}
          <mesh castShadow>
            <boxGeometry args={[0.6, 0.6, 2.5]} />
            <meshStandardMaterial color={hp < 15 ? "#222" : "#4a4e69"} />
          </mesh>

          {/* COCKPIT */}
          <mesh castShadow position={[0, 0.4, 0]}>
            <boxGeometry args={[0.4, 0.3, 0.8]} />
            <meshStandardMaterial color="#8ecae6" transparent opacity={0.6} />
          </mesh>

          {/* PROPELLER */}
          <group position={[0, 0, -1.3]}>
            <mesh ref={propellerRef}>
              <boxGeometry args={[2, 0.1, 0.05]} />
              <meshStandardMaterial color="#222" />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshStandardMaterial color="#333" />
            </mesh>
          </group>

          {/* WINGS */}
          <mesh castShadow position={[0, 0, 0.2]}>
            <boxGeometry args={[4.5, 0.08, 1]} />
            <meshStandardMaterial color="#4a4e69" />
          </mesh>

          {/* TAIL UNIT */}
          <group position={[0, 0, 1.1]}>
            {/* Horizontal Stabilizer */}
            <mesh castShadow>
              <boxGeometry args={[1.5, 0.05, 0.6]} />
              <meshStandardMaterial color="#4a4e69" />
            </mesh>
            {/* Vertical Stabilizer */}
            <mesh castShadow position={[0, 0.4, 0]}>
              <boxGeometry args={[0.05, 0.8, 0.5]} />
              <meshStandardMaterial color="#4a4e69" />
            </mesh>
          </group>
        </group>
      </RigidBody>

      {/* Render local bullets */}
      {bullets.map((b) => (
        <Bullet key={b.id} position={b.pos} rotation={b.rot} onHit={() => {}} />
      ))}
    </>
  );
}
