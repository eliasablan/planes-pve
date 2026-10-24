"use client";

import { useFrame } from "@react-three/fiber";
import { CollisionEnterPayload, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useControls } from "@/hooks/useControls";
import { PerspectiveCamera, Trail } from "@react-three/drei";
import { useGameStore } from "@/store/useGameStore";
import { playGameSound } from "@/lib/gameAudio";
import { createWeaponAudioFeedback } from "@/lib/weaponAudioFeedback";
import { firePveMachineGun, firePveMissile, findTargetLock } from "@/lib/pveCombat";
import { Bullet } from "./Projectiles";
import { AirplaneModel } from "./AirplaneModel";
import { WORLD_TOPOLOGY } from "@/lib/worldTopology";
import {
  DAMAGE,
  applyLocalDamage,
  eliminateLocalPlayer,
  resolveMachineGunShot,
} from "@/lib/combatResolution";
import {
  applyFlightForces,
  applyFlightTorque,
  applySpeedCamera,
  getBodySpeed,
  getFlightBasis,
  getFlightTelemetry,
  nextThrottle,
} from "@/lib/flightFrame";

export function Airplane({ userId, username, roomName }: { userId: string, username: string, roomName?: string }) {
  const rb = useRef<RapierRigidBody>(null);
  const propellerRef = useRef<THREE.Group | null>(null);
  const controls = useControls();
  const hp = useGameStore((state) => state.hp);
  const {
    setFlightData,
    setSelectedWeapon,
    setShowLargeMap,
    setLocalPlayerPosition,
    setBoundaryWarning,
    setTargetLock,
    useAmmo: consumeAmmo,
    useMissile: consumeMissile,
    damagePveEnemy,
  } = useGameStore();
  
  const [bullets, setBullets] = useState<{ id: string, pos: [number, number, number], rot: [number, number, number, number] }[]>([]);
  
  const currentThrottle = useRef(88);
  const lastBroadcast = useRef(0);
  const broadcastInterval = 1000 / 30; 
  const spawnTime = useRef(0);
  const invulnerabilityDuration = 3000;
  const lastDamage = useRef(0);

  const weaponAudio = useRef(createWeaponAudioFeedback());
  const lastShot = useRef(0);
  const lastMissile = useRef(0);
  const mgInterval = 150; 
  const missileInterval = 2000;
  const { warningRadius, damageRadius } = WORLD_TOPOLOGY.combatBoundary;

  useEffect(() => {
    spawnTime.current = Date.now();
  }, []);

  useEffect(() => {
    setShowLargeMap(controls.showLargeMap);
  }, [controls.showLargeMap, setShowLargeMap]);

  useFrame((state, delta) => {
    if (!rb.current || useGameStore.getState().hp <= 0 || useGameStore.getState().paused) return;

    if (controls.selectMG) setSelectedWeapon('mg');
    if (controls.selectMissile) setSelectedWeapon('missile');
    const { selectedWeapon, ammo, missiles, pveEnemies } = useGameStore.getState();

    const rotation = rb.current.rotation();
    const translation = rb.current.translation();
    const basis = getFlightBasis(rotation);
    
    setLocalPlayerPosition([translation.x, translation.z]);

    const currentSpeed = getBodySpeed(rb.current);
    
    if (translation.y < WORLD_TOPOLOGY.seaLevel + 0.5) {
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

    // 7. TARGET LOCK
    const lock = findTargetLock(
      Object.values(useGameStore.getState().pveEnemies),
      [translation.x, translation.y, translation.z],
      [basis.forward.x, basis.forward.y, basis.forward.z],
      selectedWeapon,
    );
    const currentLock = useGameStore.getState().targetLock;
    if (
      lock?.id !== currentLock?.id ||
      lock?.inSolution !== currentLock?.inSolution ||
      (lock && currentLock && Math.abs(lock.distance - currentLock.distance) >= 10)
    ) {
      setTargetLock(lock);
    }

    // 8. SHOOTING & BROADCAST
    const now = Date.now();
    for (const event of weaponAudio.current.update(controls.fire, selectedWeapon, ammo, missiles)) {
      playGameSound(event);
    }
    if (controls.fire) {
      if (selectedWeapon === 'mg' && now - lastShot.current > mgInterval && ammo > 0) {
        lastShot.current = now;
        const shot = roomName
          ? resolveMachineGunShot({
              roomName,
              shooterId: userId,
              shooterName: username,
              position: [translation.x, translation.y, translation.z],
              forward: [basis.forward.x, basis.forward.y, basis.forward.z],
            })
          : firePveMachineGun({
              enemies: Object.values(pveEnemies),
              origin: [translation.x, translation.y, translation.z],
              forward: [basis.forward.x, basis.forward.y, basis.forward.z],
              consumeAmmo,
              damagePveEnemy,
            });

        if (shot.fired) {
          weaponAudio.current.confirmShot("mg", useGameStore.getState().ammo).forEach(playGameSound);
          const bId = crypto.randomUUID();
          setBullets((prev) => [...prev, { id: bId, pos: [translation.x, translation.y, translation.z], rot: [rotation.x, rotation.y, rotation.z, rotation.w] }]);
          setTimeout(() => setBullets((prev) => prev.filter(b => b.id !== bId)), 2000);
        }
      } else if (selectedWeapon === 'missile' && now - lastMissile.current > missileInterval && missiles > 0) {
        lastMissile.current = now;
        consumeMissile();
        weaponAudio.current.confirmShot("missile", useGameStore.getState().missiles).forEach(playGameSound);
        firePveMissile({
          enemies: Object.values(pveEnemies),
          origin: [translation.x, translation.y, translation.z],
          forward: [basis.forward.x, basis.forward.y, basis.forward.z],
          damagePveEnemy,
        });
      }
    }

    if (roomName && now - lastBroadcast.current > broadcastInterval) {
      lastBroadcast.current = now;
      void import("@/lib/realtimeRoom").then(({ publishLocalSnapshot }) => {
        void publishLocalSnapshot(roomName, {
          id: userId,
          username,
          position: [translation.x, translation.y, translation.z],
          rotation: [rotation.x, rotation.y, rotation.z, rotation.w],
          hp,
        });
      });
    }

    const distToCenter = Math.sqrt(translation.x * translation.x + translation.z * translation.z);
    if (distToCenter > warningRadius) {
      setBoundaryWarning("Return to combat airspace");
    } else {
      setBoundaryWarning(null);
    }

    if (distToCenter > damageRadius && now - lastDamage.current > 1000) {
      lastDamage.current = now;
      applyLocalDamage(DAMAGE.collision / 5);
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
        <PerspectiveCamera makeDefault position={[0, 1.5, 5]} fov={75} near={1} far={5000} />
        <group>
          {hp < 75 && (
            <Trail width={1.5} length={8} color={hp < 40 ? "#111" : "#fff"} attenuation={(t) => t * t}>
              <mesh position={[0, 0, 1.2]} />
            </Trail>
          )}
          <AirplaneModel hp={hp} variant="local" playerColor="#d9e2ec" propellerRef={propellerRef} />
        </group>
      </RigidBody>
      {bullets.map((b) => (
        <Bullet key={b.id} position={b.pos} rotation={b.rot} onHit={() => {}} />
      ))}
    </>
  );
}
