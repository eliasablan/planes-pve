"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/useGameStore";

export function TheZone({ initialRadius = 1500 }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wallRef = useRef<THREE.Mesh>(null);
  const targetMeshRef = useRef<THREE.Mesh>(null);
  
  const { startTime, setZoneData, setTargetZoneData } = useGameStore();
  
  const [phase, setPhase] = useState(0);
  const [currentRadius, setCurrentRadius] = useState(initialRadius);
  const [currentCenter, setCurrentCenter] = useState<[number, number]>([0, 0]);
  const [targetRadius, setTargetRadius] = useState(initialRadius);
  const [targetCenter, setTargetCenter] = useState<[number, number]>([0, 0]);
  
  const lastDamage = useRef(0);
  const phaseDuration = 60000;

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setPhase(p => {
        const nextPhase = p + 1;
        const nextRadius = initialRadius * Math.pow(0.6, nextPhase);
        const angle = Math.random() * Math.PI * 2;
        const maxDist = Math.max(0, currentRadius - nextRadius);
        const dist = Math.random() * maxDist;
        const nextX = currentCenter[0] + Math.cos(angle) * dist;
        const nextZ = currentCenter[1] + Math.sin(angle) * dist;
        setTargetRadius(nextRadius);
        setTargetCenter([nextX, nextZ]);
        setTargetZoneData({ radius: nextRadius, center: [nextX, nextZ] });
        return nextPhase;
      });
    }, phaseDuration);
    return () => clearInterval(interval);
  }, [startTime, initialRadius, currentRadius, currentCenter, setTargetZoneData]);

  useFrame((state, delta) => {
    if (!startTime) return;

    const lerpFactor = delta * 0.1;
    const newRadius = THREE.MathUtils.lerp(currentRadius, targetRadius, lerpFactor);
    const newX = THREE.MathUtils.lerp(currentCenter[0], targetCenter[0], lerpFactor);
    const newZ = THREE.MathUtils.lerp(currentCenter[1], targetCenter[1], lerpFactor);

    setCurrentRadius(newRadius);
    setCurrentCenter([newX, newZ]);
    setZoneData({ radius: newRadius, center: [newX, newZ] });

    if (meshRef.current && wallRef.current && targetMeshRef.current) {
      // RING FLOOR
      meshRef.current.position.set(newX, -1.4, newZ);
      meshRef.current.scale.set(newRadius, newRadius, 1);
      
      // VERTICAL WALL (Fixed Y scale to 1, scale only X and Z)
      wallRef.current.position.set(newX, 0, newZ);
      wallRef.current.scale.set(newRadius, 1, newRadius);

      // NEXT SAFE AREA
      targetMeshRef.current.position.set(targetCenter[0], -1.35, targetCenter[1]);
      targetMeshRef.current.scale.set(targetRadius, targetRadius, 1);
    }

    const playerPos = state.camera.position;
    const dx = playerPos.x - newX;
    const dz = playerPos.z - newZ;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance > newRadius && Date.now() - lastDamage.current > 1000) {
      lastDamage.current = Date.now();
      const damage = Math.min(25, phase * 2 + 5);
      useGameStore.getState().reduceHp(damage);
    }
  });

  return (
    <group>
      {/* Floor Ring */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.98, 1.02, 128]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={1} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Vertical Wall - Fixed Geometry Scaling */}
      <mesh ref={wallRef}>
        <cylinderGeometry args={[1, 1, 5000, 128, 1, true]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* Target Safe Area */}
      <mesh ref={targetMeshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.99, 1.0, 128]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
