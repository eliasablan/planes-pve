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
  const { hp, selectedWeapon, ammo, missiles, flares } = useGameStore();
  const { useAmmo, useMissile, useFlare, setFlightData, setHp, setSelectedWeapon } = useGameStore();
  
  // Local state for projectiles
  const [bullets, setBullets] = useState<{ id: string, pos: [number, number, number], rot: [number, number, number, number] }[]>([]);
  
  // Physics constants (Aerodynamic Refinement)
  const maxThrust = 45;
  const gravityConst = 9.81;
  const stallSpeed = 15; // Speed below which lift is lost
  const rotationSpeed = 2.8;
  const dragCoeff = 0.992;
  
  // Internal state
  const currentThrottle = useRef(25);
  const lastBroadcast = useRef(0);
  const broadcastInterval = 1000 / 30; // 30Hz

  // Combat timers
  const lastShot = useRef(0);
  const lastMissile = useRef(0);
  const lastFlare = useRef(0);
  const mgInterval = 150; 
  const missileInterval = 2000;
  const flareInterval = 1000;

  useFrame((state, delta) => {
    if (!rb.current || hp <= 0) return;

    // Handle Weapon Selection
    if (controls.selectMG) setSelectedWeapon('mg');
    if (controls.selectMissile) setSelectedWeapon('missile');

    const rotation = rb.current.rotation();
    const translation = rb.current.translation();
    const currentRotation = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    
    // Direction vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(currentRotation);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(currentRotation);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(currentRotation);

    // Speed calculation
    const linVel = rb.current.linvel();
    const currentSpeed = Math.sqrt(linVel.x**2 + linVel.y**2 + linVel.z**2);
    
    // 1. THROTTLE & THRUST
    if (controls.throttleUp) currentThrottle.current = Math.min(currentThrottle.current + delta * 20, maxThrust);
    if (controls.throttleDown) currentThrottle.current = Math.max(currentThrottle.current - delta * 20, 0);
    if (controls.brake) currentThrottle.current = Math.max(currentThrottle.current - delta * 40, 0);

    // Apply forward thrust
    rb.current.applyImpulse(vec3(forward).multiplyScalar(currentThrottle.current * delta), true);

    // 2. LIFT & STALL PHYSICS
    // Lift is proportional to speed. At speed 0, gravity wins.
    const liftFactor = Math.min(currentSpeed / stallSpeed, 1.1);
    const liftForce = new THREE.Vector3(0, gravityConst, 0).multiplyScalar(liftFactor);
    const weightForce = new THREE.Vector3(0, -gravityConst, 0);
    
    // Apply net vertical force (Lift vs Gravity)
    rb.current.applyImpulse(vec3(liftForce.add(weightForce)).multiplyScalar(delta), true);

    // 3. DRAG (Natural air resistance)
    rb.current.setLinvel(vec3(rb.current.linvel()).multiplyScalar(dragCoeff), true);

    // 4. ROTATION (Torque)
    const torque = new THREE.Vector3(0, 0, 0);
    
    // Mouse Influence (Conditional)
    if (controls.mouseControlEnabled) {
      const targetMousePitch = -controls.mouseY * rotationSpeed * 1.5;
      const targetMouseYaw = -controls.mouseX * rotationSpeed * 1.0;
      torque.add(right.clone().multiplyScalar(targetMousePitch * delta));
      torque.add(up.clone().multiplyScalar(targetMouseYaw * delta));

      // Dynamic camera follow lerp (Only when mouse enabled)
      const camLerp = 0.08;
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, controls.mouseX * 3, camLerp);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 2.5 - controls.mouseY, camLerp);
    } else {
      // Reset camera to default center if mouse disabled
      const camLerp = 0.05;
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, 0, camLerp);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 2.5, camLerp);
    }

    // Keyboard Overrides (Always active)
    if (controls.pitchUp) torque.add(right.clone().multiplyScalar(rotationSpeed * delta));
    if (controls.pitchDown) torque.add(right.clone().multiplyScalar(-rotationSpeed * delta));
    if (controls.yawLeft) torque.add(up.clone().multiplyScalar(rotationSpeed * 0.8 * delta));
    if (controls.yawRight) torque.add(up.clone().multiplyScalar(-rotationSpeed * 0.8 * delta));
    if (controls.rollLeft) torque.add(forward.clone().multiplyScalar(-rotationSpeed * 1.2 * delta));
    if (controls.rollRight) torque.add(forward.clone().multiplyScalar(rotationSpeed * 1.2 * delta));

    rb.current.applyTorqueImpulse(vec3(torque), true);
    rb.current.setAngvel(vec3(rb.current.angvel()).multiplyScalar(0.96), true);

    // 5. CAMERA DYNAMICS
    const speedFactor = THREE.MathUtils.clamp(currentSpeed / (maxThrust * 1.2), 0, 1);
    const camera = state.camera as THREE.PerspectiveCamera;
    if (camera.fov !== undefined) {
      camera.fov = THREE.MathUtils.lerp(75, 95, speedFactor);
      camera.updateProjectionMatrix();
    }

    if (speedFactor > 0.6) {
      const shake = (speedFactor - 0.6) * 0.08;
      state.camera.position.x += (Math.random() - 0.5) * shake;
      state.camera.position.y += (Math.random() - 0.5) * shake;
    }

    // Propeller animation
    if (propellerRef.current) {
      propellerRef.current.rotation.z += delta * (currentThrottle.current + currentSpeed);
    }

    // 6. TELEMETRY
    const euler = new THREE.Euler().setFromQuaternion(currentRotation, 'YXZ');
    setFlightData({
      altitude: Math.max(0, translation.y + 2), 
      speed: currentSpeed * 10,
      pitch: (euler.x * 180) / Math.PI,
      roll: (euler.z * 180) / Math.PI
    });

    // 7. SHOOTING & BROADCAST
    const now = Date.now();
    if (controls.fire) {
      if (selectedWeapon === 'mg' && now - lastShot.current > mgInterval && ammo > 0) {
        lastShot.current = now;
        useAmmo();
        const bId = crypto.randomUUID();
        setBullets((prev) => [...prev, { id: bId, pos: [translation.x, translation.y, translation.z], rot: [rotation.x, rotation.y, rotation.z, rotation.w] }]);
        setTimeout(() => setBullets((prev) => prev.filter(b => b.id !== bId)), 2000);
      } else if (selectedWeapon === 'missile' && now - lastMissile.current > missileInterval && missiles > 0) {
        lastMissile.current = now;
        useMissile();
      }
    }

    if (controls.flare && now - lastFlare.current > flareInterval && flares > 0) {
      lastFlare.current = now;
      useFlare();
    }

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
    if (e.other.rigidBodyObject?.name === "ground") {
      setHp(0);
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
          {hp < 75 && (
            <Trail width={1} length={5} color={hp < 40 ? "black" : "white"} attenuation={(t) => t * t}>
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
            <mesh castShadow><boxGeometry args={[1.5, 0.05, 0.6]} /><meshStandardMaterial color="#4a4e69" /></mesh>
            <mesh castShadow position={[0, 0.4, 0]}><boxGeometry args={[0.05, 0.8, 0.5]} /><meshStandardMaterial color="#4a4e69" /></mesh>
          </group>
        </group>
      </RigidBody>

      {Object.values(bullets).map((b) => (
        <Bullet key={b.id} position={b.pos} rotation={b.rot} onHit={() => {}} />
      ))}
    </>
  );
}
