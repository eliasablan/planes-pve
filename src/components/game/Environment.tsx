"use client";

import { Sky } from "@react-three/drei";
import { RigidBody, TrimeshCollider } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { WORLD_TOPOLOGY } from "@/lib/worldTopology";
import { buildTerrainMesh } from "@/lib/terrainHeight";
import { generateScatter, type ScatterItem } from "@/lib/terrainScatter";

// Matches the Sky shader's horizon tint so distant terrain and ocean blend into it.
const HORIZON_COLOR = "#cfdfea";

export function Environment() {
  const scatter = useMemo(() => generateScatter(), []);
  const terrain = useMemo(() => buildTerrainMesh(), []);

  return (
    <>
      <color attach="background" args={[HORIZON_COLOR]} />
      <Sky distance={450000} sunPosition={[80, 120, 35]} turbidity={6} rayleigh={1.4} mieCoefficient={0.004} />

      <ambientLight intensity={0.52} color="#b9d8ff" />
      <hemisphereLight args={["#bfe7ff", "#264f38", 0.85]} />
      {/* Same sun direction as before, moved out so the shadow depth range (near/far) spans the whole relief. */}
      <directionalLight
        position={[800, 1600, 600]}
        intensity={2.15}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={0.0001}
        shadow-normalBias={0.05}
        shadow-camera-left={-1200}
        shadow-camera-right={1200}
        shadow-camera-top={1200}
        shadow-camera-bottom={-1200}
        shadow-camera-near={500}
        shadow-camera-far={3300}
      />

      <OceanSurface />

      {/* The collider reuses the rendered surface's buffers, so lethal ground matches what the pilot sees. */}
      <RigidBody type="fixed" colliders={false} name="ground">
        <TrimeshCollider args={[terrain.positions, terrain.indices]} />
        <TerrainSurface positions={terrain.positions} indices={terrain.indices} />
      </RigidBody>

      <NatureScatter items={scatter} />
      <CloudLayer />
      <fog attach="fog" args={[HORIZON_COLOR, 650, 3900]} />
    </>
  );
}

function TerrainSurface({ positions, indices }: { positions: Float32Array; indices: Uint32Array }) {
  const detailTexture = useMemo(() => createTerrainTexture(["#e9eae4", "#cfd3c6", "#f7f7f1", "#b9beb0"], 220), []);
  const geometry = useMemo(() => createTerrainGeometry(positions, indices), [indices, positions]);

  useMemo(() => {
    configureTiledTexture(detailTexture, 90);
  }, [detailTexture]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial map={detailTexture} vertexColors roughness={0.93} metalness={0} />
    </mesh>
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WORLD_TOPOLOGY.seaLevel, 0]} receiveShadow>
        <planeGeometry args={[30000, 30000, 1, 1]} />
        <meshStandardMaterial
          ref={materialRef}
          map={waterTexture}
          color={WORLD_TOPOLOGY.oceanColor}
          roughness={0.28}
          metalness={0.12}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WORLD_TOPOLOGY.seaLevel + 0.06, 0]}>
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

const TREE_TINTS = ["#3a7d44", "#4a8c3f", "#2f6b3a", "#5b9446"];
const PINE_TINTS = ["#1b4332", "#24553a", "#173d2c", "#2d5e3e"];
const ROCK_TINTS = ["#6b706a", "#7d7a70", "#5c625d", "#8a877c"];

