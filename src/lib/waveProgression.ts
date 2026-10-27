import * as THREE from "three";
import type { EnemyRole, EnemyState, PickupKind, PickupState, useGameStore } from "@/store/useGameStore";
import { getWaveClearBonus, getWaveEnemyCount, INTER_WAVE_DELAY_MS, ROLE_STATS } from "./pveRules";
import { hasTerrainLineOfSight, minimumAirborneY } from "./terrainHeight";

type WaveState = Pick<ReturnType<typeof useGameStore.getState>,
  | "gameStatus" | "hp" | "paused" | "startTime" | "wave" | "ammo"
  | "localPlayerPosition" | "altitude" | "heading" | "pveEnemies" | "pvePickups"
  | "spawnPveEnemies" | "setPveEnemies" | "spawnPvePickups" | "collectPvePickup"
  | "setWave" | "addScore" | "setDamageIndicator"
>;

type Attack = { lastAt: number; remaining: number; reloadUntil: number };

const RUN_START_INVULNERABILITY_MS = 6500;
const ENEMY_ATTACK_INTERVAL_MS = 2300;
const EMERGENCY_RESUPPLY_DELAY_MS = 5000;
const ENEMY_TERRAIN_CLEARANCE = 30;
const PICKUP_TERRAIN_CLEARANCE = 28;

/** One instance per run. The frame adapter supplies time; progression owns all gameplay ordering. */
export function createWaveProgression({ getState, applyDamage }: {
  getState: () => WaveState;
  applyDamage: (damage: number) => void;
}) {
  let started = false;
  let nextWaveAt: number | null = null;
  let shortageSince: number | null = null;
  const attacks = new Map<string, Attack>();

  return {
    update({ now, delta }: { now: number; delta: number }) {
      let state = getState();
      if (state.gameStatus !== "playing" || state.hp <= 0 || state.paused || state.startTime === null) return;

      // The lifecycle shifts startTime on resume. Every deadline therefore uses active run time,
      // even when pause and resume happen without a rendered frame between them.
      const activeNow = now - state.startTime;
      if (!started) {
        started = true;
        if (Object.keys(state.pveEnemies).length === 0) {
          state.spawnPveEnemies(createWave(state.wave, state));
          state = getState();
        }
      }

      const player = new THREE.Vector3(state.localPlayerPosition[0], state.altitude - 5, state.localPlayerPosition[1]);
      const enemies = Object.values(state.pveEnemies);
      // Capture pickups before spawning: new supplies become collectible on the following frame.
      const pickups = Object.values(state.pvePickups);

      for (const id of attacks.keys()) {
        if (!state.pveEnemies[id]) attacks.delete(id);
      }

      const needsAmmo = state.ammo === 0 && enemies.length > 0 && !pickups.some(pickup => pickup.kind === "ammo");
      shortageSince = needsAmmo ? shortageSince ?? activeNow : null;
      if (shortageSince !== null && activeNow - shortageSince >= EMERGENCY_RESUPPLY_DELAY_MS) {
        state.spawnPvePickups(createPickups(state.wave, player, state.heading, ["ammo"]));
        shortageSince = null;
      }

      if (enemies.length === 0) {
        if (nextWaveAt === null) {
          nextWaveAt = activeNow + INTER_WAVE_DELAY_MS;
          state.addScore(getWaveClearBonus(state.wave));
          const kinds: PickupKind[] = ["ammo"];
          if (state.wave % 5 === 0) kinds.push("missile");
          if (state.wave % 2 === 0) kinds.push("repair");
          state.spawnPvePickups(createPickups(state.wave, player, state.heading, kinds));
        }
        if (activeNow >= nextWaveAt) {
          const nextWave = state.wave + 1;
          state.setWave(nextWave);
          state.spawnPveEnemies(createWave(nextWave, state));
          nextWaveAt = null;
        }
      } else {
        nextWaveAt = null;
        const nextEnemies: Record<string, EnemyState> = {};

        for (const enemy of enemies) {
          const stats = ROLE_STATS[enemy.role];
          let attack = attacks.get(enemy.id);
          if (!attack) {
            attack = { lastAt: 0, remaining: stats.burst, reloadUntil: 0 };
            attacks.set(enemy.id, attack);
          }

          const position = new THREE.Vector3(...enemy.position);
          const toPlayer = player.clone().sub(position);
          const distance = toPlayer.length();
          const direction = distance > 0 ? toPlayer.clone().normalize() : new THREE.Vector3(0, 0, -1);
          const orbitStrength = enemy.role === "scout" ? 0.16 : enemy.role === "fighter" ? 0.11 : 0.05;
          const orbit = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(Math.sin(now * 0.001 + enemy.id.length) * orbitStrength);
          const desired = direction.add(orbit).normalize();
          const preferredRange = stats.range * 0.8;
          const speedScale = distance > preferredRange ? 1 : -0.12;
          position.add(desired.multiplyScalar(stats.speed * speedScale * delta));
          position.y = THREE.MathUtils.lerp(position.y, player.y + altitudeOffset(enemy.role, now), 0.018);
          position.y = Math.max(position.y, minimumAirborneY(position.x, position.z, ENEMY_TERRAIN_CLEARANCE));
          nextEnemies[enemy.id] = { ...enemy, position: [position.x, position.y, position.z], heading: Math.atan2(desired.x, desired.z) };

          if (attack.reloadUntil > 0 && activeNow >= attack.reloadUntil) {
            attack.reloadUntil = 0;
            attack.remaining = stats.burst;
          }
          if (
            getState().hp > 0 &&
            activeNow > RUN_START_INVULNERABILITY_MS && position.distanceTo(player) < stats.range &&
            attack.reloadUntil === 0 && attack.remaining > 0 &&
            activeNow - attack.lastAt > ENEMY_ATTACK_INTERVAL_MS &&
            hasTerrainLineOfSight([position.x, position.y, position.z], [player.x, player.y, player.z])
          ) {
            attack.lastAt = activeNow;
            attack.remaining--;
            applyDamage(stats.damage);
            state.setDamageIndicator({
              angle: Math.atan2(position.x - player.x, position.z - player.z),
              intensity: enemy.role === "bomber" ? 1 : enemy.role === "fighter" ? 0.78 : 0.56,
              timestamp: now,
            });
            if (attack.remaining <= 0) attack.reloadUntil = activeNow + stats.reloadMs;
          }
        }
        state.setPveEnemies(nextEnemies);
      }

      // Damage and defeat resolve before recovery. A nearby repair cannot revive a defeated pilot.
      if (getState().hp <= 0) return;
      for (const pickup of pickups) {
        if (new THREE.Vector3(...pickup.position).distanceTo(player) < 85) state.collectPvePickup(pickup.id);
      }
    },
  };
}

