"use client";

import { useFrame } from "@react-three/fiber";
import { RigidBody, RapierRigidBody, vec3, quat } from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
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
  const { useAmmo, useMissile, useFlare, setFlightData, setHp, setSelectedWeapon, setShowLargeMap } = useGameStore();
  
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
  const lastDamage = useRef(0);

  // COMBAT REFS (RESTORED)
  const lastShot = useRef(0);
  const lastMissile = useRef(0);
  const lastFlare = useRef(0);
  const mgInterval = 150; 
  const missileInterval = 2000;
  const flareInterval = 1000;

  useEffect(() => {
    setShowLargeMap(controls.showLargeMap);
  }, [controls.showLargeMap, setShowLargeMap]);

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
    
    if (translation.y < -4.5) {
      setHp(0);
      return;
    }

    if (controls.throttleUp) currentThrottle.current = Math.min(currentThrottle.current + delta * 20, maxThrust);
    if (controls.throttleDown) currentThrottle.current = Math.max(currentThrottle.current - delta * 20, 0);
    if (controls.brake) currentThrottle.current = Math.max(currentThrottle.current - delta * 40, 0);
    rb.current.applyImpulse(vec3(forward).multiplyScalar(currentThrottle.current * delta), true);

    const liftFactor = Math.min(currentSpeed / stallSpeed, 1.1);
    const liftForce = new THREE.Vector3(0, gravityConst, 0).multiplyScalar(liftFactor);
    const weightForce = new THREE.Vector3(0, -gravityConst, 0);
    rb.current.applyImpulse(vec3(liftForce.add(weightForce)).multiplyScalar(delta), true);

    rb.current.setLinvel(vec3(rb.current.linvel()).multiplyScalar(dragCoeff), true);

    const torque = new THREE.Vector3(0, 0, 0);
    if (controls.mouseControlEnabled) {
      const targetMousePitch = -controls.mouseY * rotationSpeed * 1.5;
      const targetMouseYaw = -controls.mouseX * rotationSpeed * 1.0;
      torque.add(right.clone().multiplyScalar(targetMousePitch * delta));
      torque.add(up.clone().multiplyScalar(targetMouseYaw * delta));
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, controls.mouseX * 3, 0.08);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 2.0 - controls.mouseY, 0.08);
    } else {
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, 0, 0.05);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 2.0, 0.05);
    }

    if (controls.pitchUp) torque.add(right.clone().multiplyScalar(rotationSpeed * delta));
    if (controls.pitchDown) torque.add(right.clone().multiplyScalar(-rotationSpeed * delta));
    if (controls.yawLeft) torque.add(up.clone().multiplyScalar(rotationSpeed * 0.8 * delta));
    if (controls.yawRight) torque.add(up.clone().multiplyScalar(-rotationSpeed * 0.8 * delta));
    if (controls.rollLeft) torque.add(forward.clone().multiplyScalar(-rotationSpeed * 1.2 * delta));
    if (controls.rollRight) torque.add(forward.clone().multiplyScalar(rotationSpeed * 1.2 * delta));

    rb.current.applyTorqueImpulse(vec3(torque), true);
    rb.current.setAngvel(vec3(rb.current.angvel()).multiplyScalar(0.96), true);

    const speedFactor = THREE.MathUtils.clamp(currentSpeed / (maxThrust * 1.2), 0, 1);
    const camera = state.camera as THREE.PerspectiveCamera;
    if (camera.fov !== undefined) {
      camera.fov = THREE.MathUtils.lerp(75, 95, speedFactor);
      camera.updateProjectionMatrix();
    }

    if (propellerRef.current) {
      propellerRef.current.rotation.z += delta * (currentThrottle.current + currentSpeed);
    }

    const euler = new THREE.Euler().setFromQuaternion(currentRotation, 'YXZ');
    setFlightData({
      altitude: translation.y + 5, 
      speed: currentSpeed * 10,
      pitch: (euler.x * 180) / Math.PI,
      roll: (euler.z * 180) / Math.PI
    });

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
        payload: { id: userId, username, position: [translation.x, translation.y, translation.z], rotation: [rotation.x, rotation.y, rotation.z, rotation.w], hp }
      });
    }

    const dx = translation.x - zoneCenter[0];
    const dz = translation.z - zoneCenter[1];
    const distToCenter = Math.sqrt(dx * dx + dz * dz);
    if (distToCenter > zoneRadius && now - lastDamage.current > 1000) {
      lastDamage.current = now;
      setHp(Math.max(0, hp - 15)); 
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
          {hp < 75 && (
            <Trail width={1.5} length={8} color={hp < 40 ? "#111" : "#fff"} attenuation={(t) => t * t}>
              <mesh position={[0, 0, 1.2]} />
            </Trail>
          )}
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.25, 0.3, 2.5, 12]} />
            <meshStandardMaterial color={hp < 15 ? "#1a1a1a" : "#ced4da"} metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh castShadow position={[0, 0.35, -0.2]}>
            <sphereGeometry args={[0.35, 16, 16]} scale={[1, 0.6, 1.5]} />
            <meshPhysicalMaterial color="#a2d2ff" transmission={1} thickness={0.5} roughness={0} ior={1.5} transparent opacity={0.4} />
          </mesh>
          <group position={[0, 0, -1.5]}>
            <mesh ref={propellerRef}><boxGeometry args={[2.2, 0.12, 0.04]} /><meshStandardMaterial color="#212529" metalness={0.5} /></mesh>
          </group>
          <mesh castShadow position={[0, 0, -0.1]}>
            <boxGeometry args={[5, 0.06, 1.2]} />
            <meshStandardMaterial color="#adb5bd" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[2.5, 0, -0.1]}><boxGeometry args={[0.1, 0.1, 0.4]} /><meshStandardMaterial color="#ef233c" emissive="#ef233c" emissiveIntensity={2} /></mesh>
          <mesh position={[-2.5, 0, -0.1]}><boxGeometry args={[0.1, 0.1, 0.4]} /><meshStandardMaterial color="#2b9348" emissive="#2b9348" emissiveIntensity={2} /></mesh>
          <group position={[0, 0, 1.2]}>
            <mesh castShadow><boxGeometry args={[1.8, 0.04, 0.7]} /><meshStandardMaterial color="#adb5bd" metalness={0.7} /></mesh>
            <mesh castShadow position={[0, 0.45, 0.1]}><boxGeometry args={[0.04, 1, 0.6]} /><meshStandardMaterial color="#adb5bd" metalness={0.7} /></mesh>
          </group>
        </group>
      </RigidBody>
      {bullets.map((b) => (
        <Bullet key={b.id} position={b.pos} rotation={b.rot} onHit={() => {}} />
      ))}
    </>
  );
}
