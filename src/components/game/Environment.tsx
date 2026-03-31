"use client";

import { Sky, ContactShadows, Grid } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";

export function Environment() {
  return (
    <>
      <Sky 
        distance={450000} 
        sunPosition={[0, 1, 0]} 
        inclination={0} 
        azimuth={0.25} 
      />
      
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* Ground Plane (Infinite Grid for visual reference) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <planeGeometry args={[10000, 10000]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      </RigidBody>
      
      <Grid 
        infiniteGrid 
        fadeDistance={5000} 
        fadeStrength={5} 
        cellSize={10} 
        sectionSize={50} 
        sectionColor="#333" 
        cellColor="#222" 
        position={[0, -0.4, 0]}
      />

      <ContactShadows 
        position={[0, 0, 0]} 
        opacity={0.4} 
        scale={20} 
        blur={2} 
        far={4.5} 
      />
    </>
  );
}
