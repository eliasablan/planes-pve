"use client";

import type { LocalScoreEntry } from "@/lib/localScoreboard";
import { Trophy } from "lucide-react";

export function LocalScoreboardTable({
  scores,
  highlightId,
  compact = false,
}: {
  scores: LocalScoreEntry[];
  highlightId?: string;
  compact?: boolean;
}) {
  if (scores.length === 0) {
    return (
      <div className="border border-dashed border-white/14 bg-white/[0.025] p-6 text-center">
        <div className="mb-3 flex justify-center text-[#f4c95d]">
          <Trophy className="h-6 w-6" />
        </div>
        <p className="text-sm font-black uppercase tracking-[0.2em] text-white/56">No local scores yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-white/10">
      <div className="grid grid-cols-[56px_1fr_88px_68px_68px] bg-white/[0.05] px-3 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-white/42 sm:grid-cols-[80px_1fr_120px_100px_100px] sm:px-4 sm:text-[10px]">
        <span>Rank</span>
        <span>Name</span>
        <span className="text-right">Score</span>
        <span className="text-right">Wave</span>
        <span className="text-right">Kills</span>
      </div>
      {scores.map((row, index) => {
        const highlighted = row.id === highlightId;
        return (
          <div
            key={row.id}
            className={`grid grid-cols-[56px_1fr_88px_68px_68px] border-t border-white/10 px-3 text-xs font-black uppercase tracking-[0.1em] sm:grid-cols-[80px_1fr_120px_100px_100px] sm:px-4 sm:text-sm ${
              compact ? "py-3" : "py-5"
            } ${highlighted ? "bg-[#f4c95d]/12 text-white" : "text-white/86"}`}
          >
            <span className="text-[#f4c95d]">#{index + 1}</span>
            <span className="truncate">{row.name}</span>
            <span className="text-right tabular-nums">{row.score}</span>
            <span className="text-right tabular-nums">{row.wave}</span>
            <span className="text-right tabular-nums">{row.kills}</span>
          </div>
        );
      })}
    </div>
  );
}