// One instanced mesh per part keeps vegetation at a handful of draw calls; geometries are unit-sized
// with their base at y = 0 and scaled by each item's size.
function NatureScatter({ items }: { items: ScatterItem[] }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);
  const pineRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const bushRef = useRef<THREE.InstancedMesh>(null);

  const groups = useMemo(() => {
    const byKind = (kind: ScatterItem["kind"]) => items.filter((item) => item.kind === kind);
    const trees = byKind("tree");
    const pines = byKind("pine");
    return { trees, pines, trunks: [...trees, ...pines], rocks: byKind("rock"), bushes: byKind("bush") };
  }, [items]);

  const geometries = useMemo(
    () => ({
      trunk: new THREE.CylinderGeometry(0.055, 0.08, 0.42, 6).translate(0, 0.21, 0),
      canopy: new THREE.DodecahedronGeometry(0.33, 1).translate(0, 0.66, 0),
      pine: new THREE.ConeGeometry(0.25, 0.86, 7).translate(0, 0.57, 0),
      bush: new THREE.IcosahedronGeometry(0.5, 0).translate(0, 0.42, 0),
      rock: new THREE.DodecahedronGeometry(0.5, 0).translate(0, 0.32, 0),
    }),
    [],
  );

  useLayoutEffect(() => {
    const widen = (item: ScatterItem) => 0.9 + (item.rotation % 1) * 0.25;
    placeInstances(trunkRef.current, groups.trunks, (item) => [item.size, item.size, item.size]);
    placeInstances(canopyRef.current, groups.trees, (item) => [item.size * widen(item), item.size, item.size * widen(item)], TREE_TINTS);
    placeInstances(pineRef.current, groups.pines, (item) => [item.size, item.size, item.size], PINE_TINTS);
    placeInstances(bushRef.current, groups.bushes, (item) => [item.size * 1.2, item.size * 0.8, item.size * 1.1], TREE_TINTS);
    placeInstances(rockRef.current, groups.rocks, (item) => [item.size, item.size * 0.62, item.size * 0.82], ROCK_TINTS, 0.18);
  }, [groups]);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[geometries.trunk, undefined, groups.trunks.length]} castShadow receiveShadow>
        <meshStandardMaterial color="#6f4e37" roughness={0.82} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[geometries.canopy, undefined, groups.trees.length]} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.88} />
      </instancedMesh>
      <instancedMesh ref={pineRef} args={[geometries.pine, undefined, groups.pines.length]} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={rockRef} args={[geometries.rock, undefined, groups.rocks.length]} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh ref={bushRef} args={[geometries.bush, undefined, groups.bushes.length]} castShadow receiveShadow>
        <meshStandardMaterial color="#d8f0d0" roughness={0.92} flatShading />
      </instancedMesh>
    </group>
  );
}

function placeInstances(
  mesh: THREE.InstancedMesh | null,
  list: ScatterItem[],
  shape: (item: ScatterItem) => [number, number, number],
  tints?: string[],
  tilt = 0,
) {
  if (!mesh) return;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  list.forEach((item, index) => {
    dummy.position.set(...item.position);
    dummy.rotation.set(tilt * Math.sin(item.rotation * 3), item.rotation, tilt * Math.cos(item.rotation * 5));
    dummy.scale.set(...shape(item));
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    if (tints) mesh.setColorAt(index, color.set(tints[index % tints.length]));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
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

// Colour by height and slope: wet sand, beach, meadow, forest floor, bare rock on steep or high
// ground and pale caps on the crests. A neutral detail texture breaks up the large faces.
function createTerrainGeometry(positions: Float32Array, indices: Uint32Array) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  const count = positions.length / 3;
  const extent = positions[(count - 1) * 3] - positions[0];
  const uvs = new Float32Array(count * 2);
  const colors = new Float32Array(count * 3);
  const normals = geometry.getAttribute("normal");
  const palette = {
    wetSand: new THREE.Color("#a99766"),
    sand: new THREE.Color("#dcc994"),
    meadow: new THREE.Color("#6aa451"),
    grass: new THREE.Color("#4b8a45"),
    forest: new THREE.Color("#35693a"),
    rock: new THREE.Color("#77746a"),
    highRock: new THREE.Color("#9c998f"),
    cap: new THREE.Color("#e6ebe9"),
  };
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const h = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    uvs[i * 2] = (x - positions[0]) / extent;
    uvs[i * 2 + 1] = (z - positions[2]) / extent;

    const ny = normals.getY(i);
    const slope = Math.sqrt(Math.max(0, 1 - ny * ny)) / Math.max(ny, 0.05);
    const jitter = (seededNoise(i, 61) - 0.5) * 6;
    const level = h + jitter;

    if (level < -2) color.copy(palette.wetSand);
    else if (level < 3) color.copy(palette.sand);
    else if (level < 8) color.copy(palette.sand).lerp(palette.meadow, (level - 3) / 5);
    else if (level < 40) color.copy(palette.meadow).lerp(palette.grass, (level - 8) / 32);
    else if (level < 110) color.copy(palette.grass).lerp(palette.forest, Math.min(1, (level - 40) / 50));
    else color.copy(palette.forest).lerp(palette.rock, Math.min(1, (level - 110) / 35));

    const rockiness = THREE.MathUtils.smoothstep(slope, 0.55, 0.95);
    if (h > 3) color.lerp(level > 120 ? palette.highRock : palette.rock, rockiness);
    if (level > 160) color.lerp(palette.cap, THREE.MathUtils.smoothstep(level, 160, 185) * (1 - rockiness * 0.5));

    colors.set([color.r, color.g, color.b], i * 3);
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
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
