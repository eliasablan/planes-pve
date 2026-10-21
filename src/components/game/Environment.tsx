"use client";

import { Sky } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { WORLD_TOPOLOGY } from "@/lib/worldTopology";

type EnvironmentQuality = "high" | "medium";
type ScatterKind = "tree" | "pine" | "rock" | "bush";

const QUALITY: EnvironmentQuality = "high";
const DETAIL_COUNT = QUALITY === "high" ? 360 : 180;
// Matches the Sky shader's horizon tint so distant terrain and ocean blend into it.
const HORIZON_COLOR = "#cfdfea";

export function Environment() {
  const details = useMemo(() => createScatterDetails(DETAIL_COUNT), []);

  return (
    <>
      <color attach="background" args={[HORIZON_COLOR]} />
      <Sky distance={450000} sunPosition={[80, 120, 35]} turbidity={6} rayleigh={1.4} mieCoefficient={0.004} />

      <ambientLight intensity={0.52} color="#b9d8ff" />
      <hemisphereLight args={["#bfe7ff", "#264f38", 0.85]} />
      <directionalLight
        position={[160, 320, 120]}
        intensity={2.15}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={0.0001}
        shadow-normalBias={0.05}
        shadow-camera-left={-1200}
        shadow-camera-right={1200}
        shadow-camera-top={1200}
        shadow-camera-bottom={-1200}
      />

      <OceanSurface />

      <RigidBody type="fixed" colliders="hull" name="ground">
        <TerrainSurface />
        <MountainRange />
      </RigidBody>

      <NatureScatter details={details} />
      <CloudLayer />
      <fog attach="fog" args={[HORIZON_COLOR, 650, 3900]} />
    </>
  );
}

