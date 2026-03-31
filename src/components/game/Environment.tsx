"use client";

import { Sky, ContactShadows, Grid, Float } from "@react-three/drei";
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
      <pointLight position={[100, 100, 100]} intensity={1.5} castShadow />
      <directionalLight
        position={[-50, 50, 50]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* Sea (Water) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[10000, 10000]} />
        <meshStandardMaterial 
          color="#006994" 
          transparent 
          opacity={0.8} 
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>

      {/* Main Island (Minecraft Voxel Style) */}
      <RigidBody type="fixed" colliders="cuboid" name="ground">
        <group position={[0, -1, 0]}>
          {/* Main Landmass */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[800, 4, 800]} />
            <meshStandardMaterial color="#3a5a40" />
          </mesh>
          
          {/* Central Mountain (Voxel Step) */}
          <mesh castShadow receiveShadow position={[0, 4, 0]}>
            <boxGeometry args={[200, 8, 200]} />
            <meshStandardMaterial color="#588157" />
          </mesh>
          
          {/* Higher Peak */}
          <mesh castShadow receiveShadow position={[20, 10, -30]}>
            <boxGeometry args={[100, 12, 100]} />
            <meshStandardMaterial color="#a3b18a" />
          </mesh>

          {/* Scattered Voxel Blocks for texture */}
          <mesh castShadow receiveShadow position={[-150, 2, 100]}>
            <boxGeometry args={[50, 10, 50]} />
            <meshStandardMaterial color="#344e41" />
          </mesh>
        </group>
      </RigidBody>
      
      {/* Atmosphere / Clouds (Voxel Style) */}
      <group position={[0, 100, 0]}>
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
          <mesh position={[200, 0, -200]}>
            <boxGeometry args={[100, 20, 60]} />
            <meshStandardMaterial color="white" transparent opacity={0.3} />
          </mesh>
        </Float>
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={2}>
          <mesh position={[-300, 50, 100]}>
            <boxGeometry args={[150, 30, 80]} />
            <meshStandardMaterial color="white" transparent opacity={0.2} />
          </mesh>
        </Float>
      </group>

      <ContactShadows 
        position={[0, 0, 0]} 
        opacity={0.4} 
        scale={1000} 
        blur={2} 
        far={50} 
      />
    </>
  );
}
