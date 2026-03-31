"use client";

import { useFrame } from "@react-three/fiber";
import { RigidBody, RapierRigidBody, vec3 } from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";

interface BulletProps {
  position: [number, number, number];
  rotation: [number, number, number, number];
  onHit: () => void;
}

export function Bullet({ position, rotation, onHit }: BulletProps) {
  const rb = useRef<RapierRigidBody>(null);
  const [alive, setAlive] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setAlive(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useFrame((state, delta) => {
    if (!rb.current || !alive) return;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(...rotation));
    rb.current.setLinvel(vec3(forward).multiplyScalar(100), true);
  });

  if (!alive) return null;

  return (
    <RigidBody
      ref={rb}
      position={position}
      rotation={rotation}
      sensor
      onIntersectionEnter={onHit}
      colliders="ball"
    >
      <mesh>
        <sphereGeometry args={[0.1]} />
        <meshStandardMaterial color="yellow" emissive="yellow" emissiveIntensity={2} />
      </mesh>
    </RigidBody>
  );
}

export function Missile({ position, rotation, targetId, onHit }: BulletProps & { targetId?: string }) {
  const rb = useRef<RapierRigidBody>(null);
  const [alive, setAlive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setAlive(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useFrame((state, delta) => {
    if (!rb.current || !alive) return;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(...rotation));
    rb.current.setLinvel(vec3(forward).multiplyScalar(50), true);
    // Simple homing logic could be added here
  });

  if (!alive) return null;

  return (
    <RigidBody
      ref={rb}
      position={position}
      rotation={rotation}
      sensor
      onIntersectionEnter={onHit}
      colliders="ball"
    >
      <group>
        <mesh>
          <cylinderGeometry args={[0.1, 0.1, 0.5]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color="red" />
        </mesh>
        <mesh position={[0, 0, 0.3]}>
          <coneGeometry args={[0.1, 0.2]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color="darkred" />
        </mesh>
      </group>
    </RigidBody>
  );
}
