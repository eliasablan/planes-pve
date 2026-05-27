"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getLocalScoreSnapshot, parseLocalScores } from "@/lib/localScoreboard";
import { LocalScoreboardTable } from "./LocalScoreboardTable";

export function LocalScoreboardPanel() {
  const snapshot = useSyncExternalStore(subscribeToLocalScores, getLocalScoreSnapshot, () => "[]");
  const scores = useMemo(() => parseLocalScores(snapshot), [snapshot]);

  return <LocalScoreboardTable scores={scores} />;
}

function subscribeToLocalScores(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("local-scoreboard:update", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("local-scoreboard:update", onStoreChange);
  };
}
