"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/useGameStore";

export function TheZone({ maxRadius = 500, totalDuration = 600000 }) { // 10 mins
  const meshRef = useRef<THREE.Mesh>(null);
  const { startTime, setHp, hp } = useGameStore();
  const lastDamage = useRef(0);

  useFrame((state, delta) => {
    if (!startTime || !meshRef.current) return;

    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / totalDuration, 1);
    const currentRadius = maxRadius * (1 - progress);

    meshRef.current.scale.set(currentRadius, 1, currentRadius);

    // Local player damage check
    const playerPos = state.camera.position; // Simplification: use camera or store pos
    const distance = Math.sqrt(playerPos.x ** 2 + playerPos.z ** 2);

    if (distance > currentRadius && Date.now() - lastDamage.current > 1000) {
      lastDamage.current = Date.now();
      useGameStore.getState().reduceHp(10);
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <ringGeometry args={[0.99, 1, 64]} />
      <meshBasicMaterial color="red" transparent opacity={0.5} side={THREE.DoubleSide} />
      
      {/* Visual Cylinder for the wall */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 500]}>
        <cylinderGeometry args={[1, 1, 1000, 64, 1, true]} />
        <meshBasicMaterial color="red" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
    </mesh>
  );
}