function TerrainSurface() {
  const grassTexture = useMemo(() => createTerrainTexture(["#2d6a4f", "#40916c", "#184e37", "#95d5b2"], 180), []);
  const sandTexture = useMemo(() => createTerrainTexture(["#c2b280", "#e6ccb2", "#a98467", "#f3d9a4"], 120), []);
  const coastTexture = useMemo(() => createTerrainTexture(["#6b8f71", "#d8c27a", "#40916c", "#8d99ae"], 150), []);

  useMemo(() => {
    configureTiledTexture(grassTexture, 28);
    configureTiledTexture(sandTexture, 18);
    configureTiledTexture(coastTexture, 22);
  }, [coastTexture, grassTexture, sandTexture]);

  return (
    <group>
      <mesh receiveShadow position={[0, -1.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[WORLD_TOPOLOGY.coastRadius + 64, 96]} />
        <meshStandardMaterial
          map={sandTexture}
          color={WORLD_TOPOLOGY.sandColor}
          roughness={0.92}
          metalness={0}
          {...layerOffset(1)}
        />
      </mesh>

      <mesh receiveShadow position={[0, -1.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[WORLD_TOPOLOGY.coastRadius, 96]} />
        <meshStandardMaterial map={coastTexture} color="#9ba86f" roughness={0.88} metalness={0} {...layerOffset(2)} />
      </mesh>

      <mesh receiveShadow position={[0, -0.98, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[WORLD_TOPOLOGY.islandRadius, 128]} />
        <meshStandardMaterial
          map={grassTexture}
          color="#e4f2d8"
          roughness={0.96}
          metalness={0}
          {...layerOffset(3)}
        />
      </mesh>

      <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[WORLD_TOPOLOGY.islandRadius * 0.99, WORLD_TOPOLOGY.coastRadius + 18, 128]} />
        <meshStandardMaterial
          color="#e9d8a6"
          roughness={0.68}
          transparent
          opacity={0.32}
          side={THREE.DoubleSide}
          depthWrite={false}
          {...layerOffset(4)}
        />
      </mesh>
    </group>
  );
}

function OceanSurface() {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const waterTexture = useMemo(() => createWaterTexture(), []);

  useMemo(() => {
    configureTiledTexture(waterTexture, 132);
  }, [waterTexture]);

  useFrame((_, delta) => {
    const map = materialRef.current?.map;
    if (map) {
      map.offset.x += delta * 0.018;
      map.offset.y += delta * 0.011;
    }
    if (materialRef.current) {
      materialRef.current.roughness = 0.28 + Math.sin(Date.now() * 0.001) * 0.04;
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
        <planeGeometry args={[30000, 30000, 1, 1]} />
        <meshStandardMaterial
          ref={materialRef}
          map={waterTexture}
          color={WORLD_TOPOLOGY.oceanColor}
          roughness={0.28}
          metalness={0.12}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.94, 0]}>
        <ringGeometry args={[WORLD_TOPOLOGY.coastRadius + 18, WORLD_TOPOLOGY.coastRadius + 58, 160]} />
        <meshBasicMaterial
          color="#caf0f8"
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          depthWrite={false}
          {...layerOffset(1)}
        />
      </mesh>
    </group>
  );
}

function MountainRange() {
  const rockTexture = useMemo(() => createTerrainTexture(["#243b35", "#335c4d", "#5b6d5b", "#14213d"], 160), []);

  useMemo(() => {
    configureTiledTexture(rockTexture, 5);
  }, [rockTexture]);

  return (
    <group position={[0, -1.0, 0]}>
      {WORLD_TOPOLOGY.mountains.map((mountain, index) => (
        <group key={`${mountain.x}:${mountain.z}`} position={[mountain.x, 0, mountain.z]}>
          <mesh
            castShadow
            receiveShadow
            position={[0, mountain.height / 2, 0]}
            rotation={[0, seededNoise(index, 33) * Math.PI, 0]}
          >
            <coneGeometry args={[mountain.radius, mountain.height, mountain.segments + 3, 2]} />
            <meshStandardMaterial map={rockTexture} color="#b9cdb4" roughness={0.86} />
          </mesh>
          <mesh castShadow position={[0, mountain.height + 2, 0]} rotation={[0, seededNoise(index, 37) * Math.PI, 0]}>
            <coneGeometry args={[mountain.radius * 0.38, mountain.height * 0.22, mountain.segments + 1]} />
            <meshStandardMaterial color="#dbeafe" roughness={0.7} />
          </mesh>
          <mesh receiveShadow position={[0, 1.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[mountain.radius * 0.72, mountain.radius * 1.12, mountain.segments + 8]} />
            <meshStandardMaterial color="#254d3a" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function NatureScatter({ details }: { details: ScatterDetail[] }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);
  const pineRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const bushRef = useRef<THREE.InstancedMesh>(null);

  const trees = useMemo(() => details.filter((item) => item.kind === "tree"), [details]);
  const pines = useMemo(() => details.filter((item) => item.kind === "pine"), [details]);
  const rocks = useMemo(() => details.filter((item) => item.kind === "rock"), [details]);
  const bushes = useMemo(() => details.filter((item) => item.kind === "bush"), [details]);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();

    trees.forEach((item, index) => {
      dummy.position.set(item.position[0], item.position[1] + item.scale * 0.72, item.position[2]);
      dummy.rotation.set(0, item.rotation, 0);
      dummy.scale.set(item.scale * 0.42, item.scale * 1.48, item.scale * 0.42);
      dummy.updateMatrix();
      trunkRef.current?.setMatrixAt(index, dummy.matrix);

      dummy.position.set(item.position[0], item.position[1] + item.scale * 1.74, item.position[2]);
      dummy.scale.set(item.scale * 0.88, item.scale * 0.88, item.scale * 0.88);
      dummy.updateMatrix();
      canopyRef.current?.setMatrixAt(index, dummy.matrix);
    });

    pines.forEach((item, index) => {
      dummy.position.set(item.position[0], item.position[1] + item.scale * 1.1, item.position[2]);
      dummy.rotation.set(0, item.rotation, 0);
      dummy.scale.set(item.scale * 0.75, item.scale * 1.65, item.scale * 0.75);
      dummy.updateMatrix();
      pineRef.current?.setMatrixAt(index, dummy.matrix);
    });

    rocks.forEach((item, index) => {
      dummy.position.set(item.position[0], item.position[1] + item.scale * 0.28, item.position[2]);
      dummy.rotation.set(item.rotation * 0.3, item.rotation, item.rotation * 0.17);
      dummy.scale.set(item.scale * 0.85, item.scale * 0.42, item.scale * 0.65);
      dummy.updateMatrix();
      rockRef.current?.setMatrixAt(index, dummy.matrix);
    });

    bushes.forEach((item, index) => {
      dummy.position.set(item.position[0], item.position[1] + item.scale * 0.34, item.position[2]);
      dummy.rotation.set(0, item.rotation, 0);
      dummy.scale.set(item.scale * 0.72, item.scale * 0.46, item.scale * 0.72);
      dummy.updateMatrix();
      bushRef.current?.setMatrixAt(index, dummy.matrix);
    });

    [trunkRef, canopyRef, pineRef, rockRef, bushRef].forEach((ref) => {
      if (ref.current) {
        ref.current.instanceMatrix.needsUpdate = true;
        ref.current.computeBoundingSphere();
      }
    });
  }, [bushes, pines, rocks, trees]);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, trees.length]} castShadow receiveShadow>
        <cylinderGeometry args={[0.38, 0.48, 1, 6]} />
        <meshStandardMaterial color="#6f4e37" roughness={0.82} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, trees.length]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#3a7d44" roughness={0.88} />
      </instancedMesh>
      <instancedMesh ref={pineRef} args={[undefined, undefined, pines.length]} castShadow receiveShadow>
        <coneGeometry args={[0.9, 1.8, 7]} />
        <meshStandardMaterial color="#1b4332" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={rockRef} args={[undefined, undefined, rocks.length]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1.1, 0]} />
        <meshStandardMaterial color="#55605c" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={bushRef} args={[undefined, undefined, bushes.length]} castShadow receiveShadow>
        <icosahedronGeometry args={[0.82, 0]} />
        <meshStandardMaterial color="#52b788" roughness={0.92} />
      </instancedMesh>
    </group>
  );
}

