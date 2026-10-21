"use client";

import { useFrame } from "@react-three/fiber";
import { RigidBody, RapierRigidBody, vec3 } from "@react-three/rapier";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

interface BulletProps {
  position: [number, number, number];
  rotation: [number, number, number, number];
  onHit: () => void;
}

const TRACER_SPEED = 420;
const TRACER_LIFETIME_MS = 1100;

// Visual-only tracer: machine gun hits are resolved hitscan in Airplane, so no physics body is needed.
export function Bullet({ position, rotation }: BulletProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [alive, setAlive] = useState(true);
  const forward = useMemo(
    () => new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(...rotation)),
    [rotation],
  );

  useEffect(() => {
    const timer = setTimeout(() => setAlive(false), TRACER_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, []);

  useFrame((_, delta) => {
    groupRef.current?.position.addScaledVector(forward, TRACER_SPEED * delta);
  });

  if (!alive) return null;

  return (
    <group ref={groupRef} position={position} quaternion={rotation}>
      <mesh position={[0, -0.15, -6]}>
        <boxGeometry args={[0.16, 0.16, 6]} />
        <meshBasicMaterial color="#fff1b8" toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.15, -6]}>
        <boxGeometry args={[0.55, 0.55, 6.6]} />
        <meshBasicMaterial
          color="#f4a33d"
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function Missile({ position, rotation, onHit }: BulletProps & { targetId?: string }) {
  const rb = useRef<RapierRigidBody>(null);
  const [alive, setAlive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setAlive(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useFrame(() => {
    if (!rb.current || !alive) return;
    const q = new THREE.Quaternion(...rotation);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    rb.current.setLinvel(vec3(forward).multiplyScalar(50), true);
    // Simple homing logic could be added here
  });

  if (!alive) return null;

  return (
    <RigidBody
      ref={rb}
      position={position}
      rotation={quaternionToEulerTuple(rotation)}
      sensor
      onIntersectionEnter={onHit}
      colliders="ball"
    >
      <group>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.5]} />
          <meshStandardMaterial color="red" />
        </mesh>
        <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 0.2]} />
          <meshStandardMaterial color="darkred" />
        </mesh>
      </group>
    </RigidBody>
  );
}

function quaternionToEulerTuple(rotation: [number, number, number, number]) {
  const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(...rotation));
  return [euler.x, euler.y, euler.z] as [number, number, number];
}
