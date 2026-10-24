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

export function finishLocalMatch() {
  const state = useGameStore.getState();
  if (state.gameStatus === "finished") return;
  finishGameAudio();
  state.setEndTime(Date.now());
  state.setGameStatus("finished");
}

export function resetLocalMatch() {
  stopGameAudio();
  const state = useGameStore.getState();
  state.resetGame();
  state.setMatchId(null);
  state.setStartTime(null);
  state.setEndTime(null);
}
