"use client";

import { Sky, Stars, Environment as DreiEnvironment } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Environment() {
  const oceanRef = useRef<THREE.Mesh>(null);

  const details = useMemo(() => {
    const items = [];
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 150 + Math.random() * 800;
      items.push({
        position: [Math.cos(angle) * radius, -1.4, Math.sin(angle) * radius],
        scale: 0.5 + Math.random() * 1.5,
        type: Math.random() > 0.3 ? "tree" : "rock",
      });
    }
    return items;
  }, []);

  return (
    <>
      <Sky distance={450000} sunPosition={[10, 10, 10]} inclination={0} azimuth={0.25} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[100, 200, 100]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]} // Menor resolución para más estabilidad
        shadow-bias={-0.001} // Bias más agresivo para evitar shadow acne (rayas)
        shadow-camera-left={-1500}
        shadow-camera-right={1500}
        shadow-camera-top={1500}
        shadow-camera-bottom={-1500}
      />

      {/* MAR: Posición fija más abajo para evitar Z-fighting */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
        <planeGeometry args={[10000, 10000]} />
        <meshStandardMaterial color="#004d7a" roughness={0.3} metalness={0.2} />
      </mesh>

      <RigidBody type="fixed" colliders="hull" name="ground">
        {/* ISLA: Capa de Pasto */}
        <mesh receiveShadow position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1000, 64]} />
          <meshStandardMaterial color="#2d6a4f" />
        </mesh>
        
        {/* PLAYA: Un poco más abajo que el pasto */}
        <mesh receiveShadow position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1050, 64]} />
          <meshStandardMaterial color="#c2b280" />
        </mesh>

        {/* MONTAÑAS: Formas simples y sólidas */}
        <group position={[0, -1.5, 0]}>
          <mesh position={[0, 40, 0]} castShadow receiveShadow>
            <coneGeometry args={[250, 80, 8]} />
            <meshStandardMaterial color="#1b4332" />
          </mesh>
          <mesh position={[300, 20, -200]} castShadow receiveShadow>
            <coneGeometry args={[150, 40, 6]} />
            <meshStandardMaterial color="#1b4332" />
          </mesh>
        </group>

        {/* VEGETACIÓN Y ROCAS */}
        {details.map((item, i) => (
          <group key={i} position={item.position as any} scale={item.scale}>
            {item.type === "tree" ? (
              <mesh castShadow position={[0, 1, 0]}>
                <boxGeometry args={[0.5, 2, 0.5]} />
                <meshStandardMaterial color="#1b4332" />
              </mesh>
            ) : (
              <mesh castShadow position={[0, 0.5, 0]}>
                <dodecahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color="#444" />
              </mesh>
            )}
          </group>
        ))}
      </RigidBody>
      
      <fog attach="fog" args={["#8ecae6", 1000, 5000]} />
    </>
  );
}
