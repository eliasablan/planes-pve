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

  useFrame(() => {
    if (!rb.current || !alive) return;
    const q = new THREE.Quaternion(...rotation);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    rb.current.setLinvel(vec3(forward).multiplyScalar(100), true);
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
      <mesh>
        <sphereGeometry args={[0.1]} />
        <meshStandardMaterial color="yellow" emissive="yellow" emissiveIntensity={2} />
      </mesh>
    </RigidBody>
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
