import { useGameStore } from "@/store/useGameStore";
import { beginGameAudio, finishGameAudio, stopGameAudio } from "@/lib/gameAudio";

export function startLocalMatch(matchId: string | null = null) {
  beginGameAudio();
  const state = useGameStore.getState();
  state.setMatchId(matchId);
  state.setStartTime(Date.now());
  state.setEndTime(null);
  state.setGameStatus("playing");
}

let pausedAt: number | null = null;

export function pauseLocalMatch() {
  const state = useGameStore.getState();
  if (state.gameStatus !== "playing" || state.paused || state.hp <= 0) return;
  pausedAt = Date.now();
  state.setPaused(true);
}

export function resumeLocalMatch() {
  const state = useGameStore.getState();
  if (!state.paused) return;
  // Shift the run clock past the pause so it neither counts as flight time nor eats the start-of-run grace period.
  if (pausedAt !== null && state.startTime !== null) state.setStartTime(state.startTime + (Date.now() - pausedAt));
  pausedAt = null;
  state.setPaused(false);
}

export function finishLocalMatch() {
  const state = useGameStore.getState();
  if (state.gameStatus === "finished") return;
  finishGameAudio();
  state.setEndTime(Date.now());
  state.setGameStatus("finished");
}

export function resetLocalMatch() {
  stopGameAudio();
  pausedAt = null;
  const state = useGameStore.getState();
  state.resetGame();
  state.setMatchId(null);
  state.setStartTime(null);
  state.setEndTime(null);
}
