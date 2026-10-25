"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/useGameStore";
import { hasTerrainLineOfSight } from "@/lib/terrainHeight";

interface BulletProps {
  position: [number, number, number];
  rotation: [number, number, number, number];
}

const TRACER_SPEED = 420;
const TRACER_LIFETIME_MS = 1100;

// Visual-only tracer: machine gun hits are resolved hitscan in Airplane, so no physics body is needed.
export function Bullet({ position, rotation }: BulletProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [alive, setAlive] = useState(true);
  const forward = useMemo(
    () => new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(...rotation)),
    [rotation],
  );

  useEffect(() => {
    const timer = setTimeout(() => setAlive(false), TRACER_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current || !alive || useGameStore.getState().paused) return;
    const start = groupRef.current.position;
    const end = start.clone().addScaledVector(forward, TRACER_SPEED * delta);
    if (!hasTerrainLineOfSight(start.toArray(), end.toArray())) {
      groupRef.current.visible = false;
      setAlive(false);
      return;
    }
    start.copy(end);
  });

  if (!alive) return null;

  return (
    <group ref={groupRef} position={position} quaternion={rotation}>
      <mesh position={[0, -0.15, -6]}>
        <boxGeometry args={[0.16, 0.16, 6]} />
        <meshBasicMaterial color="#fff1b8" toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.15, -6]}>
        <boxGeometry args={[0.55, 0.55, 6.6]} />
        <meshBasicMaterial
          color="#f4a33d"
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
