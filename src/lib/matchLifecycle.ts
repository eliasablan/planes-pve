import { useGameStore } from "@/store/useGameStore";
import { beginGameAudio, finishGameAudio, stopGameAudio } from "@/lib/gameAudio";
import { clearRunTracking, getCurrentRunSession, startRunTracking } from "@/lib/scoreService";

export function startLocalMatch(matchId: string | null = null) {
  const state = useGameStore.getState();
  // Re-enable audio after Strict Mode runs the scene's cleanup and then repeats its mount effect.
  beginGameAudio();
  // React Strict Mode repeats mount effects. Keep one registration and clock per actual run.
  if (state.gameStatus === "playing" && state.startTime !== null) return;
  pausedAt = null;
  startRunTracking();
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
  const ended = useGameStore.getState();
  void getCurrentRunSession()?.finish(getRunResult(ended)).catch(() => {});
}

export function resetLocalMatch() {
  stopGameAudio();
  const state = useGameStore.getState();
  if (state.gameStatus === "playing") {
    const end = pausedAt ?? Date.now();
    void getCurrentRunSession()?.finish(getRunResult(state, end), "abandoned").catch(() => {});
  }
  clearRunTracking();
  pausedAt = null;
  state.resetGame();
  state.setMatchId(null);
  state.setStartTime(null);
  state.setEndTime(null);
}

function getRunResult(state: ReturnType<typeof useGameStore.getState>, end = state.endTime ?? Date.now()) {
  return { score: state.score, wave: state.wave, kills: state.localKills, durationMs: Math.max(0, end - (state.startTime ?? end)) };
}
