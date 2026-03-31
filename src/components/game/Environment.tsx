"use client";

import { Sky, ContactShadows, Stars, Environment as DreiEnvironment } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Environment() {
  const oceanRef = useRef<THREE.Mesh>(null);

  // Generate more detailed terrain items
  const details = useMemo(() => {
    const items = [];
    for (let i = 0; i < 300; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 150 + Math.random() * 800; // Keep mostly away from center mountain
      items.push({
        position: [Math.cos(angle) * radius, -1.5, Math.sin(angle) * radius],
        scale: 0.4 + Math.random() * 1.5,
        type: Math.random() > 0.2 ? "tree" : "rock",
        rotation: [0, Math.random() * Math.PI, 0]
      });
    }
    return items;
  }, []);

  useFrame(({ clock }) => {
    if (oceanRef.current) {
      // Subtle oscillation for stylized water
      oceanRef.current.position.y = -5 + Math.sin(clock.getElapsedTime() * 0.5) * 0.1;
    }
  });

  return (
    <>
      <Sky distance={450000} sunPosition={[10, 10, 10]} inclination={0} azimuth={0.25} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[50, 100, 50]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-camera-left={-1200}
        shadow-camera-right={1200}
        shadow-camera-top={1200}
        shadow-camera-bottom={-1200}
      />

      {/* High Fidelity PBR Ocean */}
      <mesh ref={oceanRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
        <planeGeometry args={[20000, 20000]} />
        <meshStandardMaterial 
          color="#003566" 
          roughness={0.1}
          metalness={0.5}
        />
      </mesh>

      {/* Main Island with PBR Materials */}
      <RigidBody type="fixed" colliders="hull" name="ground">
        {/* Base Island Layer */}
        <mesh receiveShadow position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1000, 128]} />
          <meshStandardMaterial color="#2d6a4f" roughness={1} metalness={0} />
        </mesh>
        
        {/* Sandy Shore */}
        <mesh receiveShadow position={[0, -2.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1050, 128]} />
          <meshStandardMaterial color="#f2e8cf" roughness={1} />
        </mesh>

        {/* RELIEF: PBR Mountain Range */}
        <group position={[0, -2, 0]}>
          <mesh position={[0, 60, 0]} castShadow receiveShadow>
            <coneGeometry args={[350, 120, 12]} />
            <meshStandardMaterial color="#6a994e" roughness={0.8} />
          </mesh>
          <mesh position={[250, 40, -150]} castShadow receiveShadow>
            <coneGeometry args={[220, 80, 10]} />
            <meshStandardMaterial color="#386641" roughness={0.8} />
          </mesh>
          <mesh position={[-200, 30, 200]} castShadow receiveShadow>
            <coneGeometry args={[180, 60, 10]} />
            <meshStandardMaterial color="#1b4332" roughness={0.8} />
          </mesh>
        </group>

        {/* Terrain Details with improved geometries */}
        {details.map((item, i) => (
          <group key={i} position={item.position as any} scale={item.scale} rotation={item.rotation as any}>
            {item.type === "tree" ? (
              <>
                <mesh position={[0, 1, 0]} castShadow>
                  <cylinderGeometry args={[0.15, 0.25, 2, 6]} />
                  <meshStandardMaterial color="#432818" roughness={1} />
                </mesh>
                <group position={[0, 2.2, 0]}>
                  <mesh castShadow>
                    <coneGeometry args={[1.2, 2.5, 6]} />
                    <meshStandardMaterial color="#2d6a4f" roughness={0.9} />
                  </mesh>
                  <mesh position={[0, 1.2, 0]} castShadow scale={0.8}>
                    <coneGeometry args={[1.2, 2.5, 6]} />
                    <meshStandardMaterial color="#1b4332" roughness={0.9} />
                  </mesh>
                </group>
              </>
            ) : (
              <mesh castShadow position={[0, 0.5, 0]}>
                <dodecahedronGeometry args={[1.2, 1]} />
                <meshStandardMaterial color="#adb5bd" roughness={0.6} metalness={0.2} />
              </mesh>
            )}
          </group>
        ))}
      </RigidBody>
      
      <DreiEnvironment preset="night" />
      <fog attach="fog" args={["#001d3d", 500, 8000]} />

      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={2000} blur={2} far={50} />
    </>
  );
}