function CloudLayer() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.006;
    }
  });

  const clouds = useMemo(() => {
    return Array.from({ length: 26 }, (_, index) => {
      const angle = seededNoise(index, 81) * Math.PI * 2;
      const radius = 650 + seededNoise(index, 82) * 2600;
      return {
        position: [Math.cos(angle) * radius, 520 + seededNoise(index, 83) * 280, Math.sin(angle) * radius] as [
          number,
          number,
          number,
        ],
        scale: 24 + seededNoise(index, 84) * 52,
        rotation: seededNoise(index, 85) * Math.PI,
      };
    });
  }, []);

  return (
    <group ref={groupRef}>
      {clouds.map((cloud, index) => (
        <CloudPuff key={index} position={cloud.position} rotation={cloud.rotation} scale={cloud.scale} seed={index} />
      ))}
    </group>
  );
}

function CloudPuff({
  position,
  rotation,
  scale,
  seed,
}: {
  position: [number, number, number];
  rotation: number;
  scale: number;
  seed: number;
}) {
  const puffs = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => ({
        position: [
          (seededNoise(seed * 10 + index, 91) - 0.5) * 2.8,
          (seededNoise(seed * 10 + index, 92) - 0.35) * 0.65,
          (seededNoise(seed * 10 + index, 93) - 0.5) * 1.2,
        ] as [number, number, number],
        scale: [
          0.72 + seededNoise(seed * 10 + index, 94) * 0.9,
          0.42 + seededNoise(seed * 10 + index, 95) * 0.46,
          0.58 + seededNoise(seed * 10 + index, 96) * 0.72,
        ] as [number, number, number],
        color: index % 3 === 0 ? "#ffffff" : index % 3 === 1 ? "#edf6ff" : "#dceeff",
        opacity: 0.38 + seededNoise(seed * 10 + index, 97) * 0.3,
      })),
    [seed],
  );

  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {puffs.map((puff, index) => (
        <mesh key={index} position={puff.position} scale={puff.scale}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial
            color={puff.color}
            emissive="#ffffff"
            emissiveIntensity={0.42}
            roughness={1}
            transparent
            opacity={puff.opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

interface ScatterDetail {
  position: [number, number, number];
  scale: number;
  rotation: number;
  kind: ScatterKind;
}

function createScatterDetails(count: number) {
  const items: ScatterDetail[] = [];
  for (let i = 0; i < count; i++) {
    const angle = seededNoise(i, 1) * Math.PI * 2;
    const radius = 120 + seededNoise(i, 2) * (WORLD_TOPOLOGY.islandRadius - 170);
    const roll = seededNoise(i, 4);
    items.push({
      position: [Math.cos(angle) * radius, -0.95, Math.sin(angle) * radius],
      scale: 0.85 + seededNoise(i, 3) * 2.4,
      rotation: seededNoise(i, 5) * Math.PI * 2,
      kind: roll > 0.72 ? "rock" : roll > 0.52 ? "bush" : roll > 0.25 ? "pine" : "tree",
    });
  }
  return items;
}

function createTerrainTexture(colors: string[], flecks: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Flat base: a gradient here shows up as a checkerboard once the texture repeats.
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < flecks; i++) {
    const x = seededNoise(i, 11) * 256;
    const y = seededNoise(i, 12) * 256;
    const size = 1 + seededNoise(i, 13) * 5;
    ctx.globalAlpha = 0.16 + seededNoise(i, 14) * 0.22;
    ctx.fillStyle = colors[Math.floor(seededNoise(i, 15) * colors.length)];
    // Draw wrapped copies so flecks crossing an edge stay seamless.
    for (const [ox, oy] of [[0, 0], [-256, 0], [256, 0], [0, -256], [0, 256]]) {
      ctx.beginPath();
      ctx.ellipse(x + ox, y + oy, size * 1.8, size, seededNoise(i, 16) * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createWaterTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#cfeaf5";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 42; i++) {
    ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 255, 255, 0.55)" : "rgba(120, 180, 210, 0.4)";
    ctx.lineWidth = 1 + seededNoise(i, 22) * 2.2;
    ctx.beginPath();
    const y = seededNoise(i, 23) * 256;
    ctx.moveTo(-20, y);
    ctx.bezierCurveTo(60, y - 18, 130, y + 18, 276, y - 8);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Ground and shore layers are nearly coplanar; at distance the depth buffer can't tell them apart
// and they z-fight. Polygon offset scales with depth precision, so higher layers always win.
function layerOffset(layer: number) {
  return { polygonOffset: true, polygonOffsetFactor: -layer, polygonOffsetUnits: -layer * 4 };
}

function configureTiledTexture(texture: THREE.Texture, repeat: number) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
}

function seededNoise(index: number, salt: number) {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
