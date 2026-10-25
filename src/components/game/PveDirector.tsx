"use client";

import { Billboard, Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { applyLocalDamage } from "@/lib/combatResolution";
import { ROLE_STATS } from "@/lib/pveRules";
import { tickEmergencyResupply } from "@/lib/emergencyResupply";
import { hasTerrainLineOfSight, minimumAirborneY } from "@/lib/terrainHeight";
import { EnemyRole, EnemyState, PickupKind, PickupState, PveExplosion, TargetLock, useGameStore } from "@/store/useGameStore";
import { AirplaneModel } from "./AirplaneModel";
import { PickupVisual } from "./PickupVisual";

const RUN_START_INVULNERABILITY_MS = 6500;
// Enemies and supplies do not use physics; these keep them above the relief instead of inside it.
const ENEMY_TERRAIN_CLEARANCE = 30;
const PICKUP_TERRAIN_CLEARANCE = 28;
const ENEMY_ATTACK_INTERVAL_MS = 2300;

export function PveDirector() {
  const pveEnemies = useGameStore((state) => state.pveEnemies);
  const pvePickups = useGameStore((state) => state.pvePickups);
  const pveExplosions = useGameStore((state) => state.pveExplosions);
  const targetLock = useGameStore((state) => state.targetLock);
  const lockedEnemy = targetLock ? pveEnemies[targetLock.id] : undefined;
  const setPveEnemies = useGameStore((state) => state.setPveEnemies);
  const spawnPveEnemies = useGameStore((state) => state.spawnPveEnemies);
  const spawnPvePickups = useGameStore((state) => state.spawnPvePickups);
  const collectPvePickup = useGameStore((state) => state.collectPvePickup);
  const setWave = useGameStore((state) => state.setWave);
  const addScore = useGameStore((state) => state.addScore);
  const setDamageIndicator = useGameStore((state) => state.setDamageIndicator);

  const lastAttackByEnemy = useRef<Record<string, number>>({});
  const shotsInBurstByEnemy = useRef<Record<string, number>>({});
  const reloadUntilByEnemy = useRef<Record<string, number>>({});
  const pendingNextWaveAt = useRef<number | null>(null);
  const ammoShortageSince = useRef<number | null>(null);
  const pausedSince = useRef<number | null>(null);

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
    if (state.paused) {
      pausedSince.current ??= now;
      return;
    }
    if (pausedSince.current !== null) {
      // Wall-clock timers resume where they stopped instead of all expiring at once after a pause.
      const pausedFor = now - pausedSince.current;
      pausedSince.current = null;
      for (const timers of [lastAttackByEnemy.current, reloadUntilByEnemy.current]) {
        for (const id in timers) if (timers[id] > 0) timers[id] += pausedFor;
      }
      if (pendingNextWaveAt.current !== null) pendingNextWaveAt.current += pausedFor;
      if (ammoShortageSince.current !== null) ammoShortageSince.current += pausedFor;
    }
    const player = new THREE.Vector3(
      state.localPlayerPosition[0],
      Math.max(130, state.altitude - 5),
      state.localPlayerPosition[1],
    );

    const enemyList = Object.values(state.pveEnemies);
    const emergency = tickEmergencyResupply(
      now,
      ammoShortageSince.current,
      state.ammo === 0 && enemyList.length > 0 &&
        !Object.values(state.pvePickups).some((pickup) => pickup.kind === "ammo"),
    );
    ammoShortageSince.current = emergency.shortageSince;
    if (emergency.shouldSpawn) {
      spawnPickupsAhead(
        state.wave,
        new THREE.Vector3(player.x, state.altitude - 5, player.z),
        state.heading,
        ["ammo"],
        spawnPvePickups,
      );
      ammoShortageSince.current = null;
    }

    if (enemyList.length === 0) {
      if (!pendingNextWaveAt.current) {
        pendingNextWaveAt.current = now + 2400;
        addScore(180 + state.wave * 25);
        spawnRecoveryPickups(state.wave, new THREE.Vector3(player.x, state.altitude - 5, player.z), state.heading, spawnPvePickups);
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
        shotsInBurstByEnemy.current[enemy.id] ??= stats.burst;

        const position = new THREE.Vector3(...enemy.position);
        const toPlayer = player.clone().sub(position);
        const distance = toPlayer.length();
        const direction = distance > 0 ? toPlayer.clone().normalize() : new THREE.Vector3(0, 0, -1);
        const orbitStrength = enemy.role === "scout" ? 0.16 : enemy.role === "fighter" ? 0.11 : 0.05;
        const orbit = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(Math.sin(now * 0.001 + enemy.id.length) * orbitStrength);
        const desired = direction.add(orbit).normalize();
        const preferredRange = enemy.role === "bomber" ? 210 : enemy.role === "fighter" ? 165 : 135;
        const speedScale = distance > preferredRange ? 1 : -0.12;

        position.add(desired.multiplyScalar(stats.speed * speedScale * delta));
        position.y = THREE.MathUtils.lerp(position.y, player.y + altitudeOffset(enemy.role, now), 0.018);
        position.y = Math.max(position.y, minimumAirborneY(position.x, position.z, ENEMY_TERRAIN_CLEARANCE));

        const heading = Math.atan2(desired.x, desired.z);
        nextEnemies[enemy.id] = {
          ...enemy,
          position: [position.x, position.y, position.z],
          heading,
        };

        const runAge = state.startTime ? now - state.startTime : 0;
        const reloadUntil = reloadUntilByEnemy.current[enemy.id] ?? 0;
        if (reloadUntil > 0 && now >= reloadUntil) {
          reloadUntilByEnemy.current[enemy.id] = 0;
          shotsInBurstByEnemy.current[enemy.id] = stats.burst;
        }

        if (
          runAge > RUN_START_INVULNERABILITY_MS &&
          distance < stats.range &&
          (reloadUntilByEnemy.current[enemy.id] ?? 0) === 0 &&
          (shotsInBurstByEnemy.current[enemy.id] ?? 0) > 0 &&
          now - (lastAttackByEnemy.current[enemy.id] ?? 0) > ENEMY_ATTACK_INTERVAL_MS &&
          hasTerrainLineOfSight([position.x, position.y, position.z], [player.x, state.altitude - 5, player.z])
        ) {
          lastAttackByEnemy.current[enemy.id] = now;
          shotsInBurstByEnemy.current[enemy.id] -= 1;
          applyLocalDamage(stats.damage, "enemy");
          setDamageIndicator({
            angle: Math.atan2(position.x - player.x, position.z - player.z),
            intensity: enemy.role === "bomber" ? 1 : enemy.role === "fighter" ? 0.78 : 0.56,
            timestamp: now,
          });

          if (shotsInBurstByEnemy.current[enemy.id] <= 0) {
            reloadUntilByEnemy.current[enemy.id] = now + stats.reloadMs;
          }
        }
      }

      setPveEnemies(nextEnemies);
    }

    // A repair pickup must not revive the aircraft after a fatal attack this frame.
    if (useGameStore.getState().hp <= 0) return;
    for (const pickup of Object.values(state.pvePickups)) {
      const pickupPosition = new THREE.Vector3(...pickup.position);
      if (pickupPosition.distanceTo(new THREE.Vector3(player.x, state.altitude - 5, player.z)) < 85) {
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
        <PickupVisual key={pickup.id} pickup={pickup} />
      ))}
      {pveExplosions.map((explosion) => (
        <Explosion key={explosion.id} explosion={explosion} />
      ))}
      {targetLock && lockedEnemy && <TargetReticle enemy={lockedEnemy} lock={targetLock} />}
    </>
  );
}

