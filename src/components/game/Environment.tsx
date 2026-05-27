"use client";

import { Sky, Stars } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import { WORLD_TOPOLOGY } from "@/lib/worldTopology";

export function Environment() {
  const details = useMemo(() => {
    const items: Array<{
      position: [number, number, number];
      scale: number;
      type: "tree" | "rock";
    }> = [];
    for (let i = 0; i < 200; i++) {
      const angle = seededNoise(i, 1) * Math.PI * 2;
      const radius = 150 + seededNoise(i, 2) * 800;
      items.push({
        position: [Math.cos(angle) * radius, -0.95, Math.sin(angle) * radius],
        scale: 0.5 + seededNoise(i, 3) * 1.5,
        type: seededNoise(i, 4) > 0.3 ? "tree" : "rock",
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
        position={[150, 300, 150]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={0.0001} // Bias positivo para superficies planas
        shadow-normalBias={0.05} // Fundamental para eliminar rayas (shadow acne)
        shadow-camera-left={-1200}
        shadow-camera-right={1200}
        shadow-camera-top={1200}
        shadow-camera-bottom={-1200}
      />

      {/* MAR: Profundidad clara */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
        <planeGeometry args={[10000, 10000]} />
        <meshStandardMaterial color={WORLD_TOPOLOGY.oceanColor} roughness={0.2} metalness={0.1} />
      </mesh>

      <RigidBody type="fixed" colliders="hull" name="ground">
        {/* CAPA DE PASTO: Elevada a -1.0 */}
        <mesh receiveShadow position={[0, -1.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[WORLD_TOPOLOGY.islandRadius, 64]} />
          <meshStandardMaterial color={WORLD_TOPOLOGY.grassColor} />
        </mesh>
        
        {/* CAPA DE ARENA: Bajada a -1.2 para evitar Z-fighting */}
        <mesh receiveShadow position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[WORLD_TOPOLOGY.coastRadius, 64]} />
          <meshStandardMaterial color={WORLD_TOPOLOGY.sandColor} />
        </mesh>

        {/* MONTAÑAS: Ancladas a la capa de pasto */}
        <group position={[0, -1.0, 0]}>
          {WORLD_TOPOLOGY.mountains.map((mountain) => (
            <mesh key={`${mountain.x}:${mountain.z}`} position={[mountain.x, mountain.height / 2, mountain.z]} castShadow receiveShadow>
              <coneGeometry args={[mountain.radius, mountain.height, mountain.segments]} />
              <meshStandardMaterial color={WORLD_TOPOLOGY.mountainColor} />
            </mesh>
          ))}
        </group>

        {/* OBJETOS: Ajustados a la nueva altura del pasto */}
        {details.map((item, i) => (
          <group key={i} position={item.position} scale={item.scale}>
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

function seededNoise(index: number, salt: number) {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
