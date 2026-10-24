import * as THREE from "three";
import { hasTerrainLineOfSight } from "./terrainHeight";

export function firePveMachineGun({
  enemies,
  origin,
  forward,
  consumeAmmo,
  damagePveEnemy,
}: {
  enemies: Array<{ id: string; position: [number, number, number] }>;
  origin: [number, number, number];
  forward: [number, number, number];
  consumeAmmo: () => void;
  damagePveEnemy: (enemyId: string, damage: number) => void;
}) {
  consumeAmmo();
  const target = findPveTarget(enemies, origin, forward, WEAPON_CONES.mg.range, WEAPON_CONES.mg.minDot);
  if (target) damagePveEnemy(target.id, 12);
  return { fired: true, targetId: target?.id };
}

export function firePveMissile({
  enemies,
  origin,
  forward,
  damagePveEnemy,
}: {
  enemies: Array<{ id: string; position: [number, number, number] }>;
  origin: [number, number, number];
  forward: [number, number, number];
  damagePveEnemy: (enemyId: string, damage: number) => void;
}) {
  const target = findPveTarget(enemies, origin, forward, WEAPON_CONES.missile.range, WEAPON_CONES.missile.minDot);
  if (target) damagePveEnemy(target.id, 80);
}

// Hit cones used by the hitscan weapons; the HUD lock reads the same values so "in solution" means a hit.
const WEAPON_CONES = {
  mg: { range: 780, minDot: 0.982 },
  missile: { range: 1200, minDot: 0.94 },
} as const;
// Wider cone (~25°) for picking which enemy the secondary reticle tracks.
const LOCK_CONE = { range: 1200, minDot: 0.9 } as const;

export function findTargetLock(
  enemies: Array<{ id: string; position: [number, number, number] }>,
  origin: [number, number, number],
  forward: [number, number, number],
  weapon: "mg" | "missile",
) {
  const originVector = new THREE.Vector3(...origin);
  const forwardVector = new THREE.Vector3(...forward).normalize();
  let best: { id: string; distance: number; dot: number } | null = null;

  for (const enemy of enemies) {
    const toEnemy = new THREE.Vector3(...enemy.position).sub(originVector);
    const distance = toEnemy.length();
    if (distance <= 0 || distance > LOCK_CONE.range) continue;

    const dot = toEnemy.normalize().dot(forwardVector);
    if (dot < LOCK_CONE.minDot || !hasTerrainLineOfSight(origin, enemy.position)) continue;

    // Track whichever enemy sits closest to the crosshair.
    if (!best || dot > best.dot) best = { id: enemy.id, distance, dot };
  }

  if (!best) return null;
  const cone = WEAPON_CONES[weapon];
  return {
    id: best.id,
    distance: Math.round(best.distance),
    inSolution: best.distance <= cone.range && best.dot >= cone.minDot,
  };
}

function findPveTarget(
  enemies: Array<{ id: string; position: [number, number, number] }>,
  origin: [number, number, number],
  forward: [number, number, number],
  range: number,
  minDot: number,
) {
  const originVector = new THREE.Vector3(...origin);
  const forwardVector = new THREE.Vector3(...forward).normalize();
  let best: { id: string; distance: number } | null = null;

  for (const enemy of enemies) {
    const toEnemy = new THREE.Vector3(...enemy.position).sub(originVector);
    const distance = toEnemy.length();
    if (distance <= 0 || distance > range) continue;

    const dot = toEnemy.normalize().dot(forwardVector);
    if (dot < minDot || !hasTerrainLineOfSight(origin, enemy.position)) continue;

    if (!best || distance < best.distance) best = { id: enemy.id, distance };
  }

  return best;
}
