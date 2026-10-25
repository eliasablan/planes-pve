"use client";

import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { MutableRefObject, Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/useGameStore";

type AirplaneVariant = "player" | "enemy";

const PIXABAY_BIPLANE_PATH = "/assets/game/models/airplanes/pixabay-biplane-low-poly-131.glb";

interface AirplaneModelProps {
  hp: number;
  variant?: AirplaneVariant;
  playerColor?: string;
  propellerRef?: MutableRefObject<THREE.Group | null>;
}

export function AirplaneModel({
  hp,
  variant = "player",
  playerColor = "#d9e2ec",
  propellerRef,
}: AirplaneModelProps) {
  const [assetAvailable, setAssetAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch(PIXABAY_BIPLANE_PATH, { method: "HEAD" })
      .then((response) => {
        if (mounted) setAssetAvailable(response.ok);
      })
      .catch(() => {
        if (mounted) setAssetAvailable(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (assetAvailable) {
    return (
      <Suspense fallback={<ProceduralAirplaneModel hp={hp} variant={variant} playerColor={playerColor} propellerRef={propellerRef} />}>
        <PixabayBiplaneModel hp={hp} variant={variant} playerColor={playerColor} propellerRef={propellerRef} />
      </Suspense>
    );
  }

  return <ProceduralAirplaneModel hp={hp} variant={variant} playerColor={playerColor} propellerRef={propellerRef} />;
}

function PixabayBiplaneModel({
  hp,
  variant = "player",
  playerColor = "#d9e2ec",
  propellerRef,
}: AirplaneModelProps) {
  const fallbackPropellerRef = useRef<THREE.Group | null>(null);
  const spinRef = propellerRef ?? fallbackPropellerRef;
  const { scene } = useGLTF(PIXABAY_BIPLANE_PATH);
  const isCritical = hp < 35;

  const model = useMemo(() => {
    const clone = scene.clone(true);
    const bodyColor = new THREE.Color(hp < 15 ? "#222222" : playerColor);
    const accentColor = new THREE.Color(variant === "player" ? "#d8a24a" : "#3b82f6");

    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const material = new THREE.MeshStandardMaterial({
          color: child.name.toLowerCase().includes("prop") ? "#1f2933" : bodyColor,
          metalness: 0.18,
          roughness: 0.56,
        });

        if (child.name.toLowerCase().includes("wing")) {
          material.color = accentColor;
          material.roughness = 0.68;
          material.metalness = 0.05;
        }

        child.material = material;
      }
    });

    return clone;
  }, [hp, playerColor, scene, variant]);

  useFrame((_, delta) => {
    if (useGameStore.getState().paused) return;
    if (spinRef.current) {
      spinRef.current.rotation.z += delta * (isCritical ? 28 : 48);
    }
  });

  return (
    <group scale={variant === "player" ? 0.46 : 0.44} rotation={[0, Math.PI, 0]}>
      <primitive object={model} />
      <group ref={spinRef} position={[0, 0, -2.12]}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <circleGeometry args={[0.86, 32]} />
          <meshBasicMaterial color="#f8fafc" transparent opacity={0.13} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      <NavigationLights />
      {isCritical && <DamageFlame />}
    </group>
  );
}

function ProceduralAirplaneModel({
  hp,
  variant = "player",
  playerColor = "#d9e2ec",
  propellerRef,
}: AirplaneModelProps) {
  const fallbackPropellerRef = useRef<THREE.Group | null>(null);
  const spinRef = propellerRef ?? fallbackPropellerRef;
  const isCritical = hp < 35;
  const isDestroyed = hp < 15;

  const materials = useMemo(() => {
    const body = new THREE.MeshStandardMaterial({
      color: isDestroyed ? "#222222" : playerColor,
      metalness: 0.35,
      roughness: 0.38,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: variant === "player" ? "#f8f9fa" : "#8ecae6",
      metalness: 0.25,
      roughness: 0.42,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: "#1f2933",
      metalness: 0.4,
      roughness: 0.35,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#9bd7ff",
      roughness: 0.02,
      transmission: 0.55,
      thickness: 0.35,
      ior: 1.35,
      transparent: true,
      opacity: 0.55,
    });
    const warning = new THREE.MeshStandardMaterial({
      color: isCritical ? "#ef233c" : "#ffb703",
      emissive: isCritical ? "#ef233c" : "#ffb703",
      emissiveIntensity: isCritical ? 1.8 : 0.55,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: "#111111",
      roughness: 0.76,
      metalness: 0.05,
    });
    const canvas = new THREE.MeshStandardMaterial({
      color: variant === "player" ? "#e9d8a6" : "#bfdbfe",
      roughness: 0.72,
      metalness: 0.05,
    });

    return { body, accent, dark, glass, warning, rubber, canvas };
  }, [isCritical, isDestroyed, playerColor, variant]);

  useFrame((_, delta) => {
    if (useGameStore.getState().paused) return;
    if (!propellerRef && spinRef.current) {
      spinRef.current.rotation.z += delta * (isCritical ? 28 : 44);
    }
  });

  return (
    <group scale={variant === "player" ? 1 : 0.95}>
      <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.36, 2.9, 10, 1]} />
        <primitive object={materials.body} attach="material" />
      </mesh>

      <mesh castShadow position={[0, 0.08, -0.2]} scale={[0.82, 0.52, 1.75]}>
        <sphereGeometry args={[0.48, 16, 10]} />
        <primitive object={materials.body} attach="material" />
      </mesh>

      <mesh castShadow position={[0, 0.43, -0.28]} scale={[0.78, 0.44, 1.18]}>
        <sphereGeometry args={[0.38, 16, 10]} />
        <primitive object={materials.glass} attach="material" />
      </mesh>

      <mesh castShadow receiveShadow position={[0, -0.02, -0.12]} scale={[1, 0.55, 1]}>
        <boxGeometry args={[5.5, 0.08, 1.05]} />
        <primitive object={materials.accent} attach="material" />
      </mesh>

      <mesh castShadow receiveShadow position={[0, 0.55, -0.16]} scale={[1, 0.5, 1]}>
        <boxGeometry args={[4.65, 0.06, 0.82]} />
        <primitive object={materials.canvas} attach="material" />
      </mesh>

      <mesh castShadow receiveShadow position={[0, -0.04, -0.34]} rotation={[0, 0, Math.PI / 18]}>
        <boxGeometry args={[5.15, 0.06, 0.44]} />
        <primitive object={materials.body} attach="material" />
      </mesh>

      <WingStruts material={materials.dark} />

      <group position={[0, 0.02, 1.32]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.05, 0.06, 0.74]} />
          <primitive object={materials.accent} attach="material" />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.42, 0.12]}>
          <boxGeometry args={[0.08, 1.05, 0.68]} />
          <primitive object={materials.body} attach="material" />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.26, 0.38]} rotation={[Math.PI / 10, 0, 0]}>
          <boxGeometry args={[0.68, 0.08, 0.72]} />
          <primitive object={materials.accent} attach="material" />
        </mesh>
      </group>

      <group ref={spinRef} position={[0, 0, -1.58]}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <circleGeometry args={[1.26, 32]} />
          <meshBasicMaterial color="#f8fafc" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[2.35, 0.12, 0.045]} />
          <primitive object={materials.dark} attach="material" />
        </mesh>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[2.35, 0.12, 0.045]} />
          <primitive object={materials.dark} attach="material" />
        </mesh>
        <mesh castShadow>
          <sphereGeometry args={[0.16, 10, 8]} />
          <primitive object={materials.warning} attach="material" />
        </mesh>
      </group>

      <group position={[0, -0.45, -0.32]}>
        <LandingGear x={0.82} darkMaterial={materials.dark} wheelMaterial={materials.rubber} />
        <LandingGear x={-0.82} darkMaterial={materials.dark} wheelMaterial={materials.rubber} />
      </group>

      <mesh castShadow position={[0, -0.28, 1.55]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.54, 8]} />
        <primitive object={materials.rubber} attach="material" />
      </mesh>

      <NavigationLights />

      {isCritical && (
        <DamageFlame />
      )}
    </group>
  );
}

