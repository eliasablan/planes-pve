import { hasTerrainLineOfSight } from "./terrainHeight";

type Weapon = "mg" | "missile";
type Position = [number, number, number];
type Enemy = { id: string; position: Position };
type WeaponSound = { type: "machine-gun" | "missile" | "ammo-depleted" | "weapon-empty" };
type Target = { id: string; distance: number; dot: number };
type TargetLock = { id: string; distance: number; inSolution: boolean } | null;

export type PveFiringState = {
  hp: number;
  paused: boolean;
  selectedWeapon: Weapon;
  ammo: number;
  missiles: number;
  pveEnemies: Readonly<Record<string, Enemy>>;
  useAmmo: () => void;
  useMissile: () => void;
  damagePveEnemy: (id: string, damage: number) => void;
};

const WEAPONS = {
  mg: { range: 780, minDot: 0.982, damage: 12, intervalMs: 150 },
  missile: { range: 1200, minDot: 0.94, damage: 80, intervalMs: 2000 },
} as const;
const LOCK_CONE = { range: 1200, minDot: 0.9 } as const;

/** One instance per aircraft: callers only supply aim, trigger, and wall-clock time. */
export function createPveFiring({ getState, playSound }: {
  getState: () => PveFiringState;
  playSound: (event: WeaponSound) => void;
}) {
  const lastFiredAt: Record<Weapon, number> = { mg: -Infinity, missile: -Infinity };
  const warnedEmpty = new Set<Weapon>();

  return {
    update({ now, firing, origin, forward }: {
      now: number;
      firing: boolean;
      origin: Position;
      forward: Position;
    }): { lock: TargetLock; fired: Weapon | null } {
      const state = getState();
      if (state.hp <= 0 || state.paused) return { lock: null, fired: null };

      const weapon = state.selectedWeapon;
      const lock = findFiringSolution(Object.values(state.pveEnemies), origin, forward, weapon);
      if (!firing) warnedEmpty.clear();
      if (state.ammo > 0) warnedEmpty.delete("mg");
      if (state.missiles > 0) warnedEmpty.delete("missile");

      const remaining = weapon === "mg" ? state.ammo : state.missiles;
      if (!firing) return { lock, fired: null };
      if (remaining <= 0) {
        if (!warnedEmpty.has(weapon)) {
          warnedEmpty.add(weapon);
          playSound({ type: "weapon-empty" });
        }
        return { lock, fired: null };
      }

      const rules = WEAPONS[weapon];
      // Cooldowns remain independent and use elapsed wall time, including time paused.
      if (now - lastFiredAt[weapon] <= rules.intervalMs) return { lock, fired: null };
      lastFiredAt[weapon] = now;
      if (weapon === "mg") state.useAmmo();
      else state.useMissile();

      // Keep the existing feedback order: gun damage precedes audio; missile audio precedes damage.
      if (weapon === "mg" && lock?.inSolution) state.damagePveEnemy(lock.id, rules.damage);
      playSound({ type: weapon === "mg" ? "machine-gun" : "missile" });
      const after = getState();
      if ((weapon === "mg" ? after.ammo : after.missiles) === 0) {
        warnedEmpty.add(weapon);
        playSound({ type: "ammo-depleted" });
      }
      if (weapon === "missile" && lock?.inSolution) state.damagePveEnemy(lock.id, rules.damage);

      return { lock, fired: weapon };
    },
  };
}

function findFiringSolution(enemies: Enemy[], origin: Position, forward: Position, weapon: Weapon): TargetLock {
  const forwardLength = Math.hypot(...forward);
  if (forwardLength === 0) return null;
  const rules = WEAPONS[weapon];
  let solution: Target | null = null;
  let preview: Target | null = null;

  for (const enemy of enemies) {
    const x = enemy.position[0] - origin[0];
    const y = enemy.position[1] - origin[1];
    const z = enemy.position[2] - origin[2];
    const distance = Math.hypot(x, y, z);
    if (distance <= 0 || distance > LOCK_CONE.range) continue;
    const dot = (x * forward[0] + y * forward[1] + z * forward[2]) / (distance * forwardLength);
    if (dot < LOCK_CONE.minDot || !hasTerrainLineOfSight(origin, enemy.position)) continue;

    const candidate = { id: enemy.id, distance, dot };
    if (isBetterTarget(candidate, preview)) preview = candidate;
    if (distance <= rules.range && dot >= rules.minDot && isBetterTarget(candidate, solution)) solution = candidate;
  }

  const target = solution ?? preview;
  return target ? { id: target.id, distance: Math.round(target.distance), inSolution: solution !== null } : null;
}

function isBetterTarget(candidate: Target, current: Target | null) {
  return current === null || candidate.dot > current.dot ||
    (candidate.dot === current.dot && candidate.distance < current.distance);
}
