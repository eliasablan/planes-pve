import type { EnemyRole } from "@/store/useGameStore";

export const INTER_WAVE_DELAY_MS = 2400;
export const GAME_VERSION = "survival-v2";
export type GameVersion = "survival-v1" | typeof GAME_VERSION;

export function getWaveEnemyCount(wave: number, gameVersion: GameVersion = GAME_VERSION) {
  // Open tabs running the previous rules must still be able to finish their registered run.
  if (gameVersion === "survival-v1") return 3 + Math.min(5, Math.floor((wave - 1) / 2));
  // Grow every two waves through 17, then every wave. Bound rendering cost at 24 aircraft.
  const earlyGrowth = Math.floor(Math.min(wave - 1, 16) / 2);
  const lateGrowth = Math.min(13, Math.max(0, wave - 17));
  return 3 + earlyGrowth + lateGrowth;
}

export function getWaveClearBonus(wave: number) {
  return 180 + wave * 25;
}

export const ROLE_STATS: Record<
  EnemyRole,
  { hp: number; speed: number; damage: number; range: number; color: string; scale: number; burst: number; reloadMs: number }
> = {
  scout: { hp: 35, speed: 46, damage: 3, range: 125, color: "#51d6a3", scale: 0.78, burst: 2, reloadMs: 4200 },
  fighter: { hp: 65, speed: 40, damage: 5, range: 155, color: "#f65f5f", scale: 0.92, burst: 3, reloadMs: 5200 },
  bomber: { hp: 120, speed: 28, damage: 8, range: 180, color: "#f4c95d", scale: 1.18, burst: 1, reloadMs: 6800 },
};