function createWave(wave: number, state: Pick<WaveState, "localPlayerPosition" | "altitude" | "heading">): EnemyState[] {
  const composition: EnemyRole[] = ["scout", "fighter", "bomber"];
  const extras: EnemyRole[] = ["fighter", "scout", "bomber"];
  for (let i = 0; composition.length < getWaveEnemyCount(wave); i++) composition.push(extras[i % extras.length]);

  const nearRadius = Math.max(240, 500 - (wave - 1) * 10);
  const bandSpacing = wave <= 3 ? 0 : 60;
  const halfArc = THREE.MathUtils.degToRad(Math.min(85, 70 + (wave - 1) * 2));
  // Heading 0 faces -Z; +90 faces -X, matching flight and radar.
  const bearing = -Math.PI / 2 - THREE.MathUtils.degToRad(state.heading);

  return composition.map((role, index) => {
    const stats = ROLE_STATS[role];
    // Alternating bands stagger arrival; flip the near band each wave to vary the formation.
    const radius = nearRadius + ((index + wave) % 2) * bandSpacing;
    const angle = bearing - halfArc + 2 * halfArc * index / (composition.length - 1);
    // Spawn rings stay centered at the map origin, independently of the pilot's position.
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return {
      id: `wave-${wave}-${role}-${index}-${crypto.randomUUID().slice(0, 6)}`,
      role,
      position: [x, Math.max(state.altitude - 5 + (index % 3 - 1) * 24, minimumAirborneY(x, z, ENEMY_TERRAIN_CLEARANCE)), z],
      heading: Math.atan2(state.localPlayerPosition[0] - x, state.localPlayerPosition[1] - z),
      hp: stats.hp,
      maxHp: stats.hp,
    };
  });
}

function createPickups(wave: number, player: THREE.Vector3, heading: number, kinds: PickupKind[]): PickupState[] {
  const bearing = THREE.MathUtils.degToRad(heading);
  return kinds.map((kind, index) => {
    const distance = 200 + index * 100;
    const x = player.x - Math.sin(bearing) * distance;
    const z = player.z - Math.cos(bearing) * distance;
    return {
      id: `pickup-${wave}-${kind}-${crypto.randomUUID().slice(0, 6)}`,
      kind,
      position: [x, Math.max(30, player.y, minimumAirborneY(x, z, PICKUP_TERRAIN_CLEARANCE)), z],
    };
  });
}

function altitudeOffset(role: EnemyRole, now: number) {
  const base = role === "bomber" ? -24 : role === "fighter" ? 8 : 34;
  return base + Math.sin(now * 0.0015) * 28;
}
