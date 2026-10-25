"use client";

import { useEffect, useState } from "react";
import { getGlobalScores } from "@/lib/scoreService";
import type { ScoreEntry } from "@/lib/scoreboard";
import { LocalScoreboardTable } from "./LocalScoreboardTable";

export function GlobalScoreboardPanel() {
  const [scores, setScores] = useState<ScoreEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    getGlobalScores().then(scores => { if (active) setScores(scores); }).catch(error => {
      if (active) setError(error instanceof Error ? error.message : "Scores unavailable.");
    });
    return () => { active = false; };
  }, [attempt]);

  if (error) return <div role="alert" className="space-y-3 text-sm text-wf-dim">
    <p>{error}</p>
    <button className="wf-button px-4 py-2" onClick={() => { setError(null); setAttempt(value => value + 1); }}>Retry</button>
  </div>;
  if (!scores) return <p role="status" className="text-sm text-wf-dim">Loading global scores…</p>;
  return <LocalScoreboardTable scores={scores} />;
}
