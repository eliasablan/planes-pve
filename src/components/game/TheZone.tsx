"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/useGameStore";

export function TheZone({ maxRadius = 1000, totalDuration = 300000 }) { // 5 mins
  const meshRef = useRef<THREE.Mesh>(null);
  const wallRef = useRef<THREE.Mesh>(null);
  const { startTime, setZoneRadius } = useGameStore();
  const lastDamage = useRef(0);

  useFrame((state, delta) => {
    if (!startTime || !meshRef.current || !wallRef.current) return;

    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / totalDuration, 1);
    const currentRadius = maxRadius * (1 - progress);

    setZoneRadius(currentRadius);

    meshRef.current.scale.set(currentRadius, currentRadius, 1);
    wallRef.current.scale.set(currentRadius, currentRadius, 1);

    // Local player damage check
    // We get player position from camera
    const playerPos = state.camera.position;
    const distance = Math.sqrt(playerPos.x ** 2 + playerPos.z ** 2);

    if (distance > currentRadius && Date.now() - lastDamage.current > 1000) {
      lastDamage.current = Date.now();
      useGameStore.getState().reduceHp(10); // "Gas" damage
    }
  });

  return (
    <group>
      {/* Floor Ring */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.9, 0]}>
        <ringGeometry args={[0.99, 1.05, 128]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Vertical "Gas" Wall */}
      <mesh ref={wallRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 500, 0]}>
        <cylinderGeometry args={[1, 1, 1000, 128, 1, true]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
