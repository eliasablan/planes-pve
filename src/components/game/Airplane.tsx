"use client";

import { useFrame } from "@react-three/fiber";
import { CollisionEnterPayload, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useControls } from "@/hooks/useControls";
import { PerspectiveCamera, Trail } from "@react-three/drei";
import { useGameStore } from "@/store/useGameStore";
import { playGameSound } from "@/lib/gameAudio";
import { createPveFiring } from "@/lib/pveCombat";
import { Bullet } from "./Projectiles";
import { AirplaneModel } from "./AirplaneModel";
import { WORLD_TOPOLOGY } from "@/lib/worldTopology";
import {
  DAMAGE,
  applyLocalDamage,
  eliminateLocalPlayer,
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

export function Airplane() {
  const rb = useRef<RapierRigidBody>(null);
  const propellerRef = useRef<THREE.Group | null>(null);
  const controls = useControls();
  const hp = useGameStore((state) => state.hp);
  const [firing] = useState(() => createPveFiring({ getState: useGameStore.getState, playSound: playGameSound }));
  
  const [bullets, setBullets] = useState<{ id: string, pos: [number, number, number], rot: [number, number, number, number] }[]>([]);
  
  const currentThrottle = useRef(88);
  const spawnTime = useRef(0);
  const invulnerabilityDuration = 3000;
  const lastDamage = useRef(0);

  const { damageRadius } = WORLD_TOPOLOGY.combatBoundary;

  useEffect(() => {
    spawnTime.current = Date.now();
  }, []);

  useFrame((state, delta) => {
    const game = useGameStore.getState();
    if (!rb.current || game.hp <= 0 || game.paused) return;

    if (controls.selectMG) game.setSelectedWeapon('mg');
    if (controls.selectMissile) game.setSelectedWeapon('missile');

    const rotation = rb.current.rotation();
    const translation = rb.current.translation();
    const basis = getFlightBasis(rotation);
    
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
    game.publishFlight({
      localPlayerPosition: [translation.x, translation.z],
      ...getFlightTelemetry(translation, currentSpeed, basis.rotation),
    });

    // 7. TARGET LOCK
    const { lock, fired } = firing.update({
      now: Date.now(),
      firing: controls.fire,
      origin: [translation.x, translation.y, translation.z],
      forward: [basis.forward.x, basis.forward.y, basis.forward.z],
    });
    game.setTargetLock(lock);

    // Tracers remain visual feedback for accepted machine-gun shots.
    const now = Date.now();
    if (fired === "mg") {
      const bId = crypto.randomUUID();
      setBullets((prev) => [...prev, { id: bId, pos: [translation.x, translation.y, translation.z], rot: [rotation.x, rotation.y, rotation.z, rotation.w] }]);
      setTimeout(() => setBullets((prev) => prev.filter(b => b.id !== bId)), 2000);
    }

    const distToCenter = Math.sqrt(translation.x * translation.x + translation.z * translation.z);
    if (distToCenter > damageRadius && now - lastDamage.current > 1000) {
      lastDamage.current = now;
      applyLocalDamage(DAMAGE.boundary);
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
          <AirplaneModel hp={hp} variant="player" playerColor="#d9e2ec" propellerRef={propellerRef} />
        </group>
      </RigidBody>
      {bullets.map((b) => (
        <Bullet key={b.id} position={b.pos} rotation={b.rot} />
      ))}
    </>
  );
}
