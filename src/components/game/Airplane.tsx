"use client";

import { useFrame } from "@react-three/fiber";
import { CollisionEnterPayload, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useControls } from "@/hooks/useControls";
import { PerspectiveCamera, Trail } from "@react-three/drei";
import { useGameStore } from "@/store/useGameStore";
import { Bullet } from "./Projectiles";
import {
  applyLocalDamage,
  DAMAGE,
  eliminateLocalPlayer,
  resolveFlareUse,
  resolveMachineGunShot,
  resolveMissileFire,
} from "@/lib/combatResolution";
import { publishLocalSnapshot } from "@/lib/realtimeRoom";
import {
  applyFlightForces,
  applyFlightTorque,
  applySpeedCamera,
  getBodySpeed,
  getFlightBasis,
  getFlightTelemetry,
  nextThrottle,
} from "@/lib/flightFrame";

export function Airplane({ userId, username, roomName }: { userId: string, username: string, roomName: string }) {
  const rb = useRef<RapierRigidBody>(null);
  const propellerRef = useRef<THREE.Mesh>(null);
  const controls = useControls();
  const { hp, selectedWeapon, ammo, missiles, flares, zoneRadius, zoneCenter } = useGameStore();
  const { setFlightData, setSelectedWeapon, setShowLargeMap, setLocalPlayerPosition } = useGameStore();
  
  const [bullets, setBullets] = useState<{ id: string, pos: [number, number, number], rot: [number, number, number, number] }[]>([]);
  
  const currentThrottle = useRef(25);
  const lastBroadcast = useRef(0);
  const broadcastInterval = 1000 / 30; 
  const spawnTime = useRef(0);
  const invulnerabilityDuration = 3000;
  const lastDamage = useRef(0);

  const lastShot = useRef(0);
  const lastMissile = useRef(0);
  const lastFlare = useRef(0);
  const mgInterval = 150; 
  const missileInterval = 2000;
  const flareInterval = 1000;

  useEffect(() => {
    spawnTime.current = Date.now();
  }, []);

  useEffect(() => {
    setShowLargeMap(controls.showLargeMap);
  }, [controls.showLargeMap, setShowLargeMap]);

  useFrame((state, delta) => {
    if (!rb.current || hp <= 0) return;

    if (controls.selectMG) setSelectedWeapon('mg');
    if (controls.selectMissile) setSelectedWeapon('missile');

    const rotation = rb.current.rotation();
    const translation = rb.current.translation();
    const basis = getFlightBasis(rotation);
    
    setLocalPlayerPosition([translation.x, translation.z]);

    const currentSpeed = getBodySpeed(rb.current);
    
    if (translation.y < -4.5) {
      eliminateLocalPlayer();
      return;
    }

    currentThrottle.current = nextThrottle(currentThrottle.current, controls, delta);
    applyFlightForces(rb.current, basis, currentThrottle.current, currentSpeed, delta);
    applyFlightTorque(rb.current, state.camera, basis, controls, delta);
    applySpeedCamera(state.camera, currentSpeed);

    if (propellerRef.current) {
      propellerRef.current.rotation.z += delta * (currentThrottle.current + currentSpeed);
    }

    // 6. TELEMETRY
    setFlightData(getFlightTelemetry(translation, currentSpeed, basis.rotation));

    // 7. SHOOTING & BROADCAST
    const now = Date.now();
    if (controls.fire) {
      if (selectedWeapon === 'mg' && now - lastShot.current > mgInterval && ammo > 0) {
        lastShot.current = now;
        const shot = resolveMachineGunShot({
          roomName,
          shooterId: userId,
          shooterName: username,
          position: [translation.x, translation.y, translation.z],
          forward: [basis.forward.x, basis.forward.y, basis.forward.z],
        });

        if (shot.fired) {
          const bId = crypto.randomUUID();
          setBullets((prev) => [...prev, { id: bId, pos: [translation.x, translation.y, translation.z], rot: [rotation.x, rotation.y, rotation.z, rotation.w] }]);
          setTimeout(() => setBullets((prev) => prev.filter(b => b.id !== bId)), 2000);
        }
      } else if (selectedWeapon === 'missile' && now - lastMissile.current > missileInterval && missiles > 0) {
        lastMissile.current = now;
        resolveMissileFire();
      }
    }

    if (controls.flare && now - lastFlare.current > flareInterval && flares > 0) {
      lastFlare.current = now;
      resolveFlareUse();
    }

    if (now - lastBroadcast.current > broadcastInterval) {
      lastBroadcast.current = now;
      void publishLocalSnapshot(roomName, {
        id: userId,
        username,
        position: [translation.x, translation.y, translation.z],
        rotation: [rotation.x, rotation.y, rotation.z, rotation.w],
        hp
      });
    }

    const dx = translation.x - zoneCenter[0];
    const dz = translation.z - zoneCenter[1];
    const distToCenter = Math.sqrt(dx * dx + dz * dz);
    if (distToCenter > zoneRadius && now - lastDamage.current > 1000) {
      lastDamage.current = now;
      applyLocalDamage(DAMAGE.zone);
    }
  });

  const handleCollision = (e: CollisionEnterPayload) => {
    if (Date.now() - spawnTime.current < invulnerabilityDuration) return;
    if (e.other.rigidBodyObject?.name === "ground") {
      eliminateLocalPlayer();
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