function EnemyAircraft({ enemy }: { enemy: EnemyState }) {
  const stats = ROLE_STATS[enemy.role];

  return (
    <group position={enemy.position} rotation={[0, enemy.heading + Math.PI, 0]} scale={stats.scale}>
      <AirplaneModel hp={enemy.hp} variant="enemy" playerColor={stats.color} />
      <Text position={[0, 2.6, 0]} fontSize={0.42} color={stats.color} anchorX="center" anchorY="middle">
        {enemy.role.toUpperCase()}
      </Text>
      <EnemyHealthBar ratio={enemy.hp / enemy.maxHp} color={stats.color} />
      <mesh position={[0, -0.2, 1.8]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color={stats.color} emissive={stats.color} emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

function TargetReticle({ enemy, lock }: { enemy: EnemyState; lock: NonNullable<TargetLock> }) {
  const color = lock.inSolution ? "#ff4d3d" : ROLE_STATS[enemy.role].color;
  const size = lock.inSolution ? 46 : 64;
  const outline = { textShadow: "0 0 2px #000, 0 0 2px #000" };

  return (
    <Html position={enemy.position} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
      <div className="relative flex select-none flex-col items-center whitespace-nowrap text-[11px] text-wf-ink">
        <div className="mb-1 font-medium" style={{ color, ...outline }}>
          {lock.inSolution ? "FIRE // IN_RANGE" : `${enemy.role.toUpperCase()}_LOCK`}
        </div>
        <div
          className="relative transition-all duration-150 ease-out"
          style={{ width: size, height: size, filter: "drop-shadow(0 0 1px #000)" }}
        >
          {(["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"] as const).map(
            (corner) => (
              <div key={corner} className={`absolute h-3 w-3 ${corner}`} style={{ borderColor: color }} />
            ),
          )}
          {lock.inSolution && (
            <div className="absolute left-1/2 top-1/2 h-0.5 w-0.5 -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: color }} />
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 tabular-nums" style={outline}>
          <span>{lock.distance}M</span>
          <span className="h-[2px] w-10 bg-black/50">
            <span className="block h-full" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%`, backgroundColor: color }} />
          </span>
        </div>
      </div>
    </Html>
  );
}

function EnemyHealthBar({ ratio, color }: { ratio: number; color: string }) {
  const width = 3.2;
  const fill = Math.max(0, Math.min(1, ratio));

  return (
    <Billboard position={[0, 3.25, 0]}>
      <mesh>
        <planeGeometry args={[width + 0.16, 0.36]} />
        <meshBasicMaterial color="#05070a" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <mesh position={[(-width * (1 - fill)) / 2, 0, 0.01]} scale={[fill, 1, 1]}>
        <planeGeometry args={[width, 0.2]} />
        <meshBasicMaterial color={fill < 0.35 ? "#f65f5f" : color} toneMapped={false} depthWrite={false} />
      </mesh>
    </Billboard>
  );
}

const EXPLOSION_DURATION_MS = 1600;
const DEBRIS_COUNT = 10;

function Explosion({ explosion }: { explosion: PveExplosion }) {
  const groupRef = useRef<THREE.Group>(null);
  const flashRef = useRef<THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>>(null);
  const fireRef = useRef<THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>>(null);
  const smokeRef = useRef<THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>>(null);
  const ringRef = useRef<THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>>(null);
  const debrisRefs = useRef<Array<THREE.Mesh | null>>([]);
  const debris = useMemo(
    () =>
      Array.from({ length: DEBRIS_COUNT }, (_, index) => {
        const noise = (salt: number) => {
          const x = Math.sin(explosion.timestamp * 0.001 + index * 12.9898 + salt * 78.233) * 43758.5453;
          return x - Math.floor(x);
        };
        return new THREE.Vector3(noise(1) - 0.5, noise(2) * 0.8 - 0.2, noise(3) - 0.5)
          .normalize()
          .multiplyScalar(18 + noise(4) * 22);
      }),
    [explosion.timestamp],
  );

  useFrame(({ camera }) => {
    const t = (Date.now() - explosion.timestamp) / EXPLOSION_DURATION_MS;
    if (!groupRef.current) return;
    groupRef.current.visible = t < 1;
    if (t >= 1) return;

    const seconds = t * (EXPLOSION_DURATION_MS / 1000);
    const flashT = Math.min(1, t / 0.18);
    flashRef.current?.scale.setScalar(2 + flashT * 10);
    if (flashRef.current) flashRef.current.material.opacity = 1 - flashT;

    const fireT = Math.min(1, t / 0.55);
    fireRef.current?.scale.setScalar(1.5 + Math.sqrt(fireT) * 7);
    if (fireRef.current) fireRef.current.material.opacity = 0.95 * (1 - fireT);

    smokeRef.current?.scale.setScalar(3 + Math.sqrt(t) * 12);
    smokeRef.current?.position.set(0, seconds * 4, 0);
    if (smokeRef.current) smokeRef.current.material.opacity = 0.55 * (1 - t);

    if (ringRef.current) {
      ringRef.current.lookAt(camera.position);
      ringRef.current.scale.setScalar(1 + Math.min(1, t / 0.4) * 16);
      ringRef.current.material.opacity = 0.7 * Math.max(0, 1 - t / 0.4);
    }

    debrisRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const velocity = debris[index];
      mesh.position.set(velocity.x * seconds, velocity.y * seconds - 9 * seconds * seconds, velocity.z * seconds);
      mesh.rotation.set(seconds * 7 + index, seconds * 5, seconds * 3);
    });
  });

  return (
    <group ref={groupRef} position={explosion.position}>
      <mesh ref={flashRef}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#fff6d5" transparent toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh ref={fireRef}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#ff8a3d" transparent toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh ref={smokeRef}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color="#3a3f45" roughness={1} transparent depthWrite={false} />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.85, 1, 40]} />
        <meshBasicMaterial color={explosion.color} transparent toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {debris.map((_, index) => (
        <mesh key={index} ref={(mesh) => { debrisRefs.current[index] = mesh; }}>
          <boxGeometry args={[0.7, 0.25, 0.45]} />
          <meshStandardMaterial color={index % 3 === 0 ? explosion.color : "#2b2f33"} roughness={0.8} />
        </mesh>
      ))}
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
    const radius = 420 + wave * 18 + index * 36;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return {
      id: `wave-${wave}-${role}-${index}-${crypto.randomUUID().slice(0, 6)}`,
      role,
      position: [x, Math.max(210 + index * 24, minimumAirborneY(x, z, ENEMY_TERRAIN_CLEARANCE)), z] as [number, number, number],
      heading: angle + Math.PI,
      hp: stats.hp,
      maxHp: stats.hp,
    };
  });
}

function spawnRecoveryPickups(
  wave: number,
  player: THREE.Vector3,
  heading: number,
  spawnPvePickups: (pickups: PickupState[]) => void,
) {
  const kinds: PickupKind[] = ["ammo"];
  if (wave % 5 === 0) kinds.push("missile");
  if (wave % 2 === 0) kinds.push("repair");
  spawnPickupsAhead(wave, player, heading, kinds, spawnPvePickups);
}

function spawnPickupsAhead(
  wave: number,
  player: THREE.Vector3,
  heading: number,
  kinds: PickupKind[],
  spawnPvePickups: (pickups: PickupState[]) => void,
) {
  const bearing = THREE.MathUtils.degToRad(heading);

  spawnPvePickups(
    kinds.map((kind, index) => {
      const distance = 200 + index * 100;
      const x = player.x - Math.sin(bearing) * distance;
      const z = player.z - Math.cos(bearing) * distance;
      return {
        id: `pickup-${wave}-${kind}-${crypto.randomUUID().slice(0, 6)}`,
        kind,
        position: [x, Math.max(30, player.y, minimumAirborneY(x, z, PICKUP_TERRAIN_CLEARANCE)), z],
      };
    }),
  );
}

function altitudeOffset(role: EnemyRole, now: number) {
  const base = role === "bomber" ? -24 : role === "fighter" ? 8 : 34;
  return base + Math.sin(now * 0.0015) * 28;
}
