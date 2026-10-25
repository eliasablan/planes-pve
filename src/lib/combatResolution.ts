import { playGameSound } from "@/lib/gameAudio";
import { finishRun } from "@/lib/runLifecycle";
import { useGameStore } from "@/store/useGameStore";

export const DAMAGE = { boundary: 20 } as const;

export function applyLocalDamage(damage: number, source: "enemy" | "environment" = "environment") {
  const state = useGameStore.getState();
  const nextHp = Math.max(0, state.hp - damage);
  state.setHp(nextHp);
  if (source === "enemy" && nextHp < state.hp) {
    playGameSound({ type: nextHp === 0 ? "enemy-fatal" : "enemy-hit" });
  }
  if (state.hp > 0 && nextHp === 0) {
    finishRun();
  }
  return { hp: nextHp, eliminated: state.hp > 0 && nextHp === 0 };
}

export function eliminateLocalPlayer() {
  const state = useGameStore.getState();
  if (state.hp <= 0) return { eliminated: false };
  state.setHp(0);
  finishRun();
  return { eliminated: true };
}
