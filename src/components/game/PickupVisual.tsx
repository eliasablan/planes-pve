"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Group, Shape } from "three";
import { useGameStore, type PickupState } from "@/store/useGameStore";

/** World-scale supplies: perspective and lighting expose their actual volume. */
export function PickupVisual({ pickup }: { pickup: PickupState }) {
  const objectRef = useRef<Group>(null);
  const reducedMotion = useRef(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reducedMotion.current = preference.matches; };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useFrame(({ clock }, delta) => {
    if (!objectRef.current || useGameStore.getState().paused) return;
    objectRef.current.position.y = reducedMotion.current ? 0 : Math.sin(clock.elapsedTime * 1.1) * 0.8;
    if (!reducedMotion.current) objectRef.current.rotation.y += Math.min(delta, 0.1) * 0.22;
  });
  return (
    <group position={pickup.position} name={`pickup-${pickup.kind}-${pickup.id}`}>
      <group ref={objectRef} rotation={[0.12, 0.5, pickup.kind === "repair" ? -0.3 : -0.12]}>
        {pickup.kind === "ammo" ? <AmmoBox /> : pickup.kind === "missile" ? <MissileSupply /> : <RepairWrench />}
      </group>
    </group>
  );
}

function AmmoBox() {
  return (
    <group>
      <mesh position={[0, -4, 0]}>
        <boxGeometry args={[13, 8, 8]} />
        <meshStandardMaterial color="#72511c" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[13.5, 1, 8.5]} />
        <meshStandardMaterial color="#f4c95d" roughness={0.42} metalness={0.3} />
      </mesh>
      {/* Protective bands wrap the box and keep its shape legible from behind. */}
      {[-4.7, 4.7].map((x) => (
        <mesh key={x} position={[x, -4, 0]}>
          <boxGeometry args={[1.1, 8.4, 8.4]} />
          <meshStandardMaterial color="#f4c95d" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
      {[-4, 0, 4].flatMap((x) => [-2, 2].map((z) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[1.1, 1.1, 6, 8]} />
            <meshStandardMaterial color="#e8b947" roughness={0.36} metalness={0.45} />
          </mesh>
          <mesh position={[0, 7.1, 0]}>
            <coneGeometry args={[1.1, 2.2, 8]} />
            <meshStandardMaterial color="#fff0b9" roughness={0.3} metalness={0.35} />
          </mesh>
        </group>
      )))}
    </group>
  );
}

function MissileSupply() {
  const fin = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(1.7, -3);
    shape.lineTo(5.3, -7.5);
    shape.lineTo(5.3, -10);
    shape.lineTo(1.7, -8);
    shape.closePath();
    return shape;
  }, []);
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[2, 2, 15, 10]} />
        <meshStandardMaterial color="#edf4ff" roughness={0.42} metalness={0.25} />
      </mesh>
      <mesh position={[0, 10, 0]}>
        <coneGeometry args={[2, 5, 10]} />
        <meshStandardMaterial color="#65a6ff" roughness={0.35} metalness={0.3} />
      </mesh>
      {[-5.5, 5.5].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[2.08, 2.08, 1.3, 10]} />
          <meshStandardMaterial color="#2877d4" roughness={0.45} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((index) => (
        <group key={index} rotation={[0, index * Math.PI / 2, 0]}>
          <mesh position={[0, 0, -0.4]}>
            <extrudeGeometry args={[fin, { depth: 0.8, bevelEnabled: false }]} />
            <meshStandardMaterial color="#65a6ff" roughness={0.45} metalness={0.25} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -8.3, 0]}>
        <cylinderGeometry args={[1.6, 1.8, 1.6, 10, 1, true]} />
        <meshStandardMaterial color="#263341" roughness={0.5} />
      </mesh>
    </group>
  );
}

function RepairWrench() {
  return (
    <group>
      {/* Torque wrench: long shaft, calibrated grip, ratchet and projecting socket. */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.4, 16, 2]} />
        <meshStandardMaterial color="#e4f2ec" metalness={0.45} roughness={0.38} />
      </mesh>
      <mesh position={[0, 7.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[3.6, 3.6, 2.8, 8]} />
        <meshStandardMaterial color="#e4f2ec" metalness={0.45} roughness={0.38} flatShading />
      </mesh>
      <mesh position={[0, 7.1, 1.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.7, 2.7, 0.6, 8]} />
        <meshStandardMaterial color="#22634e" metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh position={[0, 7.1, 3.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.8, 1.8, 2.6, 6]} />
        <meshStandardMaterial color="#d9e4e8" metalness={0.5} roughness={0.32} flatShading />
      </mesh>
      <mesh position={[0, 7.1, 4.42]}>
        <circleGeometry args={[1.1, 6]} />
        <meshStandardMaterial color="#182a28" roughness={0.8} />
      </mesh>
      {/* Raised direction selector on the reverse face makes the ratchet explicit. */}
      <mesh position={[0.9, 5.3, -1.65]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[2.8, 0.8, 0.7]} />
        <meshStandardMaterial color="#22634e" roughness={0.55} />
      </mesh>
      <mesh position={[0, -5.6, 0]}>
        <cylinderGeometry args={[2.1, 2.1, 8.6, 8]} />
        <meshStandardMaterial color="#51d6a3" roughness={0.7} />
      </mesh>
      {[-8.4, -6.6, -4.8, -3].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[2.16, 2.16, 0.35, 8]} />
          <meshStandardMaterial color="#22634e" roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[0, -1.4, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 1, 8]} />
        <meshStandardMaterial color="#e4f2ec" metalness={0.4} roughness={0.4} />
      </mesh>
      {[-0.4, 0.5, 1.4].map((y, index) => (
        <mesh key={y} position={[0.25, y, 1.04]}>
          <boxGeometry args={[index === 1 ? 1.5 : 0.9, 0.18, 0.1]} />
          <meshStandardMaterial color="#22634e" roughness={0.65} />
        </mesh>
      ))}
    </group>
  );
}
