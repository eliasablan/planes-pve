"use client";

import { Sky, Stars, Environment as DreiEnvironment } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export function Environment() {
  const details = useMemo(() => {
    const items = [];
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 150 + Math.random() * 800;
      items.push({
        position: [Math.cos(angle) * radius, -1.45, Math.sin(angle) * radius],
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
      
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[100, 200, 100]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.005} // Increased bias to kill shadow acne stripes
        shadow-camera-left={-1500}
        shadow-camera-right={1500}
        shadow-camera-top={1500}
        shadow-camera-bottom={-1500}
      />

      {/* OCEAN - Deep floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
        <planeGeometry args={[10000, 10000]} />
        <meshStandardMaterial color="#003566" roughness={0.2} metalness={0.1} />
      </mesh>

      <RigidBody type="fixed" colliders="hull" name="ground">
        {/* GRASS LAYER - Slightly elevated to avoid sea fighting */}
        <mesh receiveShadow position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1000, 64]} />
          <meshStandardMaterial color="#2d6a4f" />
        </mesh>
        
        {/* SAND SHORE - Slightly below grass */}
        <mesh receiveShadow position={[0, -1.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1050, 64]} />
          <meshStandardMaterial color="#c2b280" />
        </mesh>

        {/* MOUNTAINS */}
        <group position={[0, -1.5, 0]}>
          <mesh position={[0, 40, 0]} castShadow receiveShadow>
            <coneGeometry args={[250, 80, 8]} />
            <meshStandardMaterial color="#1b4332" />
          </mesh>
          <mesh position={[300, 20, -200]} castShadow receiveShadow>
            <coneGeometry args={[150, 40, 6]} />
            <meshStandardMaterial color="#1b4332" />
          </mesh>
          <mesh position={[-250, 15, 300]} castShadow receiveShadow>
            <coneGeometry args={[120, 30, 5]} />
            <meshStandardMaterial color="#1b4332" />
          </mesh>
        </group>

        {/* PROPS */}
        {details.map((item, i) => (
          <group key={i} position={item.position as any} scale={item.scale}>
            {item.type === "tree" ? (
              <mesh castShadow position={[0, 1, 0]}>
                <boxGeometry args={[0.5, 2, 0.5]} />
                <meshStandardMaterial color="#1b4332" />
              </mesh>
            ) : (
              <mesh castShadow position={[0, 0.5, 0]}>
                <dodecahedronGeometry args={[1.2, 0]} />
                <meshStandardMaterial color="#444" />
              </mesh>
            )}
          </group>
        ))}
      </RigidBody>
      
      <fog attach="fog" args={["#001d3d", 1500, 6000]} />
    </>
  );
}
