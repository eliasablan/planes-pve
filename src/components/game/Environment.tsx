"use client";

import { Sky, ContactShadows } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

export function Environment() {
  return (
    <>
      <Sky 
        distance={450000} 
        sunPosition={[0, 1, 0]} 
        inclination={0} 
        azimuth={0.25} 
      />
      
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[-50, 50, 50]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[4096, 4096]}
      />

      {/* Stylized Ocean */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
        <planeGeometry args={[20000, 10000]} />
        <meshStandardMaterial 
          color="#0077be" 
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>

      {/* Main Stylized Island */}
      <RigidBody type="fixed" colliders="hull" name="ground">
        <mesh receiveShadow position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1000, 64]} />
          <meshStandardMaterial color="#2d6a4f" roughness={0.8} />
        </mesh>
        
        {/* Central Terrain Details */}
        <mesh castShadow receiveShadow position={[0, -1, 0]}>
          <cylinderGeometry args={[400, 500, 10, 32]} />
          <meshStandardMaterial color="#40916c" />
        </mesh>
      </RigidBody>
      
      {/* Decorative Atmosphere */}
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
