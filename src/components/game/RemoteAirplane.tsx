"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { PlayerState } from "@/store/useGameStore";
import { Text } from "@react-three/drei";

interface RemoteAirplaneProps {
  data: PlayerState;
}

export function RemoteAirplane({ data }: RemoteAirplaneProps) {
  const meshRef = useRef<THREE.Group>(null);
  const targetPos = new THREE.Vector3(...data.position);
  const targetRot = new THREE.Quaternion(...data.rotation);

  useFrame(() => {
    if (!meshRef.current) return;

    // Smoothly interpolate position and rotation
    meshRef.current.position.lerp(targetPos, 0.1);
    meshRef.current.quaternion.slerp(targetRot, 0.1);
  });

  return (
    <group ref={meshRef} position={data.position} quaternion={data.rotation}>
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {data.username}
      </Text>
      
      {/* Airplane Model Placeholder */}
      <group>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.5, 2]} />
          <meshStandardMaterial color={data.hp < 50 ? "red" : "blue"} />
        </mesh>
        <mesh castShadow position={[0, 0, 0]}>
          <boxGeometry args={[3, 0.1, 0.8]} />
          <meshStandardMaterial color={data.hp < 50 ? "darkred" : "darkblue"} />
        </mesh>
      </group>
    </group>
  );
}
