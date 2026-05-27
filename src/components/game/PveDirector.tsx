"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { applyLocalDamage } from "@/lib/combatResolution";
import { EnemyRole, EnemyState, PickupKind, PickupState, useGameStore } from "@/store/useGameStore";
import { AirplaneModel } from "./AirplaneModel";

const ROLE_STATS: Record<EnemyRole, { hp: number; speed: number; damage: number; range: number; color: string; scale: number }> = {
  scout: { hp: 35, speed: 78, damage: 5, range: 155, color: "#51d6a3", scale: 0.78 },
  fighter: { hp: 65, speed: 58, damage: 8, range: 190, color: "#f65f5f", scale: 0.92 },
  bomber: { hp: 120, speed: 38, damage: 12, range: 220, color: "#f4c95d", scale: 1.18 },
};

const ENEMY_ATTACK_INTERVAL_MS = 1850;

const PICKUP_COLORS: Record<PickupKind, string> = {
  ammo: "#f4c95d",
  missile: "#65a6ff",
  repair: "#51d6a3",
};

export function PveDirector() {
  const pveEnemies = useGameStore((state) => state.pveEnemies);
  const pvePickups = useGameStore((state) => state.pvePickups);
  const setPveEnemies = useGameStore((state) => state.setPveEnemies);
  const spawnPveEnemies = useGameStore((state) => state.spawnPveEnemies);
  const spawnPvePickups = useGameStore((state) => state.spawnPvePickups);
  const collectPvePickup = useGameStore((state) => state.collectPvePickup);
  const setWave = useGameStore((state) => state.setWave);
  const addScore = useGameStore((state) => state.addScore);
  const setDamageIndicator = useGameStore((state) => state.setDamageIndicator);

  const lastAttackByEnemy = useRef<Record<string, number>>({});
  const pendingNextWaveAt = useRef<number | null>(null);

  useEffect(() => {
    const state = useGameStore.getState();
    if (Object.keys(state.pveEnemies).length === 0) {
      spawnPveEnemies(createWave(1));
    }
  }, [spawnPveEnemies]);

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    if (state.gameStatus !== "playing" || state.hp <= 0) return;

    const now = Date.now();
    const player = new THREE.Vector3(
      state.localPlayerPosition[0],
      Math.max(130, state.altitude - 5),
      state.localPlayerPosition[1],
    );

    const enemyList = Object.values(state.pveEnemies);
    if (enemyList.length === 0) {
      if (!pendingNextWaveAt.current) {
        pendingNextWaveAt.current = now + 2400;
        addScore(180 + state.wave * 25);
        spawnRecoveryPickups(state.wave, player, spawnPvePickups);
      }

      if (pendingNextWaveAt.current && now >= pendingNextWaveAt.current) {
        const nextWave = state.wave + 1;
        setWave(nextWave);
        spawnPveEnemies(createWave(nextWave));
        pendingNextWaveAt.current = null;
      }
    }

    if (enemyList.length > 0) {
      pendingNextWaveAt.current = null;
      const nextEnemies: Record<string, EnemyState> = {};

      for (const enemy of enemyList) {
        const stats = ROLE_STATS[enemy.role];
        const position = new THREE.Vector3(...enemy.position);
        const toPlayer = player.clone().sub(position);
        const distance = toPlayer.length();
        const direction = distance > 0 ? toPlayer.clone().normalize() : new THREE.Vector3(0, 0, -1);
        const orbit = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(Math.sin(now * 0.001 + enemy.id.length) * 0.35);
        const desired = direction.add(orbit).normalize();
        const preferredRange = enemy.role === "bomber" ? 300 : enemy.role === "fighter" ? 230 : 180;
        const speedScale = distance > preferredRange ? 1 : -0.28;

        position.add(desired.multiplyScalar(stats.speed * speedScale * delta));
        position.y = THREE.MathUtils.lerp(position.y, player.y + altitudeOffset(enemy.role, now), 0.018);

        const heading = Math.atan2(desired.x, desired.z);
        nextEnemies[enemy.id] = {
          ...enemy,
          position: [position.x, position.y, position.z],
          heading,
        };

        if (
          distance < stats.range &&
          now - (lastAttackByEnemy.current[enemy.id] ?? 0) > ENEMY_ATTACK_INTERVAL_MS
        ) {
          lastAttackByEnemy.current[enemy.id] = now;
          applyLocalDamage(stats.damage);
          setDamageIndicator({
            angle: Math.atan2(position.x - player.x, position.z - player.z),
            intensity: enemy.role === "bomber" ? 1 : enemy.role === "fighter" ? 0.78 : 0.56,
            timestamp: now,
          });
        }
      }

      setPveEnemies(nextEnemies);
    }

    for (const pickup of Object.values(state.pvePickups)) {
      const pickupPosition = new THREE.Vector3(...pickup.position);
      if (pickupPosition.distanceTo(player) < 85) {
        collectPvePickup(pickup.id);
      }
    }
  });

  return (
    <>
      {Object.values(pveEnemies).map((enemy) => (
        <EnemyAircraft key={enemy.id} enemy={enemy} />
      ))}
      {Object.values(pvePickups).map((pickup) => (
        <Pickup key={pickup.id} pickup={pickup} />
      ))}
    </>
  );
}

