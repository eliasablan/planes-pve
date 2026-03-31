"use client";

import { Sky, ContactShadows, Float, Stars } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";

export function Environment() {
  // Generate random positions for trees and rocks
  const details = useMemo(() => {
    const items = [];
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 900;
      items.push({
        position: [Math.cos(angle) * radius, -1.5, Math.sin(angle) * radius],
        scale: 0.5 + Math.random() * 2,
        type: Math.random() > 0.3 ? "tree" : "rock"
      });
    }
    return items;
  }, []);

  return (
    <>
      <Sky 
        distance={450000} 
        sunPosition={[0, 1, 0]} 
        inclination={0} 
        azimuth={0.25} 
      />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[-50, 50, 50]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[4096, 4096]}
      />

      {/* Stylized Ocean */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
        <planeGeometry args={[20000, 20000]} />
        <meshStandardMaterial 
          color="#0077be" 
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>

      {/* Main Island */}
      <RigidBody type="fixed" colliders="hull" name="ground">
        <mesh receiveShadow position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1000, 64]} />
          <meshStandardMaterial color="#2d6a4f" roughness={0.8} />
        </mesh>
        
        {/* RELIEF: Central Mountain Range */}
        <group position={[0, -2, 0]}>
          <mesh position={[0, 50, 0]} castShadow receiveShadow>
            <coneGeometry args={[300, 100, 8]} />
            <meshStandardMaterial color="#40916c" roughness={0.9} />
          </mesh>
          <mesh position={[200, 30, -100]} castShadow receiveShadow>
            <coneGeometry args={[200, 60, 6]} />
            <meshStandardMaterial color="#3a5a40" roughness={0.9} />
          </mesh>
          <mesh position={[-150, 20, 150]} castShadow receiveShadow>
            <coneGeometry args={[150, 40, 7]} />
            <meshStandardMaterial color="#344e41" roughness={0.9} />
          </mesh>
        </group>

        {/* Terrain Details (Trees & Rocks) */}
        {details.map((item, i) => (
          <group key={i} position={item.position as any} scale={item.scale}>
            {item.type === "tree" ? (
              <>
                <mesh position={[0, 1, 0]} castShadow>
                  <cylinderGeometry args={[0.2, 0.3, 2, 8]} />
                  <meshStandardMaterial color="#582f0e" />
                </mesh>
                <mesh position={[0, 2.5, 0]} castShadow>
                  <coneGeometry args={[1, 3, 8]} />
                  <meshStandardMaterial color="#1b4332" />
                </mesh>
              </>
            ) : (
              <mesh castShadow>
                <dodecahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color="#495057" />
              </mesh>
            )}
          </group>
        ))}
      </RigidBody>
      
      <fog attach="fog" args={["#8ecae6", 500, 5000]} />

      <ContactShadows 
        position={[0, 0, 0]} 
        opacity={0.4} 
        scale={2000} 
        blur={2} 
        far={50} 
      />
    </>
  );
}
