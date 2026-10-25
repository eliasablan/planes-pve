import type { EnemyRole } from "@/store/useGameStore";

export const INTER_WAVE_DELAY_MS = 2400;

export function getWaveEnemyCount(wave: number) {
  return 3 + Math.min(5, Math.floor((wave - 1) / 2));
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

