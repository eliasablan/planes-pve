"use client";

import { useQuery } from "@tanstack/react-query";
import { globalScoreboardQuery } from "@/lib/scoreQueries";
import { LocalScoreboardTable } from "./LocalScoreboardTable";

export function GlobalScoreboardPanel({ highlightId, compact = false }: { highlightId?: string; compact?: boolean }) {
  const { data: scores, error, isFetching, refetch } = useQuery(globalScoreboardQuery);
  return <div className="space-y-3">
    {error ? <div role="alert" className="space-y-3 text-sm text-wf-dim">
      <p>{scores ? "Could not refresh the ranking. Showing the last loaded scores. " : ""}{error.message}</p>
      <button className="wf-button px-4 py-2" disabled={isFetching} onClick={() => { void refetch(); }}>
        {isFetching ? "Retrying…" : "Retry ranking"}
      </button>
    </div> : null}
    {scores ? <LocalScoreboardTable scores={scores} highlightId={highlightId} compact={compact} /> :
      !error ? <p role="status" className="text-sm text-wf-dim">Loading global scores…</p> : null}
  </div>;
}