function EnemyAircraft({ enemy }: { enemy: EnemyState }) {
  const stats = ROLE_STATS[enemy.role];

  return (
    <group position={enemy.position} rotation={[0, enemy.heading + Math.PI, 0]} scale={stats.scale}>
      <AirplaneModel hp={enemy.hp} variant="remote" playerColor={stats.color} />
      <Text position={[0, 2.6, 0]} fontSize={0.42} color={stats.color} anchorX="center" anchorY="middle">
        {enemy.role.toUpperCase()}
      </Text>
      <mesh position={[0, -0.2, 1.8]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color={stats.color} emissive={stats.color} emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

function Pickup({ pickup }: { pickup: PickupState }) {
  const color = PICKUP_COLORS[pickup.kind];
  const label = pickup.kind === "ammo" ? "AMMO" : pickup.kind === "missile" ? "MSL" : "FIX";

  return (
    <group position={pickup.position}>
      <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <boxGeometry args={[12, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.42} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[18, 21, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.38} side={THREE.DoubleSide} />
      </mesh>
      <Text position={[0, 18, 0]} fontSize={5} color={color} anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}

function createWave(wave: number) {
  const composition: EnemyRole[] = ["scout", "fighter", "bomber"];
  const extraCount = Math.min(5, Math.floor((wave - 1) / 2));
  for (let i = 0; i < extraCount; i++) {
    composition.push(i % 3 === 0 ? "fighter" : i % 3 === 1 ? "scout" : "bomber");
  }

  return composition.map((role, index) => {
    const stats = ROLE_STATS[role];
    const angle = (Math.PI * 2 * index) / composition.length + wave * 0.62;
    const radius = 620 + wave * 28 + index * 45;
    return {
      id: `wave-${wave}-${role}-${index}-${crypto.randomUUID().slice(0, 6)}`,
      role,
      position: [Math.cos(angle) * radius, 210 + index * 24, Math.sin(angle) * radius] as [number, number, number],
      heading: angle + Math.PI,
      hp: stats.hp,
      maxHp: stats.hp,
    };
  });
}

function spawnRecoveryPickups(
  wave: number,
  player: THREE.Vector3,
  spawnPvePickups: (pickups: PickupState[]) => void,
) {
  const kinds: PickupKind[] = wave % 5 === 0 ? ["ammo", "missile", "repair"] : wave % 2 === 0 ? ["ammo"] : [];
  if (kinds.length === 0) return;

  spawnPvePickups(
    kinds.map((kind, index) => {
      const angle = wave * 0.9 + index * 2.1;
      const distance = 240 + index * 90;
      return {
        id: `pickup-${wave}-${kind}-${crypto.randomUUID().slice(0, 6)}`,
        kind,
        position: [
          player.x + Math.cos(angle) * distance,
          Math.max(120, player.y - 20 + index * 18),
          player.z + Math.sin(angle) * distance,
        ],
      };
    }),
  );
}

function altitudeOffset(role: EnemyRole, now: number) {
  const base = role === "bomber" ? -24 : role === "fighter" ? 8 : 34;
  return base + Math.sin(now * 0.0015) * 28;
}