function WingStruts({ material }: { material: THREE.Material }) {
  return (
    <group>
      {[-1.65, 1.65].map((x) => (
        <group key={x}>
          <mesh castShadow position={[x, 0.27, -0.42]} rotation={[0.28, 0, x > 0 ? -0.22 : 0.22]}>
            <boxGeometry args={[0.08, 0.82, 0.08]} />
            <primitive object={material} attach="material" />
          </mesh>
          <mesh castShadow position={[x, 0.27, 0.18]} rotation={[-0.28, 0, x > 0 ? -0.22 : 0.22]}>
            <boxGeometry args={[0.08, 0.82, 0.08]} />
            <primitive object={material} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function LandingGear({
  x,
  darkMaterial,
  wheelMaterial,
}: {
  x: number;
  darkMaterial: THREE.Material;
  wheelMaterial: THREE.Material;
}) {
  return (
    <group position={[x, 0, 0]}>
      <mesh castShadow rotation={[0.16, 0, x > 0 ? 0.28 : -0.28]}>
        <boxGeometry args={[0.07, 0.92, 0.07]} />
        <primitive object={darkMaterial} attach="material" />
      </mesh>
      <mesh castShadow position={[x > 0 ? 0.1 : -0.1, -0.42, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.045, 8, 16]} />
        <primitive object={wheelMaterial} attach="material" />
      </mesh>
    </group>
  );
}

function NavigationLights() {
  return (
    <>
      <mesh position={[2.82, 0.02, -0.18]}>
        <boxGeometry args={[0.11, 0.11, 0.42]} />
        <meshStandardMaterial color="#ef233c" emissive="#ef233c" emissiveIntensity={2.3} />
      </mesh>
      <mesh position={[-2.82, 0.02, -0.18]}>
        <boxGeometry args={[0.11, 0.11, 0.42]} />
        <meshStandardMaterial color="#2b9348" emissive="#2b9348" emissiveIntensity={2.3} />
      </mesh>
    </>
  );
}

function DamageFlame() {
  return (
    <group position={[0, -0.15, 0.72]}>
      <mesh>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshStandardMaterial color="#ff6b35" emissive="#ff6b35" emissiveIntensity={2.4} />
      </mesh>
      <mesh position={[0.18, 0.04, -0.08]}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshStandardMaterial color="#111111" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}
